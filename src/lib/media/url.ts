import { getStorage } from "@/lib/storage";

/**
 * Public URL of a media asset's file. Assets migrated from external URLs
 * (demo placeholders) keep the absolute URL as their storage key.
 */
export function mediaUrl(storageKey: string): string {
  return /^https?:\/\//.test(storageKey) ? storageKey : getStorage().publicUrl(storageKey);
}

/** URL of an optional asset relation (`null` when the record has no image). */
export function mediaAssetUrl(asset: { storageKey: string } | null | undefined): string | null {
  return asset ? mediaUrl(asset.storageKey) : null;
}

/** `{ id, url }` of an optional asset, for the admin MediaField. */
export function mediaValue(asset: { id: string; storageKey: string } | null | undefined) {
  return asset ? { id: asset.id, url: mediaUrl(asset.storageKey) } : null;
}
