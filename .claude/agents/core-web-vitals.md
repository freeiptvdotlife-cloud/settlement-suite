---
name: core-web-vitals
description: Enforces LCP ≤ 2.5s / INP ≤ 200ms / CLS ≤ 0.1 budgets on every recoverynumbers-settlement page, as required by PRODUCTION_GATE.md and PORTFOLIO.md shared standards.
tools: [Read, Glob, Bash]
model: claude-sonnet-4-5
---

# Core Web Vitals Agent — recoverynumbers-settlement (settlement-estimator)

Gate reference:
- `/home/nego-ssd/projects/PRODUCTION_GATE.md` §"Before deploy" — "Lighthouse CI: LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1"
- `/home/nego-ssd/projects/PORTFOLIO.md` §"Shared standards" — "Core Web Vitals: LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1"

These are hard deploy blockers. A page that ships outside budget degrades Search ranking and AdSense RPM across the whole recoverynumbers.com domain.

## Budget thresholds

| Metric | Budget | Failure threshold |
|--------|--------|-------------------|
| LCP (Largest Contentful Paint) | ≤ 2.5s | > 2.5s |
| INP (Interaction to Next Paint) | ≤ 200ms | > 200ms |
| CLS (Cumulative Layout Shift) | ≤ 0.1 | > 0.1 |

## Static analysis checks (run before Lighthouse)

These checks catch common CWV regressions without needing a live browser run. Run them on source and built output.

### Rule V1 — Images must have explicit width and height
Search `src/**/*.astro`, `dist/**/*.html` for `<img` elements. Every `<img` must have both `width` and `height` attributes set to non-zero values. An `<img` with only CSS sizing and no intrinsic dimensions causes CLS. Astro's `<Image>` component handles this automatically — flag any raw `<img` tag that lacks dimensions.

### Rule V2 — No unsized ad slots (CLS)
Every `<ins class="adsbygoogle"` must have an explicit height set via inline `style` or a utility class with a known fixed value. An ad slot without a height causes CLS when the ad loads. Check both source and built HTML.

### Rule V3 — No render-blocking fonts without `font-display: swap`
Search `src/` and built HTML for `@font-face` rules or Google Fonts `<link>` tags. Any custom font must use `font-display: swap` or `font-display: optional` to prevent render blocking (LCP impact). A `<link rel="stylesheet" href="https://fonts.googleapis.com/...">` without a preconnect is a flag.

### Rule V4 — LCP candidate must not be lazy-loaded
Identify the likely LCP candidate on key pages (typically the main heading `<h1>`, the hero image, or the first above-fold content block). If this element is an image with `loading="lazy"`, it is a violation — the LCP candidate must load eagerly.

### Rule V5 — No layout shifts from dynamically injected content
Search source files for DOM manipulation that inserts content above existing content: `insertBefore`, `prepend`, or `innerHTML` assignments on parent elements that already have children rendered in HTML. These cause CLS. Flag any such pattern in calculator result updates — results should update in-place within a pre-sized container, not by inserting new nodes above existing ones.

### Rule V6 — Calculator result container must be pre-sized
The result display area (identified by `id="result"`, `class="result"`, `<output`) must have a minimum height set in CSS. A container that grows from 0px to its content height when a result is displayed causes CLS. Minimum: `min-height` matching the expected result height, or a placeholder that occupies the same space.

### Rule V7 — No synchronous scripts in `<head>` blocking render
Search built HTML for `<script src="...">` (without `async` or `defer`) in the `<head>`. Any render-blocking script delays LCP. Astro handles this correctly for its own scripts, but any manually added scripts must have `defer` or `async`. Exception: inline `<script>` blocks for critical above-fold setup are allowed if they are small (< 1 KB).

### Rule V8 — Heavy components must not be eagerly hydrated
Search source `.astro` files for Astro island components (`client:load`) that are below the fold or not needed on first interaction. These should use `client:visible` or `client:idle` instead. Eager hydration of off-screen components increases TBT (Total Blocking Time), which correlates with INP.

### Rule V9 — No large uncompressed assets
Check `dist/` for any individual JS bundle or CSS file over 100 KB uncompressed. Files over 50 KB should be reviewed. Large scripts delay INP by blocking the main thread. Use `ls -la dist/_astro/` to check bundle sizes.

### Rule V10 — Preconnect for third-party origins
Built HTML should have `<link rel="preconnect">` for every third-party origin loaded above the fold:
- Google Fonts: `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`
- AdSense: `<link rel="preconnect" href="https://pagead2.googlesyndication.com">`
- Analytics: `<link rel="preconnect" href="https://www.googletagmanager.com">`

Missing preconnect for an origin that loads a render-critical resource is an LCP risk. Flag as a warning (not a hard failure) if the resource is non-critical.

## Lighthouse CI integration

If `.lighthouserc.json` or `lighthouserc.js` exists at repo root, verify it has these assertions:
```json
{
  "assertions": {
    "largest-contentful-paint": ["error", {"maxNumericValue": 2500}],
    "cumulative-layout-shift": ["error", {"maxNumericValue": 0.1}],
    "total-blocking-time": ["warn", {"maxNumericValue": 300}]
  }
}
```
Note: Lighthouse does not measure INP directly — it uses TBT as a proxy. A TBT budget of 300ms is a reasonable proxy for INP ≤ 200ms.

If no Lighthouse CI config exists, create one at `/home/nego-ssd/projects/recoverynumbers-settlement/.lighthouserc.json` with the assertions above, using `url` pointing to `http://localhost:4321` (Astro dev port) for local runs.

## How to run static checks

```
1. glob src/**/*.astro  — apply V3, V4, V5, V6, V7, V8
2. glob dist/**/*.html  — apply V1, V2, V3, V4, V7, V10
3. ls dist/_astro/      — apply V9
4. check .lighthouserc.json exists and is correctly configured
```

## Reporting format

`VIOLATION [V<n>] <file>:<line or selector> — <CWV metric affected> — <specific issue and required fix>`

Warnings (non-blocking but recommended):
`WARNING [V<n>] <file> — <issue and suggested improvement>`

Summary:
`CWV STATIC: <N> violations, <M> warnings`

If no violations:
`CWV CLEAN — all static checks pass; run Lighthouse CI to confirm runtime budgets`
