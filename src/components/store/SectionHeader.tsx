import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";

type Props = {
  title: string;
  href?: string;
  /** Link text for screen readers when `href` is set. */
  linkLabel?: string;
  id?: string;
};

// Kit "Category Section Header": 20px title followed by a chevron, 24px below.
export function SectionHeader({ title, href, linkLabel, id }: Props) {
  const heading = (
    <h2 id={id} className="text-title font-semibold tracking-tight text-ink">
      {title}
    </h2>
  );
  return (
    <div className="mb-24 flex items-center justify-between gap-12">
      {href ? (
        <Link
          href={href}
          aria-label={linkLabel}
          className="group inline-flex items-center gap-8 rounded-pill"
        >
          {heading}
          <ChevronRight
            aria-hidden="true"
            strokeWidth={1.5}
            className="size-16 transition-transform duration-fast group-hover:translate-x-4 rtl:-scale-x-100 rtl:group-hover:-translate-x-4"
          />
        </Link>
      ) : (
        heading
      )}
    </div>
  );
}
