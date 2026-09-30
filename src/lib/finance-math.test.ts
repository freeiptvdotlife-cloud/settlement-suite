import { describe, it, expect } from 'vitest';
import {
  monthsBetween,
  presentValue,
  totalNominal,
  netOffer,
  forfeitedAmount,
  impliedAnnualRate,
  summarizePayout,
  compoundPayoff,
  simplePayoff,
  loanPayoff,
  effectiveAnnualApr,
  loanScenarios,
  periodsPerYear,
  periodicRateFromAnnual,
  annualRateFromPeriodic,
  annuityPresentValue,
  annuityFutureValue,
  annuitySchedule,
  impliedRateFromPresentValue,
  impliedRateFromFutureValue,
  periodsFromPresentValue,
  clamp,
  compensationRate,
  undiscountedBenefitTotal,
  type Payment,
} from './finance-math';

const asOf = new Date('2026-01-01T00:00:00Z');

function monthsOut(n: number): Date {
  const d = new Date(asOf);
  d.setMonth(d.getMonth() + n);
  return d;
}

describe('monthsBetween', () => {
  it('is 0 for the same date', () => {
    expect(monthsBetween(asOf, asOf)).toBe(0);
  });

  it('clamps negative spans to 0', () => {
    const past = new Date('2025-01-01T00:00:00Z');
    expect(monthsBetween(asOf, past)).toBe(0);
  });

  it('is approximately 12 for one year out', () => {
    const oneYearOut = new Date('2027-01-01T00:00:00Z');
    expect(monthsBetween(asOf, oneYearOut)).toBeCloseTo(12, 0);
  });
});

describe('presentValue', () => {
  it('equals the raw amount for a payment due immediately, regardless of rate', () => {
    const payments: Payment[] = [{ amount: 1000, date: asOf }];
    expect(presentValue(payments, asOf, 10)).toBeCloseTo(1000, 6);
    expect(presentValue(payments, asOf, 50)).toBeCloseTo(1000, 6);
  });

  it('equals the raw sum at a 0% discount rate', () => {
    const payments: Payment[] = [
      { amount: 1000, date: monthsOut(6) },
      { amount: 2000, date: monthsOut(24) },
    ];
    expect(presentValue(payments, asOf, 0)).toBeCloseTo(3000, 6);
  });

  it('discounts a single payment correctly at a known rate', () => {
    // $10,000 ~twelve months out at 12% nominal annual (1%/month) compounded monthly.
    const date = monthsOut(12);
    const payments: Payment[] = [{ amount: 10000, date }];
    const pv = presentValue(payments, asOf, 12);
    const n = monthsBetween(asOf, date);
    const expected = 10000 / Math.pow(1.01, n);
    expect(pv).toBeCloseTo(expected, 6);
  });

  it('sums present values across multiple payments', () => {
    const date1 = monthsOut(12);
    const date2 = monthsOut(24);
    const payments: Payment[] = [
      { amount: 5000, date: date1 },
      { amount: 5000, date: date2 },
    ];
    const pv = presentValue(payments, asOf, 10);
    const n1 = monthsBetween(asOf, date1);
    const n2 = monthsBetween(asOf, date2);
    const expected =
      5000 / Math.pow(1 + 0.1 / 12, n1) + 5000 / Math.pow(1 + 0.1 / 12, n2);
    expect(pv).toBeCloseTo(expected, 6);
  });
});

describe('totalNominal', () => {
  it('sums raw payment amounts undiscounted', () => {
    const payments: Payment[] = [
      { amount: 1000, date: monthsOut(1) },
      { amount: 2500.5, date: monthsOut(2) },
    ];
    expect(totalNominal(payments)).toBeCloseTo(3500.5, 6);
  });

  it('is 0 for an empty stream', () => {
    expect(totalNominal([])).toBe(0);
  });
});

describe('netOffer', () => {
  it('applies a percentage fee to present value', () => {
    expect(netOffer(10000, 10)).toBeCloseTo(9000, 6);
  });

  it('returns the full PV when fee is 0', () => {
    expect(netOffer(10000, 0)).toBe(10000);
  });
});

