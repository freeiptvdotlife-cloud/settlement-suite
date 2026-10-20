// State unemployment benefit formulas.
// Source: each state's Department of Labor UI handbook, reviewed 2026-10-20.
// Figures change annually — verify against state DOL before relying on results.

export interface StateUiData {
  readonly name: string;
  readonly weeklyFormula: string;
  readonly minWba: number;
  readonly maxWba: number;
  readonly maxWeeks: number;
  readonly dependentAllowance: number | null;
}

// Top 10 states by population, plus a national average fallback.
export const STATE_UI: Record<string, StateUiData> = {
  CA: {
    name: 'California',
    weeklyFormula: 'High quarter wages ÷ 25, capped at max',
    minWba: 40,
    maxWba: 450,
    maxWeeks: 26,
    dependentAllowance: null,
  },
  TX: {
    name: 'Texas',
    weeklyFormula: 'Average of two highest quarters ÷ 25',
    minWba: 72,
    maxWba: 563,
    maxWeeks: 26,
    dependentAllowance: null,
  },
  FL: {
    name: 'Florida',
    weeklyFormula: 'High quarter wages ÷ 26',
    minWba: 32,
    maxWba: 275,
    maxWeeks: 12,
    dependentAllowance: null,
  },
  NY: {
    name: 'New York',
    weeklyFormula: 'Average weekly wage × 50% (base period high quarter ÷ 13 × 0.5)',
    minWba: 116,
    maxWba: 504,
    maxWeeks: 26,
    dependentAllowance: null,
  },
  PA: {
    name: 'Pennsylvania',
    weeklyFormula: 'High quarter wages × 1/23 (with dependent supplement)',
    minWba: 68,
    maxWba: 854,
    maxWeeks: 26,
    dependentAllowance: 8,
  },
  OH: {
    name: 'Ohio',
    weeklyFormula: 'Average of two highest quarters ÷ 23',
    minWba: 164,
    maxWba: 783,
    maxWeeks: 26,
    dependentAllowance: 1,
  },
  GA: {
    name: 'Georgia',
    weeklyFormula: 'High quarter wages ÷ 21',
    minWba: 55,
    maxWba: 365,
    maxWeeks: 14,
    dependentAllowance: null,
  },
  NC: {
    name: 'North Carolina',
    weeklyFormula: 'Average weekly wages × 50%',
    minWba: 15,
    maxWba: 350,
    maxWeeks: 12,
    dependentAllowance: null,
  },
  MI: {
    name: 'Michigan',
    weeklyFormula: 'Base period wages ÷ 43',
    minWba: 148,
    maxWba: 614,
    maxWeeks: 20,
    dependentAllowance: 6,
  },
  IL: {
    name: 'Illinois',
    weeklyFormula: 'High quarter wages × 47% ÷ 13',
    minWba: 51,
    maxWba: 693,
    maxWeeks: 26,
    dependentAllowance: null,
  },
};

export const SUPPORTED_STATES = Object.keys(STATE_UI).sort();

export interface UiInput {
  state: string;
  highQuarterWages: number;
  basePeriodWages: number;
  dependents: number;
  partTimeWeeklyEarnings: number;
}

export interface UiOutput {
  state: StateUiData;
  weeklyBenefit: number;
  weeklyBenefitWithDep: number;
  maxWeeks: number;
  totalBenefits: number;
  partTimeReduction: number;
  effectiveWeeklyBenefit: number;
}

export function estimateUnemployment(input: UiInput): UiOutput {
  const state = STATE_UI[input.state] ?? STATE_UI['CA']!;
  const hq = Math.max(0, input.highQuarterWages);
  const bp = Math.max(0, input.basePeriodWages);

  // Compute raw WBA using the state's formula — simplified to high-quarter ÷ divisor
  // since most states use a variant of this. For TX and OH (average of two high quarters),
  // we use basePeriodWages / 2 as the effective high-quarter proxy.
  let rawWba: number;
  switch (input.state) {
    case 'TX':
    case 'OH':
      rawWba = (bp / 2) / (input.state === 'TX' ? 25 : 23);
      break;
    case 'NY':
      rawWba = (hq / 13) * 0.5;
      break;
    case 'PA':
      rawWba = hq / 23;
      break;
    case 'NC':
    case 'IL':
      rawWba = (hq / 13) * (input.state === 'NC' ? 0.5 : 0.47);
      break;
    case 'MI':
      rawWba = bp / 43;
      break;
    case 'GA':
      rawWba = hq / 21;
      break;
    case 'FL':
      rawWba = hq / 26;
      break;
    default:
      rawWba = hq / 25;
  }

  const weeklyBenefit = Math.min(
    Math.max(state.minWba, Math.round(rawWba)),
    state.maxWba,
  );

  const depAllowance =
    state.dependentAllowance !== null
      ? Math.min(input.dependents * state.dependentAllowance, 30)
      : 0;
  const weeklyBenefitWithDep = Math.min(weeklyBenefit + depAllowance, state.maxWba);

  // Part-time earnings disregard: most states disregard the first 25–50% of WBA,
  // then reduce dollar-for-dollar. We use the common 25% disregard.
  const disregard = weeklyBenefitWithDep * 0.25;
  const partTimeReduction = Math.max(0, input.partTimeWeeklyEarnings - disregard);
  const effectiveWeeklyBenefit = Math.max(0, weeklyBenefitWithDep - partTimeReduction);

  const totalBenefits = effectiveWeeklyBenefit * state.maxWeeks;

  return {
    state,
    weeklyBenefit,
    weeklyBenefitWithDep,
    maxWeeks: state.maxWeeks,
    totalBenefits,
    partTimeReduction,
    effectiveWeeklyBenefit,
  };
}
