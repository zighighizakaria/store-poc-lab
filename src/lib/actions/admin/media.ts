"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { fail, fileOf, success, textOf, type FormState } from "@/lib/admin/form";
import { redirectWithNotice, revalidateAdmin, revalidateStorefront } from "@/lib/admin/revalidate";
import { requireAdmin } from "@/lib/admin/session";
import {
  ALT_LOCALES,
  cardSelect,
  createMediaAsset,
  deleteMediaAsset,
  replaceMediaFile,
  searchWhere,
  setMediaAlt,
  toMediaCard,
  UNUSED_WHERE,
  type MediaCard,
} from "@/lib/media/library";

// Media library actions. Client components (picker, uploader, detail panel) call
// the ones returning plain objects; the form actions follow the AdminForm pattern.

export type MediaActionResult = { ok: true; card: MediaCard } | { ok: false; error: string };

const refresh = () => {
  revalidateAdmin("/admin/media");
  revalidateStorefront();
};

async function cardOf(id: string): Promise<MediaCard> {
  return toMediaCard(await db.mediaAsset.findUniqueOrThrow({ where: { id }, select: cardSelect }));
}

/** One file per request (the client uploads a batch one file at a time). */
export async function uploadMedia(formData: FormData): Promise<MediaActionResult> {
  const admin = await requireAdmin();
  const file = fileOf(formData, "file");
  if (!file) return { ok: false, error: "Aucun fichier reçu." };
  const created = await createMediaAsset(file, { uploadedById: admin.id });
  if (!created.ok) return { ok: false, error: `${file.name} : ${created.error}` };
  revalidateAdmin("/admin/media");
  return { ok: true, card: await cardOf(created.value.id) };
}

export async function replaceMedia(formData: FormData): Promise<MediaActionResult> {
  await requireAdmin();
  const file = fileOf(formData, "file");
  if (!file) return { ok: false, error: "Aucun fichier reçu." };
  const replaced = await replaceMediaFile(textOf(formData, "id"), file);
  if (!replaced.ok) return { ok: false, error: replaced.error };
  refresh();
  return { ok: true, card: await cardOf(replaced.value.id) };
}

const PAGE_SIZE = 40;
const listSchema = z.object({
  q: z.string().trim().max(100).default(""),
  unused: z.boolean().default(false),
  cursor: z.string().max(64).optional(),
});

/** Newest first, `PAGE_SIZE` per call; pass the returned cursor to load more. */
export async function listMedia(input: z.input<typeof listSchema>) {
  await requireAdmin();
  const { q, unused, cursor } = listSchema.parse(input);
  const rows = await db.mediaAsset.findMany({
    where: { ...searchWhere(q), ...(unused ? UNUSED_WHERE : {}) },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: cardSelect,
  });
  const page = rows.slice(0, PAGE_SIZE);
  return {
    items: page.map(toMediaCard),
    nextCursor: rows.length > PAGE_SIZE ? page[page.length - 1].id : null,
  };
}

const altSchema = z.string().trim().max(200, "200 caractères maximum");

/** Translated alt text of an asset (FR first, AR/EN optional). */
export async function saveMediaAlt(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = textOf(formData, "id");
  if (!(await db.mediaAsset.findUnique({ where: { id }, select: { id: true } }))) return fail("Média introuvable.");

  const alt = { fr: "", ar: "", en: "" };
  const errors: Record<string, string> = {};
  for (const locale of ALT_LOCALES) {
    const parsed = altSchema.safeParse(textOf(formData, `alt_${locale}`));
    if (parsed.success) alt[locale] = parsed.data;
    else errors[`alt_${locale}`] = parsed.error.issues[0].message;
  }
  if (Object.keys(errors).length > 0) return fail("Corrigez les champs en erreur.", errors);

  await setMediaAlt(id, alt);
  refresh();
  return success("Texte alternatif enregistré.");
}

/** Delete only when unused. */
export async function deleteMedia(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = textOf(formData, "id");
  const result = await deleteMediaAsset(id);
  if (!result.ok) redirectWithNotice(`/admin/media?asset=${encodeURIComponent(id)}`, { error: result.error });
  refresh();
  redirectWithNotice("/admin/media", { notice: "Média supprimé." });
}
