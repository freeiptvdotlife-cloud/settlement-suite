import { describe, it, expect } from "vitest";
import { buildCsvString, csvFilename } from "./csvExport";

describe("buildCsvString", () => {
  it("produces a header row and data rows", () => {
    const out = buildCsvString(["Month", "Amount"], [[1, 1000], [2, 2000]]);
    const lines = out.split("\r\n");
    expect(lines[0]).toBe("Month,Amount");
    expect(lines[1]).toBe("1,1000");
    expect(lines[2]).toBe("2,2000");
  });

  it("wraps cells with commas in double quotes", () => {
    const out = buildCsvString(["Label"], [["Hello, world"]]);
    expect(out).toContain('"Hello, world"');
  });

  it("escapes double quotes by doubling them", () => {
    const out = buildCsvString(["Note"], [['Say "hello"']]);
    expect(out).toContain('"Say ""hello"""');
  });

  it("prefixes formula-injection cells starting with =", () => {
    const out = buildCsvString(["Formula"], [["=1+1"]]);
    expect(out).toContain("'=1+1");
  });

  it("prefixes cells starting with +", () => {
    const out = buildCsvString(["X"], [["+cmd"]]);
    expect(out).toContain("'+cmd");
  });

  it("prefixes cells starting with -", () => {
    const out = buildCsvString(["X"], [["-cmd"]]);
    expect(out).toContain("'-cmd");
  });

  it("prefixes cells starting with @", () => {
    const out = buildCsvString(["X"], [["@SUM(A1)"]]);
    expect(out).toContain("'@SUM(A1)");
  });

  it("does not modify normal numeric values", () => {
    const out = buildCsvString(["Amount"], [[42]]);
    expect(out).toContain("42");
    expect(out).not.toContain("'42");
  });
});

describe("csvFilename", () => {
  it("produces the correct format", () => {
    const name = csvFilename("recovery", "annuity-solver");
    expect(name).toMatch(/^recovery-annuity-solver-\d{4}-\d{2}-\d{2}\.csv$/);
  });
});
