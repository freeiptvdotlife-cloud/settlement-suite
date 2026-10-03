/**
 * IRS Collection Financial Standards used in Means Test Part 2 (Form 122A-2):
 * national standards (food/clothing/etc + out-of-pocket healthcare) and
 * local standards (housing/utilities, transportation) by county/region.
 *
 * SOURCE (national standards, out-of-pocket health care, transportation
 * ownership): https://www.irs.gov/businesses/small-businesses-self-employed/collection-financial-standards
 * Effective 2026-06-29.
 *
 * Local standards (housing/utilities, transportation operating costs) are
 * published per-county / per-MSA — thousands of rows nationwide, revised
 * annually. Hand-entering full national coverage isn't reliable to do in
 * one pass, so `countyHousingStandards` below is intentionally a small,
 * explicitly-sourced subset (the counties already referenced elsewhere in
 * this codebase), not full coverage. See the TODO on `getLocalStandards`.
 */

export const IRS_STANDARDS_EFFECTIVE_DATE = "2026-06-29";
export const IRS_STANDARDS_SOURCE =
  "https://www.irs.gov/businesses/small-businesses-self-employed/collection-financial-standards";

/** National Standards: food, housekeeping, apparel, personal care, misc — by household size. */
export const nationalStandards: Record<number, number> = {
  1: 867,
  2: 1558,
  3: 1857,
  4: 2176,
};

const NATIONAL_STANDARD_PER_ADDITIONAL_MEMBER = 397;

export function getNationalStandard(householdSize: number): number {
  if (householdSize in nationalStandards) return nationalStandards[householdSize];
  const base = nationalStandards[4];
  return base + NATIONAL_STANDARD_PER_ADDITIONAL_MEMBER * (householdSize - 4);
}

/** Out-of-pocket health care allowance, per person per month, by age band. */
export const outOfPocketHealthCarePerPerson = {
  under65: 90,
  age65OrOlder: 163,
};

export function getOutOfPocketHealthCare(
  householdSize: number,
  membersAge65OrOlder = 0
): number {
  const olderCount = Math.min(membersAge65OrOlder, householdSize);
  const youngerCount = householdSize - olderCount;
  return (
    youngerCount * outOfPocketHealthCarePerPerson.under65 +
    olderCount * outOfPocketHealthCarePerPerson.age65OrOlder
  );
}

/** Transportation ownership costs — nationwide flat allowance, not regional. */
export const transportationOwnershipCost = {
  oneCar: 703,
  twoCars: 1406,
};

/**
 * Transportation operating costs (maintenance, insurance, fuel, etc.) by
 * Census region, one-car baseline. The IRS also publishes higher MSA-level
 * overrides for specific major metros (e.g. New York MSA, Los Angeles MSA);
 * those are not modeled here — this is the regional baseline only.
 */
export type CensusRegion = "northeast" | "midwest" | "south" | "west";

export const transportationOperatingCostByRegion: Record<CensusRegion, number> = {
  northeast: 330,
  midwest: 263,
  south: 291,
  west: 299,
};

/**
 * Housing & utilities local standards by county, for the specific counties
 * already referenced elsewhere in this codebase (state selector options /
 * test fixtures). This is NOT a national dataset — see the module doc
 * comment. Source: IRS state-specific local standards pages, effective
 * 2026-06-29 (e.g. https://www.irs.gov/businesses/small-businesses-self-employed/texas-local-standards-housing-and-utilities).
 */
export interface CountyHousingStandard {
  state: string;
  county: string;
  bySize: Record<1 | 2 | 3 | 4, number>;
}

export const countyHousingStandards: CountyHousingStandard[] = [
  { state: "CA", county: "Los Angeles", bySize: { 1: 3001, 2: 3525, 3: 3714, 4: 4141 } },
  { state: "TX", county: "Harris", bySize: { 1: 2153, 2: 2529, 3: 2665, 4: 2971 } },
  { state: "FL", county: "Miami-Dade", bySize: { 1: 2474, 2: 2906, 3: 3062, 4: 3414 } },
  { state: "NY", county: "New York", bySize: { 1: 4350, 2: 5109, 3: 5384, 4: 6003 } },
];

/**
 * Local standards (housing+utilities, transportation) are keyed by county/
 * metro area in the real IRS tables — far too granular to stub meaningfully
 * for the whole country in one pass. This function only resolves the
 * counties in `countyHousingStandards` above.
 *
 * TODO before shipping the means-test tool to production: ingest the full
 * IRS "all-states-housing-standards" dataset (published as a PDF/table per
 * state) plus the MSA-level transportation operating cost overrides, rather
 * than hand-typing more counties one at a time.
 */
export function getLocalStandards(
  county: string,
  householdSize: number,
  state?: string
): { housingAndUtilities: number; transportation: number } | undefined {
  const normalizedCounty = county.trim().toLowerCase();
  const match = countyHousingStandards.find(
    (row) =>
      row.county.toLowerCase() === normalizedCounty &&
      (!state || row.state.toUpperCase() === state.toUpperCase())
  );
  if (!match) return undefined;

  const size = Math.min(householdSize, 4) as 1 | 2 | 3 | 4;
  const housingAndUtilities = match.bySize[size];

  const regionByState: Record<string, CensusRegion> = {
    CA: "west",
    TX: "south",
    FL: "south",
    NY: "northeast",
  };
  const region = regionByState[match.state] ?? "south";
  const transportation = transportationOperatingCostByRegion[region];

  return { housingAndUtilities, transportation };
}
