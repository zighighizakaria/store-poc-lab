"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { revalidateAdmin, revalidateStorefront } from "@/lib/admin/revalidate";
import { requireAdmin } from "@/lib/admin/session";

// Called from the ImageManager (client). Images are picked from the media
// library (MediaPicker); a product image is a link to a MediaAsset plus a color
// and a position. Results are plain objects: { ok } or { ok: false, error }.
export type ImageActionResult = { ok: true } | { ok: false; error: string };

const MAX_IMAGES_PER_PRODUCT = 20;

const refresh = (productId: string) => {
  revalidateAdmin(`/admin/products/${productId}`, "/admin/products", "/admin/media");
  revalidateStorefront();
};

const idsSchema = z.array(z.string().min(1).max(64)).min(1).max(MAX_IMAGES_PER_PRODUCT);

/** Add library assets to a product, at the end of its gallery. */
export async function addProductImages(productId: string, mediaAssetIds: string[]): Promise<ImageActionResult> {
  await requireAdmin();
  const parsed = idsSchema.safeParse(mediaAssetIds);
  if (!parsed.success) return { ok: false, error: "Aucune image sélectionnée." };

  const product = await db.product.findUnique({
    where: { id: productId },
    select: { id: true, _count: { select: { images: true } } },
  });
  if (!product) return { ok: false, error: "Produit introuvable." };
  if (product._count.images + parsed.data.length > MAX_IMAGES_PER_PRODUCT) {
    return { ok: false, error: `${MAX_IMAGES_PER_PRODUCT} images maximum par produit.` };
  }
  const assets = await db.mediaAsset.findMany({ where: { id: { in: parsed.data } }, select: { id: true } });
  if (assets.length !== new Set(parsed.data).size) return { ok: false, error: "Média introuvable." };

  const last = await db.productImage.aggregate({ where: { productId }, _max: { position: true } });
  const start = (last._max.position ?? -1) + 1;
  await db.productImage.createMany({
    data: [...new Set(parsed.data)].map((mediaAssetId, i) => ({ productId, mediaAssetId, position: start + i })),
  });
  refresh(productId);
  return { ok: true };
}

/** Point a product image (keeping its position and color) at another library asset. */
export async function swapProductImage(imageId: string, mediaAssetId: string): Promise<ImageActionResult> {
  await requireAdmin();
  const image = await db.productImage.findUnique({ where: { id: imageId }, select: { productId: true } });
  if (!image) return { ok: false, error: "Image introuvable." };
  if (!(await db.mediaAsset.findUnique({ where: { id: mediaAssetId }, select: { id: true } }))) {
    return { ok: false, error: "Média introuvable." };
  }
  await db.productImage.update({ where: { id: imageId }, data: { mediaAssetId } });
  refresh(image.productId);
  return { ok: true };
}

/** Remove the image from the product. The file stays in the media library. */
export async function deleteProductImage(imageId: string): Promise<ImageActionResult> {
  await requireAdmin();
  const image = await db.productImage.findUnique({ where: { id: imageId } });
  if (!image) return { ok: false, error: "Image introuvable." };
  await db.productImage.delete({ where: { id: imageId } });
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

/** Assign the image to a color (for swatch switching). */
export async function setProductImageColor(imageId: string, colorId: string | null): Promise<ImageActionResult> {
  await requireAdmin();
  const image = await db.productImage.findUnique({ where: { id: imageId } });
  if (!image) return { ok: false, error: "Image introuvable." };
  if (colorId && !(await db.color.findUnique({ where: { id: colorId }, select: { id: true } }))) {
    return { ok: false, error: "Couleur introuvable." };
  }
  await db.productImage.update({ where: { id: imageId }, data: { colorId: colorId || null } });
  refresh(image.productId);
  return { ok: true };
}
