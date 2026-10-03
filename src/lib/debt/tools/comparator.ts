/**
 * Side-by-side comparison of debt settlement, debt consolidation, Chapter 7,
 * and Chapter 13 — total cost and time-to-debt-free for each path.
 * Credit-impact is intentionally an ordinal severity label, not a fabricated
 * numeric score (credit-score prediction is not something this engine
 * claims to model deterministically).
 */

export interface ComparatorInput {
  totalUnsecuredDebt: number;
  monthlyPaymentAvailable: number;
  /** Blended new-loan APR available for a consolidation loan at the user's credit band. */
  consolidationLoanApr: number;
  /** Projected Chapter 13 plan payment, e.g. from runMeansTest(). */
  chapter13PlanPayment?: number;
}

export type CreditImpact = "severe" | "significant" | "moderate";

export interface PathResult {
  path: "settlement" | "consolidation" | "chapter7" | "chapter13";
  totalCost: number;
  monthsToDebtFree: number;
  creditImpact: CreditImpact;
}

const SETTLEMENT_RATE_OF_ENROLLED_DEBT = 0.5; // creditors typically settle for 45-55% of balance
const SETTLEMENT_FEE_RATE = 0.2; // 15-25% of enrolled debt, midpoint

export function compareDebtPaths(input: ComparatorInput): PathResult[] {
  const results: PathResult[] = [];

  // Settlement: pay settlementRate of debt + fee, spread over reserve-account
  // accumulation at the user's stated monthly payment.
  const settlementTotalCost =
    input.totalUnsecuredDebt * SETTLEMENT_RATE_OF_ENROLLED_DEBT +
    input.totalUnsecuredDebt * SETTLEMENT_FEE_RATE;
  results.push({
    path: "settlement",
    totalCost: settlementTotalCost,
    monthsToDebtFree: Math.ceil(settlementTotalCost / input.monthlyPaymentAvailable),
    creditImpact: "significant",
  });

  // Consolidation: standard amortizing loan at the blended APR, sized so the
  // monthly payment matches what the user says they can afford.
  const monthlyRate = input.consolidationLoanApr / 12;
  const termMonths = amortizingTermForPayment(
    input.totalUnsecuredDebt,
    monthlyRate,
    input.monthlyPaymentAvailable
  );
  results.push({
    path: "consolidation",
    totalCost: input.monthlyPaymentAvailable * termMonths,
    monthsToDebtFree: termMonths,
    creditImpact: "moderate",
  });

  // Chapter 7: filing/attorney cost only, near-immediate discharge of
  // qualifying unsecured debt. Cost here is a rough attorney+filing estimate,
  // not the discharged debt itself.
  results.push({
    path: "chapter7",
    totalCost: 1500,
    monthsToDebtFree: 4,
    creditImpact: "severe",
  });

  // Chapter 13: plan payment over a 36-60 month court-supervised plan.
  if (input.chapter13PlanPayment !== undefined && input.chapter13PlanPayment > 0) {
    const termMonths13 = 60;
    results.push({
      path: "chapter13",
      totalCost: input.chapter13PlanPayment * termMonths13,
      monthsToDebtFree: termMonths13,
      creditImpact: "severe",
    });
  }

  return results;
}

/**
 * Solves for n in the standard amortization formula given a fixed payment.
 * Returns Infinity when the payment doesn't even cover the first month's
 * interest — the loan mathematically never amortizes at that payment level,
 * so this is the correct answer, not an error case. Callers must handle a
 * non-finite result explicitly rather than letting it reach the UI as
 * literal "Infinity" text.
 */
function amortizingTermForPayment(
  principal: number,
  monthlyRate: number,
  payment: number
): number {
  if (monthlyRate === 0) return Math.ceil(principal / payment);
  const monthlyInterest = monthlyRate * principal;
  if (payment <= monthlyInterest) return Infinity;
  const n = -Math.log(1 - monthlyInterest / payment) / Math.log(1 + monthlyRate);
  return Math.ceil(n);
}
