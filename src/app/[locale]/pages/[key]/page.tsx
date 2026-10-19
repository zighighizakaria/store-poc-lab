import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Breadcrumb } from "@/components/store/Breadcrumb";
import { db } from "@/lib/db";
import { getTranslation } from "@/lib/i18n";
import { decodeParam, pagePath, samePathForAllLocales } from "@/lib/routes";
import { alternatesFor } from "@/lib/seo";
import { routing } from "@/i18n/routing";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string; key: string }> };

const loadPage = (key: string) =>
  db.page.findUnique({ where: { key: decodeParam(key) }, include: { translations: true } });

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, key } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const page = await loadPage(key);
  if (!page) return {};
  return {
    title: getTranslation(page, locale).title,
    alternates: alternatesFor(locale, samePathForAllLocales(pagePath(page.key))),
  };
}

// Generic static page (About, shipping, returns, terms, privacy, contact):
// the admin-editable Page record, rendered as paragraphs.
export default async function StaticPage({ params }: Props) {
  const { locale, key } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const page = await loadPage(key);
  if (!page) notFound();
  const text = getTranslation(page, locale);

  return (
    <div className="mx-auto max-w-narrow px-16 pt-12">
      <Breadcrumb items={[{ label: text.title }]} />
      <article className="mt-16 rounded-card bg-surface p-24 shadow-sm md:p-48">
        <h1 className="text-display-sm font-semibold tracking-tight md:text-display">
          {text.title}
        </h1>
        <div className="mt-24 flex flex-col gap-16 text-body-lg text-muted">
          {text.body
            .split(/\n{2,}/)
            .filter(Boolean)
            .map((paragraph, i) => (
              <p key={i} className="whitespace-pre-line">
                {paragraph}
              </p>
            ))}
        </div>
      </article>
    </div>
  );
}
