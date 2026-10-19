import type { OrderStatus, ProductStatus, SizeGroup } from "@prisma/client";

// French labels of enums (admin UI is French only).

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: "Nouvelle",
  CONFIRMED: "Confirmée",
  SHIPPED: "Expédiée",
  DELIVERED: "Livrée",
  CANCELLED: "Annulée",
  RETURNED: "Retournée",
};

export const ORDER_STATUSES = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[];

/** Button label for moving an order to a status. */
export const ORDER_ACTION_LABELS: Record<OrderStatus, string> = {
  NEW: "Remettre en nouvelle",
  CONFIRMED: "Confirmer",
  SHIPPED: "Marquer expédiée",
  DELIVERED: "Marquer livrée",
  CANCELLED: "Annuler la commande",
  RETURNED: "Marquer retournée",
};

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  DRAFT: "Brouillon",
  ACTIVE: "Actif",
  ARCHIVED: "Archivé",
};

export const SIZE_GROUP_LABELS: Record<SizeGroup, string> = {
  TOP: "Hauts",
  BOTTOM: "Bas",
  SHOES: "Chaussures",
  ONE_SIZE: "Taille unique",
};

export const SIZE_GROUPS = Object.keys(SIZE_GROUP_LABELS) as SizeGroup[];

export const LOCALE_LABELS = { fr: "Français", ar: "العربية", en: "English" } as const;

const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  numberingSystem: "latn",
});
const dayFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  numberingSystem: "latn",
});

export const formatDateTime = (date: Date) => dateFormat.format(date);
export const formatDay = (date: Date) => dayFormat.format(date);
