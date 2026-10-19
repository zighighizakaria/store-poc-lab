"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/cn";

type Suggestion = {
  id: string;
  name: string;
  href: string;
  image: string | null;
  price: number;
};

const MIN_CHARS = 2;
const DEBOUNCE_MS = 250;

// Kit search pill with an accent circular submit, plus live suggestions.
export function SearchBox({ className }: { className?: string }) {
  const t = useTranslations("header");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const baseId = useId();
  const listId = `${baseId}-list`;
  const rootRef = useRef<HTMLDivElement>(null);

  const [value, setValue] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const query = value.trim();
  const searchHref = `/search?q=${encodeURIComponent(query)}`;
  const optionCount = items.length + 1; // suggestions + "see all results"

  // Debounced fetch of the top suggestions in the current locale.
  useEffect(() => {
    if (query.length < MIN_CHARS) {
      setItems([]);
      setLoaded(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/search/suggest?${new URLSearchParams({ q: query, locale })}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("suggest failed");
        const data = (await response.json()) as { items: Suggestion[] };
        setItems(data.items);
        setActive(-1);
        setLoaded(true);
      } catch {
        if (!controller.signal.aborted) {
          setItems([]);
          setLoaded(true);
        }
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, locale]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const showList = open && query.length >= MIN_CHARS && loaded;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (query.length === 0) return;
    setOpen(false);
    const target = showList && active >= 0 && active < items.length ? items[active].href : searchHref;
    router.push(target);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      setActive(-1);
    } else if (event.key === "ArrowDown" && query.length >= MIN_CHARS) {
      event.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % optionCount);
    } else if (event.key === "ArrowUp" && showList) {
      event.preventDefault();
      setActive((i) => (i <= 0 ? optionCount - 1 : i - 1));
    }
  };

  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  };

  const optionId = (index: number) => `${baseId}-option-${index}`;

  return (
    <div ref={rootRef} className={cn("relative w-full", className)} onBlur={onBlur}>
      <form
        role="search"
        onSubmit={submit}
        className="flex min-h-48 items-center rounded-pill border border-input-border bg-surface py-4 ps-20 pe-4"
      >
        <label htmlFor={`${baseId}-input`} className="sr-only">
          {t("search")}
        </label>
        <input
          id={`${baseId}-input`}
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? optionId(active) : undefined}
          autoComplete="off"
          enterKeyHint="search"
          value={value}
          placeholder={t("searchPlaceholder")}
          onChange={(event) => {
            setValue(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="min-w-0 flex-1 bg-transparent text-body-lg text-ink outline-offset-8 placeholder:text-muted [&::-webkit-search-cancel-button]:appearance-none"
        />
        <button
          type="submit"
          aria-label={t("search")}
          className="inline-flex size-40 shrink-0 items-center justify-center rounded-pill bg-accent text-on-accent shadow-lg-2 hover:bg-accent-hover"
        >
          <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-20 rtl:-scale-x-100" />
        </button>
      </form>

      {showList ? (
        <div className="absolute inset-x-0 top-full z-50 mt-8 overflow-hidden rounded-card bg-surface p-8 shadow-lg">
          <ul id={listId} role="listbox" aria-label={t("suggestions")}>
            {items.map((item, index) => (
              <li
                key={item.id}
                id={optionId(index)}
                role="option"
                aria-selected={active === index}
              >
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-12 rounded-image p-8 hover:bg-canvas",
                    active === index && "bg-canvas",
                  )}
                >
                  <span className="relative block h-48 w-40 shrink-0 overflow-hidden rounded-xl bg-tile">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt=""
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-body font-medium text-ink">
                    {item.name}
                  </span>
                  <span dir="ltr" className="shrink-0 text-body font-semibold text-ink">
                    {formatMoney(item.price)}
                  </span>
                </Link>
              </li>
            ))}
            {items.length === 0 ? (
              <li role="presentation" className="px-12 py-8 text-body text-muted">
                {t("noSuggestions")}
              </li>
            ) : null}
            <li
              id={optionId(items.length)}
              role="option"
              aria-selected={active === items.length}
            >
              <Link
                href={searchHref}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex min-h-44 items-center justify-between gap-12 rounded-image px-12 text-body font-semibold text-ink hover:bg-canvas",
                  active === items.length && "bg-canvas",
                )}
              >
                {t("viewAllResults", { query })}
                <ArrowRight
                  aria-hidden="true"
                  strokeWidth={1.5}
                  className="size-16 shrink-0 rtl:-scale-x-100"
                />
              </Link>
            </li>
          </ul>
        </div>
      ) : null}
    </div>
  );
}
