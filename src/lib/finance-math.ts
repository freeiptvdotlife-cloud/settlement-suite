/**
 * Pure, dependency-free time-value-of-money engine for the Structured
 * Settlement Payout Calculator. No I/O, no globals, no network — every
 * function here must be independently unit-testable and correct before
 * any UI is wired to it.
 */

export interface Payment {
  /** Dollar amount of a single future payment. Must be > 0. */
  amount: number;
  /** Calendar date the payment is scheduled to be received. */
  date: Date;
}

const DAYS_PER_MONTH = 365.25 / 12;

/** Fractional number of months between two dates (can be fractional, never negative). */
export function monthsBetween(from: Date, to: Date): number {
  const diffMs = to.getTime() - from.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return Math.max(0, diffDays / DAYS_PER_MONTH);
}

/**
 * Present value of a stream of future payments, discounted monthly at the
 * given nominal annual rate. Payments on or before `asOfDate` are treated
 * as due immediately (n = 0, undiscounted).
 *
 * PV = Σ [ payment_i / (1 + r/12)^n_i ]
 */
export function presentValue(
  payments: readonly Payment[],
  asOfDate: Date,
  annualRatePercent: number
): number {
  const monthlyRate = annualRatePercent / 100 / 12;
  return payments.reduce((sum, p) => {
    const n = monthsBetween(asOfDate, p.date);
    const discount = Math.pow(1 + monthlyRate, n);
    return sum + p.amount / discount;
  }, 0);
}

/** Sum of raw, undiscounted payment amounts — the "sticker" nominal value. */
export function totalNominal(payments: readonly Payment[]): number {
  return payments.reduce((sum, p) => sum + p.amount, 0);
}

/** Net cash a seller receives after a buyer's origination/processing fee. */
export function netOffer(pv: number, feePercent: number): number {
  return pv * (1 - feePercent / 100);
}

/** Dollars forfeited by accepting a lump sum instead of the full payment stream. */
export function forfeitedAmount(payments: readonly Payment[], net: number): number {
  return Math.max(0, totalNominal(payments) - net);
}

/**
 * Solves for the nominal annual discount rate a buyer is implicitly using,
 * given a competing lump-sum offer amount. PV(rate) is monotonically
 * non-increasing in rate for a positive payment stream, so bisection is
 * robust and doesn't need a derivative.
 *
 * Returns null if the target isn't bracketed within [0%, 500%] — i.e. the
 * offer is higher than the undiscounted nominal total (not a real discount
 * scenario) or implausibly low.
 */
export function impliedAnnualRate(
  payments: readonly Payment[],
  asOfDate: Date,
  targetOffer: number
): number | null {
  if (payments.length === 0) return null;

  const lowRate = 0;
  const highRate = 500;
  const pvAtLow = presentValue(payments, asOfDate, lowRate);
  const pvAtHigh = presentValue(payments, asOfDate, highRate);

  if (targetOffer > pvAtLow || targetOffer < pvAtHigh) {
    return null;
  }

  let lo = lowRate;
  let hi = highRate;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const pvMid = presentValue(payments, asOfDate, mid);
    if (Math.abs(pvMid - targetOffer) < 0.005) {
      return mid;
    }
    if (pvMid > targetOffer) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) / 2;
}

export interface PayoutSummary {
  totalNominal: number;
  presentValue: number;
  netOffer: number;
  forfeited: number;
  forfeitedPercent: number;
}

/** Convenience wrapper computing every headline figure the UI displays. */
export function summarizePayout(
  payments: readonly Payment[],
  asOfDate: Date,
  annualRatePercent: number,
  feePercent: number
): PayoutSummary {
  const nominal = totalNominal(payments);
  const pv = presentValue(payments, asOfDate, annualRatePercent);
  const net = netOffer(pv, feePercent);
  const forfeited = forfeitedAmount(payments, net);
  const forfeitedPercent = nominal > 0 ? (forfeited / nominal) * 100 : 0;
  return {
    totalNominal: nominal,
    presentValue: pv,
    netOffer: net,
    forfeited,
    forfeitedPercent,
  };
}

