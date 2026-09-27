# Autonomous Deep Research: Highest-Yield Micro-Utility Niche Audit

**Status:** Autonomous market audit — findings + build spec
**Date:** 2026-09-20
**Scope:** Blind macro-economic scan for a solo-developer, zero-hosting-cost, AdSense/AdMob-monetized micro-utility niche
**Mirrors:** Haul Numbers portfolio strategy (client-side calculator tools, Astro web + Expo/Capacitor WebView Android wrapper)

---

## 1. Executive Summary

The digital ad auction in 2026 rewards **advertiser Customer Lifetime Value (CLV) density**, not raw traffic volume. A tool with 300 monthly active users querying "IFTA fuel tax calculator" sits in the same second-price auction pool as an insurance comparison blog with 50,000 visitors — because the advertisers bidding (commercial insurers, freight factoring firms, ELD/telematics SaaS vendors) value the *click*, not the *page*. This audit scores niches on that principle rather than on SEO difficulty or search volume alone.

**Winner: B2B Trucking & Owner-Operator Financial Compliance Calculators** — a direct sibling vertical to the Haul Numbers portfolio, reusing its audience, its "zero-login instant math" UX thesis, and its cross-listing pattern into Android, while opening a fresh keyword surface (fuel tax, factoring, HOS/compliance) not yet covered by that portfolio.

---

## 2. Scoring Model

Every candidate niche is scored 1–10 on three axes and combined with fixed weights. The weights encode the three revenue/system objectives given in the brief (yield, rankability, compliance-safe determinism).

| Axis | Weight | What it measures |
|---|---|---|
| **ABD** — Advertiser Bid Density | 0.40 | Estimated CLV of advertisers who bid on this content (insurance, factoring, SaaS, lending vs. consumer/entertainment) — this is the direct driver of AdSense/AdMob RPM at low traffic |
| **KC** — Keyword Cardinality | 0.35 | Number of distinct, real, long-tail query variants the niche supports (per-state, per-vehicle-class, per-scenario) — determines how many indexable, low-competition pages a single tool engine can generate |
| **CSPV** — Client-Side Processing Viability | 0.25 | Whether the tool's core logic is a pure, deterministic function of user-supplied inputs and static reference tables (no server, no personal data, no third-party live API) — this is what makes zero-hosting-cost *and* Google-policy-safe (no scraped/user-generated content risk) |

```
NicheScore = 0.40·ABD + 0.35·KC + 0.25·CSPV
```

Sources informing the ABD estimates: current-generation AdSense CPC surveys placing insurance ($45–$75), legal ($35–$110), and B2B SaaS/finance ($20–$55) keywords at the top of the 2026 rate card, and AdMob/mobile-mediation benchmarks confirming finance- and business-vertical apps clear 2–3x the eCPM of general-utility or entertainment apps in Tier-1 geos.

---

## 3. Top 3 Autonomous Vertical Discoveries

### 3.1 Scoring Table

| Niche | ABD | KC | CSPV | **Score** | Order-of-magnitude CPC | Order-of-magnitude RPM (at 100–500 sessions/day) |
|---|---|---|---|---|---|---|
| **A. Trucking / Owner-Operator Financial & Compliance Calculators** | 8 | 9 | 10 | **8.75** | $8–$35 CPC (factoring, ELD, commercial insurance, fuel cards) | $15–$45 RPM |
| B. Commercial & Cyber-Liability Insurance Estimator Tools | 9 | 6 | 7 | 7.65 | $25–$75+ CPC (insurance is the single highest CPC vertical in existence) | $20–$60 RPM, but volatile — see below |
| C. B2B SaaS Procurement TCO/ROI Calculators | 7 | 7 | 9 | 7.45 | $15–$40 CPC (SaaS/B2B lead-gen advertisers) | $12–$30 RPM |

### 3.2 Vertical Notes

**A — Trucking/Owner-Operator Finance & Compliance.** Advertisers bidding into this content — freight factoring companies, commercial truck/cargo insurers, ELD & telematics SaaS, fuel card programs, CDL recruiting — all carry per-acquisition values in the thousands of dollars, so they sustain aggressive display bids even against a tiny audience. Top-ranking pages today are dominated by (a) trucking-industry blogs with dense text and no interactive tool, (b) legacy fleet-management platforms (TruckingOffice-style) that gate the calculator behind a paid account, and (c) state DOT/IRP PDF documents. All three are outrankable on pure UX (instant, zero-login, mobile-first math). Keyword cardinality is very high because almost every calculation is naturally parameterized by U.S. state/province, vehicle class, and fuel type — one calculator engine yields dozens of long-tail indexable page variants.

