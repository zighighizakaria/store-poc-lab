import type { Order, OrderItem } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import { cityDisplayName } from "@/lib/city";
import { db } from "@/lib/db";
import { sendMail } from "@/lib/mail";
import { formatMoney } from "@/lib/money";
import { getDirection } from "@/i18n/routing";
import { siteConfig } from "../../site.config";

// Order emails: simple HTML + plain-text pair. Sent after the order is
// committed; a failure is logged and never fails the order.

// Email clients ignore CSS variables, so the kit colors are inlined here.
const COLOR = {
  ink: "#000000",
  muted: "#6b6968",
  line: "#ebebeb",
  canvas: "#f2f4f5",
  surface: "#ffffff",
  accent: "#5433eb",
  onAccent: "#ffffff",
};

const esc = (value: string) =>
  value.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);

type EmailItem = { name: string; detail: string; quantity: number; price: string };
type EmailBlock = { title: string; lines: string[] };
type EmailContent = {
  lang: string;
  dir: "ltr" | "rtl";
  heading: string;
  paragraphs: string[];
  itemsTitle: string;
  items: EmailItem[];
  totals: { label: string; value: string; strong?: boolean }[];
  blocks: EmailBlock[];
  cta?: { label: string; href: string };
  footer: string[];
};

function renderEmail(content: EmailContent): { html: string; text: string } {
  const start = content.dir === "rtl" ? "right" : "left";
  const end = content.dir === "rtl" ? "left" : "right";
  const ltr = (value: string) => `<span dir="ltr">${esc(value)}</span>`;

  const itemRows = content.items
    .map(
      (item) => `<tr>
  <td style="padding:12px 0;border-bottom:1px solid ${COLOR.line};text-align:${start}">
    <strong>${esc(item.name)}</strong><br><span style="color:${COLOR.muted}">${esc(item.detail)}</span>
  </td>
  <td style="padding:12px 8px;border-bottom:1px solid ${COLOR.line};text-align:center;white-space:nowrap">&times;${item.quantity}</td>
  <td style="padding:12px 0;border-bottom:1px solid ${COLOR.line};text-align:${end};white-space:nowrap">${ltr(item.price)}</td>
</tr>`,
    )
    .join("\n");

  const totalRows = content.totals
    .map(
      (row) => `<tr>
  <td style="padding:6px 0;text-align:${start};${row.strong ? "font-weight:bold;font-size:16px" : `color:${COLOR.muted}`}">${esc(row.label)}</td>
  <td style="padding:6px 0;text-align:${end};white-space:nowrap;${row.strong ? "font-weight:bold;font-size:16px" : ""}">${ltr(row.value)}</td>
</tr>`,
    )
    .join("\n");

  const blocks = content.blocks
    .map(
      (block) => `<h2 style="margin:24px 0 8px;font-size:14px">${esc(block.title)}</h2>
<p style="margin:0;color:${COLOR.muted}">${block.lines.map(esc).join("<br>")}</p>`,
    )
    .join("\n");

  const cta = content.cta
    ? `<p style="margin:24px 0 0"><a href="${esc(content.cta.href)}" style="display:inline-block;padding:12px 24px;border-radius:9999px;background:${COLOR.accent};color:${COLOR.onAccent};text-decoration:none;font-weight:bold">${esc(content.cta.label)}</a></p>`
    : "";

  const html = `<!doctype html>
<html lang="${content.lang}" dir="${content.dir}">
<body style="margin:0;padding:24px 12px;background:${COLOR.canvas};font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:${COLOR.ink}">
<div style="max-width:560px;margin:0 auto;padding:24px;border-radius:20px;background:${COLOR.surface};text-align:${start}">
<p style="margin:0 0 16px;font-size:18px;font-weight:bold">${esc(siteConfig.name)}</p>
<h1 style="margin:0 0 16px;font-size:20px">${esc(content.heading)}</h1>
${content.paragraphs.map((p) => `<p style="margin:0 0 12px">${esc(p)}</p>`).join("\n")}
<h2 style="margin:24px 0 0;font-size:14px">${esc(content.itemsTitle)}</h2>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
${itemRows}
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;border-collapse:collapse">
${totalRows}
</table>
${blocks}
${cta}
<p style="margin:24px 0 0;color:${COLOR.muted};font-size:12px">${content.footer.map(esc).join("<br>")}</p>
</div>
</body>
</html>`;

  const text = [
    content.heading,
    "",
    ...content.paragraphs,
    "",
    content.itemsTitle,
    ...content.items.map(
      (item) => `- ${item.name} (${item.detail}) x${item.quantity}  ${item.price}`,
    ),
    "",
    ...content.totals.map((row) => `${row.label}: ${row.value}`),
    ...content.blocks.flatMap((block) => ["", block.title, ...block.lines]),
    ...(content.cta ? ["", `${content.cta.label}: ${content.cta.href}`] : []),
    "",
    ...content.footer,
  ].join("\n");

  return { html, text };
}

