import { Router, type Request } from "express";
import mongoose from "mongoose";
import { authenticate } from "../middleware/authenticate.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { User } from "../models/User.js";
import { getOrCreateSettings } from "../models/Settings.js";
import { sendEmail } from "../utils/mailer.js";
import { orderConfirmationTemplate, dealOfMonthTemplate, inlineImageAttachments } from "../services/emailTemplates.js";
import { settleWithConcurrency } from "../utils/concurrency.js";

// Cap concurrent SMTP sends for a campaign so "send to all customers" doesn't fire dozens/
// hundreds of simultaneous connections against a provider's rate/connection limits.
const CAMPAIGN_SEND_CONCURRENCY = 8;

export const marketingRouter = Router();

marketingRouter.use(authenticate, requireAdmin);

// Manual/resend trigger — distinct from the automatic plain-text notice sent when an order's
// status transitions to "processing" (see routes/orders.ts). This one always sends the full
// branded HTML confirmation, regardless of the order's current status, so an admin can resend
// it on demand.
marketingRouter.post("/order-confirmation", async (req, res) => {
  const { orderId } = req.body ?? {};
  if (typeof orderId !== "string" || !mongoose.Types.ObjectId.isValid(orderId)) {
    res.status(400).json({ error: "Invalid order id" });
    return;
  }

  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const settings = await getOrCreateSettings();
  const { html, attachments } = inlineImageAttachments(orderConfirmationTemplate(order, settings.shopName));

  try {
    await sendEmail({
      to: order.contact.email,
      subject: `Order Confirmation #${order.orderNumber}`,
      text: `Hi ${order.contact.name}, your order #${order.orderNumber} is confirmed. Total: Ksh ${order.total.toLocaleString()}.`,
      html,
      attachments,
    });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "Failed to send confirmation email" });
    return;
  }

  res.json({ success: true, message: `Confirmation email sent to ${order.contact.email}` });
});

function parseProductIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((id): id is string => typeof id === "string" && mongoose.Types.ObjectId.isValid(id));
}

async function buildCampaign(req: Request) {
  const { productIds, recipientType, customerIds, note } = req.body ?? {};
  const validProductIds = parseProductIds(productIds);
  if (validProductIds.length === 0) {
    return { error: "Select at least one product" } as const;
  }

  const products = await Product.find({ _id: { $in: validProductIds } });
  if (products.length === 0) {
    return { error: "No matching products found" } as const;
  }

  let recipients: { email: string }[];
  if (recipientType === "selected") {
    const validCustomerIds = parseProductIds(customerIds);
    if (validCustomerIds.length === 0) {
      return { error: "Select at least one customer" } as const;
    }
    recipients = await User.find({ _id: { $in: validCustomerIds } }).select("email");
  } else {
    recipients = await User.find({ email: { $exists: true, $ne: "" } }).select("email");
  }

  const settings = await getOrCreateSettings();
  const { html, attachments } = inlineImageAttachments(
    dealOfMonthTemplate(products, typeof note === "string" ? note : undefined, settings.shopName)
  );

  return { products, recipients, html, attachments, shopName: settings.shopName } as const;
}

marketingRouter.get("/deal-of-month/preview", async (req, res) => {
  const productIds = typeof req.query.productIds === "string" ? req.query.productIds.split(",") : [];
  const note = typeof req.query.note === "string" ? req.query.note : undefined;

  const validProductIds = parseProductIds(productIds);
  if (validProductIds.length === 0) {
    res.status(400).json({ error: "Select at least one product" });
    return;
  }

  const products = await Product.find({ _id: { $in: validProductIds } });
  const settings = await getOrCreateSettings();
  const html = dealOfMonthTemplate(products, note, settings.shopName);
  res.json({ html });
});

marketingRouter.post("/deal-of-month", async (req, res) => {
  const campaign = await buildCampaign(req);
  if ("error" in campaign) {
    res.status(400).json({ error: campaign.error });
    return;
  }

  const { recipients, html, attachments, shopName } = campaign;
  const note = typeof req.body?.note === "string" ? req.body.note : undefined;

  const results = await settleWithConcurrency(recipients, CAMPAIGN_SEND_CONCURRENCY, (r) =>
    sendEmail({
      to: r.email,
      subject: `🔥 ${shopName} — Deals of the Month!`,
      text: note || "Exclusive deals this month — check your email client's HTML view for the full offer.",
      html,
      attachments,
    })
  );
  const sent = results.filter((r) => r.status === "fulfilled").length;

  res.json({ success: true, sent, total: recipients.length, message: `Campaign sent to ${sent} of ${recipients.length} customers` });
});
