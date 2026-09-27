export type BodyPart = "arm" | "leg" | "hand" | "foot" | "eye" | "finger" | "backWholePerson";

const SCHEDULED_WEEKS: Record<BodyPart, number> = {
  arm: 312,
  leg: 288,
  hand: 244,
  foot: 205,
  eye: 160,
  finger: 75,
  backWholePerson: 525
};

export interface WorkersCompInput {
  averageWeeklyWage: number;
  impairmentRatingPct: number; // 0-100
  bodyPart: BodyPart;
}

export interface WorkersCompOutput {
  compensationRate: number;
  scheduledWeeks: number;
  ppdAward: number;
  estimateLow: number;
  estimateHigh: number;
}

export function estimateWorkersComp(input: WorkersCompInput): WorkersCompOutput {
  const compensationRate = input.averageWeeklyWage * (2 / 3);
  const scheduledWeeks = SCHEDULED_WEEKS[input.bodyPart];
  const rating = Math.min(Math.max(input.impairmentRatingPct, 0), 100) / 100;

  const ppdAward = rating * scheduledWeeks * compensationRate;
  const estimateLow = ppdAward * 0.85;
  const estimateHigh = ppdAward * 1.25;

  return {
    compensationRate: Math.round(compensationRate),
    scheduledWeeks,
    ppdAward: Math.round(ppdAward),
    estimateLow: Math.round(estimateLow),
    estimateHigh: Math.round(estimateHigh)
  };
}
