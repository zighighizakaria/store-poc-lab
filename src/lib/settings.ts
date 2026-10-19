import { cache } from "react";
import { db } from "@/lib/db";
import { siteConfig } from "../../site.config";

export type StoreSettings = {
  shippingFee: number;
  freeShippingThreshold: number;
  whatsappNumber: string;
  lowStockThreshold: number;
};

// Singleton row, with defaults when it is missing.
export const getSettings = cache(async (): Promise<StoreSettings> => {
  const row = await db.settings.findUnique({ where: { id: "singleton" } });
  return {
    shippingFee: row?.shippingFee ?? 3000,
    freeShippingThreshold: row?.freeShippingThreshold ?? 49900,
    whatsappNumber: row?.whatsappNumber ?? siteConfig.whatsapp.number,
    lowStockThreshold: row?.lowStockThreshold ?? 3,
  };
});
