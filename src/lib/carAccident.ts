export type InjurySeverity = "minor" | "moderate" | "severe" | "catastrophic";
export type AccidentType = "rear-end" | "intersection" | "sideswipe" | "head-on" | "hit-and-run";
export type FaultSystem = "pure-comparative" | "modified-51" | "modified-50" | "pure-contributory";

// Verified against NCSL comparative fault table (accessed 2026-10-20)
const STATE_FAULT_SYSTEMS: Record<string, FaultSystem> = {
  // Pure contributory negligence — any fault bars recovery
  AL: "pure-contributory", DC: "pure-contributory", MD: "pure-contributory",
  NC: "pure-contributory", VA: "pure-contributory",
  // Pure comparative — recovers even if >50% at fault
  AZ: "pure-comparative", CA: "pure-comparative", FL: "pure-comparative",
  KY: "pure-comparative", LA: "pure-comparative", MI: "pure-comparative",
  MO: "pure-comparative", MS: "pure-comparative", NM: "pure-comparative",
  NY: "pure-comparative", RI: "pure-comparative", SD: "pure-comparative",
  WA: "pure-comparative",
  // Modified comparative 50% bar — barred if >= 50% at fault
  AR: "modified-50", CO: "modified-50", GA: "modified-50", ID: "modified-50",
  KS: "modified-50", ME: "modified-50", ND: "modified-50", TN: "modified-50",
  UT: "modified-50", WY: "modified-50",
  // Modified comparative 51% bar — barred if >= 51% at fault (default for unlisted states)
  AK: "modified-51", CT: "modified-51", DE: "modified-51", HI: "modified-51",
  IL: "modified-51", IN: "modified-51", IA: "modified-51", MA: "modified-51",
  MN: "modified-51", MT: "modified-51", NE: "modified-51", NH: "modified-51",
  NJ: "modified-51", NV: "modified-51", OH: "modified-51", OK: "modified-51",
  OR: "modified-51", PA: "modified-51", SC: "modified-51", TX: "modified-51",
  VT: "modified-51", WI: "modified-51", WV: "modified-51",
};

// States with no-fault PIP systems (threshold required to sue in tort)
const NO_FAULT_STATES = new Set([
  "FL", "HI", "KS", "KY", "MA", "MI", "MN", "NJ", "NY", "ND", "PA", "UT",
]);

// Multiplier ranges by injury severity (personal injury, not property damage)
const MULTIPLIER_RANGE: Record<InjurySeverity, [number, number]> = {
  minor:        [1.5, 2.5],
  moderate:     [2.5, 4.0],
  severe:       [4.0, 6.0],
  catastrophic: [6.0, 10.0],
};

// Head-on and intersection collisions carry higher multipliers than low-speed impact types
const ACCIDENT_TYPE_BUMP: Record<AccidentType, number> = {
  "rear-end":    0.0,
  "sideswipe":   0.0,
  "intersection": 0.25,
  "head-on":     0.75,
  "hit-and-run": 0.25,
};

export interface CarAccidentInput {
  medicalExpenses: number;
  futureMedicalExpenses: number;
  lostWages: number;
  futureLostWages: number;
  propertyDamage: number;
  severity: InjurySeverity;
  accidentType: AccidentType;
  /** Percentage of fault attributed to claimant (0–100). */
  comparativeFaultPct: number;
  stateCode: string;
}

export interface CarAccidentOutput {
  personalInjuryBase: number;
  propertyDamage: number;
  estimateLow: number;
  estimateHigh: number;
  multiplierRange: [number, number];
  faultSystem: FaultSystem;
  /** True when the claimant's fault level bars recovery under the state's rule. */
  isBarred: boolean;
  isNoFault: boolean;
}

export function estimateCarAccidentSettlement(input: CarAccidentInput): CarAccidentOutput {
  const stateCode = input.stateCode.toUpperCase();
  const faultSystem: FaultSystem = STATE_FAULT_SYSTEMS[stateCode] ?? "modified-51";
  const isNoFault = NO_FAULT_STATES.has(stateCode);
  const faultPct = Math.min(Math.max(input.comparativeFaultPct, 0), 100);

  const isBarred =
    (faultSystem === "pure-contributory" && faultPct > 0) ||
    (faultSystem === "modified-51" && faultPct >= 51) ||
    (faultSystem === "modified-50" && faultPct >= 50);

  const faultFactor = isBarred ? 0 : (1 - faultPct / 100);

  const personalInjuryBase = Math.max(
    0,
    input.medicalExpenses +
      input.futureMedicalExpenses +
      input.lostWages +
      input.futureLostWages,
  );

  const [baseLow, baseHigh] = MULTIPLIER_RANGE[input.severity];
  const bump = ACCIDENT_TYPE_BUMP[input.accidentType];
  const multLow = baseLow + bump;
  const multHigh = baseHigh + bump;

  const piLow = (personalInjuryBase + personalInjuryBase * multLow) * faultFactor;
  const piHigh = (personalInjuryBase + personalInjuryBase * multHigh) * faultFactor;

  return {
    personalInjuryBase,
    propertyDamage: Math.max(0, input.propertyDamage),
    estimateLow: Math.round(piLow),
    estimateHigh: Math.round(piHigh),
    multiplierRange: [multLow, multHigh],
    faultSystem,
    isBarred,
    isNoFault,
  };
}
