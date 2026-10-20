// SSA bend points and COLA data for PIA calculation.
// Source: SSA.gov/oact/cola/bendpoints.html and SSA.gov/oact/cola/colaseries.html
// Updated annually — last reviewed 2026-10-20.

interface BendPoints {
  readonly first: number;
  readonly second: number;
}

// Bend points for the year the insured turns 62 (or becomes disabled, whichever applies for SSDI).
// Key = the year the PIA computation year applies.
export const BEND_POINTS: Record<number, BendPoints> = {
  2020: { first: 960, second: 5_785 },
  2021: { first: 996, second: 6_002 },
  2022: { first: 1_024, second: 6_172 },
  2023: { first: 1_115, second: 6_721 },
  2024: { first: 1_174, second: 7_078 },
  2025: { first: 1_226, second: 7_391 },
};

// COLA adjustments by year (fraction, e.g. 0.087 = 8.7%).
// Used to project a historical PIA forward to today's value.
const COLA_BY_YEAR: Record<number, number> = {
  2020: 0.013,
  2021: 0.059,
  2022: 0.087,
  2023: 0.032,
  2024: 0.025,
  2025: 0.025,
};

const CURRENT_YEAR = 2025;

// Standard Medicare Part B premium (2025). Deducted from most SSDI checks.
const MEDICARE_PART_B_MONTHLY = 185.0;

export interface SsdiPiaInput {
  /** Average Indexed Monthly Earnings — the key SSA input. */
  aime: number;
  /** Year the disability began (determines which bend points apply). Defaults to current year. */
  benefitYear?: number;
  /** Number of eligible dependents (spouse or children) for family max estimate. */
  dependents?: number;
}

export interface SsdiPiaOutput {
  pia: number;
  piaAfterMedicare: number;
  annualBenefit: number;
  familyMax: number | null;
  familyMaxPerDependent: number | null;
  bendPoints: BendPoints;
  benefitYear: number;
}

/** Compute PIA from AIME using SSA bend-point formula. */
function computePia(aime: number, bp: BendPoints): number {
  const tier1 = Math.min(aime, bp.first);
  const tier2 = Math.max(0, Math.min(aime, bp.second) - bp.first);
  const tier3 = Math.max(0, aime - bp.second);
  const raw = tier1 * 0.9 + tier2 * 0.32 + tier3 * 0.15;
  // SSA rounds PIA down to the nearest $0.10
  return Math.floor(raw * 10) / 10;
}

/** Project a base PIA forward with COLA through the current year. */
function applyCola(pia: number, fromYear: number): number {
  let result = pia;
  for (let y = fromYear + 1; y <= CURRENT_YEAR; y++) {
    const cola = COLA_BY_YEAR[y] ?? 0.025;
    result = result * (1 + cola);
  }
  // COLA rounding: SSA rounds to the nearest $0.10 each year
  return Math.round(result * 10) / 10;
}

/**
 * SSA family maximum formula (2024 bend points: $1,308 / $1,889 / $2,463).
 * Returns the maximum total monthly benefit payable to the family.
 */
function familyMaximum(pia: number): number {
  // 2024-2025 family max formula bend points
  const bp1 = 1_308;
  const bp2 = 1_889;
  const bp3 = 2_463;
  const t1 = Math.min(pia, bp1) * 1.5;
  const t2 = Math.max(0, Math.min(pia, bp2) - bp1) * 2.72;
  const t3 = Math.max(0, Math.min(pia, bp3) - bp2) * 1.34;
  const t4 = Math.max(0, pia - bp3) * 1.75;
  return Math.floor((t1 + t2 + t3 + t4) * 10) / 10;
}

export function estimateSsdiPia(input: SsdiPiaInput): SsdiPiaOutput {
  const benefitYear = Math.max(2020, Math.min(input.benefitYear ?? CURRENT_YEAR, CURRENT_YEAR));
  const bp = BEND_POINTS[benefitYear] ?? BEND_POINTS[2024]!;

  const pia = computePia(input.aime, bp);
  const piaToday = benefitYear < CURRENT_YEAR ? applyCola(pia, benefitYear) : pia;
  const piaAfterMedicare = Math.max(0, piaToday - MEDICARE_PART_B_MONTHLY);

  const dependents = input.dependents ?? 0;
  let familyMax: number | null = null;
  let familyMaxPerDependent: number | null = null;
  if (dependents > 0) {
    const fMax = familyMaximum(piaToday);
    familyMax = fMax;
    // The worker gets their full PIA; the remainder is split equally among dependents
    const dependentPool = Math.max(0, fMax - piaToday);
    familyMaxPerDependent = Math.floor((dependentPool / dependents) * 10) / 10;
  }

  return {
    pia: piaToday,
    piaAfterMedicare,
    annualBenefit: Math.round(piaToday * 12),
    familyMax,
    familyMaxPerDependent,
    bendPoints: bp,
    benefitYear,
  };
}
