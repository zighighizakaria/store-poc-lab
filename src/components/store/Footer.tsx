import { getLocale, getTranslations } from "next-intl/server";
import { Banknote } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { categoryHref, categoryText, getCategoryIndex } from "@/lib/catalog";
import { pagePath } from "@/lib/routes";
import { siteConfig } from "../../../site.config";

const HELP_PAGES = [
  { key: "about", label: "about" },
  { key: "contact", label: "contact" },
  { key: "shipping", label: "shipping" },
  { key: "returns", label: "returns" },
  { key: "terms", label: "terms" },
  { key: "privacy", label: "privacy" },
] as const;

const SOCIALS = [
  { name: "Instagram", href: siteConfig.social.instagram },
  { name: "Facebook", href: siteConfig.social.facebook },
  { name: "TikTok", href: siteConfig.social.tiktok },
];

export async function Footer() {
  const locale = await getLocale();
  const t = await getTranslations("footer");
  const tHeader = await getTranslations("header");
  const index = await getCategoryIndex();

  const link =
    "inline-flex min-h-44 items-center rounded-pill text-body text-footer-muted hover:text-on-footer hover:underline";

  return (
    <footer className="mt-64 bg-footer text-on-footer">
      <div className="mx-auto grid max-w-page gap-32 px-16 py-48 md:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-12">
          <p className="text-title font-semibold tracking-tight">{siteConfig.name}</p>
          <p className="text-body text-footer-muted">{t("tagline")}</p>
          <p className="inline-flex items-center gap-8 text-body text-footer-muted">
            <Banknote aria-hidden="true" strokeWidth={1.5} className="size-20 shrink-0" />
            {t("payment")}
          </p>
        </div>

        <nav aria-label={t("shop")}>
          <h2 className="mb-8 text-body-lg font-semibold">{t("shop")}</h2>
          <ul>
            <li>
              <Link href="/nouveautes" className={link}>
                {tHeader("new")}
              </Link>
            </li>
            {index.roots.map((root) => (
              <li key={root.id}>
                <Link href={categoryHref(root, locale)} className={link}>
                  {categoryText(root, locale).name}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/soldes" className={link}>
                {tHeader("sale")}
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-label={t("help")}>
          <h2 className="mb-8 text-body-lg font-semibold">{t("help")}</h2>
          <ul>
            {HELP_PAGES.map(({ key, label }) => (
              <li key={key}>
                <Link href={pagePath(key)} className={link}>
                  {t(label)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="mb-8 text-body-lg font-semibold">{t("contactUs")}</h2>
          <ul>
            <li>
              <a href={`tel:${siteConfig.contact.phone.replace(/\s/g, "")}`} dir="ltr" className={link}>
                {siteConfig.contact.phone}
              </a>
            </li>
            <li>
              <a href={`mailto:${siteConfig.contact.email}`} dir="ltr" className={link}>
                {siteConfig.contact.email}
              </a>
            </li>
          </ul>
          <h2 className="mt-16 mb-8 text-body-lg font-semibold">{t("followUs")}</h2>
          <ul className="flex flex-wrap gap-x-16">
            {SOCIALS.map((social) => (
              <li key={social.name}>
                <a
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={link}
                >
                  {social.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-footer-line">
        <p className="mx-auto max-w-page px-16 py-20 text-body-sm text-footer-muted">
          {t("copyright", { year: String(new Date().getFullYear()), brand: siteConfig.name })}
        </p>
      </div>
    </footer>
  );
}
