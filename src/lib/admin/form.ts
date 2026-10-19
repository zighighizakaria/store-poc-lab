import type { z } from "zod";

// Shared helpers for admin forms and server actions.

export type FormState = {
  ok?: boolean;
  message?: string;
  /** Field name -> French error message. */
  fieldErrors?: Record<string, string>;
};

export const fail = (message: string, fieldErrors?: Record<string, string>): FormState => ({
  ok: false,
  message,
  fieldErrors,
});

export const success = (message: string): FormState => ({ ok: true, message });

/** First error per field (path joined with "."). */
export function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.map(String).join(".") : "form";
    errors[key] ??= issue.message;
  }
  return errors;
}

/** FormData -> plain object. Repeated names become arrays, files are kept as is. */
export function formToObject(formData: FormData): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of new Set(formData.keys())) {
    const all = formData.getAll(key);
    result[key] = all.length > 1 ? all : all[0];
  }
  return result;
}

export const textOf = (formData: FormData, name: string): string => {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
};

/** A non-empty uploaded file, or null (an empty file input still submits a 0-byte File). */
export function fileOf(formData: FormData, name: string): File | null {
  const value = formData.get(name);
  return value instanceof File && value.size > 0 ? value : null;
}

/**
 * "199", "199.5", "199,50" (MAD) -> centimes, without floating point.
 * Returns null when the text is not a valid amount (max 2 decimals).
 */
export function parseMad(input: string): number | null {
  const text = input.trim().replace(/\s/g, "").replace(",", ".");
  const match = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(text);
  if (!match) return null;
  return Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0") || 0);
}

/** Centimes -> text for a MAD input: 19900 -> "199", 19950 -> "199.50". */
export function madInput(centimes: number | null | undefined): string {
  if (centimes === null || centimes === undefined) return "";
  const whole = Math.floor(centimes / 100);
  const cents = centimes % 100;
  return cents === 0 ? String(whole) : `${whole}.${String(cents).padStart(2, "0")}`;
}

/** Date -> value of <input type="datetime-local"> (server local time, same zone the action parses it in). */
export function dateTimeInput(date: Date | null | undefined): string {
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
