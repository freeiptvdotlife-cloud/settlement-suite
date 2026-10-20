import { describe, expect, it } from "vitest";
import { estimateCarAccidentSettlement } from "./carAccident";

const base = {
  medicalExpenses: 10_000,
  futureMedicalExpenses: 5_000,
  lostWages: 3_000,
  futureLostWages: 0,
  propertyDamage: 8_000,
  severity: "moderate" as const,
  accidentType: "rear-end" as const,
  comparativeFaultPct: 0,
  stateCode: "TX",
};

describe("estimateCarAccidentSettlement", () => {
  it("produces a range wider than economic damages", () => {
    const result = estimateCarAccidentSettlement(base);
    expect(result.estimateHigh).toBeGreaterThan(result.personalInjuryBase);
  });

  it("severe produces higher estimate than moderate", () => {
    const moderate = estimateCarAccidentSettlement(base);
    const severe = estimateCarAccidentSettlement({ ...base, severity: "severe" });
    expect(severe.estimateLow).toBeGreaterThan(moderate.estimateLow);
  });

  it("head-on bump produces higher estimate than rear-end at same severity", () => {
    const rearEnd = estimateCarAccidentSettlement(base);
    const headOn = estimateCarAccidentSettlement({ ...base, accidentType: "head-on" });
    expect(headOn.estimateLow).toBeGreaterThan(rearEnd.estimateLow);
  });

  it("50% fault halves the estimate (TX = modified-51)", () => {
    const noFault = estimateCarAccidentSettlement({ ...base, comparativeFaultPct: 0 });
    const halfFault = estimateCarAccidentSettlement({ ...base, comparativeFaultPct: 50 });
    expect(halfFault.estimateLow).toBeCloseTo(noFault.estimateLow * 0.5, 0);
  });

  it("51% fault bars recovery in TX (modified-51)", () => {
    const result = estimateCarAccidentSettlement({ ...base, comparativeFaultPct: 51 });
    expect(result.isBarred).toBe(true);
    expect(result.estimateLow).toBe(0);
    expect(result.estimateHigh).toBe(0);
  });

  it("50% fault bars recovery in GA (modified-50)", () => {
    const result = estimateCarAccidentSettlement({ ...base, comparativeFaultPct: 50, stateCode: "GA" });
    expect(result.isBarred).toBe(true);
    expect(result.estimateLow).toBe(0);
  });

  it("49% fault does not bar in GA (modified-50)", () => {
    const result = estimateCarAccidentSettlement({ ...base, comparativeFaultPct: 49, stateCode: "GA" });
    expect(result.isBarred).toBe(false);
    expect(result.estimateLow).toBeGreaterThan(0);
  });

  it("any fault bars recovery in pure-contributory state (NC)", () => {
    const result = estimateCarAccidentSettlement({ ...base, comparativeFaultPct: 1, stateCode: "NC" });
    expect(result.isBarred).toBe(true);
    expect(result.estimateLow).toBe(0);
    expect(result.faultSystem).toBe("pure-contributory");
  });

  it("zero fault in pure-contributory state still recovers", () => {
    const result = estimateCarAccidentSettlement({ ...base, comparativeFaultPct: 0, stateCode: "NC" });
    expect(result.isBarred).toBe(false);
    expect(result.estimateLow).toBeGreaterThan(0);
  });

  it("CA is pure-comparative — 70% fault still allows recovery", () => {
    const result = estimateCarAccidentSettlement({ ...base, comparativeFaultPct: 70, stateCode: "CA" });
    expect(result.isBarred).toBe(false);
    expect(result.faultSystem).toBe("pure-comparative");
    expect(result.estimateLow).toBeGreaterThan(0);
  });

  it("NY is a no-fault state", () => {
    const result = estimateCarAccidentSettlement({ ...base, stateCode: "NY" });
    expect(result.isNoFault).toBe(true);
  });

  it("TX is not a no-fault state", () => {
    const result = estimateCarAccidentSettlement(base);
    expect(result.isNoFault).toBe(false);
  });

  it("property damage is tracked separately and does not affect PI estimate", () => {
    const noProp = estimateCarAccidentSettlement({ ...base, propertyDamage: 0 });
    const withProp = estimateCarAccidentSettlement({ ...base, propertyDamage: 50_000 });
    expect(noProp.estimateLow).toBe(withProp.estimateLow);
    expect(withProp.propertyDamage).toBe(50_000);
  });

  it("returns zero for zero injury inputs", () => {
    const result = estimateCarAccidentSettlement({
      ...base,
      medicalExpenses: 0,
      futureMedicalExpenses: 0,
      lostWages: 0,
      futureLostWages: 0,
    });
    expect(result.estimateLow).toBe(0);
    expect(result.estimateHigh).toBe(0);
    expect(result.personalInjuryBase).toBe(0);
  });

  it("caps fault at 100 without throwing", () => {
    const result = estimateCarAccidentSettlement({ ...base, comparativeFaultPct: 150 });
    expect(result.isBarred).toBe(true);
    expect(result.estimateLow).toBe(0);
  });

  it("worked example — $10k medical, $0 wages, moderate, rear-end, TX, 0% fault", () => {
    // personalInjuryBase = 10000
    // multiplier range moderate = [2.5, 4.0], rear-end bump = 0
    // estimateLow = round(10000 + 10000 * 2.5) * 1.0 = 35000
    // estimateHigh = round(10000 + 10000 * 4.0) * 1.0 = 50000
    const result = estimateCarAccidentSettlement({
      medicalExpenses: 10_000,
      futureMedicalExpenses: 0,
      lostWages: 0,
      futureLostWages: 0,
      propertyDamage: 0,
      severity: "moderate",
      accidentType: "rear-end",
      comparativeFaultPct: 0,
      stateCode: "TX",
    });
    expect(result.estimateLow).toBe(35_000);
    expect(result.estimateHigh).toBe(50_000);
    expect(result.personalInjuryBase).toBe(10_000);
  });
});
