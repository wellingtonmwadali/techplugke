import { config } from "../config/env.js";

const BASE_URL =
  config.mpesaEnvironment === "live" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";

export class MpesaNotConfiguredError extends Error {
  constructor() {
    super("M-Pesa is not configured — missing consumer key/secret/passkey/till/shortcode.");
    this.name = "MpesaNotConfiguredError";
  }
}

function assertConfigured() {
  if (
    !config.mpesaConsumerKey ||
    !config.mpesaConsumerSecret ||
    !config.mpesaPasskey ||
    !config.mpesaShortcode ||
    !config.mpesaTillNumber ||
    !config.mpesaCallbackUrl
  ) {
    throw new MpesaNotConfiguredError();
  }
}

export async function getMpesaToken(): Promise<string> {
  assertConfigured();
  const auth = Buffer.from(`${config.mpesaConsumerKey}:${config.mpesaConsumerSecret}`).toString("base64");

  const res = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) {
    throw new Error(`M-Pesa OAuth failed (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

function stkPassword(): { password: string; timestamp: string } {
  const date = new Date();
  const timestamp =
    date.getFullYear().toString() +
    `${date.getMonth() + 1}`.padStart(2, "0") +
    `${date.getDate()}`.padStart(2, "0") +
    `${date.getHours()}`.padStart(2, "0") +
    `${date.getMinutes()}`.padStart(2, "0") +
    `${date.getSeconds()}`.padStart(2, "0");

  const password = Buffer.from(`${config.mpesaShortcode}${config.mpesaPasskey}${timestamp}`).toString("base64");
  return { password, timestamp };
}

export async function initiateStkPush({
  phone,
  amount,
  orderNumber,
  callbackUrl,
}: {
  phone: string;
  amount: number;
  orderNumber: string;
  // Per-order URL (base CALLBACK_URL + an unguessable per-order secret segment — see
  // routes/payments.ts) rather than the bare configured URL, so the callback handler can
  // verify a callback actually corresponds to a request Safaricom was asked to make for this
  // specific order, instead of trusting any POST that names a known CheckoutRequestID.
  callbackUrl: string;
}): Promise<{ checkoutRequestId: string }> {
  assertConfigured();
  const token = await getMpesaToken();
  const { password, timestamp } = stkPassword();

  const payload = {
    BusinessShortCode: config.mpesaShortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerBuyGoodsOnline",
    Amount: Math.ceil(amount),
    PartyA: phone,
    PartyB: config.mpesaTillNumber,
    PhoneNumber: phone,
    CallBackURL: callbackUrl,
    AccountReference: orderNumber,
    TransactionDesc: `Payment for order ${orderNumber}`,
  };

  const res = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = (await res.json()) as { CheckoutRequestID?: string; errorMessage?: string; ResponseDescription?: string };
  if (!res.ok || !data.CheckoutRequestID) {
    throw new Error(data.errorMessage || data.ResponseDescription || "Failed to initiate M-Pesa payment");
  }

  return { checkoutRequestId: data.CheckoutRequestID };
}
