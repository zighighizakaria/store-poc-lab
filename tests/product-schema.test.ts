import { describe, expect, it } from "vitest";
import { madInput, parseMad } from "@/lib/admin/form";
import { parseProductForm } from "@/lib/admin/product-schema";

const valid = {
  name_fr: "T-shirt Essentiel",
  categoryId: "cat_1",
  price: "199",
  status: "DRAFT",
};

describe("parseMad", () => {
  it("converts MAD text to centimes without floats", () => {
    expect(parseMad("199")).toBe(19900);
    expect(parseMad("199.5")).toBe(19950);
    expect(parseMad("199,50")).toBe(19950);
    expect(parseMad("0.07")).toBe(7);
    expect(parseMad("1 299")).toBe(129900);
  });

  it("rejects anything that is not an amount", () => {
    for (const bad of ["", "abc", "-5", "1.234", "1e3", "12.", ".5"]) expect(parseMad(bad)).toBeNull();
  });

  it("round-trips through madInput", () => {
    expect(madInput(19900)).toBe("199");
    expect(madInput(19950)).toBe("199.50");
    expect(madInput(null)).toBe("");
  });
});

describe("parseProductForm", () => {
  it("accepts a minimal product: FR only, slug generated, price in centimes", () => {
    const result = parseProductForm(valid);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.price).toBe(19900);
    expect(result.data.compareAtPrice).toBeNull();
    expect(result.data.translations.fr).toEqual({ name: "T-shirt Essentiel", slug: "t-shirt-essentiel", description: null });
    expect(result.data.translations.ar).toBeUndefined();
    expect(result.data.translations.en).toBeUndefined();
  });

  it("requires the French name", () => {
    const result = parseProductForm({ ...valid, name_fr: "   ", name_ar: "قميص" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.fieldErrors.name_fr).toMatch(/obligatoire/);
  });

  it("makes AR / EN optional and keeps Arabic slugs readable", () => {
    const result = parseProductForm({ ...valid, name_ar: "قميص قطن", name_en: "Cotton shirt", slug_en: "My Slug" });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.translations.ar?.slug).toBe("قميص-قطن");
    expect(result.data.translations.en?.slug).toBe("my-slug");
  });

  it("requires compare-at to be greater than the price when set", () => {
    for (const compareAt of ["199", "150"]) {
      const result = parseProductForm({ ...valid, compareAt });
      expect(result.success).toBe(false);
      if (!result.success) expect(result.fieldErrors.compareAt).toMatch(/supérieur/);
    }
    const ok = parseProductForm({ ...valid, compareAt: "249.90" });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.compareAtPrice).toBe(24990);
  });

  it("requires a positive valid price and a category", () => {
    for (const price of ["", "0", "abc", "-1"]) {
      const result = parseProductForm({ ...valid, price });
      expect(result.success).toBe(false);
      if (!result.success) expect(result.fieldErrors.price).toBeTruthy();
    }
    const noCategory = parseProductForm({ ...valid, categoryId: "" });
    expect(noCategory.success).toBe(false);
    if (!noCategory.success) expect(noCategory.fieldErrors.categoryId).toBeTruthy();
  });

  it("rejects an unknown status and a bad publication date", () => {
    expect(parseProductForm({ ...valid, status: "PUBLISHED" }).success).toBe(false);
    const result = parseProductForm({ ...valid, publishedAt: "not-a-date" });
    expect(result.success).toBe(false);
  });

  it("parses collections, featured flag and publication date", () => {
    const result = parseProductForm({
      ...valid,
      collectionIds: ["c1", "c2", "c1"],
      isFeatured: "on",
      publishedAt: "2026-10-01T09:30",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.collectionIds).toEqual(["c1", "c2"]);
    expect(result.data.isFeatured).toBe(true);
    expect(result.data.publishedAt).toBeInstanceOf(Date);
  });

  it("flags a name whose slug would be empty", () => {
    const result = parseProductForm({ ...valid, name_en: "!!!" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.fieldErrors.slug_en).toMatch(/invalide/);
  });
});
