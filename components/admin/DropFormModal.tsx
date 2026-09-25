"use client";

import { useEffect, useState } from "react";
import { AdminSheet } from "@/components/admin/AdminSheet";
import { Button } from "@/components/ui/Button";
import { Field3 } from "@/components/ui/Field3";
import { useCatalog } from "@/components/shop/CatalogContext";
import type { Catalog } from "@/lib/catalog";
import { dayFromIsoDay, dayInput, dayMonthYear, isoDayFromInput } from "@/lib/datetime";
import { LEX, issueNo } from "@/lib/lexicon";

/**
 * The hour every issue of this shop opens and closes at.
 *
 * Read off the issues that exist rather than typed here: all four open and
 * close at 20:00, and a form that offered some other hour would be inventing
 * a habit the shop does not have. Change the fixtures and the form follows.
 */
export function dropHour(catalog: Catalog): string {
  const drops = catalog.drops;
  return (drops.at(-1) ?? drops[0])?.opensAt.slice(11, 16) ?? "20:00";
}

/** How long an issue runs, in days, taken from the last one that did. */
export function dropLengthDays(catalog: Catalog): number {
  const last = catalog.drops.at(-1);
  if (!last) return 14;
  return Math.round((Date.parse(last.closesAt) - Date.parse(last.opensAt)) / 86_400_000);
}

/** `2026-11-06` → `2026-11-06T20:00:00+07:00`, the shape everything stores. */
export function atDropHour(catalog: Catalog, day: string): string {
  return `${day}T${dropHour(catalog)}:00+07:00`;
}

/** An instant → the day in the box, `21/09/2026`. */
function dayValue(iso: string): string {
  return dayFromIsoDay(iso.slice(0, 10));
}

/** `21/09/2026` plus n days, still as typed. Empty when the day is not one. */
function shiftDays(shown: string, delta: number): string {
  const iso = isoDayFromInput(shown);
  if (!iso) return shown;
  return dayFromIsoDay(
    new Date(Date.parse(`${iso}T12:00:00+07:00`) + delta * 86_400_000)
      .toISOString()
      .slice(0, 10),
  );
}

/** The two boxes as instants, or null while one of them is unfinished. */
function span(from: string, to: string): { from: string; to: string } | null {
  const a = isoDayFromInput(from);
  const b = isoDayFromInput(to);
  return a && b ? { from: a, to: b } : null;
}

interface DropFormModalProps {
  open: boolean;
  /** The save is on its way to the server (slice B3b). */
  pending?: boolean;
  onClose: () => void;
  /** "Tạo số 07" or "Sửa giờ số 06" — it also decides the button. */
  mode: "create" | "edit";
  no: number;
  /** Starting values; for a new issue these are the defaults offered. */
  opensAt: string;
  closesAt: string;
  onConfirm: (opensAt: string, closesAt: string) => void;
}

/**
 * An issue is two instants and a number. That is the whole form.
 *
 * Styles, prices and how many were cut are not here because they are not
 * part of an issue — they belong to the products that go in it, which is
 * where `/admin/products` puts them.
 *
 * Dates only, at the shop's own hour: every issue it has run opened and
 * closed at 20:00, and a free-text "20:00 · 06/11/2026" box would be a
 * parser waiting to disagree with the calendar.
 */
export function DropFormModal({
  open,
  pending = false,
  onClose,
  mode,
  no,
  opensAt,
  closesAt,
  onConfirm,
}: DropFormModalProps) {
  const catalog = useCatalog();
  const hour = dropHour(catalog);
  const [from, setFrom] = useState(dayValue(opensAt));
  const [to, setTo] = useState(dayValue(closesAt));
  const [error, setError] = useState<string | null>(null);

  // Reopening the sheet on another issue must not show the last one's dates.
  useEffect(() => {
    if (!open) return;
    setFrom(dayValue(opensAt));
    setTo(dayValue(closesAt));
    setError(null);
  }, [open, opensAt, closesAt]);

  const days = span(from, to);
  const ready = days !== null && Date.parse(days.to) > Date.parse(days.from);

  return (
    <AdminSheet
      open={open}
      onClose={onClose}
      title={
        mode === "create"
          ? `Tạo ${LEX.tl} ${issueNo(no)}`
          : `Sửa giờ ${LEX.tl} ${issueNo(no)}`
      }
      footer={
        <>
          <Button tone="ink sm" icon="back" disabled={pending} onClick={onClose}>
            Huỷ
          </Button>
          <Button
            tone="sm"
            {...(ready && !pending
              ? { icon: mode === "create" ? ("plus" as const) : ("calendar" as const) }
              : {})}
            disabled={!ready || pending}
            onClick={() => {
              if (pending) return;
              if (!days) return setError("Nhập ngày mở và ngày đóng theo dạng dd/mm/yyyy.");
              if (Date.parse(days.to) <= Date.parse(days.from)) {
                return setError("Ngày đóng phải sau ngày mở.");
              }
              onConfirm(atDropHour(catalog, days.from), atDropHour(catalog, days.to));
            }}
          >
            {pending
              ? "Đang lưu…"
              : !ready
                ? "Nhập hai ngày"
                : mode === "create"
                  ? `Tạo ${LEX.tl}`
                  : "Lưu giờ"}
          </Button>
        </>
      }
    >
      <div className="fgrid">
        <Field3 label={`Mở lúc ${hour} ngày`} error={error ?? undefined}>
          {({ id }) => (
            <input
              id={id}
              className="inp"
              inputMode="numeric"
              placeholder="dd/mm/yyyy"
              value={from}
              onChange={(e) => {
                const next = dayInput(e.target.value);
                setFrom(next);
                setError(null);
                const a = isoDayFromInput(next);
                const b = isoDayFromInput(to);
                if (a && (!b || Date.parse(b) <= Date.parse(a))) {
                  setTo(shiftDays(next, dropLengthDays(catalog)));
                }
              }}
            />
          )}
        </Field3>
        <Field3 label={`Đóng lúc ${hour} ngày`}>
          {({ id }) => (
            <input
              id={id}
              className="inp"
              inputMode="numeric"
              placeholder="dd/mm/yyyy"
              value={to}
              onChange={(e) => {
                setTo(dayInput(e.target.value));
                setError(null);
              }}
            />
          )}
        </Field3>
      </div>
      <p className="fine3">
        Xem trước: {LEX.t} {issueNo(no)} mở {hour} ngày{" "}
        {isoDayFromInput(from)
          ? dayMonthYear(atDropHour(catalog, isoDayFromInput(from)!))
          : "—"}
        , đóng {hour} ngày{" "}
        {isoDayFromInput(to) ? dayMonthYear(atDropHour(catalog, isoDayFromInput(to)!)) : "—"}
        {ready
          ? ` · ${Math.round((Date.parse(days.to) - Date.parse(days.from)) / 86_400_000)} ngày`
          : ""}
        .
      </p>
    </AdminSheet>
  );
}
