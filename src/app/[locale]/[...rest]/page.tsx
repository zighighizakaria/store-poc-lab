import { notFound } from "next/navigation";

// Any unmatched URL under /[locale] renders the localized 404 (not-found.tsx).
export default function CatchAll() {
  notFound();
}
