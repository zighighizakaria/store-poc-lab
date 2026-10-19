import { BannerForm } from "@/components/admin/BannerForm";
import { LinkButton, PageHeader, Panel } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default function NewBannerPage() {
  return (
    <>
      <PageHeader title="Nouvelle bannière" actions={<LinkButton href="/admin/banners">Retour</LinkButton>} />
      <Panel>
        <BannerForm texts={{}} link="" isActive imageDesktop={null} imageMobile={null} />
      </Panel>
    </>
  );
}
