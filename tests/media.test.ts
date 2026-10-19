import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import {
  createMediaAsset,
  deleteMediaAsset,
  getMediaUsage,
  replaceMediaFile,
  UNUSED_WHERE,
  usageCountSelect,
  usageTotal,
} from "@/lib/media/library";
import { MAX_IMAGE_SIDE, optimizeImage } from "@/lib/media/optimize";
import { uploadsRoot } from "@/lib/storage";

// The upload pipeline needs no database; the library tests run against
// store_test (see vitest.config.ts) with files written to a temp directory.

let uploads: string;
beforeAll(async () => {
  uploads = await mkdtemp(path.join(tmpdir(), "store-media-"));
  process.env.UPLOADS_DIR = uploads;
});
afterAll(async () => {
  await rm(uploads, { recursive: true, force: true });
  await db.$disconnect();
});

/** A JPEG stored 3000x1500 with EXIF orientation 6 (= displayed 1500x3000), a description and a GPS position. */
function exifJpeg(width = 3000, height = 1500) {
  return sharp({ create: { width, height, channels: 3, background: "#c0392b" } })
    .withMetadata({
      orientation: 6,
      exif: {
        IFD0: { ImageDescription: "secret description" },
        IFD3: { GPSLatitudeRef: "N", GPSLatitude: "33/1 35/1 0/1", GPSLongitudeRef: "W", GPSLongitude: "7/1 36/1 0/1" },
      },
    })
    .jpeg()
    .toBuffer();
}

describe("optimizeImage", () => {
  it("converts to WebP, applies the EXIF orientation, strips EXIF/GPS and caps the longest side", async () => {
    const input = await exifJpeg();
    expect((await sharp(input).metadata()).exif).toBeDefined(); // the fixture really carries EXIF

    const out = await optimizeImage(input);
    const meta = await sharp(out.body).metadata();

    expect(meta.format).toBe("webp");
    expect(out.mime).toBe("image/webp");
    expect(meta.exif).toBeUndefined();
    expect(meta.icc).toBeUndefined();
    expect(out.body.includes(Buffer.from("secret description"))).toBe(false);
    // Rotated (portrait) and scaled so the longest side is 2400.
    expect([out.width, out.height]).toEqual([1200, MAX_IMAGE_SIDE]);
    expect([meta.width, meta.height]).toEqual([1200, MAX_IMAGE_SIDE]);
    expect(out.size).toBe(out.body.length);
  });

  it("never upscales a small image", async () => {
    const small = await sharp({ create: { width: 300, height: 200, channels: 3, background: "#222" } })
      .png()
      .toBuffer();
    const out = await optimizeImage(small);
    expect([out.width, out.height]).toEqual([300, 200]);
  });

  it("rejects bytes that are not an image", async () => {
    await expect(optimizeImage(Buffer.from("not an image"))).rejects.toThrow();
  });
});

async function pngFile(name: string, color: string) {
  const bytes = await sharp({ create: { width: 64, height: 48, channels: 3, background: color } })
    .png()
    .toBuffer();
  return new File([bytes], name, { type: "image/png" });
}

const fileOf = (storageKey: string) => path.join(uploadsRoot(), ...storageKey.split("/"));
const exists = (storageKey: string) => readFile(fileOf(storageKey)).then(() => true, () => false);

async function resetDatabase() {
  await db.$executeRawUnsafe(`TRUNCATE "MediaAsset","Banner","Collection","Category","Product" RESTART IDENTITY CASCADE`);
}

async function newAsset(name = "photo.png") {
  const created = await createMediaAsset(await pngFile(name, "#336699"));
  if (!created.ok) throw new Error(created.error);
  return created.value;
}

