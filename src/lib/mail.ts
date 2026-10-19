import nodemailer, { type Transporter } from "nodemailer";
import { siteConfig } from "../../site.config";

// SMTP transport from env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM.
// Local dev points at Mailpit (docker compose). No SMTP_HOST = sending skipped.

let transport: Transporter | null | undefined;

function getTransport(): Transporter | null {
  if (transport !== undefined) return transport;
  const host = process.env.SMTP_HOST;
  if (!host) {
    transport = null;
    return transport;
  }
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user ? { user, pass: process.env.SMTP_PASS ?? "" } : undefined,
    // Fail fast: an unreachable mail server must not hold up an order.
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
  });
  return transport;
}

export type Mail = { to: string; subject: string; html: string; text: string };

/** Sends one email. Resolves false when SMTP is not configured; throws on SMTP errors. */
export async function sendMail(mail: Mail): Promise<boolean> {
  const smtp = getTransport();
  if (!smtp) {
    console.warn(`SMTP_HOST is not set: email "${mail.subject}" not sent.`);
    return false;
  }
  await smtp.sendMail({
    from: process.env.MAIL_FROM ?? `${siteConfig.name} <${siteConfig.contact.email}>`,
    ...mail,
  });
  return true;
}