describe('forfeitedAmount', () => {
  it('is the gap between nominal total and net cash received', () => {
    const payments: Payment[] = [{ amount: 10000, date: monthsOut(12) }];
    expect(forfeitedAmount(payments, 8000)).toBeCloseTo(2000, 6);
  });

  it('never goes negative', () => {
    const payments: Payment[] = [{ amount: 1000, date: monthsOut(1) }];
    expect(forfeitedAmount(payments, 5000)).toBe(0);
  });
});

describe('impliedAnnualRate', () => {
  it('round-trips: implied rate from a PV computed at a known rate recovers that rate', () => {
    const payments: Payment[] = [
      { amount: 3000, date: monthsOut(6) },
      { amount: 4000, date: monthsOut(18) },
      { amount: 5000, date: monthsOut(30) },
    ];
    const knownRate = 14.5;
    const offer = presentValue(payments, asOf, knownRate);
    const implied = impliedAnnualRate(payments, asOf, offer);
    expect(implied).not.toBeNull();
    expect(implied as number).toBeCloseTo(knownRate, 1);
  });

  it('returns null when the offer exceeds the undiscounted nominal total', () => {
    const payments: Payment[] = [{ amount: 1000, date: monthsOut(12) }];
    expect(impliedAnnualRate(payments, asOf, 5000)).toBeNull();
  });

  it('returns null for an empty payment stream', () => {
    expect(impliedAnnualRate([], asOf, 100)).toBeNull();
  });
});

describe('compoundPayoff', () => {
  it('matches manual compounding at a known rate/term', () => {
    // $5,000 at 3%/month compounded for 12 months.
    const payoff = compoundPayoff(5000, 3, 12);
    expect(payoff).toBeCloseTo(5000 * Math.pow(1.03, 12), 6);
    expect(payoff).toBeCloseTo(7128.80, 1);
  });

  it('returns the principal unchanged at 0% and 0 months', () => {
    expect(compoundPayoff(5000, 0, 0)).toBeCloseTo(5000, 6);
  });
});

describe('simplePayoff', () => {
  it('matches manual simple accrual at a known rate/term', () => {
    // $5,000 at 3%/month simple for 12 months => 5000 * (1 + 0.36).
    const payoff = simplePayoff(5000, 3, 12);
    expect(payoff).toBeCloseTo(6800, 6);
  });

  it('is always <= compound payoff for the same inputs beyond month 1', () => {
    const simple = simplePayoff(5000, 3, 12);
    const compound = compoundPayoff(5000, 3, 12);
    expect(simple).toBeLessThan(compound);
  });
});

describe('loanPayoff', () => {
  it('dispatches to compound or simple correctly', () => {
    expect(loanPayoff(5000, 3, 12, 'compound')).toBeCloseTo(compoundPayoff(5000, 3, 12), 6);
    expect(loanPayoff(5000, 3, 12, 'simple')).toBeCloseTo(simplePayoff(5000, 3, 12), 6);
  });
});

describe('effectiveAnnualApr', () => {
  it('equals the raw growth rate when the term is exactly 12 months', () => {
    const payoff = compoundPayoff(5000, 3, 12);
    const apr = effectiveAnnualApr(5000, payoff, 12);
    expect(apr).not.toBeNull();
    expect(apr as number).toBeCloseTo((payoff / 5000 - 1) * 100, 6);
  });

  it('annualizes a short-term loan to a much larger effective rate', () => {
    // $5,000 growing to $5,300 in 3 months is a small nominal fee but a huge APR.
    const apr = effectiveAnnualApr(5000, 5300, 3);
    expect(apr).not.toBeNull();
    expect(apr as number).toBeGreaterThan(20);
  });

  it('returns null for non-positive principal or months', () => {
    expect(effectiveAnnualApr(0, 5000, 12)).toBeNull();
    expect(effectiveAnnualApr(5000, 5500, 0)).toBeNull();
  });
});

describe('loanScenarios', () => {
  it('produces one row per requested month with increasing payoff and cost', () => {
    const scenarios = loanScenarios(5000, 3, 'compound', [6, 12, 18, 24]);
    expect(scenarios).toHaveLength(4);
    for (let i = 1; i < scenarios.length; i++) {
      expect(scenarios[i]!.payoff).toBeGreaterThan(scenarios[i - 1]!.payoff);
      expect(scenarios[i]!.costOfCapital).toBeGreaterThan(scenarios[i - 1]!.costOfCapital);
    }
  });

  it('computes cost of capital as payoff minus principal', () => {
    const [row] = loanScenarios(5000, 3, 'compound', [12]);
    expect(row!.costOfCapital).toBeCloseTo(row!.payoff - 5000, 6);
  });
});

