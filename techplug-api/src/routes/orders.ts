import { Router } from "express";
import mongoose from "mongoose";
import { authenticate } from "../middleware/authenticate.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import {
  ORDER_STATUSES,
  Order,
  type OrderContact,
  type OrderItem,
  type OrderStatus,
  type PaymentMethod,
} from "../models/Order.js";
import { Product } from "../models/Product.js";
import { getOrCreateSettings } from "../models/Settings.js";
import { escapeRegExp } from "../utils/text.js";
import { parsePagination } from "../utils/pagination.js";
import { sendEmail } from "../utils/mailer.js";

export const ordersRouter = Router();

// "till" is the existing manual-payment flow; "mpesa" is the STK Push flow (routes/payments.ts).
// "cod"/"card" remain valid PaymentMethod values only for historical orders, not accepted here.
const PAYMENT_METHODS: PaymentMethod[] = ["till", "mpesa"];
const SHIPPING_FEE = 300;
const CANCEL_WINDOW_MS = 10 * 60 * 60 * 1000; // 10 hours
const LOW_STOCK_THRESHOLD = 3;

function isVariantOptions(value: unknown): value is Record<string, string> {
  if (value === undefined) return true;
  if (!value || typeof value !== "object") return false;
  return Object.values(value as Record<string, unknown>).every((v) => typeof v === "string");
}

function validateItems(items: unknown): items is OrderItem[] {
  if (!Array.isArray(items) || items.length === 0) return false;
  return (items as unknown[]).every((raw) => {
    if (!raw || typeof raw !== "object") return false;
    const item = raw as Record<string, unknown>;
    return (
      typeof item.productId === "string" &&
      item.productId.length > 0 &&
      typeof item.name === "string" &&
      item.name.length > 0 &&
      typeof item.image === "string" &&
      item.image.length > 0 &&
      typeof item.price === "number" &&
      item.price >= 0 &&
      typeof item.quantity === "number" &&
      item.quantity >= 1 &&
      typeof item.color === "string" &&
      isVariantOptions(item.variantOptions)
    );
  });
}

// Exact-match lookup — a variant "matches" only if it has precisely the same set of option
// names and values the shopper picked, so a partial/stale selection (e.g. a variant option was
// removed from the product after the client loaded it) never silently resolves to some other
// variant's price.
function findMatchingVariant(product: InstanceType<typeof Product>, variantOptions: Record<string, string>) {
  return (product.variants ?? []).find((variant) => {
    const keys = Object.keys(variant.options);
    return (
      keys.length === Object.keys(variantOptions).length &&
      keys.every((key) => variant.options[key] === variantOptions[key])
    );
  });
}

function validateContact(contact: unknown): contact is OrderContact {
  if (!contact || typeof contact !== "object") return false;
  const c = contact as Record<string, unknown>;
  return (
    typeof c.name === "string" &&
    c.name.trim().length > 0 &&
    typeof c.phone === "string" &&
    c.phone.trim().length > 0 &&
    typeof c.email === "string" &&
    c.email.trim().length > 0 &&
    typeof c.address === "string" &&
    c.address.trim().length > 0 &&
    typeof c.town === "string" &&
    c.town.trim().length > 0
  );
}

// Puts stock back for every line in an order — used both when a customer cancels their own
// order and when an admin sets an order's status to "cancelled".
async function restock(items: OrderItem[]) {
  await Promise.all(
    items.map((item) =>
      Product.findByIdAndUpdate(item.productId, { $inc: { stockQuantity: item.quantity } })
    )
  );
}

