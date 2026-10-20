import { describe, it, expect } from 'vitest';
import { estimateUnemployment, STATE_UI } from './unemployment';

describe('estimateUnemployment', () => {
  it('computes California WBA as high quarter ÷ 25, clamped to max', () => {
    const result = estimateUnemployment({
      state: 'CA',
      highQuarterWages: 11_250, // 11250 ÷ 25 = 450 = CA max
      basePeriodWages: 45_000,
      dependents: 0,
      partTimeWeeklyEarnings: 0,
    });
    expect(result.weeklyBenefit).toBe(450);
    expect(result.maxWeeks).toBe(26);
    expect(result.totalBenefits).toBe(450 * 26);
  });

  it('clamps CA WBA to minimum when wages are low', () => {
    const result = estimateUnemployment({
      state: 'CA',
      highQuarterWages: 500, // 500 ÷ 25 = 20, below $40 min
      basePeriodWages: 2_000,
      dependents: 0,
      partTimeWeeklyEarnings: 0,
    });
    expect(result.weeklyBenefit).toBe(40); // CA min
  });

  it('computes Florida WBA as high quarter ÷ 26', () => {
    const result = estimateUnemployment({
      state: 'FL',
      highQuarterWages: 5_200, // 5200 ÷ 26 = 200
      basePeriodWages: 20_000,
      dependents: 0,
      partTimeWeeklyEarnings: 0,
    });
    expect(result.weeklyBenefit).toBe(200);
    expect(result.maxWeeks).toBe(12); // FL only 12 weeks
  });

  it('adds dependent allowance for Pennsylvania', () => {
    const result = estimateUnemployment({
      state: 'PA',
      highQuarterWages: 9_200, // 9200 ÷ 23 = 400
      basePeriodWages: 36_800,
      dependents: 3,
      partTimeWeeklyEarnings: 0,
    });
    expect(result.weeklyBenefit).toBe(400);
    // PA dependent allowance = $8/dep; 3 × 8 = 24
    expect(result.weeklyBenefitWithDep).toBe(424);
  });

  it('caps dependent allowance at $30 total', () => {
    const result = estimateUnemployment({
      state: 'PA',
      highQuarterWages: 9_200,
      basePeriodWages: 36_800,
      dependents: 10, // 10 × 8 = 80, capped at 30
      partTimeWeeklyEarnings: 0,
    });
    expect(result.weeklyBenefitWithDep).toBe(400 + 30);
  });

  it('does not add dependent allowance for states without one', () => {
    const result = estimateUnemployment({
      state: 'CA',
      highQuarterWages: 10_000,
      basePeriodWages: 40_000,
      dependents: 5,
      partTimeWeeklyEarnings: 0,
    });
    expect(result.weeklyBenefitWithDep).toBe(result.weeklyBenefit);
  });

  it('applies part-time earnings disregard and reduces benefit dollar-for-dollar above it', () => {
    const result = estimateUnemployment({
      state: 'CA',
      highQuarterWages: 10_000, // WBA = 400
      basePeriodWages: 40_000,
      dependents: 0,
      partTimeWeeklyEarnings: 200, // disregard = 400×0.25=100; reduction = 200-100 = 100
    });
    expect(result.weeklyBenefit).toBe(400);
    expect(result.partTimeReduction).toBe(100);
    expect(result.effectiveWeeklyBenefit).toBe(300);
  });

  it('effectiveWeeklyBenefit is never negative', () => {
    const result = estimateUnemployment({
      state: 'CA',
      highQuarterWages: 2_000, // WBA ~= 80
      basePeriodWages: 8_000,
      dependents: 0,
      partTimeWeeklyEarnings: 500, // far exceeds WBA
    });
    expect(result.effectiveWeeklyBenefit).toBe(0);
  });

  it('falls back to CA formula for unknown state code', () => {
    const result = estimateUnemployment({
      state: 'ZZ',
      highQuarterWages: 10_000,
      basePeriodWages: 40_000,
      dependents: 0,
      partTimeWeeklyEarnings: 0,
    });
    // Falls back to CA: high quarter ÷ 25 = 400, within CA bounds
    expect(result.state).toEqual(STATE_UI['CA']);
    expect(result.weeklyBenefit).toBe(400);
  });

  it('returns correct state metadata', () => {
    const result = estimateUnemployment({
      state: 'NY',
      highQuarterWages: 13_000,
      basePeriodWages: 52_000,
      dependents: 0,
      partTimeWeeklyEarnings: 0,
    });
    expect(result.state.name).toBe('New York');
    expect(result.state.maxWba).toBe(504);
  });
});
