/**
 * USTP median family income by state and household size, used in Chapter 7
 * Means Test Part 1 (Official Form 122A-1).
 *
 * SOURCE: U.S. Trustee Program, Census Bureau median family income data,
 * for cases filed on or after July 15, 2026.
 * https://www.justice.gov/ust/eo/bapcpa/20260715/bci_data/median_income_table.htm
 *
 * These figures are extracted via automated tooling, not hand-verified
 * against the published Excel workbook line by line — spot-check a handful
 * of states against the live justice.gov page before relying on this for
 * anything user-facing, and refresh this table whenever the USTP publishes
 * a new effective-date revision (typically twice a year).
 */

export interface MedianIncomeRow {
  /** Add this amount per household member above 4 (nationwide flat add-on per USTP). */
  perAdditionalMember: number;
  bySize: Record<1 | 2 | 3 | 4, number>;
}

export const STATE_MEDIAN_INCOME_EFFECTIVE_DATE = "2026-07-15";
export const STATE_MEDIAN_INCOME_SOURCE =
  "https://www.justice.gov/ust/eo/bapcpa/20260715/bci_data/median_income_table.htm";

const PER_ADDITIONAL_MEMBER = 11100;

function row(one: number, two: number, three: number, four: number): MedianIncomeRow {
  return {
    bySize: { 1: one, 2: two, 3: three, 4: four },
    perAdditionalMember: PER_ADDITIONAL_MEMBER,
  };
}

export const stateMedianIncome: Record<string, MedianIncomeRow> = {
  AL: row(64321, 77451, 92698, 106740),
  AK: row(85817, 112548, 112548, 142136),
  AZ: row(73935, 89027, 104965, 121174),
  AR: row(58421, 73630, 82329, 97054),
  CA: row(79253, 102797, 116541, 139071),
  CO: row(87940, 109497, 130850, 153501),
  CT: row(84302, 106224, 134470, 159934),
  DE: row(69515, 94877, 111273, 132244),
  DC: row(85391, 161397, 161397, 166598),
  FL: row(69876, 86523, 97540, 114761),
  GA: row(68478, 84965, 101479, 123481),
  HI: row(85254, 106202, 123454, 142181),
  ID: row(73413, 86160, 98381, 119662),
  IL: row(73180, 93934, 113625, 137902),
  IN: row(64461, 81986, 95627, 115656),
  IA: row(67617, 88800, 104133, 126058),
  KS: row(69197, 87441, 103852, 125971),
  KY: row(61652, 73892, 85212, 109443),
  LA: row(59447, 72348, 84602, 103628),
  ME: row(75892, 90445, 106822, 131577),
  MD: row(86928, 114611, 135949, 166173),
  MA: row(88202, 112708, 139411, 178524),
  MI: row(67352, 83432, 103449, 123010),
  MN: row(77696, 98328, 126487, 149882),
  MS: row(53978, 70328, 82846, 97464),
  MO: row(64972, 82075, 100228, 118530),
  MT: row(71310, 91452, 103285, 121698),
  NE: row(66922, 90728, 103405, 125074),
  NV: row(72222, 87914, 101638, 114110),
  NH: row(87287, 109324, 141531, 155203),
  NJ: row(87173, 106876, 137136, 168127),
  NM: row(66235, 79574, 88041, 98602),
  NY: row(73272, 92902, 115579, 139040),
  NC: row(67117, 84384, 101535, 116737),
  ND: row(73549, 96352, 106686, 137817),
  OH: row(66239, 83725, 102504, 123702),
  OK: row(61180, 77208, 86845, 101798),
  OR: row(79089, 93670, 116729, 140024),
  PA: row(72230, 87534, 110151, 135862),
  RI: row(77653, 98736, 119419, 137479),
  SC: row(64808, 83761, 95672, 116314),
  SD: row(69190, 89809, 100883, 130738),
  TN: row(63979, 82846, 97511, 109585),
  TX: row(66837, 86714, 99273, 117962),
  UT: row(87898, 95757, 112751, 131741),
  VT: row(72461, 96963, 114075, 137583),
  VA: row(78491, 101171, 123159, 144826),
  WA: row(88585, 107100, 131737, 156567),
  WV: row(63908, 68592, 92050, 93672),
  WI: row(71168, 90252, 108516, 133384),
  WY: row(71745, 91502, 98476, 110297),
};

export function getStateMedianIncome(
  state: string,
  householdSize: number
): number | undefined {
  const row = stateMedianIncome[state.toUpperCase()];
  if (!row) return undefined;
  if (householdSize <= 4) {
    return row.bySize[householdSize as 1 | 2 | 3 | 4];
  }
  return row.bySize[4] + row.perAdditionalMember * (householdSize - 4);
}
