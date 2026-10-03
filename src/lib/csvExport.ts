// Prefix cells that start with formula-injection characters per OWASP guidance.
function csvSafeCell(value: string | number): string {
  const str = String(value);
  return /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
}

function csvQuoteCell(value: string | number): string {
  const safe = csvSafeCell(value);
  return /[,"\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function buildCsvString(
  columns: string[],
  rows: Array<(string | number)[]>
): string {
  return [
    columns.map(csvQuoteCell).join(","),
    ...rows.map((row) => row.map(csvQuoteCell).join(",")),
  ].join("\r\n");
}

export function downloadCsv(
  columns: string[],
  rows: Array<(string | number)[]>,
  filename: string
): void {
  const csv = buildCsvString(columns, rows);
  // BOM for Excel UTF-8 compatibility
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function csvFilename(site: string, calculator: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `${site}-${calculator}-${date}.csv`;
}
