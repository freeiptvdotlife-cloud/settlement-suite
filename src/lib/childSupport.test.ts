import { describe, expect, it } from "vitest";
import { estimateChildSupport, estimateNewYorkChildSupport, estimateTexasChildSupport } from "./childSupport";

describe("estimateChildSupport", () => {
  it("scales guideline percent with number of children", () => {
    const one = estimateChildSupport({ payorMonthlyIncome: 5000, numberOfChildren: 1, payorOvernightsPct: 0 });
    const three = estimateChildSupport({ payorMonthlyIncome: 5000, numberOfChildren: 3, payorOvernightsPct: 0 });
    expect(three.baseObligation).toBeGreaterThan(one.baseObligation);
  });

  it("reduces the low estimate as overnights increase", () => {
    const noShare = estimateChildSupport({ payorMonthlyIncome: 5000, numberOfChildren: 2, payorOvernightsPct: 0 });
    const shared = estimateChildSupport({ payorMonthlyIncome: 5000, numberOfChildren: 2, payorOvernightsPct: 50 });
    expect(shared.estimateLow).toBeLessThan(noShare.estimateLow);
    expect(shared.estimateHigh).toBe(noShare.estimateHigh);
  });

  it("returns zero for zero income", () => {
    const result = estimateChildSupport({ payorMonthlyIncome: 0, numberOfChildren: 1, payorOvernightsPct: 0 });
    expect(result.estimateLow).toBe(0);
    expect(result.estimateHigh).toBe(0);
  });
});

describe("estimateTexasChildSupport", () => {
  it("uses 20% for 1 child on net resources", () => {
    const r = estimateTexasChildSupport({ payorGrossMonthly: 8_000, numberOfChildren: 1 });
    // net ≈ 6000, 20% = 1200
    expect(r.guidelinePercent).toBe(20);
    expect(r.estimatedNetResources).toBe(6_000);
    expect(r.monthlyObligation).toBe(1_200);
    expect(r.cappedAtMax).toBe(false);
  });

  it("caps net resources at the statutory maximum", () => {
    const r = estimateTexasChildSupport({ payorGrossMonthly: 20_000, numberOfChildren: 2 });
    // net ≈ 15000, capped at 9200; 25% of 9200 = 2300
    expect(r.cappedAtMax).toBe(true);
    expect(r.monthlyObligation).toBe(Math.round(9_200 * 0.25));
  });

  it("returns zero obligation for zero income", () => {
    const r = estimateTexasChildSupport({ payorGrossMonthly: 0, numberOfChildren: 1 });
    expect(r.monthlyObligation).toBe(0);
  });
});

describe("estimateNewYorkChildSupport", () => {
  it("applies CSSA percentage to combined income and splits pro-rata", () => {
    // payor $6k/mo, payee $2k/mo, 1 child → combined $96k/yr
    const r = estimateNewYorkChildSupport({ payorGrossMonthly: 6_000, payeeGrossMonthly: 2_000, numberOfChildren: 1 });
    expect(r.guidelinePercent).toBe(17);
    expect(r.combinedAnnualIncome).toBe(96_000);
    expect(r.cappedCombinedIncome).toBe(false);
    // 17% of $96k = $16320/yr = $1360/mo total; payor share 75%
    expect(r.basicMonthlyObligation).toBe(1_360);
    expect(r.payorSharePct).toBe(75);
    expect(r.payorMonthlyObligation).toBe(1_020);
  });

  it("caps combined income at the OTDA threshold", () => {
    const r = estimateNewYorkChildSupport({ payorGrossMonthly: 10_000, payeeGrossMonthly: 6_000, numberOfChildren: 2 });
    expect(r.cappedCombinedIncome).toBe(true);
    // 25% of $183k = $45750/yr = $3812.5 → 3813/mo
    expect(r.basicMonthlyObligation).toBe(Math.round((183_000 * 0.25) / 12));
  });

  it("returns zero when both incomes are zero", () => {
    const r = estimateNewYorkChildSupport({ payorGrossMonthly: 0, payeeGrossMonthly: 0, numberOfChildren: 1 });
    expect(r.payorMonthlyObligation).toBe(0);
  });
});
