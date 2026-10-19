"use server";

import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { fail, fieldErrorsOf, formToObject, success, textOf, type FormState } from "@/lib/admin/form";
import { redirectWithNotice, revalidateAdmin } from "@/lib/admin/revalidate";
import { requireAdmin } from "@/lib/admin/session";

const MIN_PASSWORD_LENGTH = 10;

const password = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Minimum ${MIN_PASSWORD_LENGTH} caractères`)
  .max(200, "200 caractères maximum");

const createSchema = z.object({
  name: z.string().trim().min(1, "Nom obligatoire").max(100),
  email: z.string().trim().toLowerCase().pipe(z.email("Adresse e-mail invalide").max(254)),
  password,
});

export async function createAdmin(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = createSchema.safeParse({ name: "", email: "", password: "", ...formToObject(formData) });
  if (!parsed.success) return fail("Corrigez les champs en erreur.", fieldErrorsOf(parsed.error));
  const { name, email, password: plain } = parsed.data;
  try {
    await db.adminUser.create({ data: { name, email, passwordHash: await bcrypt.hash(plain, 10) } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return fail("Un administrateur avec cet e-mail existe déjà.", { email: "Déjà utilisé" });
    }
    throw error;
  }
  revalidateAdmin("/admin/admins");
  return success(`Administrateur ${email} créé.`);
}

const resetSchema = z.object({ id: z.string().min(1).max(64), password });

/** Set a new password (JWT sessions already open stay valid until they expire). */
export async function resetAdminPassword(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = resetSchema.safeParse({ id: textOf(formData, "id"), password: textOf(formData, "password") });
  if (!parsed.success) return fail("Mot de passe invalide.", fieldErrorsOf(parsed.error));
  const target = await db.adminUser.findUnique({ where: { id: parsed.data.id }, select: { id: true, email: true } });
  if (!target) return fail("Administrateur introuvable.");
  await db.adminUser.update({
    where: { id: target.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.password, 10) },
  });
  return success(`Mot de passe de ${target.email} réinitialisé.`);
}

/** Admins cannot delete themselves (and the last admin can never be deleted). */
export async function deleteAdmin(formData: FormData): Promise<void> {
  const me = await requireAdmin();
  const id = textOf(formData, "id");
  if (id === me.id) {
    redirectWithNotice("/admin/admins", { error: "Vous ne pouvez pas supprimer votre propre compte." });
  }
  if ((await db.adminUser.count()) <= 1) {
    redirectWithNotice("/admin/admins", { error: "Impossible de supprimer le dernier administrateur." });
  }
  await db.adminUser.deleteMany({ where: { id } });
  revalidateAdmin("/admin/admins");
  redirectWithNotice("/admin/admins", { notice: "Administrateur supprimé." });
}