ordersRouter.post("/", authenticate, async (req, res) => {
  const { items, contact, paymentMethod } = req.body ?? {};

  if (!validateItems(items)) {
    res.status(400).json({ error: "Invalid or empty items" });
    return;
  }
  if (!validateContact(contact)) {
    res.status(400).json({ error: "Missing required contact details" });
    return;
  }
  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    res.status(400).json({ error: "Invalid payment method" });
    return;
  }

  // Re-derive name/price/image/stock from the database rather than trusting the client —
  // a stale cart (price changed, product deleted, or gone out of stock since it was added)
  // must not be able to place an order at the wrong price or for something unavailable.
  const products = await Product.find({ _id: { $in: items.map((i) => i.productId) } });
  const productsById = new Map(products.map((p) => [p.id, p]));

  const resolvedItems: OrderItem[] = [];
  for (const item of items) {
    const product = productsById.get(item.productId);
    if (!product) {
      res.status(409).json({ error: `"${item.name}" is no longer available. Please remove it from your bag.` });
      return;
    }
    if (product.stockQuantity < item.quantity) {
      res.status(409).json({
        error:
          product.stockQuantity === 0
            ? `"${product.name}" just went out of stock. Please remove it from your bag.`
            : `Only ${product.stockQuantity} left of "${product.name}" — please reduce the quantity.`,
      });
      return;
    }

    // Price always comes from the database, never the client — for a variant product, that
    // means looking up the exact combination the shopper picked rather than trusting
    // item.price. A cart built against stale data (a variant was removed/repriced since it was
    // added) fails clearly here instead of silently charging the wrong amount.
    let price = product.price;
    if (product.variants && product.variants.length > 0) {
      if (!item.variantOptions) {
        res.status(409).json({ error: `Please choose options for "${product.name}" before checking out.` });
        return;
      }
      const variant = findMatchingVariant(product, item.variantOptions);
      if (!variant) {
        res.status(409).json({
          error: `The selected options for "${product.name}" are no longer available. Please choose again.`,
        });
        return;
      }
      price = variant.price;
    }

    resolvedItems.push({
      productId: product.id,
      name: product.name,
      price,
      color: item.color,
      variantOptions: item.variantOptions,
      quantity: item.quantity,
      image: product.images[0],
    });
  }

  const subtotal = resolvedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const total = subtotal + SHIPPING_FEE;

  try {
    // Atomically decrement stock, guarded by the same $gte check as above — closes the race
    // where two customers both pass the read-check above for the last unit at the same time.
    // If a decrement fails here (stock moved between the check and now), bail before saving.
    const newlyLowStock: { name: string; stockQuantity: number }[] = [];
    for (const item of resolvedItems) {
      const decremented = await Product.findOneAndUpdate(
        { _id: item.productId, stockQuantity: { $gte: item.quantity } },
        { $inc: { stockQuantity: -item.quantity } },
        { new: true }
      );
      if (!decremented) {
        // Roll back any decrements already applied for earlier items in this order.
        await restock(resolvedItems.slice(0, resolvedItems.indexOf(item)));
        res.status(409).json({ error: `"${item.name}" sold out just now. Please remove it from your bag.` });
        return;
      }
      if (decremented.stockQuantity <= LOW_STOCK_THRESHOLD) {
        newlyLowStock.push({ name: decremented.name, stockQuantity: decremented.stockQuantity });
      }
    }

    const order = new Order({
      firebaseUid: req.firebaseUser!.uid,
      items: resolvedItems,
      contact,
      paymentMethod,
      subtotal,
      shippingFee: SHIPPING_FEE,
      total,
    });
    order.orderNumber = `SZ${order._id.toString().slice(-6).toUpperCase()}`;
    await order.save();

    res.status(201).json(order);

    // Owner notifications are best-effort and run after the response is already sent — errors
    // here (including a bad Settings read) must never touch `res` again, so they're contained
    // to this block rather than the outer try/catch.
    try {
      const settings = await getOrCreateSettings();
      if (settings.notificationEmail) {
        if (settings.emailOnNewOrder) {
          void sendEmail({
            to: settings.notificationEmail,
            subject: `New order #${order.orderNumber}`,
            text: `${contact.name} placed order #${order.orderNumber} for ${total}.`,
          });
        }
        if (settings.emailOnLowStock) {
          for (const p of newlyLowStock) {
            void sendEmail({
              to: settings.notificationEmail,
              subject: `Low stock: ${p.name}`,
              text: `"${p.name}" is down to ${p.stockQuantity} unit(s) left.`,
            });
          }
        }
      }
    } catch (err) {
      console.error("Owner notification failed:", err);
    }
  } catch (err) {
    console.error("Order creation failed:", err);
    res.status(500).json({ error: "Failed to create order" });
  }
});