type OrderWithItems = Order & { items: OrderItem[] };

function orderUrl(order: Order): string {
  return `${siteConfig.url}/${order.locale}/order/${encodeURIComponent(order.number)}?t=${order.accessToken}`;
}

function whatsappUrl(number: string): string {
  return `https://wa.me/${number}`;
}

// Admin notification: French only (admin language), sent to Settings.adminNotifyEmail.
function adminEmail(order: OrderWithItems, city: string) {
  const fullName = `${order.firstName} ${order.lastName}`;
  const phoneDigits = order.phone.replace(/\D/g, "");
  const content = renderEmail({
    lang: "fr",
    dir: "ltr",
    heading: `Nouvelle commande ${order.number}`,
    paragraphs: [
      "Une commande vient d'être passée (paiement à la livraison). Appelez le client pour la confirmer.",
    ],
    itemsTitle: "Articles",
    items: order.items.map((item) => ({
      name: item.productName,
      detail: `${item.sku} · ${item.colorName} · ${item.sizeLabel}`,
      quantity: item.quantity,
      price: formatMoney(item.unitPrice * item.quantity),
    })),
    totals: [
      { label: "Sous-total", value: formatMoney(order.subtotal) },
      {
        label: "Livraison",
        value: order.shippingFee === 0 ? "Offerte" : formatMoney(order.shippingFee),
      },
      { label: "Total à encaisser", value: formatMoney(order.total), strong: true },
    ],
    blocks: [
      {
        title: "Client",
        lines: [
          fullName,
          `Téléphone : ${order.phone}`,
          `WhatsApp : ${whatsappUrl(phoneDigits)}`,
          ...(order.email ? [`E-mail : ${order.email}`] : []),
        ],
      },
      {
        title: "Livraison",
        lines: [city, order.address, ...(order.note ? [`Note : ${order.note}`] : [])],
      },
    ],
    footer: [`Langue de la commande : ${order.locale.toUpperCase()}`],
  });
  return {
    subject: `Nouvelle commande ${order.number} · ${formatMoney(order.total)}`,
    ...content,
  };
}

async function customerEmail(order: OrderWithItems, city: string) {
  const t = await getTranslations({ locale: order.locale, namespace: "email" });
  const content = renderEmail({
    lang: order.locale,
    dir: getDirection(order.locale),
    heading: t("heading"),
    paragraphs: [
      t("greeting", { name: order.firstName }),
      t("intro", { number: order.number }),
      t("callNote"),
    ],
    itemsTitle: t("itemsTitle"),
    items: order.items.map((item) => ({
      name: item.productName,
      detail: `${t("color")} : ${item.colorName} · ${t("size")} : ${item.sizeLabel}`,
      quantity: item.quantity,
      price: formatMoney(item.unitPrice * item.quantity),
    })),
    totals: [
      { label: t("subtotal"), value: formatMoney(order.subtotal) },
      {
        label: t("shipping"),
        value: order.shippingFee === 0 ? t("shippingFree") : formatMoney(order.shippingFee),
      },
      { label: t("total"), value: formatMoney(order.total), strong: true },
    ],
    blocks: [
      {
        title: t("deliveryTitle"),
        lines: [`${order.firstName} ${order.lastName}`, order.address, city, order.phone],
      },
      { title: t("paymentTitle"), lines: [t("paymentText")] },
    ],
    cta: { label: t("viewOrder"), href: orderUrl(order) },
    footer: [t("help", { whatsapp: whatsappUrl(siteConfig.whatsapp.number) }), siteConfig.name],
  });
  return { subject: t("subject", { number: order.number }), ...content };
}

/**
 * Sends the admin notification and, when the customer gave an email, the
 * confirmation in the order locale. Never throws: failures are only logged.
 */
export async function sendOrderEmails(orderId: string): Promise<void> {
  try {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { items: { orderBy: { createdAt: "asc" } } },
    });
    if (!order) return;
    const settings = await db.settings.findUnique({ where: { id: "singleton" } });

    const jobs: { label: string; run: () => Promise<boolean> }[] = [];

    if (settings?.adminNotifyEmail) {
      const to = settings.adminNotifyEmail;
      jobs.push({
        label: "admin notification",
        run: async () =>
          sendMail({ to, ...adminEmail(order, await cityDisplayName(order.city, "fr")) }),
      });
    }
    if (order.email) {
      const to = order.email;
      jobs.push({
        label: "customer confirmation",
        run: async () =>
          sendMail({
            to,
            ...(await customerEmail(order, await cityDisplayName(order.city, order.locale))),
          }),
      });
    }

    // Independent sends: one failing must not block the other.
    await Promise.all(
      jobs.map(async (job) => {
        try {
          await job.run();
        } catch (error) {
          console.error(`Order ${order.number}: ${job.label} email failed`, error);
        }
      }),
    );
  } catch (error) {
    console.error(`Order emails failed for order ${orderId}`, error);
  }
}
