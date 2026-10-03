import { describe, it, expect } from "vitest";
import { estimateSsdiBackPay } from "./ssdiBackPay";

describe("estimateSsdiBackPay", () => {
  it("applies 5-month waiting period from onset", () => {
    const result = estimateSsdiBackPay({
      monthlyBenefit: 1_000,
      onsetDate: new Date("2024-01-01"),
      applicationDate: new Date("2024-02-01"),
      approvalDate: new Date("2025-06-01"),
    });
    // onset + 5 = 2024-06; retro limit = 2023-02; eligible start = 2024-06
    // months from 2024-06 to 2025-06 = 12
    expect(result.backPayMonths).toBe(12);
    expect(result.grossBackPay).toBe(12_000);
    expect(result.attorneyFee).toBe(3_000); // 25% of 12000, under cap
    expect(result.netBackPay).toBe(9_000);
  });

  it("applies 12-month retroactivity cap when onset is very early", () => {
    const result = estimateSsdiBackPay({
      monthlyBenefit: 1_000,
      onsetDate: new Date("2020-01-01"), // very early onset
      applicationDate: new Date("2024-01-01"),
      approvalDate: new Date("2025-01-01"),
    });
    // onset + 5 = 2020-06; retro limit = 2023-01; retro limit wins
    // months from 2023-01 to 2025-01 = 24
    expect(result.backPayMonths).toBe(24);
    expect(result.grossBackPay).toBe(24_000);
    expect(result.attorneyFee).toBe(6_000); // 25% under cap
    expect(result.netBackPay).toBe(18_000);
  });

  it("caps attorney fee at $7,200", () => {
    const result = estimateSsdiBackPay({
      monthlyBenefit: 2_000,
      onsetDate: new Date("2024-01-01"),
      applicationDate: new Date("2024-02-01"),
      approvalDate: new Date("2026-06-01"),
    });
    // onset + 5 = 2024-06; months to 2026-06 = 24; gross = 48000
    // 25% of 48000 = 12000; capped at 7200
    expect(result.attorneyFee).toBe(7_200);
    expect(result.netBackPay).toBe(result.grossBackPay - 7_200);
  });

  it("returns 0 back pay when approval is before eligible start", () => {
    const result = estimateSsdiBackPay({
      monthlyBenefit: 1_500,
      onsetDate: new Date("2025-01-01"),
      applicationDate: new Date("2025-01-01"),
      approvalDate: new Date("2025-03-01"), // before 5-month wait expires
    });
    expect(result.backPayMonths).toBe(0);
    expect(result.grossBackPay).toBe(0);
    expect(result.attorneyFee).toBe(0);
    expect(result.netBackPay).toBe(0);
  });
});