**B — Commercial/Cyber Insurance Estimators.** Highest raw CPC ceiling of the three, but two structural problems cap its real score: (1) top-ranking competitors are the insurers' own lead-gen funnels and comparison marketplaces (NerdWallet-class sites) — not weak, they are extremely well-optimized and hard to outrank; (2) a true "estimator" for insurance premiums cannot be fully deterministic client-side math — actuarial pricing depends on carrier-side underwriting data that a static tool can only approximate, which risks presenting values that read as real quotes (a compliance and credibility problem, not just a ranking one).

**C — B2B SaaS TCO/ROI Calculators.** Strong CSPV and decent ABD, but keyword cardinality is thinner — the natural parameter space (seats, contract term, discount %) produces fewer genuinely distinct long-tail search queries than a geography/vehicle-class-driven niche, and enterprise buyers researching TCO are a much smaller absolute query volume than owner-operators searching fuel-tax and factoring terms.

---

## 4. Winning Niche

**B2B Trucking & Owner-Operator Financial Compliance Calculators.**

This is selected as the single definitive niche: it posts the highest composite score, it is a **direct sibling vertical** to the existing Haul Numbers portfolio (same audience, same distribution channels, same operational playbook), and its keyword surface is untouched by that portfolio today, so it adds incremental reach rather than cannibalizing it.

---

## 5. Modular Architecture — 4 Client-Side Tools

All four tools share one **pure TypeScript calculation engine** (`packages/engine/`) with zero I/O, zero network calls, and zero mutable global state — every function is `(input, referenceTables) => output`. Reference tables (tax rates, HOS rules, factoring benchmarks) are versioned static JSON checked into the repo and updated on a quarterly release cadence, never fetched at runtime. This is what makes the product a static-hostable, zero-backend build.

### 5.1 Tool 1 — IFTA Fuel Tax Liability Calculator

- **Input**
  ```ts
  interface IftaInput {
    quarter: string;                 // e.g. "2026-Q3"
    legs: Array<{
      jurisdiction: string;          // state/province code
      milesDriven: number;
      fuelPurchasedGallons: number;
      fuelType: "diesel" | "gasoline" | "propane" | "cng";
    }>;
    totalFuelPurchasedGallons: number;
  }
  ```
- **Reference table:** static per-quarter IFTA tax-rate matrix (jurisdiction × fuel type), sourced from the published IFTA rate schedule and re-imported each quarter.
- **Algebraic core:**
  ```
  fleetMPG = Σ(milesDriven) / totalFuelPurchasedGallons
  for each leg:
    taxableGallons = milesDriven / fleetMPG
    taxDue = taxableGallons × rate[jurisdiction][fuelType]
    taxPaidCredit = fuelPurchasedGallons × rate[jurisdiction][fuelType]
    netLiability = taxDue − taxPaidCredit
  totalNetLiability = Σ(netLiability across legs)
  ```
- **Output:** per-jurisdiction net due/credit table + total quarterly liability, exportable as CSV/PDF client-side (no upload).

### 5.2 Tool 2 — Owner-Operator Cost-Per-Mile & Breakeven Calculator

- **Input**
  ```ts
  interface CpmInput {
    fixedCostsMonthly: { truckPayment: number; insurance: number; permits: number; eldSubscription: number };
    variableCostsPerMile: { fuelPrice: number; truckMpg: number; maintenanceReserve: number; tireReserve: number };
    milesPerMonth: number;
    targetProfitMarginPct: number;
  }
  ```
- **Algebraic core:**
  ```
  fixedCPM = Σ(fixedCostsMonthly) / milesPerMonth
  fuelCPM  = fuelPrice / truckMpg
  variableCPM = fuelCPM + maintenanceReserve + tireReserve
  totalCPM = fixedCPM + variableCPM
  breakevenRatePerMile = totalCPM
  targetRatePerMile = totalCPM / (1 − targetProfitMarginPct/100)
  ```
- **Output:** total CPM, breakeven $/mile, recommended quoting rate at target margin, sensitivity table (rate at 0/5/10/15/20% margin).

### 5.3 Tool 3 — Freight Factoring & Quick-Pay Discount Calculator

- **Input**
  ```ts
  interface FactoringInput {
    invoiceAmount: number;
    advanceRatePct: number;    // e.g. 97
    factoringFeePct: number;   // e.g. 3
    reservePct: number;        // held back, released later
    daysToPayment: number;     // for effective-APR framing
  }
  ```
- **Algebraic core:**
  ```
  advanceAmount = invoiceAmount × advanceRatePct/100
  factoringFee  = invoiceAmount × factoringFeePct/100
  reserveHeld   = invoiceAmount × reservePct/100
  netAdvanceToCarrier = advanceAmount − factoringFee
  effectiveAnnualRatePct = (factoringFeePct/100) × (365/daysToPayment) × 100
  ```
- **Output:** net funds today, fee in dollars, reserve released later, effective-APR-equivalent framing for comparing factoring offers.

### 5.4 Tool 4 — Hours-of-Service (HOS) Remaining-Time Calculator

