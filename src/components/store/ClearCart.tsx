"use client";

import { useEffect } from "react";
import { useCart } from "./CartProvider";

/** Empties the cart once, on the confirmation page of a just-placed order. */
export function ClearCart() {
  const { clear } = useCart();
  useEffect(() => {
    clear();
  }, [clear]);
  return null;
}
