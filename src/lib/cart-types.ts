// Shape of the /api/cart response (server prices, never taken from the client).
export type CartLine = {
  variantId: string;
  name: string;
  href: string;
  colorName: string;
  sizeLabel: string;
  image: string | null;
  /** Current server price of one unit, in centimes. */
  unitPrice: number;
  compareAtPrice: number | null;
  stock: number;
  /** Requested quantity clamped to stock (0 when sold out). */
  quantity: number;
  available: boolean;
};

export type CartResponse = {
  lines: CartLine[];
  /** Sum of available lines at server prices, in centimes. */
  subtotal: number;
  shippingFee: number;
  freeShippingThreshold: number;
};
