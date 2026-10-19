import { notFound } from "next/navigation";
import { BannerForm } from "@/components/admin/BannerForm";
import { ConfirmSubmit } from "@/components/admin/AdminForm";
import { first, LinkButton, Notice, PageHeader, Panel } from "@/components/admin/ui";
import { deleteBanner } from "@/lib/actions/admin/banners";
import { db } from "@/lib/db";
import { getTranslation } from "@/lib/i18n";
import { mediaValue } from "@/lib/media/url";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EditBannerPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const banner = await db.banner.findUnique({ where: { id }, include: { translations: true, desktopMedia: true, mobileMedia: true } });
  if (!banner) notFound();

  const texts: Record<string, string> = {};
  for (const t of banner.translations) {
    texts[`title_${t.locale}`] = t.title;
    texts[`subtitle_${t.locale}`] = t.subtitle ?? "";
    texts[`ctaLabel_${t.locale}`] = t.ctaLabel ?? "";
  }

  return (
    <>
      <PageHeader
        title={getTranslation(banner, "fr").title}
        actions={<LinkButton href="/admin/banners">Retour</LinkButton>}
      />
      <Notice notice={first(sp.notice)} error={first(sp.error)} />
      <div className="flex flex-col gap-16">
        <Panel>
          <BannerForm
            id={banner.id}
            texts={texts}
            link={banner.link ?? ""}
            isActive={banner.isActive}
            imageDesktop={mediaValue(banner.desktopMedia)}
            imageMobile={mediaValue(banner.mobileMedia)}
          />
        </Panel>
        <Panel title="Zone sensible">
          <form action={deleteBanner}>
            <input type="hidden" name="id" value={banner.id} />
            <ConfirmSubmit variant="secondary" message="Supprimer cette bannière ?">
              Supprimer la bannière
            </ConfirmSubmit>
          </form>
        </Panel>
      </div>
    </>
  );
}
