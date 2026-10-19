import type { CardProduct } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { ProductCard } from "./ProductCard";

type Props = {
  products: CardProduct[];
  /** Columns on large screens: 4 (default) or 3 (next to a filter sidebar). */
  columns?: 3 | 4;
  priorityCount?: number;
  className?: string;
};

// Product grid: 2 columns on mobile, 3 on md, 4 on lg (3 with a sidebar).
export function ProductGrid({ products, columns = 4, priorityCount = 0, className }: Props) {
  return (
    <ul
      className={cn(
        "grid grid-cols-2 gap-12 md:grid-cols-3 md:gap-16",
        columns === 4 && "lg:grid-cols-4",
        className,
      )}
    >
      {products.map((product, index) => (
        <li key={product.id}>
          <ProductCard product={product} priority={index < priorityCount} />
        </li>
      ))}
    </ul>
  );
}
