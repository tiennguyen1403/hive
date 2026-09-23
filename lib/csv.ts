export type CsvCell = string | number;
export type CsvRow = CsvCell[];

/** Quote a field only when it needs it, doubling any quote inside. RFC 4180. */
function field(v: CsvCell): string {
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Rows to CSV text.
 *
 * Numbers go out raw. Formatting them here would hand a spreadsheet the
 * string `"1.290.000₫"`, which cannot be summed — and summing is the reason
 * anybody exports. Money formatting belongs on screen, not in a file.
 *
 * CRLF between rows because that is what RFC 4180 says and Excel is what
 * these open in.
 */
export function toCsv(rows: CsvRow[]): string {
  return rows.map((r) => r.map(field).join(",")).join("\r\n");
}

/**
 * Hand the browser a CSV file.
 *
 * The BOM is not superstition: without it Excel on Windows reads the file in
 * the system codepage and every Vietnamese name in it arrives as mojibake.
 */
export function downloadCsv(filename: string, rows: CsvRow[]): void {
  const blob = new Blob([`﻿${toCsv(rows)}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
