"use client";

import { Button } from "@/components/ui/Button";
import { downloadCsv, type CsvRow } from "@/lib/csv";

interface ExportCsvButtonProps {
  label: string;
  filename: string;
  /** Header row first, then one array per data row. */
  rows: CsvRow[];
}

/**
 * Download what is on screen, as a real file.
 *
 * The mock drew a button here labelled "Xuất báo cáo". A control that names
 * a capability the app does not have is the same kind of lie as an invented
 * figure, so this one either works or should not be drawn — and the data is
 * already in the page, so it works. The label names exactly what arrives
 * rather than promising a report.
 *
 * Quoting, CRLF and the Excel BOM all live in `lib/csv.ts`, which is tested;
 * this is only the button.
 */
export function ExportCsvButton({ label, filename, rows }: ExportCsvButtonProps) {
  return (
    <Button tone="ink sm" icon="export" onClick={() => downloadCsv(filename, rows)}>
      {label}
    </Button>
  );
}
