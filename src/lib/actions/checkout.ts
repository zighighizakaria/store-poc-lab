"use server";

import { redirect } from "next/navigation";
import { checkoutSchema, orderItemsSchema } from "@/lib/checkout-schema";
import { sendOrderEmails } from "@/lib/order-emails";
import { createOrder, type StockIssue } from "@/lib/orders";

export type CheckoutValues = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  cityId: string;
  address: string;
  note: string;
};

export type PlaceOrderState =
  | { status: "idle" }
  | {
      status: "error";
      /** invalid = field errors, stock = per-line issues, empty/city/server = form-level message. */
      code: "invalid" | "stock" | "empty" | "city" | "server";
      /** Field name -> error code (checkout.errors.<code>). */
      fieldErrors?: Record<string, string>;
      stockIssues?: StockIssue[];
      /** Echo of the typed values: React resets the form after an action. */
      values: CheckoutValues;
    };

const text = (formData: FormData, name: string) => {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
};

/**
 * Checkout submit. Validates on the server, creates the order in one
 * transaction (stock decrement included), then sends the emails and redirects
 * to the confirmation page. Prices are always recomputed from the database:
 * the client only sends variant ids and quantities.
 */
export async function placeOrder(
  _previous: PlaceOrderState,
  formData: FormData,
): Promise<PlaceOrderState> {
  const values: CheckoutValues = {
    firstName: text(formData, "firstName"),
    lastName: text(formData, "lastName"),
    phone: text(formData, "phone"),
    email: text(formData, "email"),
    cityId: text(formData, "cityId"),
    address: text(formData, "address"),
    note: text(formData, "note"),
  };

  const parsed = checkoutSchema.safeParse({
    idempotencyKey: text(formData, "idempotencyKey"),
    locale: text(formData, "locale"),
    ...values,
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? "form");
      fieldErrors[field] ??= issue.message;
    }
    return { status: "error", code: "invalid", fieldErrors, values };
  }

  let itemsJson: unknown = null;
  try {
    itemsJson = JSON.parse(text(formData, "items"));
  } catch {
    // handled below as an empty cart
  }
  const items = orderItemsSchema.safeParse(itemsJson);
  if (!items.success) return { status: "error", code: "empty", values };

  const { idempotencyKey, locale, ...customer } = parsed.data;

  let result;
  try {
    result = await createOrder({ idempotencyKey, locale, customer, items: items.data });
  } catch (error) {
    console.error("placeOrder failed", error);
    return { status: "error", code: "server", values };
  }

  if (!result.ok) {
    if (result.reason === "stock") {
      return { status: "error", code: "stock", stockIssues: result.issues, values };
    }
    return { status: "error", code: result.reason, values };
  }

  // After commit. Never throws, a mail failure must not fail the order.
  if (!result.duplicate) await sendOrderEmails(result.order.id);

  redirect(
    `/${locale}/order/${encodeURIComponent(result.order.number)}?t=${result.order.accessToken}`,
  );
}
