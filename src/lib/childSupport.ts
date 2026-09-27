export type ChildCount = 1 | 2 | 3 | 4 | 5 | 6;

const PERCENT_BY_CHILDREN: Record<ChildCount, number> = {
  1: 17,
  2: 25,
  3: 29,
  4: 31,
  5: 34,
  6: 36
};

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
