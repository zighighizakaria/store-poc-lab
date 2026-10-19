import Image from "next/image";
import Link from "next/link";
import type { Prisma, ProductStatus } from "@prisma/client";
import { ConfirmSubmit, SubmitButton } from "@/components/admin/AdminForm";
import {
  EmptyState,
  first,
  LinkButton,
  Notice,
  PageHeader,
  Pager,
  pageOf,
  Panel,
  ProductStatusBadge,
  TableWrap,
  tableClass,
  tdClass,
  thClass,
} from "@/components/admin/ui";
import { Input, Select } from "@/components/ui/Input";
import { bulkArchiveProducts } from "@/lib/actions/admin/products";
import { loadCategoryOptions } from "@/lib/admin/categories";
import { PRODUCT_STATUS_LABELS } from "@/lib/admin/labels";
import { db } from "@/lib/db";
import { getTranslation } from "@/lib/i18n";
import { mediaUrl } from "@/lib/media/url";
import { formatMoney } from "@/lib/money";
import { isOnSale } from "@/lib/pricing";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function ProductsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = first(sp.q)?.trim() || undefined;
  const status = first(sp.status);
  const categoryId = first(sp.categoryId) || undefined;
  const page = pageOf(first(sp.page));

  const categories = await loadCategoryOptions();

  const where: Prisma.ProductWhereInput = {};
  if (status && status in PRODUCT_STATUS_LABELS) where.status = status as ProductStatus;
  if (categoryId) {
    const node = categories.find((c) => c.id === categoryId);
    where.categoryId = { in: node?.subtreeIds ?? [categoryId] };
  }
  if (q) {
    where.OR = [
      { translations: { some: { name: { contains: q, mode: "insensitive" } } } },
      { translations: { some: { slug: { contains: q, mode: "insensitive" } } } },
      { variants: { some: { sku: { contains: q, mode: "insensitive" } } } },
    ];
  }

  const [total, products] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        translations: true,
        images: { orderBy: { position: "asc" }, take: 1, include: { mediaAsset: true } },
        variants: { select: { stock: true } },
      },
    }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const categoryLabel = new Map(categories.map((c) => [c.id, c.label]));
  const hasFilters = !!(q || status || categoryId);

  return (
    <>
      <PageHeader
        title="Produits"
        description={`${total} produit(s)`}
        actions={<LinkButton href="/admin/products/new" variant="accent" size="md">Nouveau produit</LinkButton>}
      />
      <Notice notice={first(sp.notice)} error={first(sp.error)} />

      <Panel className="mb-16">
        <form method="get" className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
          <Input name="q" defaultValue={q} placeholder="Nom, slug ou SKU" aria-label="Recherche" />
          <Select name="status" defaultValue={status ?? ""} aria-label="Statut">
            <option value="">Tous les statuts</option>
            {(Object.keys(PRODUCT_STATUS_LABELS) as ProductStatus[]).map((s) => (
              <option key={s} value={s}>
                {PRODUCT_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
          <Select name="categoryId" defaultValue={categoryId ?? ""} aria-label="Catégorie">
            <option value="">Toutes les catégories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
          <div className="flex gap-8">
            <SubmitButton size="sm">Filtrer</SubmitButton>
            {hasFilters ? <LinkButton href="/admin/products">Réinitialiser</LinkButton> : null}
          </div>
        </form>
      </Panel>

      <Panel>
        {products.length === 0 ? (
          <EmptyState>Aucun produit ne correspond.</EmptyState>
        ) : (
          <form action={bulkArchiveProducts}>
            <TableWrap>
              <table className={tableClass}>
                <thead>
                  <tr>
                    <th className={thClass}>
                      <span className="sr-only">Sélection</span>
                    </th>
                    <th className={thClass}>
                      <span className="sr-only">Image</span>
                    </th>
                    <th className={thClass}>Nom</th>
                    <th className={thClass}>Catégorie</th>
                    <th className={thClass}>Prix</th>
                    <th className={thClass}>Stock</th>
                    <th className={thClass}>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => {
                    const name = getTranslation(product, "fr").name;
                    const stock = product.variants.reduce((sum, v) => sum + v.stock, 0);
                    const image = product.images[0];
                    return (
                      <tr key={product.id}>
                        <td className={tdClass}>
                          <input
                            type="checkbox"
                            name="ids"
                            value={product.id}
                            aria-label={`Sélectionner ${name}`}
                            className="size-20 accent-accent"
                          />
                        </td>
                        <td className={tdClass}>
                          <div className="relative h-48 w-40 overflow-hidden rounded-lg bg-canvas">
                            {image ? <Image src={mediaUrl(image.mediaAsset.storageKey)} alt="" fill sizes="40px" className="object-cover" /> : null}
                          </div>
                        </td>
                        <td className={tdClass}>
                          <Link href={`/admin/products/${product.id}`} className="font-medium underline-offset-2 hover:underline">
                            {name}
                          </Link>
                        </td>
                        <td className={tdClass}>{categoryLabel.get(product.categoryId) ?? "—"}</td>
                        <td className={`${tdClass} whitespace-nowrap`}>
                          <span dir="ltr">{formatMoney(product.price)}</span>
                          {isOnSale(product.price, product.compareAtPrice) ? (
                            <span dir="ltr" className="ms-8 text-body-sm text-muted line-through">
                              {formatMoney(product.compareAtPrice!)}
                            </span>
                          ) : null}
                        </td>
                        <td className={tdClass}>
                          <span className={stock === 0 ? "font-semibold text-error" : undefined}>{stock}</span>
                          <span className="text-body-sm text-muted"> · {product.variants.length} var.</span>
                        </td>
                        <td className={tdClass}>
                          <ProductStatusBadge status={product.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableWrap>
            <div className="mt-12">
              <ConfirmSubmit variant="secondary" size="sm" message="Archiver les produits sélectionnés ? Ils disparaissent de la boutique.">
                Archiver la sélection
              </ConfirmSubmit>
            </div>
          </form>
        )}
        <Pager page={page} pageCount={pageCount} basePath="/admin/products" params={{ q, status, categoryId }} />
      </Panel>
    </>
  );
}
