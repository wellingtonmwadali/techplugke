import nodemailer, { type Transporter } from "nodemailer";
import type Mail from "nodemailer/lib/mailer/index.js";
import { config } from "../config/env.js";

// Lazily created so a missing SMTP_HOST/SMTP_USER/SMTP_PASS doesn't crash startup — routes that
// trigger emails (new order, low stock, order-processed, welcome email) already treat mailer
// failures as best-effort and never let them affect the HTTP response.
let transporter: Transporter | null | undefined;

function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter;

  if (!config.smtpHost || !config.smtpUser || !config.smtpPass) {
    transporter = null;
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    auth: { user: config.smtpUser, pass: config.smtpPass },
  });
  return transporter;
}

type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: Mail.Attachment[];
};

export async function sendEmail({ to, subject, text, html, attachments }: SendEmailInput): Promise<void> {
  const client = getTransporter();

  if (!client) {
    console.log(`[mailer] (SMTP_HOST/SMTP_USER/SMTP_PASS not set — logging only) to=${to} subject="${subject}"\n${text}`);
    return;
  }

  await client.sendMail({
    from: config.mailFrom || config.smtpUser,
    to,
    subject,
    text,
    html,
    attachments,
  });
}
