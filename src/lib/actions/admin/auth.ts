"use server";

import { headers } from "next/headers";
import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn, signOut } from "@/lib/auth";
import { fail, textOf, type FormState } from "@/lib/admin/form";
import {
  checkLoginRateLimit,
  clearLoginFailures,
  loginKey,
  recordLoginFailure,
} from "@/lib/admin/rate-limit";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Adresse e-mail invalide")),
  password: z.string().min(1, "Mot de passe requis").max(200),
});

/** Only same-site /admin paths are valid redirect targets. */
function safeNext(value: string): string {
  return value.startsWith("/admin") && !value.startsWith("//") && !value.includes("\\")
    ? value
    : "/admin";
}

export async function loginAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: textOf(formData, "email"),
    password: textOf(formData, "password"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return fail("Vérifiez les champs.", fieldErrors);
  }

  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const key = loginKey(ip, parsed.data.email);
  const limit = checkLoginRateLimit(key);
  if (!limit.allowed) {
    const minutes = Math.ceil(limit.retryAfterSeconds / 60);
    return fail(`Trop de tentatives. Réessayez dans ${minutes} minute${minutes > 1 ? "s" : ""}.`);
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: safeNext(textOf(formData, "next")),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      recordLoginFailure(key);
      return fail("E-mail ou mot de passe incorrect.");
    }
    // Successful sign-in redirects (NEXT_REDIRECT): let Next handle it.
    clearLoginFailures(key);
    throw error;
  }
  return fail("Connexion impossible.");
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/admin/login" });
}
