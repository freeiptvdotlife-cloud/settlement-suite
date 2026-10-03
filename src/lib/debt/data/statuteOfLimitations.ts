/**
 * Statute of limitations (in years) on consumer debt, by state and debt type.
 * This governs how long a creditor can sue to collect — it does NOT mean
 * the debt disappears, only that it becomes largely uncollectible via
 * lawsuit ("time-barred").
 *
 * SOURCES:
 * - creditCard: "open-ended account" statute of limitations, 50-state table,
 *   https://www.incharge.org/understanding-debt/credit-card/what-is-statute-of-limitations-all-50-states/
 * - medical, autoDeficiency: mapped to each state's "written contract"
 *   statute of limitations (same source as above). This is an approximation
 *   documented by consumer-debt publishers as the common case — medical debt
 *   with a signed financial-responsibility form, and auto loan contracts,
 *   are typically written contracts — but classification can vary by state
 *   and by the specific paperwork involved. Do not treat as legal certainty.
 * - judgment: https://worldpopulationreview.com/state-rankings/judgment-expiration-by-state
 *   (D.C. value cross-checked against D.C. Code § 15-101, 12 years).
 *
 * These figures were extracted via automated tooling from secondary
 * (non-primary-statute) sources and were NOT independently verified against
 * primary state statute text. Secondary sources disagree with each other on
 * several states (e.g. Illinois judgment SOL is cited as both 7 and 20 years
 * across different published tables) — spot-check any state you actually
 * rely on against its statute before shipping this to production, and treat
 * every output as a starting point for the "consult an attorney" disclaimer,
 * not a substitute for it.
 */

export type DebtType = "creditCard" | "medical" | "autoDeficiency" | "judgment";

export const SOL_EFFECTIVE_DATE = "2026 (see per-field source notes)";

interface SolRow {
  writtenContract: number;
  openEndedAccount: number;
  judgment: number;
}

function row(writtenContract: number, openEndedAccount: number, judgment: number): SolRow {
  return { writtenContract, openEndedAccount, judgment };
}

const solByState: Record<string, SolRow> = {
  AL: row(6, 3, 10),
  AK: row(6, 3, 5),
  AZ: row(6, 6, 10),
  AR: row(5, 5, 10),
  CA: row(4, 4, 10),
  CO: row(6, 6, 20),
  CT: row(6, 6, 20),
  DE: row(3, 4, 10),
  DC: row(3, 3, 12),
  FL: row(5, 5, 20),
  GA: row(6, 6, 7),
  HI: row(6, 6, 10),
  ID: row(5, 4, 10),
  IL: row(10, 5, 7),
  IN: row(10, 6, 20),
  IA: row(10, 5, 20),
  KS: row(5, 3, 5),
  KY: row(10, 10, 15),
  LA: row(10, 3, 10),
  ME: row(6, 6, 20),
  MD: row(3, 3, 12),
  MA: row(6, 6, 20),
  MI: row(6, 6, 5),
  MN: row(6, 6, 10),
  MS: row(3, 3, 7),
  MO: row(10, 5, 10),
  MT: row(8, 5, 10),
  NE: row(5, 4, 5),
  NV: row(6, 4, 6),
  NH: row(3, 3, 20),
  NJ: row(6, 6, 20),
  NM: row(6, 4, 14),
  NY: row(3, 3, 10),
  NC: row(3, 3, 10),
  ND: row(6, 6, 10),
  OH: row(6, 6, 5),
  OK: row(5, 3, 5),
  OR: row(6, 6, 10),
  PA: row(4, 4, 5),
  RI: row(4, 10, 20),
  SC: row(3, 3, 10),
  SD: row(6, 6, 10),
  TN: row(6, 6, 10),
  TX: row(4, 4, 10),
  UT: row(6, 4, 8),
  VT: row(6, 6, 8),
  VA: row(5, 3, 10),
  WA: row(6, 6, 10),
  WV: row(10, 5, 10),
  WI: row(6, 6, 10),
  WY: row(10, 8, 5),
};

/** Public export kept for backward compatibility with earlier callers/tests. */
export const statuteOfLimitations: Record<string, Record<DebtType, number>> = Object.fromEntries(
  Object.entries(solByState).map(([state, r]) => [
    state,
    {
      creditCard: r.openEndedAccount,
      medical: r.writtenContract,
      autoDeficiency: r.writtenContract,
      judgment: r.judgment,
    },
  ])
);

export function getSolYears(state: string, debtType: DebtType): number | undefined {
  return statuteOfLimitations[state.toUpperCase()]?.[debtType];
}
