export interface AlimonySingleOutput {
  monthlyAmount: number;
  monthlyNote: string;
  durationDescription: string;
  sourceStatute: string;
  asOf: string;
}

// ─── Texas ────────────────────────────────────────────────────────────────────
// Tex. Fam. Code §8.055 (amount cap) and §8.054 (duration caps).
// Effective Sept. 1, 2011. Qualifying marriage length: 10+ years (general rule).
export function estimateTexasAlimony({
  payorGrossMonthly,
  yearsMarried,
}: {
  payorGrossMonthly: number;
  yearsMarried: number;
}): AlimonySingleOutput {
  const byIncome = payorGrossMonthly * 0.20;
  const monthlyAmount = Math.round(Math.min(5_000, byIncome));

  let durationDescription: string;
  if (yearsMarried < 10) {
    durationDescription =
      "Marriage under 10 years generally does not qualify for spousal maintenance unless domestic violence or a disability exception applies.";
  } else if (yearsMarried < 20) {
    durationDescription = "Maximum 5 years (60 months) for a 10–19 year marriage.";
  } else if (yearsMarried < 30) {
    durationDescription = "Maximum 7 years (84 months) for a 20–29 year marriage.";
  } else {
    durationDescription = "Maximum 10 years (120 months) for a marriage of 30 or more years.";
  }

  return {
    monthlyAmount,
    monthlyNote:
      "Statutory maximum. The court sets the actual amount at or below this cap based on the recipient's minimum reasonable needs.",
    durationDescription,
    sourceStatute: "Tex. Fam. Code §8.054, §8.055",
    asOf: "Sept. 1, 2011",
  };
}

// ─── Colorado ─────────────────────────────────────────────────────────────────
// C.R.S. §14-10-114(3)(b). Advisory guideline formula for combined income
// up to $240,000/year; courts may deviate. Effective Jan. 1, 2014.
export function estimateColoradoAlimony({
  payorMAGIMonthly,
  payeeMAGIMonthly,
  yearsMarried,
}: {
  payorMAGIMonthly: number;
  payeeMAGIMonthly: number;
  yearsMarried: number;
}): AlimonySingleOutput {
  const raw = 0.40 * payorMAGIMonthly - 0.50 * payeeMAGIMonthly;
  const monthlyAmount = Math.round(Math.max(0, raw));

  // Advisory duration: ~30% of marriage length in months (from the published
  // Judicial Branch advisory schedule, rounded to the nearest month).
  const durationMonths = Math.round(yearsMarried * 12 * 0.30);
  const durationYears = (durationMonths / 12).toFixed(1);
  const durationDescription =
    yearsMarried < 3
      ? "Marriage under 3 years: the guideline does not specify a minimum duration."
      : `Advisory guideline: approximately ${durationMonths} months (${durationYears} years). Courts may order longer or shorter maintenance.`;

  return {
    monthlyAmount,
    monthlyNote:
      "Advisory guideline amount. Applies when combined gross income does not exceed $240,000/year. Courts may deviate.",
    durationDescription,
    sourceStatute: "C.R.S. §14-10-114(3)(b)",
    asOf: "Jan. 1, 2014",
  };
}

// ─── Illinois ─────────────────────────────────────────────────────────────────
// 750 ILCS 5/504(b-1). Statutory formula based on net income.
// Duration multiplier table per 750 ILCS 5/504(b-1)(1), as amended 2019.
const IL_DURATION_MULTIPLIERS: Record<number, number> = {
  0: 0.20, 5: 0.24, 6: 0.28, 7: 0.32, 8: 0.36, 9: 0.40,
  10: 0.44, 11: 0.48, 12: 0.52, 13: 0.56, 14: 0.60,
  15: 0.64, 16: 0.68, 17: 0.72, 18: 0.76, 19: 0.80,
};

function ilDurationMultiplier(years: number): number | null {
  if (years >= 20) return null; // indefinite at court discretion
  const bracket = years >= 5 ? Math.floor(years) : 0;
  return IL_DURATION_MULTIPLIERS[bracket] ?? 0.20;
}

export function estimateIllinoisAlimony({
  payorNetMonthly,
  payeeNetMonthly,
  yearsMarried,
}: {
  payorNetMonthly: number;
  payeeNetMonthly: number;
  yearsMarried: number;
}): AlimonySingleOutput {
  const combined = payorNetMonthly + payeeNetMonthly;
  const raw = 0.3333 * payorNetMonthly - 0.25 * payeeNetMonthly;
  const cap = 0.40 * combined;
  const monthlyAmount = Math.round(Math.max(0, Math.min(raw, cap)));

  const multiplier = ilDurationMultiplier(yearsMarried);
  const durationDescription =
    multiplier === null
      ? "Marriage of 20+ years: the court may order maintenance for an indefinite duration."
      : `${Math.round(yearsMarried * 12 * multiplier)} months (${(yearsMarried * multiplier).toFixed(1)} years), per the statutory duration table.`;

  return {
    monthlyAmount,
    monthlyNote:
      "Presumptive statutory amount using net income. Not to exceed 40% of combined net income. Courts may deviate for cause.",
    durationDescription,
    sourceStatute: "750 ILCS 5/504(b-1)",
    asOf: "Jan. 1, 2019",
  };
}

// ─── New York ─────────────────────────────────────────────────────────────────
// N.Y. Dom. Rel. Law §236B(6)(e). Post-divorce maintenance formula, eff. Jan. 25, 2016.
// Two sub-formulas; lower result governs when payor's income is above the cap
// ($203,000/yr as of 2024 — periodically adjusted by the Chief Administrative Judge).
// Duration: advisory schedule from DRL §236B(6)(e)(1)(f).
export function estimateNewYorkAlimony({
  payorGrossMonthly,
  payeeGrossMonthly,
  yearsMarried,
}: {
  payorGrossMonthly: number;
  payeeGrossMonthly: number;
  yearsMarried: number;
}): AlimonySingleOutput {
  const combined = payorGrossMonthly + payeeGrossMonthly;
  const formula1 = 0.30 * payorGrossMonthly - 0.20 * payeeGrossMonthly;
  const formula2 = 0.40 * combined - 2 * payeeGrossMonthly;
  // Apply the formula yielding the lower obligation (capped incomes use the minimum)
  const raw = Math.min(formula1, formula2);
  const monthlyAmount = Math.round(Math.max(0, raw));

  let durationDescription: string;
  if (yearsMarried < 15) {
    const low = Math.round(yearsMarried * 0.15);
    const high = Math.round(yearsMarried * 0.30);
    durationDescription = `Advisory range: ${low}–${high} years (15–30% of marriage length) for marriages under 15 years.`;
  } else if (yearsMarried < 20) {
    const low = Math.round(yearsMarried * 0.30);
    const high = Math.round(yearsMarried * 0.40);
    durationDescription = `Advisory range: ${low}–${high} years (30–40% of marriage length) for 15–19 year marriages.`;
  } else {
    const low = Math.round(yearsMarried * 0.35);
    const high = Math.round(yearsMarried * 0.50);
    durationDescription = `Advisory range: ${low}–${high} years (35–50% of marriage length) for marriages of 20+ years. Permanent maintenance is possible.`;
  }

  return {
    monthlyAmount,
    monthlyNote:
      "Guideline amount per DRL §236B(6)(e). Income above the annual cap ($203,000 as of 2024, adjusted periodically) uses the lower of the two sub-formulas applied to the cap. Courts may deviate.",
    durationDescription,
    sourceStatute: "N.Y. Dom. Rel. Law §236B(6)(e)",
    asOf: "Jan. 25, 2016",
  };
}
