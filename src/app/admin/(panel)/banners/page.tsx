import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUp } from "lucide-react";
import { SubmitButton } from "@/components/admin/AdminForm";
import { ActiveBadge, EmptyState, first, LinkButton, Notice, PageHeader, Panel } from "@/components/admin/ui";
import { moveBanner, toggleBannerActive } from "@/lib/actions/admin/banners";
import { db } from "@/lib/db";
import { getTranslation } from "@/lib/i18n";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const iconButton =
  "inline-flex size-40 items-center justify-center rounded-pill border border-line bg-surface shadow-sm hover:bg-canvas disabled:cursor-not-allowed disabled:text-muted";

export default async function BannersPage({ searchParams }: Props) {
  const sp = await searchParams;
  const banners = await db.banner.findMany({
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    include: { translations: true },
  });

  return (
    <>
      <PageHeader
        title="Bannières"
        description="Slides du carrousel de la page d'accueil, dans l'ordre d'affichage."
        actions={<LinkButton href="/admin/banners/new" variant="accent" size="md">Nouvelle bannière</LinkButton>}
      />
      <Notice notice={first(sp.notice)} error={first(sp.error)} />

      {banners.length === 0 ? (
        <Panel>
          <EmptyState>Aucune bannière.</EmptyState>
        </Panel>
      ) : (
        <ul className="flex flex-col gap-12">
          {banners.map((banner, index) => {
            const title = getTranslation(banner, "fr").title;
            return (
              <li key={banner.id}>
                <Panel>
                  <div className="flex flex-wrap items-center gap-12">
                    <div className="relative h-64 w-[160px] shrink-0 overflow-hidden rounded-image bg-canvas">
                      <Image src={banner.imageDesktop} alt="" fill sizes="160px" className="object-cover" />
                    </div>
                    <div className="min-w-0 flex-1 basis-[160px]">
                      <Link href={`/admin/banners/${banner.id}`} className="font-medium underline-offset-2 hover:underline">
                        {title}
                      </Link>
                      <p className="text-body-sm text-muted">
                        <span dir="ltr">{banner.link ?? "Sans lien"}</span>
                      </p>
                    </div>
                    <ActiveBadge active={banner.isActive} />
                    <div className="flex items-center gap-4">
                      <form action={moveBanner}>
                        <input type="hidden" name="id" value={banner.id} />
                        <input type="hidden" name="direction" value="up" />
                        <button type="submit" className={iconButton} aria-label={`Monter ${title}`} disabled={index === 0}>
                          <ArrowUp aria-hidden="true" strokeWidth={1.5} className="size-16" />
                        </button>
                      </form>
                      <form action={moveBanner}>
                        <input type="hidden" name="id" value={banner.id} />
                        <input type="hidden" name="direction" value="down" />
                        <button
                          type="submit"
                          className={iconButton}
                          aria-label={`Descendre ${title}`}
                          disabled={index === banners.length - 1}
                        >
                          <ArrowDown aria-hidden="true" strokeWidth={1.5} className="size-16" />
                        </button>
                      </form>
                    </div>
                    <form action={toggleBannerActive}>
                      <input type="hidden" name="id" value={banner.id} />
                      <SubmitButton variant="ghost" size="sm">
                        {banner.isActive ? "Désactiver" : "Activer"}
                      </SubmitButton>
                    </form>
                  </div>
                </Panel>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
