import { db } from "@/lib/db";
import { getTranslation } from "@/lib/i18n";

export type CategoryOption = {
  id: string;
  parentId: string | null;
  /** "Vêtements › T-shirts" */
  label: string;
  /** Own French name. */
  name: string;
  depth: number;
  isActive: boolean;
  position: number;
  image: string | null;
  /** Ids of this category and all its descendants (a category cannot move under itself). */
  subtreeIds: string[];
};

/** The whole category tree (inactive ones too), flattened depth-first in display order. */
export async function loadCategoryOptions(): Promise<CategoryOption[]> {
  const rows = await db.category.findMany({
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    include: { translations: true },
  });
  const children = new Map<string | null, typeof rows>();
  for (const row of rows) {
    const list = children.get(row.parentId) ?? [];
    list.push(row);
    children.set(row.parentId, list);
  }

  const out: CategoryOption[] = [];
  const walk = (parentId: string | null, trail: string[], depth: number): string[] => {
    const ids: string[] = [];
    for (const row of children.get(parentId) ?? []) {
      const name = getTranslation(row, "fr").name;
      const index = out.length;
      out.push({
        id: row.id,
        parentId: row.parentId,
        label: [...trail, name].join(" › "),
        name,
        depth,
        isActive: row.isActive,
        position: row.position,
        image: row.image,
        subtreeIds: [],
      });
      const below = walk(row.id, [...trail, name], depth + 1);
      out[index].subtreeIds = [row.id, ...below];
      ids.push(row.id, ...below);
    }
    return ids;
  };
  walk(null, [], 0);
  return out;
}

export async function loadCollectionOptions() {
  const rows = await db.collection.findMany({
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    include: { translations: true },
  });
  return rows.map((row) => ({
    id: row.id,
    name: getTranslation(row, "fr").name,
    isActive: row.isActive,
  }));
}

/** Size guides for a select. They have no name: label = position + header row of the FR table. */
export async function loadSizeGuideOptions() {
  const rows = await db.sizeGuide.findMany({
    orderBy: { createdAt: "asc" },
    include: { translations: true },
  });
  return rows.map((row, index) => {
    const header = getTranslation(row, "fr")
      .content.split("\n")[0]
      .replace(/\|/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return { id: row.id, label: `Guide ${index + 1}${header ? ` (${header})` : ""}` };
  });
}

/** Non-archived products (id + French name) for pickers. */
export async function loadProductOptions() {
  const rows = await db.product.findMany({
    where: { status: { not: "ARCHIVED" } },
    orderBy: { createdAt: "desc" },
    take: 1000,
    include: { translations: true },
  });
  return rows.map((row) => ({ id: row.id, name: getTranslation(row, "fr").name }));
}
