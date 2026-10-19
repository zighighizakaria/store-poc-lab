// Moroccan phone numbers. Accepted: 0[5-7]XXXXXXXX, +212[5-7]XXXXXXXX,
// 00212... and 212..., with spaces, dots, dashes or parentheses, and Arabic-Indic
// digits. Stored normalized as +212XXXXXXXXX (E.164).

const ARABIC_INDIC = "٠١٢٣٤٥٦٧٨٩";
const EXTENDED_ARABIC_INDIC = "۰۱۲۳۴۵۶۷۸۹";

function toLatinDigits(value: string): string {
  return value.replace(/[٠-٩۰-۹]/g, (ch) => {
    const a = ARABIC_INDIC.indexOf(ch);
    return String(a >= 0 ? a : EXTENDED_ARABIC_INDIC.indexOf(ch));
  });
}

/** "+212612345678" for a valid Moroccan number, otherwise null. */
export function normalizeMoroccanPhone(input: string): string | null {
  const compact = toLatinDigits(input).replace(/[\s.\-()]/g, "");
  const match =
    /^(?:\+212|00212|212)0?([5-7]\d{8})$/.exec(compact) ?? /^0([5-7]\d{8})$/.exec(compact);
  return match ? `+212${match[1]}` : null;
}
