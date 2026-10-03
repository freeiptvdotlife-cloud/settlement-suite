/**
 * Commonly-cited minimum waiting periods before re-qualifying for a mortgage
 * after a bankruptcy discharge, by loan type and chapter. These are widely
 * published industry guideline ranges (e.g., HUD/FHA and VA lending
 * handbooks, Fannie Mae Selling Guide) rather than a single official table,
 * and individual lender overlays vary. Presented as ranges, not guarantees —
 * verify against current agency guidelines before production use.
 */

export type LoanType = "conventional" | "fha" | "va";
export type BankruptcyChapter = "chapter7" | "chapter13";

export interface RequalificationWindow {
  /** Years from discharge (chapter7) or from filing with on-time plan payments (chapter13). */
  minYears: number;
  maxYears: number;
  basis: "discharge" | "filing-with-trustee-approval";
}

export const requalificationWindows: Record<
  LoanType,
  Record<BankruptcyChapter, RequalificationWindow>
> = {
  conventional: {
    chapter7: { minYears: 4, maxYears: 4, basis: "discharge" },
    chapter13: { minYears: 2, maxYears: 4, basis: "discharge" },
  },
  fha: {
    chapter7: { minYears: 2, maxYears: 2, basis: "discharge" },
    chapter13: { minYears: 1, maxYears: 1, basis: "filing-with-trustee-approval" },
  },
  va: {
    chapter7: { minYears: 2, maxYears: 2, basis: "discharge" },
    chapter13: { minYears: 1, maxYears: 1, basis: "filing-with-trustee-approval" },
  },
};
