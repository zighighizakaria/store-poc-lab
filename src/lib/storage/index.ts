import path from "node:path";
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

/** Delete a stored file by key. Ignores external URL keys (demo placeholders) and failures. */
export async function removeStoredFile(storageKey: string): Promise<void> {
  if (/^https?:\/\//.test(storageKey)) return;
  try {
    await getStorage().delete(storageKey);
  } catch (error) {
    console.error("Could not delete stored file", storageKey, error);
  }
}
