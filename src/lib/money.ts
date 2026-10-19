const CURRENCY = "MAD";

// Fixed locale + Latin digits so prices look the same in fr, ar and en.
const wholeFormat = new Intl.NumberFormat("en-US", {
  numberingSystem: "latn",
  maximumFractionDigits: 0,
});

/**
 * Format an amount stored in centimes (MAD x 100).
 * 19900 -> "199 MAD", 19950 -> "199.50 MAD", 129900 -> "1 299 MAD".
 */
export function formatMoney(centimes: number): string {
  const sign = centimes < 0 ? "-" : "";
  const abs = Math.abs(Math.round(centimes));
  const whole = wholeFormat.format(Math.floor(abs / 100)).replace(/,/g, " ");
  const cents = abs % 100;
  const fraction = cents === 0 ? "" : `.${String(cents).padStart(2, "0")}`;
  return `${sign}${whole}${fraction} ${CURRENCY}`;
}