// ---------------------------------------------------------------------------
// Tool 2 — Pre-Settlement Lawsuit Loan Cost Estimator
// ---------------------------------------------------------------------------

/** How a pre-settlement funder's monthly rate/fee accrues over time. */
export type CompoundingType = 'simple' | 'compound';

/**
 * Total payoff under compound-monthly accrual: Payoff = Principal × (1 + r)^months.
 * This is how most litigation funders actually structure their fee (compounding
 * on the prior balance each month), even though marketing materials rarely say so.
 */
export function compoundPayoff(
  principal: number,
  monthlyRatePercent: number,
  months: number
): number {
  const r = monthlyRatePercent / 100;
  return principal * Math.pow(1 + r, months);
}

/**
 * Total payoff under simple accrual: Payoff = Principal + Principal × r × months.
 * Rarer in practice, but some funders advertise a "flat monthly fee" structure
 * that behaves this way.
 */
export function simplePayoff(
  principal: number,
  monthlyRatePercent: number,
  months: number
): number {
  const r = monthlyRatePercent / 100;
  return principal * (1 + r * months);
}

/** Dispatches to compound or simple payoff based on the funder's stated structure. */
export function loanPayoff(
  principal: number,
  monthlyRatePercent: number,
  months: number,
  compounding: CompoundingType
): number {
  return compounding === 'compound'
    ? compoundPayoff(principal, monthlyRatePercent, months)
    : simplePayoff(principal, monthlyRatePercent, months);
}

/**
 * Annualized effective rate implied by a given payoff over a given holding
 * period — the number that lets you compare a "3% a month" pitch against a
 * credit card or personal loan APR on equal footing.
 *
 * effectiveApr = (Payoff / Principal)^(12 / months) − 1
 */
export function effectiveAnnualApr(
  principal: number,
  payoff: number,
  months: number
): number | null {
  if (principal <= 0 || months <= 0) return null;
  const growth = payoff / principal;
  if (growth <= 0) return null;
  return (Math.pow(growth, 12 / months) - 1) * 100;
}

export interface LoanScenario {
  months: number;
  payoff: number;
  costOfCapital: number;
  effectiveApr: number | null;
}

/**
 * Builds the "if your case takes N months to resolve" comparison table —
 * the core output of the lawsuit loan cost estimator, since case duration
 * (not the advance amount) is what most borrowers underestimate.
 */
export function loanScenarios(
  principal: number,
  monthlyRatePercent: number,
  compounding: CompoundingType,
  monthsList: readonly number[] = [6, 12, 18, 24]
): LoanScenario[] {
  return monthsList.map((months) => {
    const payoff = loanPayoff(principal, monthlyRatePercent, months, compounding);
    return {
      months,
      payoff,
      costOfCapital: payoff - principal,
      effectiveApr: effectiveAnnualApr(principal, payoff, months),
    };
  });
}

// ---------------------------------------------------------------------------
// Tool 3 — Annuity Present/Future Value & Discount-Rate Solver
//
// Ordinary annuity (payments at the end of each period) — the standard
// convention for structured settlement, pension, and workers'-comp payment
// streams. Tool 4's lump-sum-vs-structured comparator reuses this engine.
// ---------------------------------------------------------------------------

export type AnnuityFrequency = 'weekly' | 'monthly' | 'quarterly' | 'annual';

const PERIODS_PER_YEAR: Record<AnnuityFrequency, number> = {
  weekly: 52,
  monthly: 12,
  quarterly: 4,
  annual: 1,
};

export function periodsPerYear(frequency: AnnuityFrequency): number {
  return PERIODS_PER_YEAR[frequency];
}