describe("media library", () => {
  beforeEach(resetDatabase);

  it("stores an upload as an optimized WebP asset", async () => {
    const asset = await newAsset("Ma Photo.png");
    expect(asset.mime).toBe("image/webp");
    expect(asset.storageKey).toMatch(/^library\/[0-9a-f]{32}\.webp$/);
    expect([asset.width, asset.height]).toEqual([64, 48]);
    expect(asset.originalName).toBe("Ma Photo.png");
    expect(await exists(asset.storageKey)).toBe(true);
  });

  it("rejects a file that is not an image (magic bytes)", async () => {
    const fake = new File([Buffer.from("<?php echo 1;")], "shell.png", { type: "image/png" });
    const result = await createMediaAsset(fake);
    expect(result.ok).toBe(false);
    expect(await db.mediaAsset.count()).toBe(0);
  });

  it("replace keeps the asset id, uses a new storage key and deletes the old file", async () => {
    const asset = await newAsset();
    const result = await replaceMediaFile(asset.id, await pngFile("new.png", "#993366"));
    if (!result.ok) throw new Error(result.error);

    expect(result.value.id).toBe(asset.id);
    expect(result.value.storageKey).not.toBe(asset.storageKey);
    expect(result.value.originalName).toBe("new.png");
    expect(await exists(asset.storageKey)).toBe(false);
    expect(await exists(result.value.storageKey)).toBe(true);
    expect(await db.mediaAsset.count()).toBe(1);
  });

  it("replace keeps an old file that a past order still shows", async () => {
    const asset = await newAsset();
    const order = await db.order.create({
      data: {
        number: "T-1",
        accessToken: "tok",
        idempotencyKey: "idem",
        firstName: "A",
        lastName: "B",
        phone: "0600000000",
        city: "Rabat",
        address: "x",
        locale: "fr",
        subtotal: 100,
        shippingFee: 0,
        total: 100,
        items: {
          create: {
            productName: "p",
            sku: "s",
            colorName: "c",
            sizeLabel: "M",
            unitPrice: 100,
            quantity: 1,
            image: `/media/${asset.storageKey}`,
          },
        },
      },
    });
    const result = await replaceMediaFile(asset.id, await pngFile("new.png", "#993366"));
    expect(result.ok).toBe(true);
    expect(await exists(asset.storageKey)).toBe(true);
    await db.order.delete({ where: { id: order.id } });
  });

  it("replace and delete report an unknown asset", async () => {
    expect((await replaceMediaFile("nope", await pngFile("a.png", "#000"))).ok).toBe(false);
    expect((await deleteMediaAsset("nope")).ok).toBe(false);
  });

  it("delete is blocked while the asset is used, allowed (and removes the file) once it is not", async () => {
    const asset = await newAsset();
    const collection = await db.collection.create({ data: { mediaAssetId: asset.id } });

    const blocked = await deleteMediaAsset(asset.id);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.error).toMatch(/utilisé/);
    expect(await db.mediaAsset.count()).toBe(1);
    expect(await exists(asset.storageKey)).toBe(true);

    await db.collection.update({ where: { id: collection.id }, data: { mediaAssetId: null } });
    expect((await deleteMediaAsset(asset.id)).ok).toBe(true);
    expect(await db.mediaAsset.count()).toBe(0);
    expect(await exists(asset.storageKey)).toBe(false);
  });

  it("the database itself refuses to delete a used asset (RESTRICT)", async () => {
    const asset = await newAsset();
    await db.category.create({ data: { mediaAssetId: asset.id } });
    await expect(db.mediaAsset.delete({ where: { id: asset.id } })).rejects.toThrow();
  });

  it("counts usage across every reference, including legacy rows migrated from external URLs", async () => {
    const used = await newAsset("used.png");
    const unused = await newAsset("unused.png");
    // How the migration stores an old placeholder URL: URL as key, no size or dimensions.
    const legacy = await db.mediaAsset.create({
      data: { storageKey: "https://example.test/old.png", mime: "image/png", originalName: "old.png" },
    });

    const category = await db.category.create({
      data: { mediaAssetId: used.id, translations: { create: { locale: "fr", name: "Jeans", slug: "jeans" } } },
    });
    await db.collection.create({
      data: { mediaAssetId: used.id, translations: { create: { locale: "fr", name: "Été", slug: "ete" } } },
    });
    // One banner using the same asset for desktop and mobile counts in both places.
    await db.banner.create({
      data: {
        desktopMediaAssetId: used.id,
        mobileMediaAssetId: used.id,
        translations: { create: { locale: "fr", title: "Soldes" } },
      },
    });
    const product = await db.product.create({
      data: { categoryId: category.id, price: 100, translations: { create: { locale: "fr", name: "Jean", slug: "jean" } } },
    });
    await db.productImage.createMany({
      data: [
        { productId: product.id, mediaAssetId: used.id },
        { productId: product.id, mediaAssetId: legacy.id, position: 1 },
      ],
    });

    const counts = async (id: string) =>
      usageTotal((await db.mediaAsset.findUniqueOrThrow({ where: { id }, select: usageCountSelect })));
    expect(await counts(used.id)).toBe(5); // category + collection + banner desktop + banner mobile + product image
    expect(await counts(legacy.id)).toBe(1);
    expect(await counts(unused.id)).toBe(0);

    const unusedIds = (await db.mediaAsset.findMany({ where: UNUSED_WHERE, select: { id: true } })).map((a) => a.id);
    expect(unusedIds).toEqual([unused.id]);

    const usage = await getMediaUsage(used.id);
    expect(usage.map((u) => u.kind).sort()).toEqual(
      ["Bannière (desktop)", "Bannière (mobile)", "Catégorie", "Collection", "Produit"].sort(),
    );
    expect(usage.find((u) => u.kind === "Catégorie")).toMatchObject({ label: "Jeans", href: `/admin/categories/${category.id}` });
    expect(await getMediaUsage(unused.id)).toEqual([]);
  });
});
