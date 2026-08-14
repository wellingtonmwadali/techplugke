import type Mail from "nodemailer/lib/mailer/index.js";
import type { OrderDocument } from "../models/Order.js";
import type { ProductDocument } from "../models/Product.js";
import { config } from "../config/env.js";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Shared typography snippets, reused across every template so a heading/body/price/CTA looks
// identical wherever it appears (see the "Typography & Hierarchy" spec these values encode).
const H2 = "font-size: 28px; font-weight: 800; letter-spacing: -0.5px; line-height: 1.2; margin-top: 0; color: #0F172A;";
const BODY_TEXT = "font-size: 16px; line-height: 1.6; color: #334155;";
const PRODUCT_TITLE = "font-size: 18px; font-weight: 700; color: #0F172A;";
const PRICE = "font-size: 16px; font-weight: 800; color: #0F172A;";
// object-fit/border-radius on width/height-locked <img> tags — belt-and-suspenders against
// clients that ignore the style attribute and fall back to the width/height attributes alone.
const PRODUCT_IMG_STYLE = "width: 90px; height: 90px; min-width: 90px; object-fit: cover; border-radius: 16px;";

// Base layout wrapper — standard branding & footer shared across every HTML email.
function wrapWithLayout(content: string, shopName: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #F5F4EE; color: #0F172A; }
    .container { max-width: 600px; margin: 20px auto; background: #FFFFFF; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
    .content { padding: 32px 24px; }
    .btn { font-size: 16px; font-weight: 800; padding: 16px 36px; display: inline-block; background-color: #D0F244; color: #0F172A !important; border-radius: 9999px; text-decoration: none; text-align: center; margin-top: 16px; box-shadow: 0 4px 14px rgba(208,242,68,0.4); }
    .footer { background-color: #0F172A; color: #94A3B8; padding: 32px 24px; text-align: center; font-size: 12px; }
    .footer-text { color: #64748B; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <h3 style="color: #FFFFFF; margin: 0 0 8px 0; font-size: 18px;">${escapeHtml(shopName)}</h3>
      <p style="margin: 4px 0;">Quality footwear &amp; accessories delivered countrywide.</p>
      <p class="footer-text" style="font-size: 11px; margin-top: 16px;">© ${new Date().getFullYear()} ${escapeHtml(shopName)}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

export function welcomeTemplate(customerName: string | undefined, shopName: string): string {
  const name = escapeHtml(customerName || "there");
  const body = `
    <h2 style="${H2}">Welcome to the ${escapeHtml(shopName)} Family! 👟🔥</h2>
    <p style="${BODY_TEXT}">Hey <strong>${name}</strong>, you're officially in!</p>
    <p style="${BODY_TEXT}">You've just unlocked access to the freshest drops, premium footwear, and exclusive deals crafted for your style. Whether you're upgrading your daily rotation or hunting for standout pieces, we've got you covered.</p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${config.storefrontUrl}" class="btn">Shop Fresh Drops Now ↗</a>
    </div>
  `;
  return wrapWithLayout(body, shopName);
}

export function orderConfirmationTemplate(order: OrderDocument, shopName: string): string {
  const itemsHtml = order.items
    .map(
      (item) => `
    <tr style="border-bottom: 1px solid #E2E8F0;">
      <td style="padding: 12px 0;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <img src="${item.image}" alt="${escapeHtml(item.name)}" width="90" height="90" style="${PRODUCT_IMG_STYLE}" />
          <div>
            <p style="${PRODUCT_TITLE} margin: 0;">${escapeHtml(item.name)}</p>
            <span style="font-size: 13px; color: #64748B;">Qty: ${item.quantity}</span>
          </div>
        </div>
      </td>
      <td style="padding: 12px 0; text-align: right; ${PRICE}">
        Ksh ${(item.price * item.quantity).toLocaleString()}
      </td>
    </tr>`
    )
    .join("");

  const body = `
    <div style="display: inline-block; background-color: #D1FAE5; color: #065F46; font-weight: 700; font-size: 13px; padding: 4px 12px; border-radius: 9999px; margin-bottom: 12px;">
      ✓ Payment Received &amp; Verified
    </div>
    <h2 style="${H2}">Boom! Your Order is Confirmed 🎉</h2>
    <p style="${BODY_TEXT}">Great choice, <strong>${escapeHtml(order.contact.name)}</strong>! We've received your payment and our team is already packing up your gear.</p>
    <div style="background-color: #F8F8F6; border-radius: 16px; padding: 20px; margin: 24px 0;">
      <h3 style="font-size: 14px; text-transform: uppercase; color: #64748B; margin-top: 0;">Order Summary</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tbody>${itemsHtml}</tbody>
      </table>
      <div style="display: flex; justify-content: space-between; border-top: 2px solid #E2E8F0; padding-top: 12px; margin-top: 12px;">
        <strong style="${PRICE}">Total:</strong>
        <strong style="${PRICE}">Ksh ${order.total.toLocaleString()}</strong>
      </div>
    </div>
    <p style="font-size: 14px; color: #64748B;">Delivery address: ${escapeHtml(order.contact.address)}, ${escapeHtml(order.contact.town)}</p>
  `;
  return wrapWithLayout(body, shopName);
}

// `setPasswordLink` is only passed by the admin's manual "Add Customer" flow (routes/users.ts)
// — that's the one caller where the recipient doesn't have a password yet and needs a concrete
// way to actually sign in, so it renders as a small secondary line rather than disturbing the
// requested copy/CTA above it.
export function thankYouTemplate(customerName: string | undefined, shopName: string, setPasswordLink?: string): string {
  const name = escapeHtml(customerName || "there");
  const body = `
    <h2 style="${H2}">Thank You for Shopping with Us! ❤️</h2>
    <p style="${BODY_TEXT}">Hey <strong>${name}</strong>, your order made our day! We put a lot of care into every product, and we can't wait for you to unbox your new gadgets.</p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${config.storefrontUrl}" class="btn">Explore New Arrivals ↗</a>
    </div>
    ${
      setPasswordLink
        ? `<p style="font-size: 13px; color: #64748B; text-align: center;">Want to track this order online? <a href="${setPasswordLink}" style="color: #0F172A; font-weight: 700;">Set your password</a> to sign in any time.</p>`
        : ""
    }
  `;
  return wrapWithLayout(body, shopName);
}

// Product images are stored as base64 data URIs (see routes/products.ts), which renders fine
// on the storefront but most email clients (Gmail, Outlook, Yahoo) strip data: URIs from
// <img src> as a security measure, leaving a src-less tag. Swap each one for a cid: reference
// backed by a real Nodemailer inline attachment — the standard workaround for embedding images
// in HTML email without hosting them anywhere. Call this only on HTML that's about to be sent;
// preview endpoints that render straight to a browser should keep the original data URIs.
const DATA_URI_IMG = /src="data:([a-zA-Z0-9.+-]+\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)"/g;

export function inlineImageAttachments(html: string): { html: string; attachments: Mail.Attachment[] } {
  const attachments: Mail.Attachment[] = [];
  let index = 0;

  const inlinedHtml = html.replace(DATA_URI_IMG, (_match, contentType: string, base64: string) => {
    const cid = `img${index++}@techplug`;
    attachments.push({ cid, content: Buffer.from(base64, "base64"), contentType });
    return `src="cid:${cid}"`;
  });

  return { html: inlinedHtml, attachments };
}

// Sent when a super_admin adds a new team member — mirrors the "Add Customer" account-creation
// flow (routes/users.ts / thankYouTemplate) but points at the admin panel and names their role.
export function teamInviteTemplate(
  name: string | undefined,
  shopName: string,
  roleLabel: string,
  setPasswordLink: string
): string {
  const greeting = escapeHtml(name || "there");
  const body = `
    <h2 style="${H2}">You've Been Added to the ${escapeHtml(shopName)} Team 🎉</h2>
    <p style="${BODY_TEXT}">Hey <strong>${greeting}</strong>, you've been given <strong>${escapeHtml(roleLabel)}</strong> access to the ${escapeHtml(shopName)} admin panel.</p>
    <p style="${BODY_TEXT}">Set your password to sign in for the first time:</p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${setPasswordLink}" class="btn">Set Your Password ↗</a>
    </div>
  `;
  return wrapWithLayout(body, shopName);
}

export function dealOfMonthTemplate(
  products: Pick<ProductDocument, "name" | "price" | "compareAtPrice" | "images">[],
  note: string | undefined,
  shopName: string
): string {
  const productCards = products
    .map(
      (p) => `
    <div style="background: #F8F8F6; border-radius: 16px; margin-bottom: 16px; padding: 16px; display: flex; align-items: center; gap: 16px;">
      <img src="${p.images[0] ?? ""}" alt="${escapeHtml(p.name)}" width="90" height="90" style="${PRODUCT_IMG_STYLE}" />
      <div style="flex: 1;">
        <span style="font-size: 11px; background: #EF4444; color: #FFF; font-weight: 800; padding: 2px 8px; border-radius: 9999px;">🔥 SPECIAL OFFER</span>
        <h4 style="${PRODUCT_TITLE} margin: 6px 0 4px 0;">${escapeHtml(p.name)}</h4>
        <div>
          <span style="${PRICE}">Ksh ${p.price.toLocaleString()}</span>
          ${p.compareAtPrice ? `<span style="text-decoration: line-through; color: #94A3B8; margin-left: 6px; font-size: 13px;">Ksh ${p.compareAtPrice.toLocaleString()}</span>` : ""}
        </div>
      </div>
    </div>`
    )
    .join("");

  const body = `
    <h2 style="${H2}">🔥 Handpicked Deals of the Month (Limited Time!)</h2>
    <p style="${BODY_TEXT}">${escapeHtml(note || "Steals you don't want to sleep on. Grab yours before it sells out!")}</p>
    <div style="margin: 24px 0;">${productCards}</div>
    <div style="text-align: center; margin-top: 24px;">
      <a href="${config.storefrontUrl}" class="btn">Claim Your Deal Before It's Gone ↗</a>
    </div>
  `;
  return wrapWithLayout(body, shopName);
}
