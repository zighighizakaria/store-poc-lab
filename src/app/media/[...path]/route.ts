import { readFile } from "node:fs/promises";
import path from "node:path";
import { uploadsRoot } from "@/lib/storage";
import { resolveSafePath, SERVED_EXTENSIONS } from "@/lib/storage/path";

export const dynamic = "force-dynamic";

// Serves files written by LocalStorage. File names are random and never
// reused, so responses are cached for a year.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: raw } = await params;
  let file: string;
  try {
    // Decode defensively: a "..%2f" must not survive as a path separator.
    file = resolveSafePath(uploadsRoot(), raw.map((segment) => decodeURIComponent(segment)));
  } catch {
    return new Response("Not found", { status: 404 });
  }

  try {
    const body = await readFile(file);
    return new Response(new Uint8Array(body), {
      headers: {
        "Content-Type": SERVED_EXTENSIONS[path.extname(file).toLowerCase()],
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