ordersRouter.get("/", authenticate, requireAdmin, async (req, res) => {
  const { status, paymentMethod, from, to, search } = req.query;

  const filter: Record<string, unknown> = {};
  if (typeof status === "string") filter.status = status;
  if (typeof paymentMethod === "string") filter.paymentMethod = paymentMethod;
  if (typeof from === "string" || typeof to === "string") {
    const range: Record<string, Date> = {};
    if (typeof from === "string" && !Number.isNaN(Date.parse(from))) range.$gte = new Date(from);
    if (typeof to === "string" && !Number.isNaN(Date.parse(to))) range.$lte = new Date(to);
    if (Object.keys(range).length > 0) filter.createdAt = range;
  }
  if (typeof search === "string" && search.trim()) {
    const pattern = new RegExp(escapeRegExp(search.trim()), "i");
    filter.$or = [{ orderNumber: pattern }, { "contact.name": pattern }, { "contact.email": pattern }];
  }

  const { page, pageSize } = parsePagination(req.query as Record<string, unknown>);

  // List views (unlike GET /:id) never render line-item images — each one is a full base64
  // data URI, so excluding them here keeps the list response from ballooning to tens of MB.
  if (page) {
    const [items, total] = await Promise.all([
      Order.find(filter)
        .select("-items.image")
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize),
      Order.countDocuments(filter),
    ]);
    res.json({ items, total, page, pageSize });
    return;
  }

  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const orders = await Order.find(filter).select("-items.image").sort({ createdAt: -1 }).limit(limit);
  res.json(orders);
});

ordersRouter.get("/mine", authenticate, async (req, res) => {
  const orders = await Order.find({ firebaseUid: req.firebaseUser!.uid }).sort({ createdAt: -1 });
  res.json(orders);
});

// Narrow, customer-scoped status poll for the M-Pesa checkout modal — deliberately separate
// from the admin-only GET /:id below rather than loosening its auth, and returns only what the
// modal needs rather than the full order (contact details, items, etc.).
ordersRouter.get("/:id/mine", authenticate, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400).json({ error: "Invalid order id" });
    return;
  }
  const order = await Order.findById(req.params.id);
  if (!order || order.firebaseUid !== req.firebaseUser!.uid) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json({
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    mpesaReceiptNumber: order.mpesaReceiptNumber,
    total: order.total,
  });
});

ordersRouter.patch("/:id/cancel", authenticate, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400).json({ error: "Invalid order id" });
    return;
  }
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  if (order.firebaseUid !== req.firebaseUser!.uid) {
    res.status(403).json({ error: "You can only cancel your own orders" });
    return;
  }
  if (order.status !== "placed") {
    res.status(400).json({ error: "This order can no longer be cancelled" });
    return;
  }
  if (Date.now() - order.createdAt.getTime() > CANCEL_WINDOW_MS) {
    res.status(400).json({ error: "The 10-hour cancellation window has passed" });
    return;
  }

  order.status = "cancelled";
  await order.save();
  await restock(order.items);

  res.json(order);
});

ordersRouter.get("/:id", authenticate, requireAdmin, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400).json({ error: "Invalid order id" });
    return;
  }
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json(order);
});

ordersRouter.patch("/:id/status", authenticate, requireAdmin, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400).json({ error: "Invalid order id" });
    return;
  }
  const status = req.body?.status as OrderStatus | undefined;
  if (!status || !(ORDER_STATUSES as readonly string[]).includes(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }

  const current = await Order.findById(req.params.id);
  if (!current) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  // Optimistic concurrency: the client must send back the updatedAt it last saw. If someone
  // else changed this order in between, that timestamp won't match anymore.
  const clientUpdatedAt = req.body?.updatedAt ? new Date(req.body.updatedAt) : null;
  if (clientUpdatedAt && clientUpdatedAt.getTime() !== current.updatedAt.getTime()) {
    res.status(409).json({ error: "This order was updated by someone else — refresh and try again." });
    return;
  }

  const order = await Order.findOneAndUpdate(
    { _id: req.params.id, updatedAt: current.updatedAt },
    { $set: { status } },
    { new: true }
  );
  if (!order) {
    res.status(409).json({ error: "This order was updated by someone else — refresh and try again." });
    return;
  }

  if (status === "cancelled" && current.status !== "cancelled") {
    await restock(order.items);
  }

  res.json(order);

  // Best-effort, after the response — see the same pattern/reasoning in POST "/" above.
  if (status === "processing" && current.status !== "processing") {
    try {
      await sendEmail({
        to: order.contact.email,
        subject: `Your order #${order.orderNumber} is being processed`,
        text: `Hi ${order.contact.name}, we've confirmed payment and your order #${order.orderNumber} is now being processed for delivery.`,
      });
    } catch (err) {
      console.error("Order-processed notification failed:", err);
    }
  }
});
