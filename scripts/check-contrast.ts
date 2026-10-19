// Fails (exit 1) when a text/background token pair is below its WCAG contrast
// ratio in the light or the dark theme. Reads src/styles/theme.css.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const css = readFileSync(join(process.cwd(), "src", "styles", "theme.css"), "utf8");

const DARK_BLOCK = /:root\[data-theme="dark"\]\s*\{([^}]*)\}/;
const dark = css.match(DARK_BLOCK)?.[1] ?? "";
const light = css.replace(DARK_BLOCK, "");

function declarations(source: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const [, name, value] of source.matchAll(/(--color-[\w-]+)\s*:\s*([^;]+);/g)) {
    map.set(name, value.trim());
  }
  return map;
}

const themes = {
  light: declarations(light),
  dark: new Map([...declarations(light), ...declarations(dark)]),
};

function resolve(theme: Map<string, string>, name: string): string {
  const value = theme.get(`--color-${name}`);
  if (!value) throw new Error(`Unknown token: ${name}`);
  const alias = value.match(/^var\((--color-[\w-]+)\)$/);
  return alias ? resolve(theme, alias[1].slice("--color-".length)) : value;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const channel = parseInt(hex.slice(i, i + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// [text token, background token, minimum ratio]. 4.5 = text; 3 = large text.
const PAIRS: [string, string, number][] = [
  ["ink", "canvas", 4.5],
  ["ink", "surface", 4.5],
  ["ink", "tile", 4.5],
  ["ink", "accent-wash", 4.5],
  ["muted", "canvas", 4.5],
  ["muted", "surface", 4.5],
  ["muted", "tile", 4.5],
  ["muted", "line", 4.5],
  ["slate-ink", "canvas", 4.5],
  ["slate-ink", "surface", 4.5],
  ["on-ink", "ink", 4.5],
  ["on-ink", "slate-ink", 4.5],
  ["on-accent", "accent", 4.5],
  ["on-accent", "accent-hover", 4.5],
  ["on-accent", "error", 4.5],
  ["accent", "canvas", 4.5],
  ["accent", "surface", 4.5],
  ["on-footer", "footer", 4.5],
  ["footer-muted", "footer", 4.5],
  ...["success", "error", "warning", "info"].flatMap((c): [string, string, number][] => [
    [c, "canvas", 4.5],
    [c, "surface", 4.5],
    [c, `${c}-wash`, 4.5],
  ]),
];

let failed = false;
for (const [name, theme] of Object.entries(themes)) {
  for (const [fg, bg, min] of PAIRS) {
    const value = ratio(resolve(theme, fg), resolve(theme, bg));
    if (value < min) {
      failed = true;
      console.error(`${name}: ${fg} on ${bg} = ${value.toFixed(2)}:1 (needs ${min}:1)`);
    }
  }
}

if (failed) process.exit(1);
console.log(`contrast OK: ${PAIRS.length} pairs x ${Object.keys(themes).length} themes.`);
