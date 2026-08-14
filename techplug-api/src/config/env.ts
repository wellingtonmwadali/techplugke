import dotenv from "dotenv";

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

// Browser `Origin` headers never have a trailing slash, but it's an easy mistake to paste one
// into an env var (e.g. copying a URL straight from the address bar) — the `cors` package does
// an exact string match against the request's Origin, so a stray trailing slash here silently
// breaks every cross-origin request instead of erroring at startup.
function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export const config = {
  port: Number(process.env.PORT) || 4000,
  corsOrigin: stripTrailingSlash(process.env.CORS_ORIGIN || "http://localhost:3000"),
  mongodbUri: required("MONGODB_URI"),
  firebaseProjectId: required("FIREBASE_PROJECT_ID"),
  firebaseClientEmail: required("FIREBASE_CLIENT_EMAIL"),
  firebasePrivateKey: required("FIREBASE_PRIVATE_KEY"),
  // Optional — the mailer (src/utils/mailer.ts) falls back to logging instead of sending if
  // these aren't set, so leaving them blank doesn't break startup or any other route.
  smtpHost: process.env.SMTP_HOST,
  smtpPort: Number(process.env.SMTP_PORT) || 587,
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  mailFrom: process.env.MAIL_FROM,
  // Used for CTA links in marketing/order emails — not the same as CORS_ORIGIN's purpose,
  // kept separate in case they ever diverge (e.g. a marketing domain vs. the app origin).
  storefrontUrl: process.env.STOREFRONT_URL || "http://localhost:3000",
  // Optional — the mpesa service (src/services/mpesa.ts) throws a clear "not configured"
  // error from the route handler if these are missing, rather than crashing startup.
  mpesaEnvironment: process.env.MPESA_ENVIRONMENT === "live" ? "live" : "sandbox",
  mpesaTillNumber: process.env.MPESA_TILL_NUMBER,
  // The STK-push-specific "online shortcode" (distinct from the physical till number) —
  // Safaricom's Daraja docs call this the "Store Number"/shortcode used for BusinessShortCode
  // and the STK password, while PartyB stays the actual till the money settles into.
  mpesaShortcode: process.env.MPESA_PAYBILL_ONLINE,
  mpesaPasskey: process.env.MPESA_PASSKEY,
  mpesaConsumerKey: process.env.MPESA_CONSUMER_KEY,
  mpesaConsumerSecret: process.env.MPESA_CONSUMER_SECRET,
  mpesaCallbackUrl: process.env.CALLBACK_URL,
};
