// Fails (exit 1) when messages/{fr,ar,en}.json do not have the same keys.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const LOCALES = ["fr", "ar", "en"] as const;
const REFERENCE = "fr";

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

function flatten(value: Json, prefix = ""): string[] {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return Object.entries(value).flatMap(([key, child]) =>
      flatten(child, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [prefix];
}

function loadKeys(locale: string): Set<string> {
  const file = join(process.cwd(), "messages", `${locale}.json`);
  return new Set(flatten(JSON.parse(readFileSync(file, "utf8")) as Json));
}

const keys = Object.fromEntries(LOCALES.map((l) => [l, loadKeys(l)]));
const reference = keys[REFERENCE];
let failed = false;

for (const locale of LOCALES) {
  if (locale === REFERENCE) continue;
  const missing = [...reference].filter((k) => !keys[locale].has(k));
  const extra = [...keys[locale]].filter((k) => !reference.has(k));
  if (missing.length > 0 || extra.length > 0) {
    failed = true;
    console.error(`messages/${locale}.json differs from ${REFERENCE}.json`);
    for (const k of missing) console.error(`  missing: ${k}`);
    for (const k of extra) console.error(`  extra:   ${k}`);
  }
}

if (failed) {
  process.exit(1);
}
console.log(
  `i18n OK: ${reference.size} keys in each of ${LOCALES.join(", ")}.`,
);
