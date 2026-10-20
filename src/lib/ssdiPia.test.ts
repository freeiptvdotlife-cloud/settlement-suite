import { describe, it, expect } from 'vitest';
import { estimateSsdiPia, BEND_POINTS } from './ssdiPia';

describe('estimateSsdiPia', () => {
  it('computes PIA using 2025 bend points for AIME below first bend point', () => {
    // AIME = $800, all in 90% tier: PIA = 0.9 × 800 = $720.00 → floor to nearest $0.10 = $720.0
    const result = estimateSsdiPia({ aime: 800, benefitYear: 2025 });
    expect(result.pia).toBeCloseTo(720.0, 1);
    expect(result.bendPoints).toEqual(BEND_POINTS[2025]);
    expect(result.benefitYear).toBe(2025);
  });

  it('computes PIA spanning both bend-point tiers for 2025', () => {
    // AIME = $3,000 with 2025 bend points ($1,226 / $7,391)
    // Tier 1: 0.9 × 1226 = 1103.4
    // Tier 2: 0.32 × (3000 - 1226) = 0.32 × 1774 = 567.68
    // Raw = 1671.08 → floor to nearest $0.10 = $1671.0
    const result = estimateSsdiPia({ aime: 3_000, benefitYear: 2025 });
    expect(result.pia).toBeCloseTo(1671.0, 1);
  });

  it('computes PIA spanning all three tiers for 2025', () => {
    // AIME = $9,000 with 2025 bend points
    // Tier 1: 0.9 × 1226 = 1103.4
    // Tier 2: 0.32 × (7391 - 1226) = 0.32 × 6165 = 1972.8
    // Tier 3: 0.15 × (9000 - 7391) = 0.15 × 1609 = 241.35
    // Raw = 3317.55 → floor to nearest $0.10 = $3317.5
    const result = estimateSsdiPia({ aime: 9_000, benefitYear: 2025 });
    expect(result.pia).toBeCloseTo(3317.5, 1);
  });

  it('uses 2024 bend points when benefitYear is 2024', () => {
    // 2024 bend points: $1,174 / $7,078
    // AIME = $1,000: all in tier 1 → 0.9 × 1000 = $900.0
    const result = estimateSsdiPia({ aime: 1_000, benefitYear: 2024 });
    expect(result.pia).toBeGreaterThan(900.0); // COLA applied from 2024 to 2025
    expect(result.bendPoints).toEqual(BEND_POINTS[2024]);
    expect(result.benefitYear).toBe(2024);
  });

  it('applies COLA when benefitYear is in the past', () => {
    const result2025 = estimateSsdiPia({ aime: 3_000, benefitYear: 2025 });
    const result2023 = estimateSsdiPia({ aime: 3_000, benefitYear: 2023 });
    // 2023 benefit gets COLA-adjusted through 2025 (3.2% + 2.5%), so should be different
    expect(result2023.pia).not.toEqual(result2025.pia);
  });

  it('computes after-Medicare amount by subtracting standard Part B premium', () => {
    const result = estimateSsdiPia({ aime: 5_000, benefitYear: 2025 });
    expect(result.piaAfterMedicare).toBeCloseTo(result.pia - 185.0, 1);
  });

  it('returns annual benefit as pia × 12 rounded', () => {
    const result = estimateSsdiPia({ aime: 3_200, benefitYear: 2025 });
    expect(result.annualBenefit).toBe(Math.round(result.pia * 12));
  });

  it('returns null family max when dependents = 0', () => {
    const result = estimateSsdiPia({ aime: 3_200, benefitYear: 2025, dependents: 0 });
    expect(result.familyMax).toBeNull();
    expect(result.familyMaxPerDependent).toBeNull();
  });

  it('computes family max and per-dependent when dependents > 0', () => {
    const result = estimateSsdiPia({ aime: 3_200, benefitYear: 2025, dependents: 2 });
    expect(result.familyMax).not.toBeNull();
    expect(result.familyMaxPerDependent).not.toBeNull();
    // Family max must be > PIA
    expect(result.familyMax!).toBeGreaterThan(result.pia);
    // Per-dependent = (familyMax - pia) / 2
    const expected = Math.floor(((result.familyMax! - result.pia) / 2) * 10) / 10;
    expect(result.familyMaxPerDependent).toBeCloseTo(expected, 1);
  });

  it('clamps benefitYear to supported range', () => {
    const result = estimateSsdiPia({ aime: 1_500, benefitYear: 1990 });
    expect(result.benefitYear).toBe(2020);
  });

  it('piaAfterMedicare is never negative', () => {
    // Very small AIME → tiny PIA < $185 Part B premium
    const result = estimateSsdiPia({ aime: 50, benefitYear: 2025 });
    expect(result.piaAfterMedicare).toBe(0);
  });
});
