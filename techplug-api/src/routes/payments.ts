import { Router } from "express";
import crypto from "node:crypto";
import mongoose from "mongoose";
import { authenticate } from "../middleware/authenticate.js";
import { Order } from "../models/Order.js";
import { getOrCreateSettings } from "../models/Settings.js";
import { initiateStkPush, MpesaNotConfiguredError } from "../services/mpesa.js";
import { sendEmail } from "../utils/mailer.js";
import { orderConfirmationTemplate, inlineImageAttachments } from "../services/emailTemplates.js";
import { config } from "../config/env.js";

export const paymentsRouter = Router();

// Accepts 07XXXXXXXX, 01XXXXXXXX, +2547XXXXXXXX, or already-normalized 2547XXXXXXXX/2541XXXXXXXX.
function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (/^254[17]\d{8}$/.test(digits)) return digits;
  if (/^0[17]\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
  if (/^[17]\d{8}$/.test(digits)) return `254${digits}`;
  return null;
}

paymentsRouter.post("/stkpush", authenticate, async (req, res) => {
  const { orderId, phone } = req.body ?? {};
  if (typeof orderId !== "string" || !mongoose.Types.ObjectId.isValid(orderId)) {
    res.status(400).json({ error: "Invalid order id" });
    return;
  }
  const normalizedPhone = typeof phone === "string" ? normalizePhone(phone) : null;
  if (!normalizedPhone) {
    res.status(400).json({ error: "Enter a valid Safaricom number, e.g. 07XX XXX XXX" });
    return;
  }

  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  if (order.firebaseUid !== req.firebaseUser!.uid) {
    res.status(403).json({ error: "This order doesn't belong to you" });
    return;
  }
  if (order.status !== "placed" || order.paymentStatus === "paid") {
    res.status(400).json({ error: "This order isn't awaiting payment" });
    return;
  }

  const callbackSecret = crypto.randomBytes(24).toString("base64url");

  try {
    const { checkoutRequestId } = await initiateStkPush({
      phone: normalizedPhone,
      amount: order.total,
      orderNumber: order.orderNumber,
      callbackUrl: `${config.mpesaCallbackUrl}/${callbackSecret}`,
    });
    order.mpesaCheckoutRequestId = checkoutRequestId;
    order.mpesaCallbackSecret = callbackSecret;
    order.paymentStatus = "pending";
    await order.save();
    res.json({ checkoutRequestId });
  } catch (err) {
    if (err instanceof MpesaNotConfiguredError) {
      res.status(503).json({ error: "M-Pesa payments aren't configured yet. Pay via the Till Number instead." });
      return;
    }
    res.status(502).json({ error: err instanceof Error ? err.message : "Failed to initiate M-Pesa payment" });
  }
});

// Public — Safaricom calls this directly and can't send a Firebase auth token. Always responds
// with the { ResultCode: 0 } shape Safaricom expects, even when something goes wrong on our
// end, so Safaricom doesn't treat a 5xx as "retry forever." Errors are logged, never thrown.
//
// The :secret segment is the per-order token generated in POST /stkpush and embedded in the
// CallBackURL we hand Safaricom for that specific STK push — it's never sent to the client, only
// CheckoutRequestID is (in the /stkpush response). Without checking it here, anyone who observed
// their own CheckoutRequestID over the network could POST a forged "payment successful" callback
// straight to this endpoint and get their own order marked paid for free.
paymentsRouter.post("/mpesa-callback/:secret", async (req, res) => {
  try {
    const callback = req.body?.Body?.stkCallback;
    const checkoutRequestId = callback?.CheckoutRequestID;
    const resultCode = callback?.ResultCode;
    const resultDesc = callback?.ResultDesc;

    if (typeof checkoutRequestId !== "string") {
      console.error("M-Pesa callback missing CheckoutRequestID:", JSON.stringify(req.body));
      res.json({ ResultCode: 0, ResultDesc: "Accepted" });
      return;
    }

    const order = await Order.findOne({ mpesaCheckoutRequestId: checkoutRequestId });
    if (!order) {
      console.error("M-Pesa callback for unknown CheckoutRequestID:", checkoutRequestId);
      res.json({ ResultCode: 0, ResultDesc: "Accepted" });
      return;
    }

    if (!order.mpesaCallbackSecret || req.params.secret !== order.mpesaCallbackSecret) {
      console.error(`M-Pesa callback secret mismatch for order ${order.orderNumber}`);
      res.json({ ResultCode: 0, ResultDesc: "Accepted" });
      return;
    }

    if (resultCode === 0) {
      const items: { Name: string; Value: unknown }[] = callback?.CallbackMetadata?.Item ?? [];
      const receipt = items.find((item) => item.Name === "MpesaReceiptNumber")?.Value;

      order.paymentStatus = "paid";
      order.status = "processing";
      if (typeof receipt === "string") order.mpesaReceiptNumber = receipt;
      await order.save();

      try {
        const settings = await getOrCreateSettings();
        const { html, attachments } = inlineImageAttachments(orderConfirmationTemplate(order, settings.shopName));
        await sendEmail({
          to: order.contact.email,
          subject: `Payment Received! Order #${order.orderNumber} Confirmed`,
          text: `Hi ${order.contact.name}, we've received your M-Pesa payment for order #${order.orderNumber}. Total: Ksh ${order.total.toLocaleString()}.`,
          html,
          attachments,
        });
      } catch (err) {
        console.error("Order-paid confirmation email failed:", err);
      }
    } else {
      order.paymentStatus = "failed";
      await order.save();
      console.log(`M-Pesa payment failed/cancelled for order ${order.orderNumber}: ${resultDesc}`);
    }

    res.json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (err) {
    console.error("M-Pesa callback handling error:", err);
    res.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }
});
