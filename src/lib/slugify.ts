/**
 * URL slug. Latin accents are stripped (e acute -> e); Arabic letters, hamza
 * forms and other marks are kept intact so Arabic URLs stay readable.
 * Shared by the demo seed and the admin product/category/collection forms.
 */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // combining Latin accents only
    .normalize("NFC") // recompose Arabic hamza forms
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}
