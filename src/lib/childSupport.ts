export type ChildCount = 1 | 2 | 3 | 4 | 5 | 6;

const PERCENT_BY_CHILDREN: Record<ChildCount, number> = {
  1: 17,
  2: 25,
  3: 29,
  4: 31,
  5: 34,
  6: 36
};

// ── Texas (Fam. Code §154.125) ─────────────────────────────────────────────
const TEXAS_PERCENT: Record<ChildCount, number> = { 1: 20, 2: 25, 3: 30, 4: 35, 5: 40, 6: 40 };
/** Approximate monthly net resources cap (Rule 154.125(a), updated periodically). */
const TEXAS_NET_CAP = 9_200;

export interface TexasChildSupportInput {
  payorGrossMonthly: number;
  numberOfChildren: ChildCount;
}
export interface TexasChildSupportOutput {
  guidelinePercent: number;
  estimatedNetResources: number;
  monthlyObligation: number;
  cappedAtMax: boolean;
  netResourcesCap: number;
}

export function estimateTexasChildSupport(input: TexasChildSupportInput): TexasChildSupportOutput {
  const guidelinePercent = TEXAS_PERCENT[input.numberOfChildren];
  const estimatedNetResources = Math.round(input.payorGrossMonthly * 0.75);
  const cappedNet = Math.min(estimatedNetResources, TEXAS_NET_CAP);
  return {
    guidelinePercent,
    estimatedNetResources,
    monthlyObligation: Math.round(cappedNet * (guidelinePercent / 100)),
    cappedAtMax: estimatedNetResources > TEXAS_NET_CAP,
    netResourcesCap: TEXAS_NET_CAP,
  };
}

// ── New York (CSSA — Family Court Act §413) ────────────────────────────────
const NY_PERCENT: Record<ChildCount, number> = { 1: 17, 2: 25, 3: 29, 4: 31, 5: 35, 6: 35 };
/** Combined parental income cap (OTDA 2025 adjustment). */
const NY_INCOME_CAP = 183_000;

export interface NewYorkChildSupportInput {
  payorGrossMonthly: number;
  payeeGrossMonthly: number;
  numberOfChildren: ChildCount;
}
export interface NewYorkChildSupportOutput {
  guidelinePercent: number;
  combinedAnnualIncome: number;
  cappedCombinedIncome: boolean;
  payorSharePct: number;
  basicMonthlyObligation: number;
  payorMonthlyObligation: number;
  incomeCap: number;
}

export function estimateNewYorkChildSupport(input: NewYorkChildSupportInput): NewYorkChildSupportOutput {
  const guidelinePercent = NY_PERCENT[input.numberOfChildren];
  const combinedAnnualIncome = (input.payorGrossMonthly + input.payeeGrossMonthly) * 12;
  const applicableIncome = Math.min(combinedAnnualIncome, NY_INCOME_CAP);
  const basicMonthlyObligation = Math.round((applicableIncome * (guidelinePercent / 100)) / 12);
  const combined = input.payorGrossMonthly + input.payeeGrossMonthly;
  const payorSharePct = combined > 0 ? Math.round((input.payorGrossMonthly / combined) * 100) : 0;
  return {
    guidelinePercent,
    combinedAnnualIncome,
    cappedCombinedIncome: combinedAnnualIncome > NY_INCOME_CAP,
    payorSharePct,
    basicMonthlyObligation,
    payorMonthlyObligation: Math.round(basicMonthlyObligation * (payorSharePct / 100)),
    incomeCap: NY_INCOME_CAP,
  };
}

export interface ChildSupportInput {
  payorMonthlyIncome: number;
  numberOfChildren: ChildCount;
  payorOvernightsPct: number; // 0-50, share of overnights with the paying parent
}

export interface ChildSupportOutput {
  guidelinePercent: number;
  baseObligation: number;
  estimateLow: number;
  estimateHigh: number;
}

export function estimateChildSupport(input: ChildSupportInput): ChildSupportOutput {
  const guidelinePercent = PERCENT_BY_CHILDREN[input.numberOfChildren];
  const baseObligation = input.payorMonthlyIncome * (guidelinePercent / 100);

  const overnights = Math.min(Math.max(input.payorOvernightsPct, 0), 50);
  const parentingTimeAdjustment = 1 - (overnights / 100) * 0.5;

  const estimateLow = baseObligation * parentingTimeAdjustment;
  const estimateHigh = baseObligation;

  return {
    guidelinePercent,
    baseObligation: Math.round(baseObligation),
    estimateLow: Math.round(estimateLow),
    estimateHigh: Math.round(estimateHigh)
  };
}
