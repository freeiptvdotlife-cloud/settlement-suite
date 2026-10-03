import {
  requalificationWindows,
  type LoanType,
  type BankruptcyChapter,
} from "../data/requalificationWindows.js";

export interface DtiInput {
  monthlyDebtObligations: number;
  monthlyGrossIncome: number;
}

export interface DtiResult {
  dti: number;
  qualifies: Record<LoanType, boolean>;
}

/** Lender DTI ceilings — widely published guideline maximums, not per-lender overlays. */
const DTI_CEILINGS: Record<LoanType, number> = {
  conventional: 0.45,
  fha: 0.57,
  va: 0.41,
};

export function calculateDti(input: DtiInput): DtiResult {
  const dti = input.monthlyDebtObligations / input.monthlyGrossIncome;
  return {
    dti,
    qualifies: {
      conventional: dti <= DTI_CEILINGS.conventional,
      fha: dti <= DTI_CEILINGS.fha,
      va: dti <= DTI_CEILINGS.va,
    },
  };
}

export interface RecoveryTimelineInput {
  chapter: BankruptcyChapter;
  /** Discharge date for chapter7, or filing date for chapter13 (plan-payment basis). */
  anchorDate: Date;
}

export interface RecoveryTimelineEntry {
  loanType: LoanType;
  earliestEligibleDate: Date;
  latestEligibleDate: Date;
}

export function projectRecoveryTimeline(
  input: RecoveryTimelineInput
): RecoveryTimelineEntry[] {
  const loanTypes: LoanType[] = ["conventional", "fha", "va"];
  return loanTypes.map((loanType) => {
    const window = requalificationWindows[loanType][input.chapter];
    return {
      loanType,
      earliestEligibleDate: addYears(input.anchorDate, window.minYears),
      latestEligibleDate: addYears(input.anchorDate, window.maxYears),
    };
  });
}

function addYears(date: Date, years: number): Date {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
}
