export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type ImageKind = {
  mime: "image/jpeg" | "image/png" | "image/webp";
  ext: ".jpg" | ".png" | ".webp";
};

/** Detect the real image type from the first bytes (never from the file name). */
export function detectImageType(bytes: Uint8Array): ImageKind | null {
  const startsWith = (...sig: number[]) => sig.every((byte, i) => bytes[i] === byte);
  if (startsWith(0xff, 0xd8, 0xff)) return { mime: "image/jpeg", ext: ".jpg" };
  if (startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) {
    return { mime: "image/png", ext: ".png" };
  }
  // WebP: "RIFF" <size> "WEBP"
  if (
    startsWith(0x52, 0x49, 0x46, 0x46) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { mime: "image/webp", ext: ".webp" };
  }
  return null;
}

export type ImageCheck =
  | { ok: true; bytes: Buffer; kind: ImageKind }
  | { ok: false; error: string };

/** Size + magic-byte validation of an uploaded file. French messages (admin UI). */
export async function checkImageFile(file: File): Promise<ImageCheck> {
  if (file.size === 0) return { ok: false, error: "Fichier vide." };
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: "Image trop lourde (5 Mo maximum)." };
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const kind = detectImageType(bytes);
  if (!kind) return { ok: false, error: "Format non accepté (JPEG, PNG ou WebP uniquement)." };
  return { ok: true, bytes, kind };
}
