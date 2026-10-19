# Design system

Source of truth: `../ui-ux/` (relative to `store/`):
- `DESIGN (1).md` — style guide, component specs, do/don't, layout notes.
- `tokens.json` — W3C tokens. `variables.css` — CSS custom properties. `theme.css` — Tailwind v4 `@theme`.
Copy `theme.css` into `src/styles/theme.css` and extend there. Read `DESIGN (1).md` before building a new visual component.

The kit was extracted from shop.app: it is a spec, not code. It has no components, no dark mode, no RTL, no icon set, no breakpoints.

## Core tokens (summary — exact values in the kit files)
- Colors: canvas `#f2f4f5`, surface white `#ffffff`, ink `#000000`, border `#ebebeb`, muted text `#787574`, stone `#cccccc`, fog `#acb0aa`, slate `#332f2d`, ash `#665a54`, accent violet `#5433eb`, accent wash `#c0b5f3`.
- Accent is one token (`--color-accent` + wash). Brand change = edit that token only.
- Type: kit font GT Standard is commercial → we use **Inter** (Latin) and **IBM Plex Sans Arabic** (AR). Scale 9/10/11/12/14/16/20px from the kit; add display sizes for hero/titles as project tokens. Body 14px (16px on inputs to avoid iOS zoom).
- Spacing: 4…64px kit scale. Page max-width 1200px, section gap 64px, element gap 12px.
- Radius: card 28px, inner image 20px, pills/buttons/inputs/chips 9999px.
- Shadows: `sm`, `sm-2`, `lg`, `lg-2` (violet glow, for accent CTA only).

## Kit inconsistencies — resolved
- Pill radius: 9999px (ignore the "pills 20px" table entry).
- Input border: `rgba(0,0,0,0.1)`.
- Body text: 14px default, 16px for form inputs.
- `sm-2` shadow: use the full value from `variables.css`.

## Kit components to implement
Product Image Tile, Category Pill, Search Input with accent submit, Category Section Header, Carousel Arrow, Mini Product Thumbnail Strip, Hero Floating Product Card (home hero), Brand Spotlight Card (collection tiles), Cookie consent (minimal, privacy-first).
Not used: Sidebar Nav Rail (we use a top header), App Download Banner.

## Project extensions (add as tokens, same style)
- Buttons: primary (ink bg, white text), accent (violet, for main CTA "Ajouter au panier"/"Commander"), secondary (white + border), ghost, disabled; hover/active/focus states. All pills.
- Semantic colors: `success`, `error`, `warning`, `info` + their wash variants; sale badge = error red.
- Focus ring: 2px accent, 2px offset, always visible on keyboard focus.
- Badges: Sale `-X%`, Nouveau, Rupture, Stock faible.
- Form fields: label, input pill, select, textarea (20px radius), error text, helper text.
- Drawer, Modal, Toast, Skeleton loaders, Quantity stepper, Size button, Color swatch.
- Breakpoints: Tailwind defaults (`sm 640`, `md 768`, `lg 1024`, `xl 1280`), mobile-first; product grid 2 cols mobile, 3 md, 4 lg.
- Motion: 150–250ms ease-out; respect `prefers-reduced-motion`.
- Icons: one outline icon set (lucide-react), stroke ink, 1.5px.

## Accessibility
Contrast ≥ 4.5:1 for text — check muted `#787574` on canvas and white on violet before use; darken via token if needed. Tap targets ≥ 44px.