describe('summarizePayout', () => {
  it('composes nominal, PV, net offer, and forfeited amount consistently', () => {
    const payments: Payment[] = [
      { amount: 10000, date: monthsOut(12) },
      { amount: 10000, date: monthsOut(24) },
    ];
    const summary = summarizePayout(payments, asOf, 12, 10);
    expect(summary.totalNominal).toBeCloseTo(20000, 6);
    expect(summary.presentValue).toBeLessThan(summary.totalNominal);
    expect(summary.netOffer).toBeCloseTo(summary.presentValue * 0.9, 6);
    expect(summary.forfeited).toBeCloseTo(summary.totalNominal - summary.netOffer, 6);
    expect(summary.forfeitedPercent).toBeGreaterThan(0);
    expect(summary.forfeitedPercent).toBeLessThan(100);
  });
});

describe('periodsPerYear / rate conversion', () => {
  it('maps frequencies to the correct period counts', () => {
    expect(periodsPerYear('monthly')).toBe(12);
    expect(periodsPerYear('quarterly')).toBe(4);
    expect(periodsPerYear('annual')).toBe(1);
  });

  it('round-trips annual -> periodic -> annual', () => {
    const periodic = periodicRateFromAnnual(12, 'monthly');
    expect(periodic).toBeCloseTo(1, 6);
    expect(annualRateFromPeriodic(periodic, 'monthly')).toBeCloseTo(12, 6);
  });
});

describe('annuityPresentValue', () => {
  it('matches the textbook ordinary-annuity PV formula at a known rate', () => {
    // $500/month for 24 months at 1%/month periodic rate.
    const pv = annuityPresentValue(500, 1, 24);
    const expected = (500 * (1 - Math.pow(1.01, -24))) / 0.01;
    expect(pv).toBeCloseTo(expected, 6);
  });

  it('degrades to PMT x periods at a 0% rate', () => {
    expect(annuityPresentValue(500, 0, 24)).toBeCloseTo(12000, 6);
  });

  it('is 0 for 0 periods', () => {
    expect(annuityPresentValue(500, 5, 0)).toBe(0);
  });

  it('is strictly decreasing as the periodic rate rises', () => {
    const low = annuityPresentValue(500, 2, 24);
    const high = annuityPresentValue(500, 8, 24);
    expect(high).toBeLessThan(low);
  });
});

describe('annuityFutureValue', () => {
  it('matches the textbook ordinary-annuity FV formula at a known rate', () => {
    // $500/month for 24 months at 1%/month periodic rate.
    const fv = annuityFutureValue(500, 1, 24);
    const expected = (500 * (Math.pow(1.01, 24) - 1)) / 0.01;
    expect(fv).toBeCloseTo(expected, 6);
  });

  it('degrades to PMT x periods at a 0% rate', () => {
    expect(annuityFutureValue(500, 0, 24)).toBeCloseTo(12000, 6);
  });

  it('is strictly increasing as the periodic rate rises', () => {
    const low = annuityFutureValue(500, 2, 24);
    const high = annuityFutureValue(500, 8, 24);
    expect(high).toBeGreaterThan(low);
  });
});

describe('annuitySchedule', () => {
  it('produces one row per period with cumulative PV/FV reaching the totals', () => {
    const pmt = 500;
    const rate = 1;
    const periods = 12;
    const schedule = annuitySchedule(pmt, rate, periods);
    expect(schedule).toHaveLength(12);
    const lastRow = schedule[schedule.length - 1]!;
    expect(lastRow.cumulativePresentValue).toBeCloseTo(
      annuityPresentValue(pmt, rate, periods),
      4
    );
    expect(lastRow.cumulativeFutureValue).toBeCloseTo(
      annuityFutureValue(pmt, rate, periods),
      4
    );
  });

  it('keeps every row payment equal to the level PMT', () => {
    const schedule = annuitySchedule(250, 3, 6);
    schedule.forEach((row) => expect(row.payment).toBe(250));
  });
});

