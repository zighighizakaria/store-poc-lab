"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { fileOf, textOf } from "@/lib/admin/form";
import { revalidateAdmin, revalidateStorefront } from "@/lib/admin/revalidate";
import { requireAdmin } from "@/lib/admin/session";
import { removeStoredImage, storeImage } from "@/lib/storage";

// Called from the ImageManager (client) one file at a time. Results are plain
// objects: { ok } or { ok: false, error }.
export type ImageActionResult = { ok: true } | { ok: false; error: string };

const MAX_IMAGES_PER_PRODUCT = 20;

const refresh = (productId: string) => {
  revalidateAdmin(`/admin/products/${productId}`, "/admin/products");
  revalidateStorefront();
};

export async function uploadProductImage(formData: FormData): Promise<ImageActionResult> {
  await requireAdmin();
  const productId = textOf(formData, "productId");
  const file = fileOf(formData, "file");
  if (!file) return { ok: false, error: "Aucun fichier reçu." };

  const product = await db.product.findUnique({
    where: { id: productId },
    select: { id: true, _count: { select: { images: true } } },
  });
  if (!product) return { ok: false, error: "Produit introuvable." };
  if (product._count.images >= MAX_IMAGES_PER_PRODUCT) {
    return { ok: false, error: `${MAX_IMAGES_PER_PRODUCT} images maximum par produit.` };
  }

  const stored = await storeImage(file, `products/${productId}`);
  if (!stored.ok) return { ok: false, error: `${file.name} : ${stored.error}` };

  const last = await db.productImage.aggregate({ where: { productId }, _max: { position: true } });
  await db.productImage.create({
    data: { productId, url: stored.url, position: (last._max.position ?? -1) + 1 },
  });
  refresh(productId);
  return { ok: true };
}

export async function deleteProductImage(imageId: string): Promise<ImageActionResult> {
  await requireAdmin();
  const image = await db.productImage.findUnique({ where: { id: imageId } });
  if (!image) return { ok: false, error: "Image introuvable." };
  await db.productImage.delete({ where: { id: imageId } });
  // Order snapshots may still show this URL for a past order: keep the file
  // only when an order item references it.
  const referenced = await db.orderItem.count({ where: { image: image.url } });
  if (referenced === 0) await removeStoredImage(image.url);
  refresh(image.productId);
  return { ok: true };
}

export async function moveProductImage(
  imageId: string,
  direction: "up" | "down",
): Promise<ImageActionResult> {
  await requireAdmin();
  const image = await db.productImage.findUnique({ where: { id: imageId } });
  if (!image) return { ok: false, error: "Image introuvable." };

  const siblings = await db.productImage.findMany({
    where: { productId: image.productId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  const from = siblings.findIndex((s) => s.id === imageId);
  const to = direction === "up" ? from - 1 : from + 1;
  if (to < 0 || to >= siblings.length) return { ok: true };
  [siblings[from], siblings[to]] = [siblings[to], siblings[from]];

  await db.$transaction(
    siblings.map((s, position) => db.productImage.update({ where: { id: s.id }, data: { position } })),
  );
  refresh(image.productId);
  return { ok: true };
}

const detailsSchema = z.object({
  colorId: z.string().max(64).nullable(),
  alt: z.object({
    fr: z.string().trim().max(200),
    ar: z.string().trim().max(200),
    en: z.string().trim().max(200),
  }),
});

/** Assign the image to a color (for swatch switching) and set its optional translated alt text. */
export async function updateProductImage(
  imageId: string,
  details: z.input<typeof detailsSchema>,
): Promise<ImageActionResult> {
  await requireAdmin();
  const parsed = detailsSchema.safeParse(details);
  if (!parsed.success) return { ok: false, error: "Texte alternatif trop long (200 caractères)." };

  const image = await db.productImage.findUnique({ where: { id: imageId } });
  if (!image) return { ok: false, error: "Image introuvable." };

  const { colorId, alt } = parsed.data;
  if (colorId && !(await db.color.findUnique({ where: { id: colorId }, select: { id: true } }))) {
    return { ok: false, error: "Couleur introuvable." };
  }

  await db.$transaction(async (tx) => {
    await tx.productImage.update({ where: { id: imageId }, data: { colorId: colorId || null } });
    for (const locale of ["fr", "ar", "en"] as const) {
      const text = alt[locale];
      if (text) {
        await tx.productImageTranslation.upsert({
          where: { productImageId_locale: { productImageId: imageId, locale } },
          update: { alt: text },
          create: { productImageId: imageId, locale, alt: text },
        });
      } else {
        await tx.productImageTranslation.deleteMany({ where: { productImageId: imageId, locale } });
      }
    }
  });
  refresh(image.productId);
  return { ok: true };
}
