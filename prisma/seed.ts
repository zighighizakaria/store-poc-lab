// Demo seed. Idempotent: the catalog is cleared then re-inserted, the admin and
// settings are upserted. Orders and newsletter subscribers are left untouched.
import { PrismaClient, type Locale, type SizeGroup } from "@prisma/client";
import bcrypt from "bcryptjs";
import { siteConfig } from "../site.config";
import { slugify } from "../src/lib/slugify";
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
  collectionImageColors,
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

function textColorFor(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return (r * 299 + g * 587 + b * 114) / 1000 > 140 ? "111111" : "ffffff";
}

function triRows<T>(tri: Tri, build: (locale: Locale, text: string) => T): T[] {
  return LOCALES.map((locale) => build(locale, tri[locale]));
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

    const colorCount = n % 5 === 0 ? 3 : 2;
    const productColors = Array.from(
      { length: colorCount },
      (_, k) => colors[(n * 3 + k * 2) % colors.length],
    );

    const images: { url: string; position: number; colorId: string }[] = [];
    const variants: { colorId: string; sizeId: string; sku: string; stock: number }[] = [];

    for (const color of productColors) {
      const colorId = colorIds.get(color.key)!;
      const bg = color.hex.slice(1);
      const fg = textColorFor(color.hex);
      for (const view of [1, 2]) {
        const text = encodeURIComponent(`${product.name.en} - ${color.name.en} (${view})`);
        images.push({
          url: `https://placehold.co/800x1000/${bg}/${fg}.png?text=${text}`,
          position: images.length,
          colorId,
        });
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
        image: placeholderImage(
          collection.name.en,
          collectionImageColors[collection.key] ?? { bg: "cccccc", fg: "111111" },
          800,
          1000,
        ),
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

// Placeholder .png from placehold.co (next/image does not render SVG by default).
function placeholderImage(
  text: string,
  { bg, fg }: { bg: string; fg: string },
  width: number,
  height: number,
): string {
  return `https://placehold.co/${width}x${height}/${bg}/${fg}.png?text=${encodeURIComponent(text)}`;
}

async function seedBanners() {
  let position = 0;
  for (const banner of banners) {
    const colors = { bg: banner.bg, fg: banner.fg };
    await db.banner.create({
      data: {
        imageDesktop: placeholderImage(banner.title.en, colors, 1600, 640),
        imageMobile: placeholderImage(banner.title.en, colors, 800, 1000),
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
