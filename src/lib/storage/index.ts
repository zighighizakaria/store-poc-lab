import path from "node:path";
import { randomBytes } from "node:crypto";
import { checkImageFile } from "./image";
import { LocalStorage } from "./local";
import type { Storage } from "./types";

export type { Storage } from "./types";

let instance: Storage | undefined;

export function uploadsRoot(): string {
  return path.resolve(process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads"));
}

/** The configured storage. Local disk (`uploads/`, or UPLOADS_DIR) for now. */
export function getStorage(): Storage {
  instance ??= new LocalStorage(uploadsRoot());
  return instance;
}

export type StoredImage = { ok: true; url: string } | { ok: false; error: string };

/** Validate (size + magic bytes) and store an uploaded image under `folder`. */
export async function storeImage(file: File, folder: string): Promise<StoredImage> {
  const check = await checkImageFile(file);
  if (!check.ok) return check;
  const key = `${folder}/${randomBytes(16).toString("hex")}${check.kind.ext}`;
  const { url } = await getStorage().put({ key, body: check.bytes, contentType: check.kind.mime });
  return { ok: true, url };
}

/** Delete the file behind a stored URL. Ignores external URLs (placeholders) and failures. */
export async function removeStoredImage(url: string | null | undefined): Promise<void> {
  if (!url?.startsWith("/media/")) return;
  try {
    const key = url.slice("/media/".length).split("/").map(decodeURIComponent).join("/");
    await getStorage().delete(key);
  } catch (error) {
    console.error("Could not delete stored image", url, error);
  }
}
