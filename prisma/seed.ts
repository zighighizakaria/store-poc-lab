// Demo seed. Idempotent: the catalog is cleared then re-inserted, the admin and
// settings are upserted. Orders and newsletter subscribers are left untouched.
import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient, type Locale, type SizeGroup } from "@prisma/client";
import bcrypt from "bcryptjs";
import { siteConfig } from "../site.config";
import { processAndStore } from "../src/lib/media/pipeline";
import { slugify } from "../src/lib/slugify";
import { uploadsRoot } from "../src/lib/storage";
import demoImages from "./demo-images.json";
import {
  aboutPage,
  archivedProducts,
  categories,
  categoryDescriptions,
  categoryMeta,
  cities,
  collections,
  colors,
  draftProducts,
  featuredProducts,
  outOfStockProducts,
  products,
  sizes,
  type Tri,
} from "./seed-data";
import {
  banners,
  categoryGuide,
  sizeGuides,
  staticPages,
} from "./seed-content";

try {
  process.loadEnvFile?.(); // Node 22: load .env when run outside the Prisma CLI
} catch {
  // no .env file, rely on the real environment
}

const db = new PrismaClient();
const LOCALES: Locale[] = ["fr", "ar", "en"];
const DAY_MS = 24 * 60 * 60 * 1000;

function assertUniqueSlugs(label: string, values: Tri[]) {
  for (const locale of LOCALES) {
    const seen = new Set<string>();
    for (const value of values) {
      const slug = slugify(value[locale]);
      if (seen.has(slug)) throw new Error(`Duplicate ${label} slug (${locale}): ${slug}`);
      seen.add(slug);
    }
  }
}

// Small deterministic PRNG so every run produces the same stock levels.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function triRows<T>(tri: Tri, build: (locale: Locale, text: string) => T): T[] {
  return LOCALES.map((locale) => build(locale, tri[locale]));
}

// ---------- Demo photos (prisma/demo-images.json) ----------
// Each photo is downloaded once into prisma/.demo-cache/ (the seed then works
// offline), run through the upload pipeline and stored as a MediaAsset. A
// photo already imported (same sourceUrl, file still on disk) is reused.

type DemoImage = { url: string; sourceUrl: string; author: string; license: string; colorKey?: string };

const CACHE_DIR = path.join(process.cwd(), "prisma", ".demo-cache");
const importedAssets = new Map<string, string>(); // sourceUrl -> MediaAsset id

