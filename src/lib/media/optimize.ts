import sharp from "sharp";

/** Longest side, in pixels, of a stored image. Larger uploads are scaled down. */
export const MAX_IMAGE_SIDE = 2400;
const WEBP_QUALITY = 82;

export type OptimizedImage = {
  body: Buffer;
  mime: "image/webp";
  width: number;
  height: number;
  size: number;
};

/**
 * The upload pipeline: apply the EXIF orientation, drop all metadata (EXIF,
 * GPS, ICC), cap the longest side at 2400 px (never upscale) and encode WebP.
 * Throws when the bytes cannot be decoded as an image.
 */
export async function optimizeImage(input: Buffer): Promise<OptimizedImage> {
  const { data, info } = await sharp(input, { limitInputPixels: 100_000_000 })
    .rotate() // sharp strips every other piece of metadata by default
    .resize({ width: MAX_IMAGE_SIDE, height: MAX_IMAGE_SIDE, fit: "inside", withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer({ resolveWithObject: true });
  return { body: data, mime: "image/webp", width: info.width, height: info.height, size: data.length };
}
