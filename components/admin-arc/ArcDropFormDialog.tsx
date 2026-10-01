"use client";

import { ArrowLeft, Check, Plus } from "lucide-react";
import { useState } from "react";
import { useCatalog } from "@/components/shop/CatalogContext";
import { dayInput, dayMonthYear, isoDayFromInput } from "@/lib/datetime";
import {
  atDropHour,
  closingAfter,
  dayValue,
  dropHour,
  dropLengthDays,
  span,
  spanDays,
} from "@/lib/drop-form";
import { LEX, issueNo } from "@/lib/lexicon";
import { Button } from "@/registry/components/button/button";
import { Dialog, DialogContent } from "@/registry/components/dialog/dialog";
import { Input } from "@/registry/components/input/input";
import box from "./ArcDialog.module.css";
import styles from "./ArcDropFormDialog.module.css";
import { keepOpenForToasts } from "./arc-toasts";

/** Lucide at 16, Arc's stroke (skill-design.md). Decorative: every icon sits beside its label. */
const ICON = { size: 16, strokeWidth: 1.75, "aria-hidden": true } as const;

/** Which issue the form holds, and the two instants it starts from. */
export interface DropFormTarget {
  /** "Tạo số 07" or "Sửa giờ số 05": it also decides the button. */
  mode: "create" | "edit";
  no: number;
  /** For a new issue these are the days proposed (`proposedWindow`). */
  opensAt: string;
  closesAt: string;
}

/**
 * "Tạo số" and "Sửa giờ": an issue is two instants and a number, and that is
 * the whole form. v3's `DropFormModal` (`components/admin/DropFormModal.tsx`)
 * rule for rule and word for word, in an Arc `Dialog` in the middle of the
 * screen (brief v5 slice 4, §2: a short form), its pure parts in
 * `lib/drop-form.ts`.
 *
 * Days only, typed `dd/mm/yyyy` and masked as they arrive (`dayInput`), at the
 * shop's own hour read off the issues that exist (`dropHour`): every issue it
 * has run opened and closed at 20:00. Moving the opening day moves an empty
 * closing day, or one not after it, to the opening day plus the last issue's
 * length (`closingAfter`).
 *
 * One change from v3, asked for by the brief (§3.4): with both days typed and
 * the closing one not after the opening one, v3's button still said "Nhập
 * hai ngày", which was not true. Here v3's own sentence for that case, "Ngày
 * đóng phải sau ngày mở.", sits under "Đóng" (Arc's `error`), and the button
 * keeps its name, disabled and without an icon.
 *
 * While the save is on its way the dialog cannot be closed and the button
 * shows Arc's spinner with "Đang lưu…". A refusal from the server is the
 * screen's toast; the dialog stays open, as in v3.
 */
export function ArcDropFormDialog({
  open,
  pending,
  target,
  opening,
  onClose,
  onConfirm,
  onCloseAutoFocus,
}: {
  open: boolean;
  /** The save is on its way to the server. */
  pending: boolean;
  /** Kept while the dialog animates out, so its title does not change on the way. */
  target: DropFormTarget | null;
  /** Which opening this is: the form starts again from `target` each time. */
  opening: number;
  onClose: () => void;
  onConfirm: (opensAt: string, closesAt: string) => void;
  /** Where focus goes when the dialog shuts: the button or the row menu that opened it. */
  onCloseAutoFocus: (event: Event) => void;
}) {
  const no = target?.no ?? 0;
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !pending) onClose();
      }}
    >
      <DialogContent
        title={
          target?.mode === "edit" ? `Sửa giờ ${LEX.tl} ${issueNo(no)}` : `Tạo ${LEX.tl} ${issueNo(no)}`
        }
        onCloseAutoFocus={onCloseAutoFocus}
        onInteractOutside={keepOpenForToasts}
      >
        {target && (
          <DropForm
            key={opening}
            target={target}
            pending={pending}
            onCancel={onClose}
            onConfirm={onConfirm}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * The two boxes, the preview and the two buttons. Mounted each time the
 * dialog opens, so it starts from the issue's own days, or from the proposed
 * ones for a new issue, without an effect to reset it.
 */
function DropForm({
  target,
  pending,
  onCancel,
  onConfirm,
}: {
  target: DropFormTarget;
  pending: boolean;
  onCancel: () => void;
  onConfirm: (opensAt: string, closesAt: string) => void;
}) {
  const catalog = useCatalog();
  const hour = dropHour(catalog);
  const [from, setFrom] = useState(dayValue(target.opensAt));
  const [to, setTo] = useState(dayValue(target.closesAt));

  const days = span(from, to);
  // Both days typed, the closing one not after the opening one.
  const backwards = days !== null && Date.parse(days.to) <= Date.parse(days.from);
  const ready = days !== null && !backwards;
  const verb = target.mode === "create" ? `Tạo ${LEX.tl}` : "Lưu giờ";

  const opensDay = isoDayFromInput(from);
  const closesDay = isoDayFromInput(to);
  const preview = `Xem trước: ${LEX.t} ${issueNo(target.no)} mở ${hour} ngày ${
    opensDay ? dayMonthYear(atDropHour(catalog, opensDay)) : "—"
  }, đóng ${hour} ngày ${closesDay ? dayMonthYear(atDropHour(catalog, closesDay)) : "—"}${
    ready ? ` · ${spanDays(days)} ngày` : ""
  }.`;

  return (
    <>
      <div className={box.fields}>
        <div className={styles.pair}>
          <Input
            label={`Mở lúc ${hour} ngày`}
            inputMode="numeric"
            placeholder="dd/mm/yyyy"
            autoComplete="off"
            value={from}
            onChange={(e) => {
              const next = dayInput(e.target.value);
              setFrom(next);
              setTo((current) => closingAfter(next, current, dropLengthDays(catalog)));
            }}
          />
          <Input
            label={`Đóng lúc ${hour} ngày`}
            inputMode="numeric"
            placeholder="dd/mm/yyyy"
            autoComplete="off"
            value={to}
            error={backwards ? "Ngày đóng phải sau ngày mở." : undefined}
            onChange={(e) => setTo(dayInput(e.target.value))}
          />
        </div>
        <p className={styles.preview}>{preview}</p>
      </div>
      <div className={box.actions}>
        <Button variant="secondary" size="sm" disabled={pending} onClick={onCancel}>
          {pending ? null : <ArrowLeft {...ICON} />}
          Huỷ
        </Button>
        <Button
          variant="primary"
          size="sm"
          disabled={!ready}
          loading={pending}
          onClick={() => {
            if (!ready || pending) return;
            onConfirm(atDropHour(catalog, days.from), atDropHour(catalog, days.to));
          }}
        >
          {ready && !pending ? target.mode === "create" ? <Plus {...ICON} /> : <Check {...ICON} /> : null}
          {pending ? "Đang lưu…" : days === null ? "Nhập hai ngày" : verb}
        </Button>
      </div>
    </>
  );
}
