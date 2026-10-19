import path from "node:path";

export class UnsafePathError extends Error {
  constructor(reason: string) {
    super(`Unsafe storage path: ${reason}`);
    this.name = "UnsafePathError";
  }
}

/** Extensions the app ever writes (see image.ts) and therefore ever serves. */
export const SERVED_EXTENSIONS: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

/**
 * Resolve `segments` (already URL-decoded) under `root`, or throw
 * UnsafePathError. Rejects empty segments, "." and "..", separators, drive
 * letters / alternate streams (":"), NUL bytes, unknown extensions, and
 * anything that would resolve outside `root`.
 */
export function resolveSafePath(root: string, segments: string[]): string {
  if (segments.length === 0) throw new UnsafePathError("empty path");
  for (const segment of segments) {
    if (!segment || segment === "." || segment === "..") {
      throw new UnsafePathError(`bad segment "${segment}"`);
    }
    if (/[\\/:\0]/.test(segment)) throw new UnsafePathError("forbidden character");
  }
  const extension = path.extname(segments[segments.length - 1]).toLowerCase();
  if (!(extension in SERVED_EXTENSIONS)) throw new UnsafePathError("extension not allowed");

  const base = path.resolve(root);
  const resolved = path.resolve(base, ...segments);
  if (resolved !== base && !resolved.startsWith(base + path.sep)) {
    throw new UnsafePathError("outside the storage root");
  }
  return resolved;
}
