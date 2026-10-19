"use client";

import {
  useActionState,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Banknote, ChevronDown, ShoppingBag, Truck } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { Link } from "@/i18n/navigation";
import {
  placeOrder,
  type CheckoutValues,
  type PlaceOrderState,
} from "@/lib/actions/checkout";
import type { CartResponse } from "@/lib/cart-types";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";
import { computeShipping } from "@/lib/shipping";
import { useCart, type CartItem } from "./CartProvider";

export type CheckoutCity = { id: string; name: string; shippingFee: number | null };

type Props = {
  /** Server-generated: the same key can never create two orders. */
  idempotencyKey: string;
  cities: CheckoutCity[];
};

const initialState: PlaceOrderState = { status: "idle" };
const emptyValues: CheckoutValues = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  cityId: "",
  address: "",
  note: "",
};
const FIELD_ERROR_CODES = new Set([
  "required",
  "phone",
  "email",
  "addressShort",
  "tooLong",
  "invalid",
]);

type LineNote = { kind: "adjusted"; quantity: number } | { kind: "unavailable" };

// True once hydrated: the cart lives in localStorage, so before that the
// server render must not show an "empty cart" flash.
const subscribeNothing = () => () => {};
const useHydrated = () =>
  useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );

// Checkout form + order summary. Lines come from the server (/api/cart): the
// client only holds variant ids and quantities. The server action recomputes
// every price again, so what is shown here is informational.
export function CheckoutForm({ idempotencyKey, cities }: Props) {
  const t = useTranslations("checkout");
  const locale = useLocale();
  const id = useId();
  const hydrated = useHydrated();
  const { items, open: openCart, setQuantity, remove } = useCart();
  const [state, formAction, pending] = useActionState(placeOrder, initialState);

  const [data, setData] = useState<CartResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [notes, setNotes] = useState<Record<string, LineNote>>({});
  const [dropped, setDropped] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [cityId, setCityId] = useState("");
  const [summaryOpen, setSummaryOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const itemsKey = JSON.stringify(items);

  // Re-read prices and stock on load and whenever the cart changes. Quantities
  // above stock are lowered and the line gets a note.
  useEffect(() => {
    if (!hydrated) return;
    const current = JSON.parse(itemsKey) as CartItem[];
    if (current.length === 0) {
      setData(null);
      return;
    }
    const controller = new AbortController();
    (async () => {
      try {
        const response = await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale, items: current }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("cart request failed");
        const next = (await response.json()) as CartResponse;
        setData(next);
        setFailed(false);

        const known = new Map(next.lines.map((line) => [line.variantId, line]));
        const nextNotes: Record<string, LineNote> = {};
        let removedAny = false;
        for (const item of current) {
          const line = known.get(item.variantId);
          if (!line) {
            remove(item.variantId);
            removedAny = true;
          } else if (!line.available) {
            nextNotes[item.variantId] = { kind: "unavailable" };
          } else if (line.quantity < item.quantity) {
            nextNotes[item.variantId] = { kind: "adjusted", quantity: line.quantity };
            setQuantity(item.variantId, line.quantity);
          }
        }
        if (Object.keys(nextNotes).length > 0) setNotes((prev) => ({ ...prev, ...nextNotes }));
        if (removedAny) setDropped(true);
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      }
    })();
    return () => controller.abort();
  }, [hydrated, itemsKey, locale, refresh, remove, setQuantity]);

  // Server refused for stock: lower the quantities it reported, then re-read.
  useEffect(() => {
    if (state.status !== "error" || state.code !== "stock" || !state.stockIssues) return;
    for (const issue of state.stockIssues) {
      if (issue.available > 0) setQuantity(issue.variantId, issue.available);
    }
    setRefresh((n) => n + 1);
    setSummaryOpen(true); // the per-line stock messages live in the summary
  }, [state, setQuantity]);

  // Move focus to the first invalid field after a failed submit.
  useEffect(() => {
    if (state.status === "error" && state.code === "invalid") {
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    }
  }, [state]);

  const issueById = useMemo(
    () =>
      new Map(
        state.status === "error" && state.stockIssues
          ? state.stockIssues.map((issue) => [issue.variantId, issue.available] as const)
          : [],
      ),
    [state],
  );

  const rows = useMemo(() => {
    const byVariant = new Map((data?.lines ?? []).map((line) => [line.variantId, line]));
    return items.flatMap((item) => {
      const line = byVariant.get(item.variantId);
      return line ? [{ item, line }] : [];
    });
  }, [items, data]);

  const orderable = rows
    .filter(({ line }) => line.available)
    .map(({ item, line }) => ({
      variantId: line.variantId,
      quantity: Math.min(item.quantity, line.stock),
    }));
  const subtotal = rows.reduce(
    (sum, { item, line }) =>
      line.available ? sum + line.unitPrice * Math.min(item.quantity, line.stock) : sum,
    0,
  );
  const city = cities.find((c) => c.id === cityId);
  const shipping = data
    ? computeShipping(subtotal, {
        shippingFee: data.shippingFee,
        freeShippingThreshold: data.freeShippingThreshold,
        cityShippingFee: city?.shippingFee ?? null,
      })
    : 0;
  const total = subtotal + shipping;
  const remainingForFree = data ? Math.max(0, data.freeShippingThreshold - subtotal) : 0;
  const itemCount = orderable.reduce((sum, line) => sum + line.quantity, 0);

  const values = state.status === "error" ? state.values : emptyValues;
  const fieldErrors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const fieldError = (name: string): string | undefined => {
    const code = fieldErrors[name];
    if (!code) return undefined;
    return t(`errors.${FIELD_ERROR_CODES.has(code) ? code : "invalid"}` as "errors.invalid");
  };

  const formError =
    state.status === "error"
      ? t(
          `errors.${state.code === "invalid" ? "form" : state.code}` as "errors.form",
        )
      : null;
  const cartChanged = dropped || Object.keys(notes).length > 0;

  // ---------------------------------------------------------------- states

  if (!hydrated) {
    return (
      <div className="grid gap-24 lg:grid-cols-3" aria-hidden="true">
        <div className="flex flex-col gap-24 lg:col-span-2">
          <Skeleton className="h-[320px] rounded-card" />
          <Skeleton className="h-[240px] rounded-card" />
        </div>
        <Skeleton className="h-[240px] rounded-card" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-narrow flex-col items-center gap-16 py-48 text-center">
        <ShoppingBag aria-hidden="true" strokeWidth={1.5} className="size-48 text-muted" />
        <h2 className="text-title font-semibold tracking-tight">{t("emptyTitle")}</h2>
        <p className="text-body-lg text-muted">{t("emptyText")}</p>
        <ButtonLink href="/" variant="primary" size="lg">
          {t("continueShopping")}
        </ButtonLink>
      </div>
    );
  }

  const summary = (
    <aside className="order-first lg:order-none lg:col-span-1">
      <Card className="p-20 sm:p-24">
        <button
          type="button"
          onClick={() => setSummaryOpen((open) => !open)}
          aria-expanded={summaryOpen}
          aria-controls={`${id}-summary`}
          className="flex min-h-44 w-full items-center justify-between gap-12 text-start lg:hidden"
        >
          <span className="inline-flex items-center gap-8 text-body-lg font-medium">
            <ShoppingBag aria-hidden="true" strokeWidth={1.5} className="size-20 shrink-0" />
            {summaryOpen ? t("hideSummary") : t("showSummary")}
            <ChevronDown
              aria-hidden="true"
              strokeWidth={1.5}
              className={cn("size-16 transition-transform duration-fast", summaryOpen && "rotate-180")}
            />
          </span>
          <span dir="ltr" className="shrink-0 whitespace-nowrap text-body-lg font-semibold">
            {data ? formatMoney(total) : ""}
          </span>
        </button>

        <div
          id={`${id}-summary`}
          className={cn("mt-16 flex-col gap-16 lg:mt-0 lg:flex", summaryOpen ? "flex" : "hidden")}
        >
          <div className="hidden items-baseline justify-between gap-12 lg:flex">
            <h2 className="text-title font-semibold tracking-tight">{t("summaryTitle")}</h2>
            <span className="text-body text-muted">{t("itemCount", { count: itemCount })}</span>
          </div>

          {failed && !data ? (
            <p role="alert" className="text-body text-error">
              {t("loadError")}
            </p>
          ) : null}

          {data === null && !failed ? (
            <ul className="flex flex-col gap-16" aria-hidden="true">
              {items.map((item) => (
                <li key={item.variantId} className="flex gap-12">
                  <Skeleton className="h-[72px] w-[56px] shrink-0" />
                  <div className="flex flex-1 flex-col gap-8">
                    <Skeleton className="h-16 w-3/4" />
                    <Skeleton className="h-16 w-1/2" />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {rows.map(({ item, line }) => {
                const issue = issueById.get(line.variantId);
                const note = notes[line.variantId];
                const message =
                  issue !== undefined
                    ? issue > 0
                      ? t("stockLeft", { count: issue })
                      : t("stockGone")
                    : note?.kind === "adjusted"
                      ? t("adjusted", { count: note.quantity })
                      : !line.available
                        ? t("unavailable")
                        : null;
                const quantity = Math.min(item.quantity, line.stock);
                return (
                  <li key={line.variantId} className="flex gap-12 py-12 first:pt-0 last:pb-0">
                    <Link
                      href={line.href}
                      className="relative block h-[72px] w-[56px] shrink-0 overflow-hidden rounded-image bg-canvas"
                    >
                      {line.image ? (
                        <Image
                          src={line.image}
                          alt={line.name}
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      ) : null}
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col gap-4">
                      <p className="text-body font-medium">{line.name}</p>
                      <p className="text-body-sm text-muted">
                        {line.colorName} · <span dir="ltr">{line.sizeLabel}</span>
                      </p>
                      <div className="flex items-baseline justify-between gap-12">
                        <span className="text-body-sm text-muted">
                          {t("quantityShort", { count: line.available ? quantity : 0 })}
                        </span>
                        {line.available ? (
                          <span dir="ltr" className="text-body font-semibold">
                            {formatMoney(line.unitPrice * quantity)}
                          </span>
                        ) : null}
                      </div>
                      {message ? (
                        <p role="alert" className="text-body-sm font-medium text-error">
                          {message}
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {data ? (
            <>
              {remainingForFree > 0 ? (
                <p className="flex items-center gap-8 rounded-image bg-canvas p-12 text-body-sm">
                  <Truck aria-hidden="true" strokeWidth={1.5} className="size-20 shrink-0" />
                  {t("freeShippingHint", { amount: formatMoney(data.freeShippingThreshold) })}
                </p>
              ) : null}
              <dl className="flex flex-col gap-8 border-t border-line pt-16">
                <div className="flex justify-between gap-12 text-body">
                  <dt className="text-muted">{t("subtotal")}</dt>
                  <dd dir="ltr">{formatMoney(subtotal)}</dd>
                </div>
                <div className="flex justify-between gap-12 text-body">
                  <dt className="text-muted">{t("shipping")}</dt>
                  <dd dir="ltr" className={shipping === 0 ? "font-medium text-success" : undefined}>
                    {shipping === 0 ? t("shippingFree") : formatMoney(shipping)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-12 border-t border-line pt-12">
                  <dt className="text-body-lg font-semibold">{t("total")}</dt>
                  <dd dir="ltr" className="text-title font-semibold">
                    {formatMoney(total)}
                  </dd>
                </div>
              </dl>
            </>
          ) : null}

          <Button variant="secondary" size="sm" onClick={openCart} className="self-start">
            {t("editCart")}
          </Button>
        </div>
      </Card>
    </aside>
  );

  return (
    <form
      ref={formRef}
      action={formAction}
      noValidate
      className="grid gap-24 lg:grid-cols-3 lg:items-start"
    >
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="items" value={JSON.stringify(orderable)} />

      {summary}

      <div className="flex flex-col gap-24 lg:col-span-2">
        {formError ? (
          <p role="alert" className="rounded-image bg-error-wash p-16 text-body font-medium text-error">
            {formError}
          </p>
        ) : null}
        {cartChanged ? (
          <p role="status" className="rounded-image bg-info-wash p-16 text-body font-medium text-info">
            {t("cartUpdated")}
          </p>
        ) : null}

        <Card className="p-20 sm:p-24">
          <div role="group" aria-labelledby={`${id}-contact`} className="flex flex-col gap-16">
            <h2 id={`${id}-contact`} className="text-title font-semibold tracking-tight">
              {t("contactTitle")}
            </h2>
            <div className="grid gap-16 sm:grid-cols-2">
              <Field label={t("firstName")} htmlFor={`${id}-firstName`} error={fieldError("firstName")}>
                <Input
                  id={`${id}-firstName`}
                  name="firstName"
                  autoComplete="given-name"
                  required
                  maxLength={60}
                  defaultValue={values.firstName}
                  aria-invalid={fieldErrors.firstName ? true : undefined}
                />
              </Field>
              <Field label={t("lastName")} htmlFor={`${id}-lastName`} error={fieldError("lastName")}>
                <Input
                  id={`${id}-lastName`}
                  name="lastName"
                  autoComplete="family-name"
                  required
                  maxLength={60}
                  defaultValue={values.lastName}
                  aria-invalid={fieldErrors.lastName ? true : undefined}
                />
              </Field>
            </div>
            <Field
              label={t("phone")}
              htmlFor={`${id}-phone`}
              error={fieldError("phone")}
              help={t("phoneHelp")}
            >
              <Input
                id={`${id}-phone`}
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                dir="ltr"
                required
                placeholder={t("phonePlaceholder")}
                defaultValue={values.phone}
                aria-invalid={fieldErrors.phone ? true : undefined}
                className="text-start"
              />
            </Field>
            <Field
              label={t("email")}
              htmlFor={`${id}-email`}
              error={fieldError("email")}
              help={t("emailHelp")}
            >
              <Input
                id={`${id}-email`}
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                dir="ltr"
                maxLength={254}
                defaultValue={values.email}
                aria-invalid={fieldErrors.email ? true : undefined}
                className="text-start"
              />
            </Field>
          </div>
        </Card>

        <Card className="p-20 sm:p-24">
          <div role="group" aria-labelledby={`${id}-delivery`} className="flex flex-col gap-16">
            <h2 id={`${id}-delivery`} className="text-title font-semibold tracking-tight">
              {t("deliveryTitle")}
            </h2>
            <Field label={t("city")} htmlFor={`${id}-city`} error={fieldError("cityId")}>
              <Select
                id={`${id}-city`}
                name="cityId"
                required
                autoComplete="address-level2"
                value={cityId}
                onChange={(event) => setCityId(event.target.value)}
                aria-invalid={fieldErrors.cityId ? true : undefined}
              >
                <option value="">{t("cityPlaceholder")}</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label={t("address")}
              htmlFor={`${id}-address`}
              error={fieldError("address")}
              help={t("addressHelp")}
            >
              <Input
                id={`${id}-address`}
                name="address"
                autoComplete="street-address"
                required
                maxLength={200}
                defaultValue={values.address}
                aria-invalid={fieldErrors.address ? true : undefined}
              />
            </Field>
            <Field
              label={t("note")}
              htmlFor={`${id}-note`}
              error={fieldError("note")}
              help={t("noteHelp")}
            >
              <Textarea
                id={`${id}-note`}
                name="note"
                rows={3}
                maxLength={500}
                defaultValue={values.note}
                aria-invalid={fieldErrors.note ? true : undefined}
              />
            </Field>
          </div>
        </Card>

        <Card className="p-20 sm:p-24">
          <fieldset className="flex flex-col gap-16">
            <legend className="mb-16 text-title font-semibold tracking-tight">
              {t("paymentTitle")}
            </legend>
            {/* Cash on delivery is the only method in v1: one selected, fixed option. */}
            <label className="flex items-start gap-12 rounded-image border-2 border-ink p-16">
              <input
                type="radio"
                name="paymentMethod"
                value="COD"
                checked
                readOnly
                className="mt-4 size-20 shrink-0 accent-accent"
              />
              <span className="flex flex-col gap-4">
                <span className="inline-flex items-center gap-8 text-body-lg font-medium">
                  <Banknote aria-hidden="true" strokeWidth={1.5} className="size-20 shrink-0" />
                  {t("codTitle")}
                </span>
                <span className="text-body text-muted">{t("codText")}</span>
              </span>
            </label>
          </fieldset>
        </Card>

        <div className="flex flex-col gap-12">
          <div className="flex items-baseline justify-between gap-12 lg:hidden">
            <span className="text-body-lg font-semibold">{t("total")}</span>
            <span dir="ltr" className="text-title font-semibold">
              {data ? formatMoney(total) : ""}
            </span>
          </div>
          <Button
            type="submit"
            variant="accent"
            size="lg"
            fullWidth
            loading={pending}
            disabled={!data || orderable.length === 0}
          >
            {t("submit")}
          </Button>
        </div>
      </div>
    </form>
  );
}
