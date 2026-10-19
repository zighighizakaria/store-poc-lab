import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { categoryHref, categoryText, getCategoryIndex } from "@/lib/catalog";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { pagePath } from "@/lib/routes";
import { siteConfig } from "../../../site.config";
import { CartButton } from "./CartButton";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MainNav, type NavItem } from "./MainNav";
import { MobileMenu } from "./MobileMenu";
import { SearchBox } from "./SearchBox";

export async function Header() {
  const locale = await getLocale();
  const tLang = await getTranslations("languages");
  const t = await getTranslations("header");
  const tTheme = await getTranslations("theme");
  const index = await getCategoryIndex();

  const languages = routing.locales.map((code) => ({ code, label: tLang(code) }));

  // Nouveautés · [root categories from the DB] · Soldes · À propos
  const items: NavItem[] = [
    { key: "new", label: t("new"), href: "/nouveautes" },
    ...index.roots.map((root) => ({
      key: `cat-${root.id}`,
      label: categoryText(root, locale).name,
      href: categoryHref(root, locale),
      children: root.children.map((child) => ({
        key: child.id,
        label: categoryText(child, locale).name,
        href: categoryHref(child, locale),
      })),
    })),
    { key: "sale", label: t("sale"), href: "/soldes" },
    { key: "about", label: t("about"), href: pagePath("about") },
  ];

  const switcher = (
    <LanguageSwitcher label={t("language")} current={locale} languages={languages} />
  );

  const themeToggle = (
    <ThemeToggle
      labels={{
        group: tTheme("group"),
        light: tTheme("light"),
        dark: tTheme("dark"),
        system: tTheme("system"),
      }}
    />
  );

  return (
    <header className="sticky top-0 z-40 bg-surface shadow-sm">
      <div className="mx-auto flex max-w-page flex-wrap items-center gap-x-12 px-16">
        <div className="order-1 flex min-h-64 items-center gap-8 lg:me-12">
          <MobileMenu
            items={items}
            footer={
              <div className="flex flex-wrap items-center justify-between gap-12">
                {switcher}
                {themeToggle}
              </div>
            }
          />
          <Link
            href="/"
            className="rounded-pill text-title font-semibold tracking-tight text-ink"
          >
            {siteConfig.name}
          </Link>
        </div>

        <div className="order-3 w-full basis-full pb-12 lg:order-2 lg:w-auto lg:flex-1 lg:basis-0 lg:pb-0">
          <SearchBox className="lg:mx-auto lg:max-w-modal" />
        </div>

        <div className="order-2 ms-auto flex items-center gap-4 lg:order-3 lg:ms-12">
          <div className="hidden items-center gap-4 lg:flex">
            {switcher}
            {themeToggle}
          </div>
          <CartButton />
        </div>
      </div>

      <div className="hidden border-t border-line lg:block">
        <MainNav items={items} label={t("mainNav")} viewAll={t("viewAll")} />
      </div>
    </header>
  );
}
