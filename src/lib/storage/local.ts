import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { resolveSafePath } from "./path";
import type { PutInput, PutResult, Storage } from "./types";

/** Writes under a root directory (default `uploads/`, outside public/). Served by /media/[...path]. */
export class LocalStorage implements Storage {
  constructor(private readonly root: string) {}

  private fileOf(key: string): string {
    return resolveSafePath(this.root, key.split("/"));
  }

  async put({ key, body }: PutInput): Promise<PutResult> {
    const file = this.fileOf(key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body);
    return { key, url: this.publicUrl(key) };
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(this.fileOf(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  publicUrl(key: string): string {
    return `/media/${key.split("/").map(encodeURIComponent).join("/")}`;
  }
}
