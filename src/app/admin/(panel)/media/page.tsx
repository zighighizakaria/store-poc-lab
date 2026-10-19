import Image from "next/image";
import Link from "next/link";
import { LibraryUploader } from "@/components/admin/MediaUploader";
import { MediaDetail } from "@/components/admin/MediaDetail";
import { EmptyState, first, Notice, PageHeader, Pager, pageOf, Panel } from "@/components/admin/ui";
import { Input } from "@/components/ui/Input";
import { buttonClasses } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { db } from "@/lib/db";
import { cardSelect, getMediaUsage, searchWhere, toMediaCard, UNUSED_WHERE } from "@/lib/media/library";
import { mediaUrl } from "@/lib/media/url";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 48;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function MediaLibraryPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = (first(sp.q) ?? "").trim().slice(0, 100);
  const unused = first(sp.filter) === "unused";
  const page = pageOf(first(sp.page));
  const selectedId = first(sp.asset);

  const where = { ...searchWhere(q), ...(unused ? UNUSED_WHERE : {}) };
  const [total, rows, selected] = await Promise.all([
    db.mediaAsset.count({ where }),
    db.mediaAsset.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: cardSelect,
    }),
    selectedId
      ? db.mediaAsset.findUnique({
          where: { id: selectedId },
          include: { translations: true, uploadedBy: { select: { name: true } } },
        })
      : null,
  ]);
  const usage = selected ? await getMediaUsage(selected.id) : [];
  const cards = rows.map(toMediaCard);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const href = (id: string) => {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (unused) qs.set("filter", "unused");
    if (page > 1) qs.set("page", String(page));
    qs.set("asset", id);
    return `/admin/media?${qs.toString()}`;
  };
  const alt = (locale: "fr" | "ar" | "en") => selected?.translations.find((t) => t.locale === locale)?.alt ?? "";

  return (
    <>
      <PageHeader title="Médiathèque" description={`${total} média(s)`} />
      <Notice notice={first(sp.notice)} error={first(sp.error)} />

      <div className="flex flex-col gap-16">
        <Panel>
          <LibraryUploader />
        </Panel>

        <div className="grid grid-cols-1 items-start gap-16 lg:grid-cols-[1fr_360px]">
          <Panel className={cn(selected && "order-2 lg:order-1")}>
            <form action="/admin/media" className="mb-16 flex flex-wrap items-center gap-8">
              <Input
                name="q"
                type="search"
                defaultValue={q}
                placeholder="Nom de fichier ou texte alternatif"
                aria-label="Recherche"
                className="min-w-0 flex-1 basis-[200px]"
              />
              <label className="inline-flex min-h-44 cursor-pointer items-center gap-8 text-body">
                <input type="checkbox" name="filter" value="unused" defaultChecked={unused} className="size-16 accent-accent" />
                Non utilisés
              </label>
              <button type="submit" className={buttonClasses({ variant: "secondary", size: "md" })}>
                Filtrer
              </button>
            </form>

            {cards.length === 0 ? (
              <EmptyState>{q || unused ? "Aucun média ne correspond." : "Aucun média pour l'instant."}</EmptyState>
            ) : (
              <ul className="grid grid-cols-2 gap-12 sm:grid-cols-3 xl:grid-cols-4">
                {cards.map((card) => (
                  <li key={card.id}>
                    <Link
                      href={href(card.id)}
                      aria-current={card.id === selectedId ? "true" : undefined}
                      className={cn(
                        "flex flex-col gap-6 rounded-image border p-6 hover:bg-canvas",
                        card.id === selectedId ? "border-accent ring-2 ring-accent" : "border-line",
                      )}
                    >
                      <span className="relative block aspect-square overflow-hidden rounded-lg bg-canvas">
                        <Image src={card.url} alt={card.alt} fill sizes="200px" className="object-cover" />
                      </span>
                      <span className="truncate text-body-sm" title={card.name}>
                        {card.name}
                      </span>
                      <span className="text-caption text-muted">
                        {card.uses === 0 ? "Non utilisé" : `Utilisé ${card.uses} fois`}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Pager page={page} pageCount={pageCount} basePath="/admin/media" params={{ q, filter: unused ? "unused" : undefined }} />
          </Panel>

          {selected ? (
            <Panel title="Détail" className="order-1 lg:sticky lg:top-64 lg:order-2">
              <MediaDetail
                asset={{
                  id: selected.id,
                  url: mediaUrl(selected.storageKey),
                  name: selected.originalName,
                  mime: selected.mime,
                  size: selected.size,
                  width: selected.width,
                  height: selected.height,
                  createdAt: selected.createdAt.toLocaleDateString("fr-FR"),
                  uploadedBy: selected.uploadedBy?.name ?? null,
                  sourceUrl: selected.sourceUrl,
                  author: selected.author,
                  license: selected.license,
                  alt: { fr: alt("fr"), ar: alt("ar"), en: alt("en") },
                }}
                usage={usage}
              />
            </Panel>
          ) : null}
        </div>
      </div>
    </>
  );
}
