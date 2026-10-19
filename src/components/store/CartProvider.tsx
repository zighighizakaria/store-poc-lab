"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

// Client cart: only {variantId, quantity} is stored (localStorage). Prices,
// names and stock always come from the server (/api/cart), never from here.

const STORAGE_KEY = "store.cart.v1";
const MAX_QUANTITY = 99;

export type CartItem = { variantId: string; quantity: number };

const EMPTY: CartItem[] = [];
const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedItems: CartItem[] = EMPTY;

function parse(raw: string | null): CartItem[] {
  if (!raw) return EMPTY;
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return EMPTY;
    const items = data.filter(
      (entry): entry is CartItem =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as CartItem).variantId === "string" &&
        Number.isInteger((entry as CartItem).quantity) &&
        (entry as CartItem).quantity > 0,
    );
    return items.length > 0 ? items : EMPTY;
  } catch {
    return EMPTY;
  }
}

// Stable snapshot reference: re-parse only when the stored string changed.
function readItems(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedItems = parse(raw);
    }
  } catch {
    // Storage blocked: keep the in-memory cart.
  }
  return cachedItems;
}

function writeItems(items: CartItem[]) {
  cachedItems = items.length > 0 ? items : EMPTY;
  try {
    cachedRaw = cachedItems === EMPTY ? null : JSON.stringify(cachedItems);
    if (cachedRaw === null) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, cachedRaw);
  } catch {
    // Storage blocked: the cart lives in memory for this tab only.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener); // other tabs
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

type CartContextValue = {
  items: CartItem[];
  count: number;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  add: (variantId: string, quantity?: number) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const items = useSyncExternalStore(subscribe, readItems, () => EMPTY);
  const [isOpen, setOpen] = useState(false);

  const open = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);

  const setQuantity = useCallback((variantId: string, quantity: number) => {
    const current = readItems();
    const next = Math.min(MAX_QUANTITY, Math.floor(quantity));
    if (next <= 0) {
      writeItems(current.filter((item) => item.variantId !== variantId));
      return;
    }
    const exists = current.some((item) => item.variantId === variantId);
    writeItems(
      exists
        ? current.map((item) =>
            item.variantId === variantId ? { ...item, quantity: next } : item,
          )
        : [...current, { variantId, quantity: next }],
    );
  }, []);

  const add = useCallback(
    (variantId: string, quantity = 1) => {
      const existing = readItems().find((item) => item.variantId === variantId);
      setQuantity(variantId, (existing?.quantity ?? 0) + quantity);
    },
    [setQuantity],
  );

  const remove = useCallback(
    (variantId: string) => setQuantity(variantId, 0),
    [setQuantity],
  );

  const clear = useCallback(() => writeItems([]), []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.reduce((sum, item) => sum + item.quantity, 0),
      isOpen,
      open,
      close,
      add,
      setQuantity,
      remove,
      clear,
    }),
    [items, isOpen, open, close, add, setQuantity, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside <CartProvider>");
  return context;
}
