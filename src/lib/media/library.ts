import type { Locale, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { removeStoredFile } from "@/lib/storage";
import { checkImageFile } from "@/lib/storage/image";
import { processAndStore, type StoredMedia } from "./pipeline";
import { mediaUrl } from "./url";

// Media library logic (DB + storage). Callers (server actions) check the admin session first.

export const ALT_LOCALES = ["fr", "ar", "en"] as const satisfies readonly Locale[];
export type AltTexts = Record<(typeof ALT_LOCALES)[number], string>;

export type MediaResult<T> = { ok: true; value: T } | { ok: false; error: string };

export type MediaMeta = {
  uploadedById?: string | null;
  sourceUrl?: string | null;
  author?: string | null;
  license?: string | null;
};

/** Validate (size + magic bytes), run the pipeline, return what to store. French errors (admin UI). */
async function prepare(file: File): Promise<MediaResult<StoredMedia>> {
  const check = await checkImageFile(file);
  if (!check.ok) return check;
  try {
    return { ok: true, value: await processAndStore(check.bytes) };
  } catch {
    return { ok: false, error: "Image illisible ou corrompue." };
  }
}

const fileFields = ({ storageKey, mime, size, width, height }: StoredMedia) => ({
  storageKey,
  mime,
  size,
  width,
  height,
});

const cleanName = (name: string) => name.replace(/^.*[\\/]/, "").slice(0, 200) || "image";

export async function createMediaAsset(file: File, meta: MediaMeta = {}) {
  const prepared = await prepare(file);
  if (!prepared.ok) return prepared;
  const asset = await db.mediaAsset.create({
    data: {
      ...fileFields(prepared.value),
      originalName: cleanName(file.name),
      sourceUrl: meta.sourceUrl ?? null,
      author: meta.author ?? null,
      license: meta.license ?? null,
      uploadedById: meta.uploadedById ?? null,
    },
  });
  return { ok: true as const, value: asset };
}

/** Past orders keep the image URL as a snapshot: a file an order still shows is not deleted from disk. */
async function removeFileUnlessOrdered(storageKey: string): Promise<void> {
  if (await db.orderItem.count({ where: { image: mediaUrl(storageKey) } })) return;
  await removeStoredFile(storageKey);
}

/** New file for an existing asset: same id (every usage follows), new storage key (caches refresh), old file removed. */
export async function replaceMediaFile(id: string, file: File) {
  const existing = await db.mediaAsset.findUnique({ where: { id }, select: { storageKey: true } });
  if (!existing) return { ok: false as const, error: "Média introuvable." };
  const prepared = await prepare(file);
  if (!prepared.ok) return prepared;
  // Compare-and-swap on the old key: a concurrent replace or delete wins cleanly.
  const updated = await db.mediaAsset.updateMany({
    where: { id, storageKey: existing.storageKey },
    data: { ...fileFields(prepared.value), originalName: cleanName(file.name) },
  });
  if (updated.count === 0) {
    await removeStoredFile(prepared.value.storageKey);
    return { ok: false as const, error: "Le média a été modifié entre-temps. Réessayez." };
  }
  const asset = await db.mediaAsset.findUniqueOrThrow({ where: { id } });
  await removeFileUnlessOrdered(existing.storageKey);
  return { ok: true as const, value: asset };
}

/** `_count` selection: how many records use an asset, per place. */
export const usageCountSelect = {
  _count: {
    select: { productImages: true, bannersDesktop: true, bannersMobile: true, collections: true, categories: true },
  },
} satisfies Prisma.MediaAssetSelect;

/** Total number of places using an asset, from a `usageCountSelect` result. */
export function usageTotal(asset: { _count: Record<string, number> }): number {
  return Object.values(asset._count).reduce((sum, n) => sum + n, 0);
}

/** Where-clause for assets used nowhere. */
export const UNUSED_WHERE = {
  productImages: { none: {} },
  bannersDesktop: { none: {} },
  bannersMobile: { none: {} },
  collections: { none: {} },
  categories: { none: {} },
} satisfies Prisma.MediaAssetWhereInput;

/** Delete an asset and its file, only when nothing uses it. */
export async function deleteMediaAsset(id: string): Promise<MediaResult<null>> {
  const asset = await db.mediaAsset.findUnique({ where: { id }, select: { storageKey: true, ...usageCountSelect } });
  if (!asset) return { ok: false, error: "Média introuvable." };
  const used = usageTotal(asset);
  if (used > 0) return { ok: false, error: `Ce média est utilisé à ${used} endroit(s) : retirez-le d'abord.` };
  try {
    await db.mediaAsset.delete({ where: { id } });
  } catch {
    // The foreign keys are RESTRICT: a usage added since the check blocks the delete.
    return { ok: false, error: "Ce média vient d'être utilisé ailleurs : suppression annulée." };
  }
  await removeFileUnlessOrdered(asset.storageKey);
  return { ok: true, value: null };
}

export type MediaUsage = { kind: string; label: string; href: string };

const frName = { translations: { where: { locale: "fr" as const } } };

/** Where an asset is used, with an admin link for each place. */
export async function getMediaUsage(id: string): Promise<MediaUsage[]> {
  const asset = await db.mediaAsset.findUnique({
    where: { id },
    select: {
      productImages: { select: { product: { select: { id: true, ...frName } } } },
      bannersDesktop: { select: { id: true, ...frName } },
      bannersMobile: { select: { id: true, ...frName } },
      collections: { select: { id: true, ...frName } },
      categories: { select: { id: true, ...frName } },
    },
  });
  if (!asset) return [];
  const label = (row: { translations: { name?: string; title?: string }[] }) =>
    row.translations[0]?.name ?? row.translations[0]?.title ?? "Sans titre";
  const products = new Map(asset.productImages.map(({ product }) => [product.id, label(product)]));

  return [
    ...[...products].map(([pid, name]) => ({ kind: "Produit", label: name, href: `/admin/products/${pid}` })),
    ...asset.bannersDesktop.map((b) => ({ kind: "Bannière (desktop)", label: label(b), href: `/admin/banners/${b.id}` })),
    ...asset.bannersMobile.map((b) => ({ kind: "Bannière (mobile)", label: label(b), href: `/admin/banners/${b.id}` })),
    ...asset.collections.map((c) => ({ kind: "Collection", label: label(c), href: `/admin/collections/${c.id}` })),
    ...asset.categories.map((c) => ({ kind: "Catégorie", label: label(c), href: `/admin/categories/${c.id}` })),
  ];
}

/** Set the translated alt texts; an empty text removes that locale. */
export async function setMediaAlt(id: string, alt: AltTexts): Promise<void> {
  await db.$transaction(
    ALT_LOCALES.map((locale) =>
      alt[locale]
        ? db.mediaAssetTranslation.upsert({
            where: { mediaAssetId_locale: { mediaAssetId: id, locale } },
            update: { alt: alt[locale] },
            create: { mediaAssetId: id, locale, alt: alt[locale] },
          })
        : db.mediaAssetTranslation.deleteMany({ where: { mediaAssetId: id, locale } }),
    ),
  );
}

/** Search clause: file name or any alt text. */
export function searchWhere(q: string): Prisma.MediaAssetWhereInput {
  return q
    ? {
        OR: [
          { originalName: { contains: q, mode: "insensitive" } },
          { translations: { some: { alt: { contains: q, mode: "insensitive" } } } },
        ],
      }
    : {};
}

export const cardSelect = {
  id: true,
  storageKey: true,
  originalName: true,
  width: true,
  height: true,
  translations: true,
  ...usageCountSelect,
} satisfies Prisma.MediaAssetSelect;

/** Light shape sent to client components (picker, library grid). */
export type MediaCard = {
  id: string;
  url: string;
  name: string;
  alt: string;
  width: number | null;
  height: number | null;
  uses: number;
};

export function toMediaCard(asset: Prisma.MediaAssetGetPayload<{ select: typeof cardSelect }>): MediaCard {
  return {
    id: asset.id,
    url: mediaUrl(asset.storageKey),
    name: asset.originalName,
    alt: asset.translations.find((t) => t.locale === "fr")?.alt ?? "",
    width: asset.width,
    height: asset.height,
    uses: usageTotal(asset),
  };
}

export async function mediaAssetExists(id: string): Promise<boolean> {
  return !!(await db.mediaAsset.findUnique({ where: { id }, select: { id: true } }));
}