async function downloadCached(url: string): Promise<Buffer> {
  const file = path.join(CACHE_DIR, `${createHash("sha1").update(url).digest("hex")}.img`);
  try {
    return await readFile(file);
  } catch {
    // not cached yet
  }
  const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!response.ok) throw new Error(`Demo image download failed (${response.status}): ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(file, bytes);
  return bytes;
}

const fileExists = (key: string) =>
  stat(path.join(uploadsRoot(), ...key.split("/"))).then(
    () => true,
    () => false,
  );

/** The MediaAsset of a demo photo, created on first use. `alt` only applies to a new asset. */
async function demoAsset(image: DemoImage, alt: Tri): Promise<string> {
  const known = importedAssets.get(image.sourceUrl);
  if (known) return known;

  const existing = await db.mediaAsset.findFirst({ where: { sourceUrl: image.sourceUrl } });
  if (existing && (await fileExists(existing.storageKey))) {
    importedAssets.set(image.sourceUrl, existing.id);
    return existing.id;
  }

  const { storageKey, mime, size, width, height } = await processAndStore(await downloadCached(image.url));
  const file = { storageKey, mime, size, width, height };
  const row = existing
    ? await db.mediaAsset.update({ where: { id: existing.id }, data: file })
    : await db.mediaAsset.create({
        data: {
          ...file,
          originalName: `${path.basename(image.sourceUrl)}.jpg`,
          sourceUrl: image.sourceUrl,
          author: image.author,
          license: image.license,
          translations: { create: triRows(alt, (locale, text) => ({ locale, alt: text })) },
        },
      });
  importedAssets.set(image.sourceUrl, row.id);
  return row.id;
}

async function clearCatalog() {
  // Orders survive a re-seed: OrderItem.variantId is ON DELETE SET NULL, and
  // every OrderItem keeps its own snapshot (name, sku, color, size, price).
  await db.product.deleteMany(); // cascades translations, images, variants, links
  await db.collection.deleteMany();
  await db.category.deleteMany({ where: { parentId: { not: null } } });
  await db.category.deleteMany();
  await db.sizeGuide.deleteMany();
  await db.banner.deleteMany();
  await db.color.deleteMany();
  await db.size.deleteMany();
  await db.city.deleteMany();
  await db.page.deleteMany();
  // Placeholder images from before the media library (external URLs as storage key).
  await db.mediaAsset.deleteMany({ where: { storageKey: { startsWith: "http" } } });
}

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env");
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await db.adminUser.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash, name: "Admin" },
  });
  return email;
}

async function seedSizeGuides() {
  const guideIds = new Map<string, string>();
  for (const [key, content] of Object.entries(sizeGuides)) {
    const row = await db.sizeGuide.create({
      data: {
        translations: {
          create: triRows(content, (locale, text) => ({ locale, content: text })),
        },
      },
    });
    guideIds.set(key, row.id);
  }
  return guideIds;
}

async function seedCategories(guideIds: Map<string, string>) {
  const leafIds = new Map<string, string>();
  let position = 0;

  for (const root of categories) {
    const created = await db.category.create({
      data: {
        audience: "MEN",
        position: position++,
        translations: {
          create: triRows(root.name, (locale, name) => ({
            locale,
            name,
            slug: slugify(name),
          })),
        },
      },
    });

    let childPosition = 0;
    for (const child of root.children ?? []) {
      const description = categoryDescriptions[child.key];
      const row = await db.category.create({
        data: {
          parentId: created.id,
          audience: "MEN",
          position: childPosition++,
          sizeGuideId: guideIds.get(categoryGuide[child.key] ?? "") ?? null,
          translations: {
            create: triRows(child.name, (locale, name) => ({
              locale,
              name,
              slug: slugify(name),
              description: description?.[locale] ?? null,
            })),
          },
        },
      });
      leafIds.set(child.key, row.id);
    }
  }
  return leafIds;
}

async function seedCatalogBase() {
  const colorIds = new Map<string, string>();
  for (const color of colors) {
    const row = await db.color.create({
      data: {
        hex: color.hex,
        translations: {
          create: triRows(color.name, (locale, name) => ({ locale, name })),
        },
      },
    });
    colorIds.set(color.key, row.id);
  }

  const sizeIds = new Map<string, string>(); // `${group}:${label}`
  for (const group of Object.keys(sizes) as SizeGroup[]) {
    let position = 0;
    for (const label of sizes[group]) {
      const row = await db.size.create({ data: { label, group, position: position++ } });
      sizeIds.set(`${group}:${label}`, row.id);
    }
  }
  return { colorIds, sizeIds };
}

async function seedProducts(
  leafIds: Map<string, string>,
  colorIds: Map<string, string>,
  sizeIds: Map<string, string>,
) {
  const random = mulberry32(2026);
  const now = Date.now();
  const productIds: string[] = [];

  for (const [index, product] of products.entries()) {
    const n = index + 1;
    const meta = categoryMeta[product.category];
    const categoryId = leafIds.get(product.category);
    if (!meta || !categoryId) throw new Error(`Unknown category: ${product.category}`);

    const isDraft = draftProducts.includes(n);
    const isArchived = archivedProducts.includes(n);
    const description = categoryDescriptions[product.category];

    // Colors follow the photos: one color per distinct photo color.
    const photos: DemoImage[] | undefined = (demoImages.products as Record<string, DemoImage[]>)[
      slugify(product.name.en)
    ];
    if (!photos?.length) throw new Error(`No demo photo for "${product.name.en}" in prisma/demo-images.json`);
    const productColors = [...new Set(photos.map((photo) => photo.colorKey))].map((key) => {
      const color = colors.find((c) => c.key === key);
      if (!color) throw new Error(`Unknown demo color "${key}" for "${product.name.en}"`);
      return color;
    });

    const images: { mediaAssetId: string; position: number; colorId: string }[] = [];
    const variants: { colorId: string; sizeId: string; sku: string; stock: number }[] = [];

    for (const color of productColors) {
      const colorId = colorIds.get(color.key)!;
      for (const photo of photos.filter((p) => p.colorKey === color.key)) {
        const alt: Tri = {
          fr: `${product.name.fr} - ${color.name.fr}`,
          ar: `${product.name.ar} - ${color.name.ar}`,
          en: `${product.name.en} - ${color.name.en}`,
        };
        images.push({ mediaAssetId: await demoAsset(photo, alt), position: images.length, colorId });
      }

      for (const label of sizes[meta.group]) {
        const roll = random();
        let stock: number;
        if (outOfStockProducts.includes(n) || roll < 0.12) stock = 0;
        else if (roll < 0.28) stock = 1 + Math.floor(random() * 3); // low: 1-3
        else stock = 4 + Math.floor(random() * 27);

        variants.push({
          colorId,
          sizeId: sizeIds.get(`${meta.group}:${label}`)!,
          sku: `${meta.sku}-${String(n).padStart(3, "0")}-${color.key.slice(0, 3).toUpperCase()}-${label.replace(/\s/g, "")}`,
          stock,
        });
      }
    }

    const row = await db.product.create({
      data: {
        categoryId,
        price: product.price * 100,
        compareAtPrice: product.compareAt ? product.compareAt * 100 : null,
        status: isDraft ? "DRAFT" : isArchived ? "ARCHIVED" : "ACTIVE",
        isFeatured: featuredProducts.includes(n),
        // Distinct publish dates (7 and 40 are coprime) so "newest" is stable.
        publishedAt: isDraft ? null : new Date(now - ((n * 7) % 40) * DAY_MS),
        translations: {
          create: triRows(product.name, (locale, name) => ({
            locale,
            name,
            slug: slugify(name),
            description: description?.[locale] ?? null,
          })),
        },
        images: { createMany: { data: images } },
        variants: { createMany: { data: variants } },
      },
    });
    productIds.push(row.id);
  }
  return productIds;
}

async function seedCollections(productIds: string[]) {
  let position = 0;
  for (const collection of collections) {
    await db.collection.create({
      data: {
        position: position++,
        showOnHome: collection.showOnHome,
        mediaAssetId: await demoAsset(demoCollectionImage(collection.key), collection.name),
        translations: {
          create: triRows(collection.name, (locale, name) => ({
            locale,
            name,
            slug: slugify(name),
            description: collection.description[locale],
          })),
        },
        products: {
          createMany: {
            data: collection.products.map((n, i) => ({
              productId: productIds[n - 1],
              position: i,
            })),
          },
        },
      },
    });
  }
}

async function seedCities() {
  await db.city.createMany({
    data: cities.map((city) => ({ nameFr: city.fr, nameAr: city.ar })),
  });
}

async function seedSettings(adminEmail: string) {
  const data = {
    shippingFee: 3000, // 30 MAD, placeholder
    freeShippingThreshold: 49900, // 499 MAD, placeholder
    whatsappNumber: siteConfig.whatsapp.number,
    adminNotifyEmail: adminEmail,
    lowStockThreshold: 3,
  };
  await db.settings.upsert({
    where: { id: "singleton" },
    update: data,
    create: { id: "singleton", ...data },
  });
}

function demoCollectionImage(key: string): DemoImage {
  const image = (demoImages.collections as Record<string, DemoImage>)[key];
  if (!image) throw new Error(`No demo photo for collection "${key}" in prisma/demo-images.json`);
  return image;
}

async function seedBanners() {
  let position = 0;
  for (const banner of banners) {
    const photos = (demoImages.banners as Record<string, { desktop: DemoImage; mobile: DemoImage }>)[banner.key];
    if (!photos) throw new Error(`No demo photo for banner "${banner.key}" in prisma/demo-images.json`);
    await db.banner.create({
      data: {
        desktopMediaAssetId: await demoAsset(photos.desktop, banner.title),
        mobileMediaAssetId: await demoAsset(photos.mobile, banner.title),
        link: banner.link,
        position: position++,
        translations: {
          create: LOCALES.map((locale) => ({
            locale,
            title: banner.title[locale],
            subtitle: banner.subtitle[locale],
            ctaLabel: banner.cta[locale],
          })),
        },
      },
    });
  }
}

async function seedStaticPages() {
  for (const page of staticPages(siteConfig.contact)) {
    await db.page.create({
      data: {
        key: page.key,
        translations: {
          create: LOCALES.map((locale) => ({
            locale,
            title: page.title[locale],
            body: page.body[locale],
          })),
        },
      },
    });
  }
}

async function seedAboutPage() {
  const about = aboutPage(siteConfig.name);
  await db.page.create({
    data: {
      key: "about",
      translations: {
        create: LOCALES.map((locale) => ({
          locale,
          title: about.title[locale],
          body: about.body[locale],
        })),
      },
    },
  });
}

async function main() {
  assertUniqueSlugs("product", products.map((p) => p.name));
  assertUniqueSlugs("collection", collections.map((c) => c.name));

  const adminEmail = await seedAdmin();
  await clearCatalog();
  const guideIds = await seedSizeGuides();
  const leafIds = await seedCategories(guideIds);
  const { colorIds, sizeIds } = await seedCatalogBase();
  const productIds = await seedProducts(leafIds, colorIds, sizeIds);
  await seedCollections(productIds);
  await seedCities();
  await seedSettings(adminEmail);
  await seedAboutPage();
  await seedStaticPages();
  await seedBanners();

  const [admins, cats, cols, prods, activeProds, vars, outOfStock, lowStock, sale, cityCount] =
    await Promise.all([
      db.adminUser.count(),
      db.category.count(),
      db.collection.count(),
      db.product.count(),
      db.product.count({ where: { status: "ACTIVE" } }),
      db.variant.count(),
      db.variant.count({ where: { stock: 0 } }),
      db.variant.count({ where: { stock: { gt: 0, lte: 3 } } }),
      db.product.count({ where: { compareAtPrice: { not: null } } }),
      db.city.count(),
    ]);

  console.log("Seed complete:");
  console.log(`  admin users:  ${admins}`);
  console.log(`  categories:   ${cats}`);
  console.log(`  collections:  ${cols}`);
  console.log(`  products:     ${prods} (${activeProds} active, ${sale} on sale)`);
  console.log(`  variants:     ${vars} (${outOfStock} out of stock, ${lowStock} low stock)`);
  console.log(`  cities:       ${cityCount}`);
  console.log(`  size guides:  ${guideIds.size}, banners: ${banners.length}, pages: ${staticPages(siteConfig.contact).length + 1}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