- **Input**
  ```ts
  interface HosInput {
    cycleType: "70/8" | "60/7";
    dutyLogEntries: Array<{ status: "driving" | "onDuty" | "offDuty" | "sleeperBerth"; startIso: string; endIso: string }>;
    lastRestartIso: string | null;
  }
  ```
- **Reference table:** static FMCSA HOS rule constants (11-hour driving limit, 14-hour on-duty window, 30-minute break threshold, 70/8 and 60/7 cycle caps), versioned for rule-change updates.
- **Algebraic core:** a deterministic state-machine walk over `dutyLogEntries` that accumulates driving/on-duty minutes within rolling windows and subtracts from the fixed FMCSA limits.
- **Output:** remaining drive time, remaining on-duty window, hours until 34-hour restart eligibility, and a flag list of any rule the entered log would violate — framed as an educational estimate, not a compliance certification.

### 5.5 Zero-CLS Ad Container Contract (applies to all 4 tools)

Every view ships a rigid, pre-reserved ad slot component so no layout shift occurs during ad load and no accidental click risk is introduced near interactive controls:

```html
<div class="ad-slot ad-slot--banner" style="min-height: 250px; min-width: 300px; contain: layout size;">
  <!-- ad unit mounts here; container never resizes -->
</div>
```

Rules: (1) fixed `min-height`/`min-width` reserved before any ad script executes, matching the exact unit size requested; (2) minimum 24px dead-space margin between any ad container and the nearest calculator input/button; (3) no ad auto-refresh; (4) no more than one ad unit above the fold and one below the primary result, per Google's own layout guidance; (5) ad containers never rendered inside a scroll-snap or swipe gesture area shared with functional controls.

---

## 6. Google Policy & Compliance Checklist

- [ ] 100% of on-page numeric output is a deterministic function of user input + static reference tables — no scraped, user-generated, or AI-generated editorial content presented as fact
- [ ] Every tool page includes a plain-language "how this is calculated" disclosure and an "estimate, not legal/tax/compliance advice" disclaimer
- [ ] No dark patterns: no fake "close" buttons, no ad creative styled to mimic UI controls
- [ ] All ad containers pre-sized (Section 5.5) — zero Cumulative Layout Shift from ad injection, verified via Lighthouse CLS = 0 on every route
- [ ] No incentivized or forced ad interaction (no "click to see your result" gating)
- [ ] AdMob: rewarded/interstitial placements only at natural break points (e.g., after export, never mid-input), never on app launch
- [ ] Reference-data tables (IFTA rates, HOS rules) carry a visible "last updated" date and quarterly review cadence
- [ ] Privacy: no login, no PII collection; if analytics are added, cookie/consent banner defaults to the most privacy-preserving option

---

## 7. Phased Implementation Checklist

**Phase 0 — Foundation**
- [ ] Scaffold monorepo: `packages/engine` (pure TS calculation core + unit tests), `apps/web` (Astro), `apps/android` (Expo/Capacitor WebView shell)
- [ ] Define and check in versioned static reference-data JSON (IFTA rates, HOS constants) with a documented quarterly update process

**Phase 1 — Calculation Engine**
- [ ] Implement the four pure functions from Section 5 with full unit-test coverage (edge cases: zero miles, missing jurisdictions, malformed duty logs)
- [ ] No DOM, no network, no dates-from-`Date.now()` inside the engine — all time/context passed in as arguments, for testability and future offline reuse

**Phase 2 — Astro Web Shell**
- [ ] Build one route per tool, mobile-first, zero-login
- [ ] Wire the zero-CLS ad container contract (Section 5.5) into a shared `<AdSlot>` Astro component
- [ ] Integrate AdSense; verify CLS=0 and ad-to-content spacing in Lighthouse + manual mobile pass

**Phase 3 — Programmatic SEO Surface**
- [ ] Generate per-jurisdiction / per-vehicle-class static page variants from the keyword-cardinality axis (e.g., `/ifta-calculator/texas`, `/cost-per-mile/reefer`) — same engine, parameterized copy
- [ ] Add `SoftwareApplication` + `FAQPage` structured data per tool page

**Phase 4 — Android Wrapper**
- [ ] Wrap the built Astro output in Expo/Capacitor WebView, matching the existing Haul Numbers portfolio packaging pattern
- [ ] Integrate AdMob (banner + interstitial at natural breakpoints only), respecting Section 6 checklist
- [ ] Play Store listing, content rating, and Ads/Privacy declarations

**Phase 5 — Launch & Auction Validation**
- [ ] Soft-launch to 100–500 sessions; confirm advertiser bid density assumption by observing realized RPM against Section 3 estimates
- [ ] A/B ad density (1 vs. 2 units per page) against RPM and bounce rate

**Phase 6 — Portfolio Scale-Out**
- [ ] Once RPM assumptions are confirmed in production, replicate the same 4-tool/Astro/Expo pattern into the next-ranked niche from Section 3 (B2B SaaS TCO calculators) as the next portfolio entry
