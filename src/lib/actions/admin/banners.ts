"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { fail, fileOf, formToObject, success, textOf, type FormState } from "@/lib/admin/form";
import { redirectWithNotice, revalidateAdmin, revalidateStorefront } from "@/lib/admin/revalidate";
import { requireAdmin } from "@/lib/admin/session";
import { ADMIN_LOCALES, readLocaleFields } from "@/lib/admin/translations";
import { removeStoredImage, storeImage } from "@/lib/storage";

const refresh = (id?: string) => {
  revalidateAdmin("/admin/banners", ...(id ? [`/admin/banners/${id}`] : []));
  revalidateStorefront();
};

const linkSchema = z
  .string()
  .trim()
  .max(300, "300 caractères maximum")
  .refine((v) => v === "" || /^\/(?!\/)/.test(v) || /^https?:\/\//.test(v), "Lien relatif (/fr/soldes) ou https://…");

/** Create or update a home banner: desktop/mobile images, link, active flag, translated texts. */
export async function saveBanner(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = textOf(formData, "id") || null;
  const isActive = formData.get("isActive") === "on";

  const existing = id ? await db.banner.findUnique({ where: { id } }) : null;
  if (id && !existing) return fail("Bannière introuvable.");

  const errors: Record<string, string> = {};
  const link = linkSchema.safeParse(textOf(formData, "link"));
  if (!link.success) errors.link = link.error.issues[0].message;

  const fields = readLocaleFields(formToObject(formData), ["title", "subtitle", "ctaLabel"] as const);
  if (!fields.fr.title) errors.title_fr = "Le titre français est obligatoire";
  for (const locale of ADMIN_LOCALES) {
    const f = fields[locale];
    if (f.title.length > 120) errors[`title_${locale}`] = "120 caractères maximum";
    if (f.subtitle.length > 300) errors[`subtitle_${locale}`] = "300 caractères maximum";
    if (f.ctaLabel.length > 40) errors[`ctaLabel_${locale}`] = "40 caractères maximum";
  }

  const desktopFile = fileOf(formData, "imageDesktop");
  const mobileFile = fileOf(formData, "imageMobile");
  if (!existing && !desktopFile) errors.imageDesktop = "L'image desktop est obligatoire";
  if (Object.keys(errors).length > 0) return fail("Corrigez les champs en erreur.", errors);

  let desktop: string | undefined;
  let mobile: string | null | undefined;
  if (desktopFile) {
    const stored = await storeImage(desktopFile, "banners");
    if (!stored.ok) return fail("Image refusée.", { imageDesktop: stored.error });
    desktop = stored.url;
  }
  if (mobileFile) {
    const stored = await storeImage(mobileFile, "banners");
    if (!stored.ok) {
      await removeStoredImage(desktop);
      return fail("Image refusée.", { imageMobile: stored.error });
    }
    mobile = stored.url;
  } else if (formData.get("removeImageMobile") === "on") {
    mobile = null;
  }

  const rows = ADMIN_LOCALES.flatMap((locale) => {
    const f = fields[locale];
    return f.title
      ? [{ locale, title: f.title, subtitle: f.subtitle || null, ctaLabel: f.ctaLabel || null }]
      : [];
  });
  const linkValue = link.data || null;

  const savedId = await db.$transaction(async (tx) => {
    if (!existing) {
      const last = await tx.banner.aggregate({ _max: { position: true } });
      const created = await tx.banner.create({
        data: {
          imageDesktop: desktop as string,
          imageMobile: mobile ?? null,
          link: linkValue,
          isActive,
          position: (last._max.position ?? -1) + 1,
          translations: { create: rows },
        },
        select: { id: true },
      });
      return created.id;
    }
    await tx.banner.update({
      where: { id: existing.id },
      data: {
        link: linkValue,
        isActive,
        ...(desktop === undefined ? {} : { imageDesktop: desktop }),
        ...(mobile === undefined ? {} : { imageMobile: mobile }),
      },
    });
    for (const locale of ADMIN_LOCALES) {
      const row = rows.find((r) => r.locale === locale);
      if (row) {
        const data = { title: row.title, subtitle: row.subtitle, ctaLabel: row.ctaLabel };
        await tx.bannerTranslation.upsert({
          where: { bannerId_locale: { bannerId: existing.id, locale } },
          update: data,
          create: { bannerId: existing.id, locale, ...data },
        });
      } else {
        await tx.bannerTranslation.deleteMany({ where: { bannerId: existing.id, locale } });
      }
    }
    return existing.id;
  });

  if (existing) {
    if (desktop && existing.imageDesktop !== desktop) await removeStoredImage(existing.imageDesktop);
    if (mobile !== undefined && existing.imageMobile && existing.imageMobile !== mobile) {
      await removeStoredImage(existing.imageMobile);
    }
  }
  refresh(savedId);
  if (!existing) redirectWithNotice(`/admin/banners/${savedId}`, { notice: "Bannière créée." });
  return success("Bannière enregistrée.");
}

export async function moveBanner(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = textOf(formData, "id");
  const direction = textOf(formData, "direction") === "up" ? "up" : "down";
  const siblings = await db.banner.findMany({
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  const from = siblings.findIndex((s) => s.id === id);
  const to = direction === "up" ? from - 1 : from + 1;
  if (from >= 0 && to >= 0 && to < siblings.length) {
    [siblings[from], siblings[to]] = [siblings[to], siblings[from]];
    await db.$transaction(
      siblings.map((s, position) => db.banner.update({ where: { id: s.id }, data: { position } })),
    );
    refresh();
  }
  redirectWithNotice("/admin/banners", { notice: "Ordre mis à jour." });
}

export async function toggleBannerActive(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = textOf(formData, "id");
  const banner = await db.banner.findUnique({ where: { id }, select: { isActive: true } });
  if (!banner) redirectWithNotice("/admin/banners", { error: "Bannière introuvable." });
  await db.banner.update({ where: { id }, data: { isActive: !banner.isActive } });
  refresh(id);
  redirectWithNotice("/admin/banners", { notice: banner.isActive ? "Bannière désactivée." : "Bannière activée." });
}

/** Banners are plain content: hard delete (with their files). */
export async function deleteBanner(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = textOf(formData, "id");
  const banner = await db.banner.findUnique({ where: { id } });
  if (!banner) redirectWithNotice("/admin/banners", { error: "Bannière introuvable." });
  await db.banner.delete({ where: { id } });
  await removeStoredImage(banner.imageDesktop);
  await removeStoredImage(banner.imageMobile);
  refresh();
  redirectWithNotice("/admin/banners", { notice: "Bannière supprimée." });
}
