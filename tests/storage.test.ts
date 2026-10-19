import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { checkImageFile, detectImageType, MAX_IMAGE_BYTES } from "@/lib/storage/image";
import { LocalStorage } from "@/lib/storage/local";
import { resolveSafePath, UnsafePathError } from "@/lib/storage/path";

const ROOT = path.resolve(tmpdir(), "store-uploads-root");

describe("resolveSafePath", () => {
  it("resolves a normal key under the root", () => {
    expect(resolveSafePath(ROOT, ["products", "abc", "photo.png"])).toBe(
      path.join(ROOT, "products", "abc", "photo.png"),
    );
  });

  it("rejects traversal in every form", () => {
    const attempts: string[][] = [
      ["..", "secret.png"],
      ["products", "..", "..", "x.png"],
      ["..%2f.env"], // not decoded here: no allowed extension, and kept as one odd segment
      ["a/../../b.png"],
      ["a\\..\\b.png"],
      ["."],
      [""],
      [],
      ["C:", "windows", "x.png"],
      ["file.png\0.exe"],
      ["/etc/passwd"],
    ];
    for (const segments of attempts) {
      expect(() => resolveSafePath(ROOT, segments), JSON.stringify(segments)).toThrow(UnsafePathError);
    }
  });

  it("only serves image extensions", () => {
    for (const name of [".env", "config.json", "run.sh", "noextension", "shell.php", "a.png.exe"]) {
      expect(() => resolveSafePath(ROOT, ["x", name]), name).toThrow(UnsafePathError);
    }
    expect(resolveSafePath(ROOT, ["x", "A.JPG"])).toBe(path.join(ROOT, "x", "A.JPG"));
  });
});

const PNG = Buffer.from("89504e470d0a1a0a0000000d49484452", "hex");
const JPEG = Buffer.from("ffd8ffe000104a464946", "hex");
const WEBP = Buffer.concat([Buffer.from("RIFF"), Buffer.from([0x10, 0, 0, 0]), Buffer.from("WEBPVP8 ")]);

describe("image validation (magic bytes)", () => {
  it("detects the real type from content", () => {
    expect(detectImageType(PNG)?.mime).toBe("image/png");
    expect(detectImageType(JPEG)?.mime).toBe("image/jpeg");
    expect(detectImageType(WEBP)?.mime).toBe("image/webp");
    expect(detectImageType(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>"))).toBeNull();
    expect(detectImageType(Buffer.from("GIF89a"))).toBeNull();
  });

  it("ignores the file name and declared type", async () => {
    const fake = new File([Buffer.from("<?php echo 1;")], "shell.png", { type: "image/png" });
    const result = await checkImageFile(fake);
    expect(result.ok).toBe(false);

    const real = new File([PNG], "weird-name.txt", { type: "text/plain" });
    const ok = await checkImageFile(real);
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.kind.ext).toBe(".png");
  });

  it("rejects empty and oversized files", async () => {
    expect((await checkImageFile(new File([], "a.png"))).ok).toBe(false);
    const big = new File([Buffer.concat([PNG, Buffer.alloc(MAX_IMAGE_BYTES)])], "big.png");
    const result = await checkImageFile(big);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/5 Mo/);
  });
});

describe("LocalStorage", () => {
  let root: string | undefined;
  afterAll(async () => {
    if (root) await rm(root, { recursive: true, force: true });
  });

  it("writes, builds a /media url, and deletes", async () => {
    root = await mkdtemp(path.join(tmpdir(), "store-storage-"));
    const storage = new LocalStorage(root);
    const { url } = await storage.put({ key: "products/p1/a.png", body: PNG, contentType: "image/png" });
    expect(url).toBe("/media/products/p1/a.png");
    expect((await readFile(path.join(root, "products", "p1", "a.png"))).equals(PNG)).toBe(true);
    await storage.delete("products/p1/a.png");
    await expect(readFile(path.join(root, "products", "p1", "a.png"))).rejects.toThrow();
    await storage.delete("products/p1/a.png"); // deleting twice is fine
  });

  it("refuses to write or delete outside its root", async () => {
    root ??= await mkdtemp(path.join(tmpdir(), "store-storage-"));
    const storage = new LocalStorage(root);
    await expect(storage.put({ key: "../escape.png", body: PNG, contentType: "image/png" })).rejects.toThrow(
      UnsafePathError,
    );
    await expect(storage.delete("../../etc/passwd.png")).rejects.toThrow(UnsafePathError);
  });
});
