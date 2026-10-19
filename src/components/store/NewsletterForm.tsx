"use client";

import { useActionState, useId } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { subscribeNewsletter, type NewsletterState } from "@/lib/actions/newsletter";
import { cn } from "@/lib/cn";

const initialState: NewsletterState = { status: "idle" };

export function NewsletterForm() {
  const t = useTranslations("home.newsletter");
  const locale = useLocale();
  const id = useId();
  const [state, action, pending] = useActionState(subscribeNewsletter, initialState);

  const message =
    state.status === "success"
      ? t("success")
      : state.status === "invalid"
        ? t("invalid")
        : state.status === "error"
          ? t("error")
          : null;

  return (
    <form action={action} noValidate className="flex w-full max-w-modal flex-col gap-8">
      <input type="hidden" name="locale" value={locale} />
      <label htmlFor={id} className="sr-only">
        {t("emailLabel")}
      </label>
      <div className="flex flex-col gap-8 sm:flex-row">
        <Input
          id={id}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          dir="ltr"
          placeholder={t("placeholder")}
          aria-invalid={state.status === "invalid" || undefined}
          aria-describedby={message ? `${id}-message` : undefined}
          required
          className="text-start"
        />
        <Button type="submit" variant="accent" size="md" loading={pending} className="sm:shrink-0">
          {t("subscribe")}
        </Button>
      </div>
      <p
        id={`${id}-message`}
        role={state.status === "idle" ? undefined : "status"}
        aria-live="polite"
        className={cn(
          "min-h-20 text-body-sm",
          state.status === "success" ? "text-success" : "text-error",
        )}
      >
        {message}
      </p>
    </form>
  );
}
