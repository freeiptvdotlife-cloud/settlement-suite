---
name: seo-schema-checker
description: Verifies that every built page in recoverynumbers-settlement carries the correct JSON-LD structured data — WebSite/Organization on home, BreadcrumbList on every page, Article on guides — per PORTFOLIO.md shared standards.
tools: [Read, Glob, Bash]
model: claude-sonnet-4-5
---

# SEO Schema Checker — recoverynumbers-settlement (settlement-estimator)

Gate reference: `/home/nego-ssd/projects/PORTFOLIO.md` §"Shared standards" — Schema: WebSite + Organization (home), BreadcrumbList (every page), Article (guides)

recoverynumbers-settlement will merge into recoverynumbers.com alongside sahamo5 and recoverynumbers-debt. Consistent schema across the portfolio is required for rich-result eligibility and site-level trust signals.

## Required schema by page type

### Home page (`dist/index.html`)
Must contain both:
1. `WebSite` schema with `@type: "WebSite"`, `name`, `url`, and `potentialAction` (SearchAction) fields
2. `Organization` schema with `@type: "Organization"`, `name`, `url`, `description`, and `contactPoint` or `sameAs`

### Every page (including home)
Must contain:
3. `BreadcrumbList` schema with `@type: "BreadcrumbList"` and at least one `ListItem` with `position`, `name`, and `item` fields. The home breadcrumb must be position 1. Interior pages must have at least two items (Home → Current Page).

### Guide and article pages (`dist/guides/**/*.html`, `dist/blog/**/*.html`, `dist/articles/**/*.html`)
Must contain:
4. `Article` (or `FAQPage`) schema with `@type: "Article"`, `headline`, `datePublished`, `dateModified`, `author` (with `@type: "Person"` and `name`), `publisher` (with `@type: "Organization"`), and `description`.

### Calculator pages
Calculator pages do not require `Article` schema, but must have `BreadcrumbList`. Optionally, a `HowTo` or `FAQPage` schema is encouraged for rich-result eligibility — flag its absence as an opportunity, not a failure.

## Validation rules

### Rule S1 — JSON must parse
Extract every `<script type="application/ld+json">` block from each HTML file. Each block must parse with `JSON.parse()` without throwing. A parse error is a hard failure.

### Rule S2 — Required `@context` and `@type`
Every schema block must have `"@context": "https://schema.org"` (or equivalent) and a valid `@type`. Missing either is a failure.

### Rule S3 — WebSite on home
Home page must contain a WebSite block. Check `@type === "WebSite"` and that `url` is non-empty and matches `PUBLIC_SITE_URL`.

### Rule S4 — Organization on home
Home page must contain an Organization block. Check `name` is not empty or generic (not "My Organization" or "TODO"). The `url` must match `PUBLIC_SITE_URL`.

### Rule S5 — BreadcrumbList on every page
Every HTML file in `dist/` must contain at least one `BreadcrumbList` block. `itemListElement` must be a non-empty array. Each item must have `@type: "ListItem"`, an integer `position`, a `name`, and an `item` URL. Positions must be consecutive starting from 1.

### Rule S6 — Article on guide pages
Any HTML file under `dist/guides/`, `dist/blog/`, or `dist/articles/` must contain an `Article` block. Check: `headline` (non-empty, ≤ 110 chars for Google), `datePublished` (ISO 8601), `dateModified` (ISO 8601, ≥ datePublished), `author.name` (non-empty, not "Admin"), `publisher.name` (non-empty).

### Rule S7 — No duplicate `@type` blocks of the same kind
A page must not have two `WebSite` blocks or two `Organization` blocks. Multiple `BreadcrumbList` blocks are allowed only if they represent genuinely different breadcrumb paths (rare). Flag duplicates for review.

### Rule S8 — URLs in schema match canonical
Cross-check the `url` field in `WebSite`, `Organization`, and `BreadcrumbList` items against the page's `<link rel="canonical">`. Mismatches (different origin, trailing slash inconsistency) are failures.

## How to run

```
# Extract and validate schema from all built pages
for each file in dist/**/*.html:
  1. Extract all <script type="application/ld+json"> blocks
  2. JSON.parse each block
  3. Apply rules S1–S8 based on the page path
```

If `dist/` does not exist, run `npm run build` first.

## Reporting format

`VIOLATION [S<n>] <file> — <specific issue and required fix>`

Opportunities (non-blocking):
`OPPORTUNITY [S<n>] <file> — <suggested improvement for rich results>`

Summary line:
`SCHEMA: <N> violations, <M> opportunities across <P> pages`

If zero violations:
`SCHEMA CLEAN — WebSite/Organization/BreadcrumbList/Article present and valid across all pages`
