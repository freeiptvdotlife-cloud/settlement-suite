import { getStateMedianIncome } from "../data/stateMedianIncome.js";
import {
  getNationalStandard,
  getLocalStandards,
  getOutOfPocketHealthCare,
} from "../data/irsStandards.js";

/** BAPCPA Chapter 7/13 Part 2 dollar thresholds (Official Form 122A-2), in dollars over 60 months. */
export const MEANS_TEST_LOWER_THRESHOLD_60MO = 9075;
export const MEANS_TEST_UPPER_THRESHOLD_60MO = 15150;
export const MEANS_TEST_UNSECURED_DEBT_RATIO = 0.25;

export interface MeansTestInput {
  state: string;
  county: string;
  householdSize: number;
  /** Gross income for each of the trailing 6 full months, oldest first. */
  last6MonthsGrossIncome: number[];
  monthlySecuredDebtPayments: number;
  totalUnsecuredDebt: number;
  /** Household members aged 65+, for the IRS out-of-pocket health care allowance. Defaults to 0. */
  membersAge65OrOlder?: number;
}

export type MeansTestResult =
  | {
      part1: "pass";
      currentMonthlyIncome: number;
      annualizedIncome: number;
      stateMedianIncome: number;
    }
  | {
      part1: "fail";
      part2: "pass" | "fail" | "unknown-local-standards";
      currentMonthlyIncome: number;
      annualizedIncome: number;
      stateMedianIncome: number;
      disposableMonthlyIncome?: number;
      disposableIncomeOver60Months?: number;
      projectedChapter13PlanPayment?: number;
    }
  | { error: "unknown-state" };

/**
 * Runs the two-part Chapter 7 means test.
 * Part 1: is annualized current monthly income at/under the state median for
 * this household size? If yes, the filer passes outright (no Part 2 needed).
 * Part 2 (only reached on Part 1 failure): compute disposable monthly income
 * after IRS national + local expense standards and secured debt, then
 * compare 60 months of that figure against the BAPCPA dollar thresholds.
 */
export function runMeansTest(input: MeansTestInput): MeansTestResult {
  const stateMedian = getStateMedianIncome(input.state, input.householdSize);
  if (stateMedian === undefined) return { error: "unknown-state" };

  const currentMonthlyIncome =
    input.last6MonthsGrossIncome.reduce((sum, m) => sum + m, 0) /
    input.last6MonthsGrossIncome.length;
  const annualizedIncome = currentMonthlyIncome * 12;

  if (annualizedIncome <= stateMedian) {
    return {
      part1: "pass",
      currentMonthlyIncome,
      annualizedIncome,
      stateMedianIncome: stateMedian,
    };
  }

  const local = getLocalStandards(input.county, input.householdSize, input.state);
  if (!local) {
    return {
      part1: "fail",
      part2: "unknown-local-standards",
      currentMonthlyIncome,
      annualizedIncome,
      stateMedianIncome: stateMedian,
    };
  }

  const national = getNationalStandard(input.householdSize);
  const healthCare = getOutOfPocketHealthCare(
    input.householdSize,
    input.membersAge65OrOlder ?? 0
  );
  const disposableMonthlyIncome =
    currentMonthlyIncome -
    national -
    healthCare -
    local.housingAndUtilities -
    local.transportation -
    input.monthlySecuredDebtPayments;

  const disposableIncomeOver60Months = disposableMonthlyIncome * 60;

  let part2: "pass" | "fail";
  if (disposableIncomeOver60Months < MEANS_TEST_LOWER_THRESHOLD_60MO) {
    part2 = "pass";
  } else if (disposableIncomeOver60Months >= MEANS_TEST_UPPER_THRESHOLD_60MO) {
    part2 = "fail";
  } else {
    part2 =
      disposableIncomeOver60Months <
      input.totalUnsecuredDebt * MEANS_TEST_UNSECURED_DEBT_RATIO
        ? "pass"
        : "fail";
  }

  return {
    part1: "fail",
    part2,
    currentMonthlyIncome,
    annualizedIncome,
    stateMedianIncome: stateMedian,
    disposableMonthlyIncome,
    disposableIncomeOver60Months,
    projectedChapter13PlanPayment:
      part2 === "fail" ? Math.max(disposableMonthlyIncome, 0) : undefined,
  };
}
