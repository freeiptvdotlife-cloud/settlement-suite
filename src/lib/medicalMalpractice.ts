export type InjurySeverity = "minor" | "moderate" | "severe" | "catastrophic";
export type MalpracticeType =
  | "surgical-error"
  | "misdiagnosis"
  | "delayed-diagnosis"
  | "medication-error"
  | "birth-injury"
  | "anesthesia-error"
  | "failure-to-treat";

// Non-economic damage caps by state (null = no statutory cap or cap struck down by courts).
// Values in dollars as of 2026-10-20. Source: NCSL medical malpractice laws table;
// CA figure reflects AB 35 (2022) phased increase ($500k non-death as of Jan 1, 2026).
// See docs/methodology.md for per-state citations.
export const STATE_NONECONOMIC_CAPS: Record<string, number | null> = {
  AL: 400_000,
  CA: 500_000,
  CO: 300_000,
  FL: null,   // McCall v. United States (2014) + North Broward (2017) struck caps
  GA: null,   // Atlanta Oculoplastic Surgery v. Nestlehutt (2010) struck cap
  ID: 250_000,
  KS: 350_000,
  MD: 905_000, // CJP § 11-108 indexed to inflation; ~$905k FY2026
  MI: 480_000, // higher cap for cases involving permanent injuries (MCL 600.1483)
  MO: null,   // Watts v. Lester E. Cox Medical Centers (2012) struck cap
  MT: 250_000,
  NC: 500_000,
  NE: null,   // NE has a total-damages cap ($2.25M) not a non-economic cap
  NV: 350_000,
  NH: null,   // RSA 507-C:7 struck down 2012
  OH: 350_000, // higher for substantial physical deformity/loss of limb
  OR: 500_000,
  SD: 500_000,
  TX: 250_000, // per health care provider; aggregate ≤$750k (single hospital cap $250k)
  UT: 450_000, // adjusts annually for inflation; ~$450k 2026
  WI: 750_000,
  WV: 500_000,
};

// Malpractice cases carry higher multiplier ranges than general PI —
// breach of a professional duty and diagnostic failures command larger jury awards.
const MULTIPLIER_RANGE: Record<InjurySeverity, [number, number]> = {
  minor:        [2.0, 3.5],
  moderate:     [3.0, 5.0],
  severe:       [5.0, 8.0],
  catastrophic: [7.0, 12.0],
};

// Malpractice type affects the multiplier bump.
// Birth injuries and anesthesia errors routinely produce the highest jury awards;
// delayed/failure-to-treat cases are harder to prove causation.
const MALPRACTICE_TYPE_BUMP: Record<MalpracticeType, number> = {
  "birth-injury":      1.0,
  "anesthesia-error":  0.75,
  "surgical-error":    0.5,
  "medication-error":  0.25,
  "misdiagnosis":      0.0,
  "delayed-diagnosis": 0.0,
  "failure-to-treat":  0.0,
};

export interface MedicalMalpracticeInput {
  medicalExpenses: number;
  futureMedicalExpenses: number;
  lostWages: number;
  futureLostWages: number;
  severity: InjurySeverity;
  malpracticeType: MalpracticeType;
  stateCode: string;
}

export interface MedicalMalpracticeOutput {
  economicDamages: number;
  estimateLow: number;
  estimateHigh: number;
  /** Non-economic component before cap: pain & suffering range. */
  nonEconomicLow: number;
  nonEconomicHigh: number;
  multiplierRange: [number, number];
  /** Null if the state has no non-economic cap. */
  nonEconomicCap: number | null;
  /** True when the state cap reduces the non-economic high end. */
  capApplies: boolean;
}

export function estimateMedicalMalpracticeSettlement(
  input: MedicalMalpracticeInput,
): MedicalMalpracticeOutput {
  const stateCode = input.stateCode.toUpperCase();
  const nonEconomicCap = stateCode in STATE_NONECONOMIC_CAPS
    ? STATE_NONECONOMIC_CAPS[stateCode]
    : null;

  const economicDamages = Math.max(
    0,
    input.medicalExpenses +
      input.futureMedicalExpenses +
      input.lostWages +
      input.futureLostWages,
  );

  const [baseLow, baseHigh] = MULTIPLIER_RANGE[input.severity];
  const bump = MALPRACTICE_TYPE_BUMP[input.malpracticeType];
  const multLow = baseLow + bump;
  const multHigh = baseHigh + bump;

  // Pain & suffering = economic × multiplier
  const rawNonEconomicLow  = economicDamages * multLow;
  const rawNonEconomicHigh = economicDamages * multHigh;

  const nonEconomicLow  = nonEconomicCap !== null ? Math.min(rawNonEconomicLow, nonEconomicCap)  : rawNonEconomicLow;
  const nonEconomicHigh = nonEconomicCap !== null ? Math.min(rawNonEconomicHigh, nonEconomicCap) : rawNonEconomicHigh;

  const capApplies =
    nonEconomicCap !== null &&
    (rawNonEconomicLow > nonEconomicCap || rawNonEconomicHigh > nonEconomicCap);

  return {
    economicDamages,
    estimateLow:      Math.round(economicDamages + nonEconomicLow),
    estimateHigh:     Math.round(economicDamages + nonEconomicHigh),
    nonEconomicLow:   Math.round(nonEconomicLow),
    nonEconomicHigh:  Math.round(nonEconomicHigh),
    multiplierRange:  [multLow, multHigh],
    nonEconomicCap,
    capApplies,
  };
}
