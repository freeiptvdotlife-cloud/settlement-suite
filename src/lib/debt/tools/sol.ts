import { getSolYears, type DebtType } from "../data/statuteOfLimitations.js";

export interface SolInput {
  state: string;
  debtType: DebtType;
  lastActivityDate: Date;
  /** True if the user made any payment (even partial) after lastActivityDate — some states revive the SOL clock. */
  paymentMadeAfterLastActivity?: boolean;
}

export type SolResult =
  | { error: "unknown-state-or-debt-type" }
  | {
      solYears: number;
      expirationDate: Date;
      isTimeBarred: boolean;
      revivalRiskWarning: boolean;
    };

export function checkStatuteOfLimitations(input: SolInput): SolResult {
  const solYears = getSolYears(input.state, input.debtType);
  if (solYears === undefined) return { error: "unknown-state-or-debt-type" };

  const expirationDate = new Date(input.lastActivityDate);
  expirationDate.setFullYear(expirationDate.getFullYear() + solYears);

  return {
    solYears,
    expirationDate,
    isTimeBarred: new Date() > expirationDate,
    revivalRiskWarning: Boolean(input.paymentMadeAfterLastActivity),
  };
}
