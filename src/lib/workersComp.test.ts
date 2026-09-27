import { describe, expect, it } from "vitest";
import { estimateWorkersComp } from "./workersComp";

describe("estimateWorkersComp", () => {
  it("computes compensation rate as two-thirds of average weekly wage", () => {
    const result = estimateWorkersComp({ averageWeeklyWage: 900, impairmentRatingPct: 10, bodyPart: "arm" });
    expect(result.compensationRate).toBe(Math.round(900 * (2 / 3)));
  });

  it("scales award with body part scheduled weeks", () => {
    const arm = estimateWorkersComp({ averageWeeklyWage: 900, impairmentRatingPct: 10, bodyPart: "arm" });
    const finger = estimateWorkersComp({ averageWeeklyWage: 900, impairmentRatingPct: 10, bodyPart: "finger" });
    expect(arm.ppdAward).toBeGreaterThan(finger.ppdAward);
  });

  it("returns zero award for zero impairment", () => {
    const result = estimateWorkersComp({ averageWeeklyWage: 900, impairmentRatingPct: 0, bodyPart: "leg" });
    expect(result.ppdAward).toBe(0);
  });
});
