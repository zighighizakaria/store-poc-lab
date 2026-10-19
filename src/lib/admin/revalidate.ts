import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/** Refresh every storefront page (all locales) after a catalog / content change. */
export function revalidateStorefront(): void {
  revalidatePath("/[locale]", "layout");
}

/** Refresh admin pages. */
export function revalidateAdmin(...paths: string[]): void {
  for (const path of paths) revalidatePath(path);
}

type Notice = { notice: string } | { error: string };

/** Redirect back to an admin list with a one-shot message in the query string. */
export function redirectWithNotice(path: string, notice: Notice): never {
  const [base, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  params.delete("notice");
  params.delete("error");
  params.set("notice" in notice ? "notice" : "error", "notice" in notice ? notice.notice : notice.error);
  redirect(`${base}?${params.toString()}`);
}