/** Nominal annual rate (%) → the periodic rate (%) for a given payment frequency. */
export function periodicRateFromAnnual(
  annualRatePercent: number,
  frequency: AnnuityFrequency
): number {
  return annualRatePercent / periodsPerYear(frequency);
}

/** Periodic rate (%) → the equivalent nominal annual rate (%) for a given frequency. */
export function annualRateFromPeriodic(
  periodicRatePercent: number,
  frequency: AnnuityFrequency
): number {
  return periodicRatePercent * periodsPerYear(frequency);
}

/**
 * Present value of an ordinary annuity: PV = PMT × [1 − (1 + r)^-n] / r,
 * where r is the PERIODIC rate as a percent. Falls back to PMT × n at r = 0
 * to avoid division by zero.
 */
export function annuityPresentValue(
  pmt: number,
  periodicRatePercent: number,
  periods: number
): number {
  if (periods <= 0) return 0;
  const r = periodicRatePercent / 100;
  if (Math.abs(r) < 1e-12) return pmt * periods;
  return (pmt * (1 - Math.pow(1 + r, -periods))) / r;
}

/**
 * Future value of an ordinary annuity: FV = PMT × [(1 + r)^n − 1] / r,
 * where r is the PERIODIC rate as a percent.
 */
export function annuityFutureValue(
  pmt: number,
  periodicRatePercent: number,
  periods: number
): number {
  if (periods <= 0) return 0;
  const r = periodicRatePercent / 100;
  if (Math.abs(r) < 1e-12) return pmt * periods;
  return (pmt * (Math.pow(1 + r, periods) - 1)) / r;
}

export interface AnnuityScheduleRow {
  period: number;
  payment: number;
  presentValueContribution: number;
  cumulativePresentValue: number;
  futureValueContribution: number;
  cumulativeFutureValue: number;
}

/** Period-by-period breakdown of each payment's PV and FV contribution. */
export function annuitySchedule(
  pmt: number,
  periodicRatePercent: number,
  periods: number
): AnnuityScheduleRow[] {
  const r = periodicRatePercent / 100;
  const rows: AnnuityScheduleRow[] = [];
  let cumulativePresentValue = 0;
  let cumulativeFutureValue = 0;
  for (let t = 1; t <= periods; t++) {
    const presentValueContribution =
      Math.abs(r) < 1e-12 ? pmt : pmt / Math.pow(1 + r, t);
    const futureValueContribution =
      Math.abs(r) < 1e-12 ? pmt : pmt * Math.pow(1 + r, periods - t);
    cumulativePresentValue += presentValueContribution;
    cumulativeFutureValue += futureValueContribution;
    rows.push({
      period: t,
      payment: pmt,
      presentValueContribution,
      cumulativePresentValue,
      futureValueContribution,
      cumulativeFutureValue,
    });
  }
  return rows;
}

/**
 * Solves for the periodic rate implied by a target present value, given a
 * fixed payment and period count. PV(r) is monotonically non-increasing in
 * r for a positive payment stream, so bisection is robust. Returns null if
 * the target isn't bracketed within [0%, 500%] per period.
 */
export function impliedRateFromPresentValue(
  pmt: number,
  periods: number,
  targetPresentValue: number
): number | null {
  if (pmt <= 0 || periods <= 0) return null;

  const lowRate = 0;
  const highRate = 500;
  const pvAtLow = annuityPresentValue(pmt, lowRate, periods);
  const pvAtHigh = annuityPresentValue(pmt, highRate, periods);

  if (targetPresentValue > pvAtLow || targetPresentValue < pvAtHigh) {
    return null;
  }

  let lo = lowRate;
  let hi = highRate;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const pvMid = annuityPresentValue(pmt, mid, periods);
    if (Math.abs(pvMid - targetPresentValue) < 0.005) return mid;
    if (pvMid > targetPresentValue) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) / 2;
}

/**
 * Solves for the periodic rate implied by a target future value, given a
 * fixed payment and period count. FV(r) is monotonically non-decreasing in
 * r for a positive payment stream, so bisection is robust. Returns null if
 * the target isn't bracketed within [0%, 500%] per period.
 */
