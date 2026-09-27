import { describe, expect, it } from "vitest";
import { estimateChildSupport } from "./childSupport";

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
