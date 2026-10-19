import { randomBytes } from "node:crypto";
import { getStorage } from "../storage";
import { optimizeImage, type OptimizedImage } from "./optimize";

export type StoredMedia = Omit<OptimizedImage, "body"> & { storageKey: string };

/**
 * Optimize raw image bytes and write the result under a fresh random key.
 * Every call yields a new key (also for a replaced file) so browser and CDN
 * caches never serve an old version. The original upload is not kept.
 */
export async function processAndStore(bytes: Buffer): Promise<StoredMedia> {
  const { body, ...info } = await optimizeImage(bytes);
  const storageKey = `library/${randomBytes(16).toString("hex")}.webp`;
  await getStorage().put({ key: storageKey, body, contentType: info.mime });
  return { storageKey, ...info };
}