describe('impliedRateFromPresentValue', () => {
  it('round-trips: implied rate from a PV computed at a known rate recovers that rate', () => {
    const pmt = 500;
    const periods = 36;
    const knownRate = 1.5;
    const targetPv = annuityPresentValue(pmt, knownRate, periods);
    const implied = impliedRateFromPresentValue(pmt, periods, targetPv);
    expect(implied).not.toBeNull();
    expect(implied as number).toBeCloseTo(knownRate, 2);
  });

  it('returns null when the target exceeds the undiscounted total (PMT x periods)', () => {
    expect(impliedRateFromPresentValue(500, 12, 10000)).toBeNull();
  });

  it('returns null for non-positive payment or periods', () => {
    expect(impliedRateFromPresentValue(0, 12, 1000)).toBeNull();
    expect(impliedRateFromPresentValue(500, 0, 1000)).toBeNull();
  });
});

describe('impliedRateFromFutureValue', () => {
  it('round-trips: implied rate from an FV computed at a known rate recovers that rate', () => {
    const pmt = 500;
    const periods = 36;
    const knownRate = 1.5;
    const targetFv = annuityFutureValue(pmt, knownRate, periods);
    const implied = impliedRateFromFutureValue(pmt, periods, targetFv);
    expect(implied).not.toBeNull();
    expect(implied as number).toBeCloseTo(knownRate, 2);
  });

  it('returns null when the target is below the undiscounted total (PMT x periods)', () => {
    expect(impliedRateFromFutureValue(500, 12, 1000)).toBeNull();
  });
});

describe('periodsFromPresentValue', () => {
  it('round-trips: periods derived from a PV computed at a known n recovers that n', () => {
    const pmt = 300;
    const rate = 0.4; // periodic (e.g. weekly) rate percent
    const knownPeriods = 104;
    const pv = annuityPresentValue(pmt, rate, knownPeriods);
    const n = periodsFromPresentValue(pmt, rate, pv);
    expect(n).not.toBeNull();
    expect(n as number).toBeCloseTo(knownPeriods, 1);
  });

  it('degrades to targetPV / pmt at a 0% rate', () => {
    expect(periodsFromPresentValue(300, 0, 15600)).toBeCloseTo(52, 6);
  });

  it('returns null when the target exceeds the value of a perpetual stream at that rate', () => {
    // At 1%/period, a $300 payment stream is worth at most 300/0.01 = 30,000 no matter how long it runs.
    expect(periodsFromPresentValue(300, 1, 50000)).toBeNull();
  });

  it('returns null for non-positive payment or target', () => {
    expect(periodsFromPresentValue(0, 1, 1000)).toBeNull();
    expect(periodsFromPresentValue(300, 1, 0)).toBeNull();
  });
});

describe('clamp', () => {
  it('passes through values already in range', () => {
    expect(clamp(50, 0, 100)).toBe(50);
  });

  it('clamps to the minimum', () => {
    expect(clamp(-10, 0, 100)).toBe(0);
  });

  it('clamps to the maximum', () => {
    expect(clamp(150, 0, 100)).toBe(100);
  });
});

describe('compensationRate', () => {
  it('computes two-thirds of AWW when within the statutory band', () => {
    const result = compensationRate(900, 66.6667, 200, 1300);
    expect(result.rawRate).toBeCloseTo(600, 1);
    expect(result.clampedRate).toBeCloseTo(600, 1);
    expect(result.wasClampedToMin).toBe(false);
    expect(result.wasClampedToMax).toBe(false);
  });

  it('clamps up to the statutory minimum for a low-wage worker', () => {
    const result = compensationRate(100, 66.6667, 200, 1300);
    expect(result.rawRate).toBeCloseTo(66.67, 1);
    expect(result.clampedRate).toBe(200);
    expect(result.wasClampedToMin).toBe(true);
    expect(result.wasClampedToMax).toBe(false);
  });

  it('clamps down to the statutory maximum for a high-wage worker', () => {
    const result = compensationRate(3000, 66.6667, 200, 1300);
    expect(result.rawRate).toBeCloseTo(2000, 1);
    expect(result.clampedRate).toBe(1300);
    expect(result.wasClampedToMin).toBe(false);
    expect(result.wasClampedToMax).toBe(true);
  });
});

describe('undiscountedBenefitTotal', () => {
  it('multiplies weekly rate by weeks', () => {
    expect(undiscountedBenefitTotal(600, 104)).toBe(62400);
  });
});
