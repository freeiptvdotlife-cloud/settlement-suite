import { describe, expect, it } from "vitest";
import { estimateSettlement } from "./settlement";

describe("estimateSettlement", () => {
  it("computes a range that scales with severity", () => {
    const base = {
      medicalExpenses: 10000,
      futureMedicalExpenses: 0,
      lostWages: 2000,
      futureLostWages: 0,
      comparativeFaultPct: 0
    };
    const minor = estimateSettlement({ ...base, severity: "minor" });
    const severe = estimateSettlement({ ...base, severity: "severe" });
    expect(severe.estimateLow).toBeGreaterThan(minor.estimateLow);
  });

  it("applies comparative fault reduction", () => {
    const noFault = estimateSettlement({
      medicalExpenses: 10000,
      futureMedicalExpenses: 0,
      lostWages: 0,
      futureLostWages: 0,
      severity: "moderate",
      comparativeFaultPct: 0
    });
    const halfFault = estimateSettlement({
      medicalExpenses: 10000,
      futureMedicalExpenses: 0,
      lostWages: 0,
      futureLostWages: 0,
      severity: "moderate",
      comparativeFaultPct: 50
    });
    expect(halfFault.estimateLow).toBeCloseTo(noFault.estimateLow * 0.5, 0);
  });

  it("returns zero for zero input", () => {
    const result = estimateSettlement({
      medicalExpenses: 0,
      futureMedicalExpenses: 0,
      lostWages: 0,
      futureLostWages: 0,
      severity: "minor",
      comparativeFaultPct: 0
    });
    expect(result.estimateLow).toBe(0);
    expect(result.estimateHigh).toBe(0);
  });
});
