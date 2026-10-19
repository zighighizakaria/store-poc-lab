-- Media library: images live in MediaAsset; product images, banners,
-- collections and categories reference them by id instead of a raw URL.
-- Existing URLs are converted to MediaAsset rows (one per distinct URL) before
-- the url columns are dropped, so no image is lost.

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "originalName" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "author" TEXT,
    "license" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAssetTranslation" (
    "id" TEXT NOT NULL,
    "mediaAssetId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "alt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAssetTranslation_pkey" PRIMARY KEY ("id")
);

-- New reference columns (nullable until the data is converted)
ALTER TABLE "Banner" ADD COLUMN "desktopMediaAssetId" TEXT, ADD COLUMN "mobileMediaAssetId" TEXT;
ALTER TABLE "Category" ADD COLUMN "mediaAssetId" TEXT;
ALTER TABLE "Collection" ADD COLUMN "mediaAssetId" TEXT;
ALTER TABLE "ProductImage" ADD COLUMN "mediaAssetId" TEXT;

-- Convert: one MediaAsset per distinct legacy URL (deterministic id from the URL).
-- "/media/<key>" URLs become the storage key; external URLs (demo placeholders)
-- are kept whole in storageKey and sourceUrl. Dimensions and size are unknown.
CREATE TEMP TABLE "_legacy_media" AS
SELECT u."url", 'ma' || substr(md5(u."url"), 1, 24) AS "id"
FROM (
    SELECT "url" FROM "ProductImage"
    UNION SELECT "imageDesktop" FROM "Banner"
    UNION SELECT "imageMobile" FROM "Banner" WHERE "imageMobile" IS NOT NULL
    UNION SELECT "image" FROM "Collection" WHERE "image" IS NOT NULL
    UNION SELECT "image" FROM "Category" WHERE "image" IS NOT NULL
) u;

INSERT INTO "MediaAsset" ("id", "storageKey", "mime", "originalName", "sourceUrl", "updatedAt")
SELECT
    l."id",
    CASE WHEN l."url" LIKE '/media/%' THEN substr(l."url", 8) ELSE l."url" END,
    CASE lower(substring(split_part(l."url", '?', 1) from '\.([A-Za-z0-9]+)$'))
        WHEN 'jpg' THEN 'image/jpeg'
        WHEN 'jpeg' THEN 'image/jpeg'
        WHEN 'webp' THEN 'image/webp'
        ELSE 'image/png'
    END,
    regexp_replace(split_part(l."url", '?', 1), '^.*/', ''),
    CASE WHEN l."url" LIKE '/media/%' THEN NULL ELSE l."url" END,
    CURRENT_TIMESTAMP
FROM "_legacy_media" l;

UPDATE "ProductImage" p SET "mediaAssetId" = l."id" FROM "_legacy_media" l WHERE p."url" = l."url";
UPDATE "Banner" b SET "desktopMediaAssetId" = l."id" FROM "_legacy_media" l WHERE b."imageDesktop" = l."url";
UPDATE "Banner" b SET "mobileMediaAssetId" = l."id" FROM "_legacy_media" l WHERE b."imageMobile" = l."url";
UPDATE "Collection" c SET "mediaAssetId" = l."id" FROM "_legacy_media" l WHERE c."image" = l."url";
UPDATE "Category" c SET "mediaAssetId" = l."id" FROM "_legacy_media" l WHERE c."image" = l."url";

-- Alt texts move from the product image to its asset (first one wins when an asset is shared).
INSERT INTO "MediaAssetTranslation" ("id", "mediaAssetId", "locale", "alt", "updatedAt")
SELECT DISTINCT ON (p."mediaAssetId", t."locale")
    'mt' || substr(md5(t."id"), 1, 24), p."mediaAssetId", t."locale", t."alt", CURRENT_TIMESTAMP
FROM "ProductImageTranslation" t
JOIN "ProductImage" p ON p."id" = t."productImageId"
ORDER BY p."mediaAssetId", t."locale", p."position", p."createdAt";

-- Switch over
ALTER TABLE "ProductImage" ALTER COLUMN "mediaAssetId" SET NOT NULL, DROP COLUMN "url";
ALTER TABLE "Banner" ALTER COLUMN "desktopMediaAssetId" SET NOT NULL, DROP COLUMN "imageDesktop", DROP COLUMN "imageMobile";
ALTER TABLE "Collection" DROP COLUMN "image";
ALTER TABLE "Category" DROP COLUMN "image";
DROP TABLE "ProductImageTranslation";
DROP TABLE "_legacy_media";

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_storageKey_key" ON "MediaAsset"("storageKey");

-- CreateIndex
CREATE INDEX "MediaAsset_uploadedById_idx" ON "MediaAsset"("uploadedById");

-- CreateIndex
CREATE INDEX "MediaAsset_createdAt_idx" ON "MediaAsset"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MediaAssetTranslation_mediaAssetId_locale_key" ON "MediaAssetTranslation"("mediaAssetId", "locale");

-- CreateIndex
CREATE INDEX "Banner_desktopMediaAssetId_idx" ON "Banner"("desktopMediaAssetId");

-- CreateIndex
CREATE INDEX "Banner_mobileMediaAssetId_idx" ON "Banner"("mobileMediaAssetId");

-- CreateIndex
CREATE INDEX "Category_mediaAssetId_idx" ON "Category"("mediaAssetId");

-- CreateIndex
CREATE INDEX "Collection_mediaAssetId_idx" ON "Collection"("mediaAssetId");

-- CreateIndex
CREATE INDEX "ProductImage_mediaAssetId_idx" ON "ProductImage"("mediaAssetId");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAssetTranslation" ADD CONSTRAINT "MediaAssetTranslation_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Banner" ADD CONSTRAINT "Banner_desktopMediaAssetId_fkey" FOREIGN KEY ("desktopMediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Banner" ADD CONSTRAINT "Banner_mobileMediaAssetId_fkey" FOREIGN KEY ("mobileMediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
