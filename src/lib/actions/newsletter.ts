"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { routing } from "@/i18n/routing";

export type NewsletterState = { status: "idle" | "success" | "invalid" | "error" };

const schema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  locale: z.enum(routing.locales),
});

export async function subscribeNewsletter(
  _previous: NewsletterState,
  formData: FormData,
): Promise<NewsletterState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    locale: formData.get("locale"),
  });
  if (!parsed.success) return { status: "invalid" };

  try {
    // Subscribing twice is not an error: keep the first row.
    await db.newsletterSubscriber.upsert({
      where: { email: parsed.data.email },
      update: {},
      create: { email: parsed.data.email, locale: parsed.data.locale },
    });
    return { status: "success" };
  } catch (error) {
    console.error("Newsletter subscription failed", error);
    return { status: "error" };
  }
}
