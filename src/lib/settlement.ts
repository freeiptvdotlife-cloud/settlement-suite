export type InjurySeverity = "minor" | "moderate" | "severe" | "catastrophic";

const MULTIPLIER_RANGE: Record<InjurySeverity, [number, number]> = {
  minor: [1.5, 2],
  moderate: [2, 3],
  severe: [3, 4],
  catastrophic: [4, 5.5]
};

export interface SettlementInput {
  medicalExpenses: number;
  futureMedicalExpenses: number;
  lostWages: number;
  futureLostWages: number;
  severity: InjurySeverity;
  comparativeFaultPct: number; // 0-100, your share of fault
}

export interface SettlementOutput {
  economicDamages: number;
  estimateLow: number;
  estimateHigh: number;
  multiplierRange: [number, number];
}

export function estimateSettlement(input: SettlementInput): SettlementOutput {
  const economicDamages =
    input.medicalExpenses +
    input.futureMedicalExpenses +
    input.lostWages +
    input.futureLostWages;

  const [multLow, multHigh] = MULTIPLIER_RANGE[input.severity];
  const faultFactor = 1 - Math.min(Math.max(input.comparativeFaultPct, 0), 100) / 100;

  const generalDamagesLow = economicDamages * multLow;
  const generalDamagesHigh = economicDamages * multHigh;

  const estimateLow = (economicDamages + generalDamagesLow) * faultFactor;
  const estimateHigh = (economicDamages + generalDamagesHigh) * faultFactor;

  return {
    economicDamages,
    estimateLow: Math.round(estimateLow),
    estimateHigh: Math.round(estimateHigh),
    multiplierRange: [multLow, multHigh]
  };
}