export function impliedRateFromFutureValue(
  pmt: number,
  periods: number,
  targetFutureValue: number
): number | null {
  if (pmt <= 0 || periods <= 0) return null;

  const lowRate = 0;
  const highRate = 500;
  const fvAtLow = annuityFutureValue(pmt, lowRate, periods);
  const fvAtHigh = annuityFutureValue(pmt, highRate, periods);

  if (targetFutureValue < fvAtLow || targetFutureValue > fvAtHigh) {
    return null;
  }

  let lo = lowRate;
  let hi = highRate;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const fvMid = annuityFutureValue(pmt, mid, periods);
    if (Math.abs(fvMid - targetFutureValue) < 0.005) return mid;
    if (fvMid < targetFutureValue) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) / 2;
}

/**
 * Solves for the number of periods (n) an annuity would need to run to reach
 * a given present value, at a fixed payment and periodic rate. Closed-form —
 * derived algebraically from the PV formula, no iteration needed:
 *
 *   PV = PMT × [1 − (1+r)^-n] / r
 *   (1+r)^-n = 1 − PV·r/PMT
 *   n = −ln(1 − PV·r/PMT) / ln(1+r)
 *
 * Returns null if the target PV exceeds what the stream could ever be worth
 * at this rate (i.e. exceeds the value of a perpetual payment stream), or if
 * inputs are non-positive.
 */
export function periodsFromPresentValue(
  pmt: number,
  periodicRatePercent: number,
  targetPresentValue: number
): number | null {
  if (pmt <= 0 || targetPresentValue <= 0) return null;
  const r = periodicRatePercent / 100;
  if (Math.abs(r) < 1e-12) {
    return targetPresentValue / pmt;
  }
  const inner = 1 - (targetPresentValue * r) / pmt;
  if (inner <= 0) return null;
  return -Math.log(inner) / Math.log(1 + r);
}

// ---------------------------------------------------------------------------
// Tool 4 — Workers' Comp Lump-Sum vs. Structured Settlement Comparator
//
// Deliberately does NOT hard-code per-state weekly compensation caps or PPD
// schedule weeks: those change annually, vary enormously by state and body
// part, and getting a stale or wrong number in front of someone deciding a
// real settlement is a worse outcome than asking them to enter their own
// state's current, verified figures. The math below is exact; the inputs
// are the user's (or their adjuster's/attorney's) responsibility.
// ---------------------------------------------------------------------------

/** Clamps a value between a minimum and maximum (order-agnostic on min/max misuse). */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export interface CompensationRateResult {
  /** Uncapped rate: averageWeeklyWage × (percentOfWage / 100). */
  rawRate: number;
  /** Rate after applying the state's statutory min/max weekly caps. */
  clampedRate: number;
  wasClampedToMin: boolean;
  wasClampedToMax: boolean;
}

/**
 * Statutory-style weekly compensation rate: CompRate = clamp(AWW × %, min, max).
 * The percent is typically ~66.67% (two-thirds of AWW) for TTD/PPD benefits
 * in most US states, but is left as an input since exact formulas vary.
 */
export function compensationRate(
  averageWeeklyWage: number,
  percentOfWage: number,
  minWeeklyCap: number,
  maxWeeklyCap: number
): CompensationRateResult {
  const rawRate = averageWeeklyWage * (percentOfWage / 100);
  const clampedRate = clamp(rawRate, minWeeklyCap, maxWeeklyCap);
  return {
    rawRate,
    clampedRate,
    wasClampedToMin: clampedRate > rawRate,
    wasClampedToMax: clampedRate < rawRate,
  };
}

/** Total undiscounted value of a weekly benefit stream: weeklyRate × weeks. */
export function undiscountedBenefitTotal(weeklyRate: number, weeks: number): number {
  return weeklyRate * weeks;
}
