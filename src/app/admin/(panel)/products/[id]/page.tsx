import { notFound } from "next/navigation";
import { ImageManager } from "@/components/admin/ImageManager";
import { ProductForm } from "@/components/admin/ProductForm";
import { VariantMatrix } from "@/components/admin/VariantMatrix";
import { ConfirmSubmit } from "@/components/admin/AdminForm";
import { first, LinkButton, Notice, PageHeader, Panel, ProductStatusBadge } from "@/components/admin/ui";
import { deleteProduct } from "@/lib/actions/admin/products";
import { loadCategoryOptions, loadCollectionOptions } from "@/lib/admin/categories";
import { dateTimeInput, madInput } from "@/lib/admin/form";
import { db } from "@/lib/db";
import { getTranslation } from "@/lib/i18n";
import { mediaUrl } from "@/lib/media/url";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EditProductPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;

  const product = await db.product.findUnique({
    where: { id },
    include: {
      translations: true,
      collections: { select: { collectionId: true } },
      images: {
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        include: { mediaAsset: { include: { translations: true } } },
      },
      variants: { include: { color: { include: { translations: true } }, size: true } },
    },
  });
  if (!product) notFound();

  const [categories, collections, colorRows, sizeRows] = await Promise.all([
    loadCategoryOptions(),
    loadCollectionOptions(),
    db.color.findMany({ include: { translations: true }, orderBy: { createdAt: "asc" } }),
    db.size.findMany({ orderBy: [{ group: "asc" }, { position: "asc" }] }),
  ]);
  const colors = colorRows.map((c) => ({ id: c.id, hex: c.hex, name: getTranslation(c, "fr").name }));

  const texts: Record<string, string> = {};
  for (const t of product.translations) {
    texts[`name_${t.locale}`] = t.name;
    texts[`slug_${t.locale}`] = t.slug;
    texts[`description_${t.locale}`] = t.description ?? "";
  }

  const sizeOrder = new Map(sizeRows.map((s, i) => [s.id, i]));
  const colorOrder = new Map(colorRows.map((c, i) => [c.id, i]));
  const rows = product.variants
    .toSorted(
      (a, b) =>
        (colorOrder.get(a.colorId) ?? 0) - (colorOrder.get(b.colorId) ?? 0) ||
        (sizeOrder.get(a.sizeId) ?? 0) - (sizeOrder.get(b.sizeId) ?? 0),
    )
    .map((v) => ({
      id: v.id,
      colorName: getTranslation(v.color, "fr").name,
      colorHex: v.color.hex,
      sizeLabel: v.size.label,
      sku: v.sku,
      stock: v.stock,
      price: madInput(v.price),
    }));

  const name = getTranslation(product, "fr").name;
  const frSlug = getTranslation(product, "fr").slug;

  return (
    <>
      <PageHeader
        title={name}
        description={`/p/${frSlug}`}
        actions={
          <>
            <ProductStatusBadge status={product.status} />
            <LinkButton href="/admin/products">Retour</LinkButton>
          </>
        }
      />
      <Notice notice={first(sp.notice)} error={first(sp.error)} />

      <div className="flex flex-col gap-16">
        <Panel title="Informations">
          <ProductForm
            categories={categories}
            collections={collections}
            values={{
              id: product.id,
              texts,
              categoryId: product.categoryId,
              collectionIds: product.collections.map((c) => c.collectionId),
              price: madInput(product.price),
              compareAt: madInput(product.compareAtPrice),
              status: product.status,
              publishedAt: dateTimeInput(product.publishedAt),
              isFeatured: product.isFeatured,
            }}
          />
        </Panel>

        <Panel title="Images">
          <ImageManager
            productId={product.id}
            colors={colors.map(({ id: colorId, name: colorName }) => ({ id: colorId, name: colorName }))}
            images={product.images.map((image) => ({
              id: image.id,
              mediaAssetId: image.mediaAssetId,
              url: mediaUrl(image.mediaAsset.storageKey),
              name: image.mediaAsset.originalName,
              alt: image.mediaAsset.translations.find((t) => t.locale === "fr")?.alt ?? "",
              colorId: image.colorId,
            }))}
          />
        </Panel>

        <Panel title="Variantes (couleur × taille)">
          <VariantMatrix
            productId={product.id}
            colors={colors}
            sizes={sizeRows.map((s) => ({ id: s.id, label: s.label, group: s.group }))}
            rows={rows}
          />
        </Panel>

        <Panel title="Zone sensible">
          <p className="mb-12 text-body text-muted">
            Un produit présent dans des commandes est archivé ; sinon il est supprimé définitivement avec ses images
            et ses variantes.
          </p>
          <form action={deleteProduct}>
            <input type="hidden" name="id" value={product.id} />
            <ConfirmSubmit variant="secondary" message="Supprimer ce produit ? (archivé s'il apparaît dans des commandes)">
              Supprimer le produit
            </ConfirmSubmit>
          </form>
        </Panel>
      </div>
    </>
  );
}
