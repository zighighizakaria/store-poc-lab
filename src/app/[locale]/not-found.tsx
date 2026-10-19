import { getTranslations } from "next-intl/server";
import { ButtonLink } from "@/components/ui/Button";

export default async function NotFound() {
  const t = await getTranslations("notFound");

  return (
    <div className="mx-auto flex max-w-narrow flex-col items-center gap-16 px-16 py-64 text-center">
      <p dir="ltr" className="text-display-lg font-semibold tracking-tight text-accent">
        404
      </p>
      <h1 className="text-display-sm font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-body-lg text-muted">{t("text")}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-12">
        <ButtonLink href="/" variant="primary" size="lg">
          {t("backHome")}
        </ButtonLink>
        <ButtonLink href="/nouveautes" variant="secondary" size="lg">
          {t("browseNew")}
        </ButtonLink>
      </div>
    </div>
  );
}
