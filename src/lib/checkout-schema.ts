import { z } from "zod";
import { normalizeMoroccanPhone } from "@/lib/phone";
import { routing } from "@/i18n/routing";

// Server-side validation of the checkout form. Error messages are stable codes
// (checkout.errors.<code> in messages/*.json), not user-facing text.

const requiredText = (max: number) =>
  z.string().trim().min(1, "required").max(max, "tooLong");

export const checkoutSchema = z.object({
  idempotencyKey: z.string().min(16, "invalid").max(64, "invalid"),
  locale: z.enum(routing.locales),
  firstName: requiredText(60),
  lastName: requiredText(60),
  phone: z
    .string()
    .trim()
    .min(1, "required")
    .refine((value) => normalizeMoroccanPhone(value) !== null, "phone")
    .transform((value) => normalizeMoroccanPhone(value) as string),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, "tooLong")
    .refine((value) => value === "" || z.email().safeParse(value).success, "email")
    .transform((value) => (value === "" ? null : value)),
  cityId: z.string().trim().min(1, "required").max(64, "invalid"),
  address: z.string().trim().min(1, "required").min(5, "addressShort").max(200, "tooLong"),
  note: z
    .string()
    .trim()
    .max(500, "tooLong")
    .transform((value) => (value === "" ? null : value)),
});

export const orderItemsSchema = z
  .array(
    z.object({
      variantId: z.string().min(1).max(64),
      quantity: z.number().int().min(1).max(99),
    }),
  )
  .min(1)
  .max(50);

export type CheckoutInput = z.output<typeof checkoutSchema>;
export type OrderItemInput = z.output<typeof orderItemsSchema>[number];
