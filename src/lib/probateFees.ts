export interface ProbateFeeOutput {
  attorneyFee: number;
  executorFee: number;
  totalStatutoryFees: number;
  note: string;
  sourceStatute: string;
  asOf: string;
}

interface Tier {
  upTo: number; // cumulative upper bound of the tier (Infinity for last tier)
  rate: number; // decimal rate for amounts within this tier
}

function tieredFee(estateValue: number, tiers: Tier[]): number {
  let fee = 0;
  let prior = 0;
  for (const tier of tiers) {
    if (estateValue <= prior) break;
    const taxable = Math.min(estateValue, tier.upTo) - prior;
    fee += taxable * tier.rate;
    prior = tier.upTo;
  }
  return fee;
}

// ─── California ───────────────────────────────────────────────────────────────
// Prob. Code §10810 (attorney) and §10800 (executor/administrator).
// Both receive the same statutory schedule. Fee base = gross probate estate value
// (full appraised value of property, not reduced by mortgages or debts).
// Effective for decedents dying on or after July 1, 1988.
const CA_TIERS: Tier[] = [
  { upTo: 100_000,    rate: 0.04  },
  { upTo: 200_000,    rate: 0.03  },
  { upTo: 1_000_000,  rate: 0.02  },
  { upTo: 10_000_000, rate: 0.01  },
  { upTo: 25_000_000, rate: 0.005 },
  { upTo: Infinity,   rate: 0     }, // "reasonable" — not computable
];

export function estimateCaliforniaProbateFees(estateValue: number): ProbateFeeOutput {
  const fee = Math.round(tieredFee(estateValue, CA_TIERS));
  const aboveCap = estateValue > 25_000_000;
  return {
    attorneyFee: fee,
    executorFee: fee,
    totalStatutoryFees: fee * 2,
    note: aboveCap
      ? "Estate exceeds $25M. Fees above $25M are set at court discretion as \"reasonable.\" Total shown covers only the first $25M."
      : "Attorney and executor each receive the statutory fee. Total is 2× the schedule amount.",
    sourceStatute: "Cal. Prob. Code §10800, §10810",
    asOf: "July 1, 1988 (unchanged)",
  };
}

// ─── Florida ──────────────────────────────────────────────────────────────────
// §733.6171 (attorney fees) and §733.617 (personal representative compensation).
// Both follow the same "presumed reasonable" schedule.
// Fee base = inventory value of probate estate + income earned during administration.
const FL_TIERS: Tier[] = [
  { upTo: 1_000_000,   rate: 0.03   },
  { upTo: 5_000_000,   rate: 0.025  },
  { upTo: 10_000_000,  rate: 0.02   },
  { upTo: Infinity,    rate: 0.015  },
];

export function estimateFloridaProbateFees(estateValue: number): ProbateFeeOutput {
  const fee = Math.round(tieredFee(estateValue, FL_TIERS));
  return {
    attorneyFee: fee,
    executorFee: fee,
    totalStatutoryFees: fee * 2,
    note: "Attorney and personal representative each receive the presumed-reasonable statutory fee. Extraordinary services (litigation, tax work) may add to attorney fees.",
    sourceStatute: "Fla. Stat. §733.617, §733.6171",
    asOf: "Oct. 1, 1993 (current schedule)",
  };
}

// ─── Missouri ─────────────────────────────────────────────────────────────────
// Mo. Rev. Stat. §473.153 — personal representative compensation.
// Attorney fees are "reasonable" per court order; Missouri has no separate
// statutory attorney fee schedule (shown separately as a footnote).
const MO_TIERS: Tier[] = [
  { upTo: 5_000,     rate: 0.05   },
  { upTo: 25_000,    rate: 0.04   },
  { upTo: 100_000,   rate: 0.03   },
  { upTo: 400_000,   rate: 0.0275 },
  { upTo: 1_000_000, rate: 0.025  },
  { upTo: Infinity,  rate: 0.02   },
];

export function estimateMissouriProbateFees(estateValue: number): ProbateFeeOutput {
  const executorFee = Math.round(tieredFee(estateValue, MO_TIERS));
  // Attorney fees in Missouri are set by the probate court as "reasonable";
  // they are commonly set at or near the PR fee rate but are not statutory.
  const attorneyFeeEstimate = executorFee;
  return {
    attorneyFee: attorneyFeeEstimate,
    executorFee,
    totalStatutoryFees: executorFee + attorneyFeeEstimate,
    note: "Personal representative fee is statutory (§473.153). Attorney fees are set by the probate court as 'reasonable' — no fixed schedule. Attorney fee shown is an estimate only; actual fees vary.",
    sourceStatute: "Mo. Rev. Stat. §473.153",
    asOf: "Current (unchanged from original enactment)",
  };
}
