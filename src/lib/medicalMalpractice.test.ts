import { describe, expect, it } from "vitest";
import { estimateMedicalMalpracticeSettlement } from "./medicalMalpractice";

const base = {
  medicalExpenses: 50_000,
  futureMedicalExpenses: 20_000,
  lostWages: 15_000,
  futureLostWages: 0,
  severity: "moderate" as const,
  malpracticeType: "misdiagnosis" as const,
  stateCode: "TX",
};

describe("estimateMedicalMalpracticeSettlement", () => {
  it("estimate is greater than economic damages", () => {
    const result = estimateMedicalMalpracticeSettlement(base);
    expect(result.estimateLow).toBeGreaterThan(result.economicDamages);
  });

  it("catastrophic produces higher estimate than moderate at same inputs (no-cap state)", () => {
    const moderate = estimateMedicalMalpracticeSettlement({ ...base, stateCode: "FL" });
    const catastrophic = estimateMedicalMalpracticeSettlement({ ...base, stateCode: "FL", severity: "catastrophic" });
    expect(catastrophic.estimateLow).toBeGreaterThan(moderate.estimateLow);
  });

  it("birth-injury bump raises estimate above misdiagnosis (no-cap state)", () => {
    // Use FL (no cap) so the bump is not absorbed by TX's $250k non-economic cap
    const misdiagnosis = estimateMedicalMalpracticeSettlement({ ...base, stateCode: "FL" });
    const birthInjury = estimateMedicalMalpracticeSettlement({ ...base, stateCode: "FL", malpracticeType: "birth-injury" });
    expect(birthInjury.estimateLow).toBeGreaterThan(misdiagnosis.estimateLow);
  });

  it("surgical-error is higher than delayed-diagnosis at same severity (no-cap state)", () => {
    const delayed = estimateMedicalMalpracticeSettlement({ ...base, stateCode: "FL", malpracticeType: "delayed-diagnosis" });
    const surgical = estimateMedicalMalpracticeSettlement({ ...base, stateCode: "FL", malpracticeType: "surgical-error" });
    expect(surgical.estimateLow).toBeGreaterThan(delayed.estimateLow);
  });

  it("TX non-economic cap ($250k) reduces high end when damages are large enough", () => {
    const result = estimateMedicalMalpracticeSettlement({
      ...base,
      medicalExpenses: 200_000,
      futureMedicalExpenses: 100_000,
      lostWages: 100_000,
      severity: "catastrophic",
      malpracticeType: "birth-injury",
      stateCode: "TX",
    });
    expect(result.nonEconomicCap).toBe(250_000);
    expect(result.capApplies).toBe(true);
    // non-economic component is capped at $250k
    expect(result.nonEconomicHigh).toBe(250_000);
    expect(result.estimateHigh).toBe(400_000 + 250_000); // economic + cap
  });

  it("TX non-economic cap does not apply for small claims", () => {
    const result = estimateMedicalMalpracticeSettlement({
      medicalExpenses: 5_000,
      futureMedicalExpenses: 0,
      lostWages: 0,
      futureLostWages: 0,
      severity: "minor",
      malpracticeType: "misdiagnosis",
      stateCode: "TX",
    });
    expect(result.capApplies).toBe(false);
    // 5000 * 2.0 = 10000 < 250k cap
    expect(result.nonEconomicHigh).toBeLessThan(250_000);
  });

  it("CA non-economic cap ($500k) applies for large severe cases", () => {
    const result = estimateMedicalMalpracticeSettlement({
      medicalExpenses: 200_000,
      futureMedicalExpenses: 100_000,
      lostWages: 100_000,
      futureLostWages: 50_000,
      severity: "severe",
      malpracticeType: "surgical-error",
      stateCode: "CA",
    });
    expect(result.nonEconomicCap).toBe(500_000);
    expect(result.capApplies).toBe(true);
    expect(result.nonEconomicHigh).toBe(500_000);
  });

  it("FL has no non-economic cap (struck down)", () => {
    const result = estimateMedicalMalpracticeSettlement({ ...base, stateCode: "FL" });
    expect(result.nonEconomicCap).toBeNull();
    expect(result.capApplies).toBe(false);
  });

  it("GA has no non-economic cap (struck down)", () => {
    const result = estimateMedicalMalpracticeSettlement({ ...base, stateCode: "GA" });
    expect(result.nonEconomicCap).toBeNull();
    expect(result.capApplies).toBe(false);
  });

  it("states not in the cap table have no cap", () => {
    // WY is not in the cap table
    const result = estimateMedicalMalpracticeSettlement({ ...base, stateCode: "WY" });
    expect(result.nonEconomicCap).toBeNull();
    expect(result.capApplies).toBe(false);
  });

  it("returns zero for zero injury inputs", () => {
    const result = estimateMedicalMalpracticeSettlement({
      ...base,
      medicalExpenses: 0,
      futureMedicalExpenses: 0,
      lostWages: 0,
      futureLostWages: 0,
    });
    expect(result.estimateLow).toBe(0);
    expect(result.estimateHigh).toBe(0);
    expect(result.economicDamages).toBe(0);
    expect(result.nonEconomicLow).toBe(0);
    expect(result.capApplies).toBe(false);
  });

  it("worked example — $50k medical, $15k wages, moderate, misdiagnosis, no-cap state", () => {
    // economicDamages = 50000 + 0 + 15000 + 0 = 65000
    // multiplier moderate misdiagnosis = [3.0, 5.0] + 0 bump
    // nonEconomicLow  = 65000 * 3.0 = 195000
    // nonEconomicHigh = 65000 * 5.0 = 325000
    // estimateLow  = 65000 + 195000 = 260000
    // estimateHigh = 65000 + 325000 = 390000
    const result = estimateMedicalMalpracticeSettlement({
      medicalExpenses: 50_000,
      futureMedicalExpenses: 0,
      lostWages: 15_000,
      futureLostWages: 0,
      severity: "moderate",
      malpracticeType: "misdiagnosis",
      stateCode: "FL", // no cap
    });
    expect(result.economicDamages).toBe(65_000);
    expect(result.estimateLow).toBe(260_000);
    expect(result.estimateHigh).toBe(390_000);
    expect(result.multiplierRange).toEqual([3.0, 5.0]);
  });
});
