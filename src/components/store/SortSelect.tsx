"use client";

import { useId, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Select } from "@/components/ui/Input";
import { useRouter } from "@/i18n/navigation";
import { SORT_KEYS, buildQueryString, type ListingQuery, type SortKey } from "@/lib/listing";

type Props = {
  basePath: string;
  extraQuery: Record<string, string | undefined>;
  defaultSort: SortKey;
  query: ListingQuery;
};

export function SortSelect({ basePath, extraQuery, defaultSort, query }: Props) {
  const t = useTranslations("listing");
  const router = useRouter();
  const id = useId();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-8">
      <label htmlFor={id} className="sr-only sm:not-sr-only sm:text-body sm:text-muted">
        {t("sortLabel")}
      </label>
      <Select
        id={id}
        value={query.sort}
        disabled={pending}
        onChange={(event) => {
          const sort = event.target.value as SortKey;
          const qs = buildQueryString({ ...query, sort, page: 1 }, defaultSort, extraQuery);
          startTransition(() => router.push(`${basePath}${qs}`, { scroll: false }));
        }}
        className="ps-16 text-body"
      >
        {SORT_KEYS.map((key) => (
          <option key={key} value={key}>
            {t(`sort.${key}`)}
          </option>
        ))}
      </Select>
    </div>
  );
}
