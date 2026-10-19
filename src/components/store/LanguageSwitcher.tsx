"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { useAlternates } from "./LocaleAlternates";

type Language = { code: "fr" | "ar" | "en"; label: string };

type Props = {
  label: string;
  current: string;
  languages: Language[];
  className?: string;
};

// Same page in another locale. next-intl's Link sets the NEXT_LOCALE cookie.
// Product / category / collection pages register translated paths through
// <SetAlternates>; the query string (filters, sort, page) is kept as is
// because it does not depend on the language.
function Switcher({
  label: navLabel,
  current,
  languages,
  query,
  className,
}: Props & { query: string }) {
  const pathname = usePathname();
  const alternates = useAlternates();

  return (
    <nav aria-label={navLabel} className={cn("flex items-center gap-4", className)}>
      {languages.map(({ code, label }) => {
        const active = code === current;
        const path = alternates?.[code] ?? pathname;
        return (
          <Link
            key={code}
            href={`${path}${query}`}
            locale={code}
            lang={code}
            hrefLang={code}
            aria-label={label}
            aria-current={active ? "true" : undefined}
            className={cn(
              "inline-flex min-h-44 min-w-44 items-center justify-center rounded-pill px-12 text-body font-semibold uppercase",
              active ? "bg-ink text-on-accent" : "text-ink hover:bg-canvas",
            )}
          >
            {code}
          </Link>
        );
      })}
    </nav>
  );
}

function WithQuery(props: Props) {
  const text = useSearchParams().toString();
  return <Switcher {...props} query={text ? `?${text}` : ""} />;
}

export function LanguageSwitcher(props: Props) {
  return (
    <Suspense fallback={<Switcher {...props} query="" />}>
      <WithQuery {...props} />
    </Suspense>
  );
}
