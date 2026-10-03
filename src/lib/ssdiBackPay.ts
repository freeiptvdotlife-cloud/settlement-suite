// SSA caps attorney contingency fees at $7,200 (raised from $6,000 in 2022).
const ATTORNEY_FEE_CAP = 7_200;
const ATTORNEY_FEE_RATE = 0.25;

export interface SsdiBackPayInput {
  monthlyBenefit: number;
  onsetDate: Date;
  applicationDate: Date;
  approvalDate: Date;
}

export interface SsdiBackPayOutput {
  eligibleStartDate: Date;
  backPayMonths: number;
  grossBackPay: number;
  attorneyFee: number;
  netBackPay: number;
}

function monthsBetween(from: Date, to: Date): number {
  return Math.max(
    0,
    (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
  );
}

function addMonths(date: Date, n: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

export function estimateSsdiBackPay(input: SsdiBackPayInput): SsdiBackPayOutput {
  // Eligible start is the later of: onset + 5-month wait, or application - 12-month retroactivity cap
  const onsetPlusWait = addMonths(input.onsetDate, 5);
  const retroLimit = addMonths(input.applicationDate, -12);
  const eligibleStartDate = onsetPlusWait > retroLimit ? onsetPlusWait : retroLimit;

  const backPayMonths = monthsBetween(eligibleStartDate, input.approvalDate);
  const grossBackPay = backPayMonths * input.monthlyBenefit;
  const attorneyFee = Math.min(grossBackPay * ATTORNEY_FEE_RATE, ATTORNEY_FEE_CAP);
  const netBackPay = grossBackPay - attorneyFee;

  return {
    eligibleStartDate,
    backPayMonths,
    grossBackPay: Math.round(grossBackPay),
    attorneyFee: Math.round(attorneyFee),
    netBackPay: Math.round(netBackPay),
  };
}
