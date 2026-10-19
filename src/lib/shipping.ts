export type ShippingRules = {
  /** Default flat fee, in centimes. */
  shippingFee: number;
  /** Free shipping from this subtotal (centimes). */
  freeShippingThreshold: number;
  /** Per-city override of the flat fee (centimes), if the city has one. */
  cityShippingFee?: number | null;
};

/** 0 when the subtotal reaches the free-shipping threshold, else city fee or flat fee. */
export function computeShipping(subtotal: number, rules: ShippingRules): number {
  if (subtotal >= rules.freeShippingThreshold) return 0;
  return rules.cityShippingFee ?? rules.shippingFee;
}
