"use client";

import { ArrowLeft, Clock } from "lucide-react";
import { dateTimeLabel } from "@/lib/datetime";
import { LEX, issueNo } from "@/lib/lexicon";
import { Button } from "@/registry/components/button/button";
import { Dialog, DialogContent } from "@/registry/components/dialog/dialog";
import box from "./ArcDialog.module.css";
import { keepOpenForToasts } from "./arc-toasts";

/** Lucide at 16, Arc's stroke (skill-design.md). Decorative: every icon sits beside its label. */
const ICON = { size: 16, strokeWidth: 1.75, "aria-hidden": true } as const;

/** The issue to close, as it stood when the dialog was asked for. */
export interface CloseTarget {
  no: number;
  /** The closing instant it had, which "bây giờ" replaces. */
  closesAt: string;
  /** Units still on the shelf, which leave it. */
  onHand: number;
}

/**
 * "Đóng số 05 sớm?": v3's `AdminSheet` of `AdminDropsScreen` as an Arc
 * `Dialog`, every word unchanged. Closing early moves the closing hour to now
 * (`closeDropNow`); nothing else about the issue or its orders changes, and
 * the sentence says so.
 *
 * "Đóng bây giờ" is Arc's `danger` button, as "Huỷ đơn" is (slice 0). While
 * it runs the dialog cannot be closed, and the button shows Arc's spinner with
 * "Đang lưu…". The target is a snapshot taken when the dialog was asked for,
 * so the sentence does not reword itself on the way out once the issue has
 * closed.
 */
export function ArcCloseDropDialog({
  open,
  pending,
  target,
  onClose,
  onConfirm,
  onCloseAutoFocus,
}: {
  open: boolean;
  /** The change is on its way to the server. */
  pending: boolean;
  target: CloseTarget | null;
  onClose: () => void;
  onConfirm: () => void;
  /** Where focus goes when the dialog shuts: the button or the row menu that opened it. */
  onCloseAutoFocus: (event: Event) => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !pending) onClose();
      }}
    >
      <DialogContent
        title={`Đóng ${LEX.tl} ${issueNo(target?.no ?? 0)} sớm?`}
        description={
          target
            ? `Giờ đóng đổi từ ${dateTimeLabel(target.closesAt)} thành bây giờ. ${target.onHand} chiếc còn lại rời kệ; đơn đã đặt không bị ảnh hưởng.`
            : undefined
        }
        onCloseAutoFocus={onCloseAutoFocus}
        onInteractOutside={keepOpenForToasts}
      >
        <div className={box.actions}>
          <Button variant="secondary" size="sm" disabled={pending} onClick={onClose}>
            {pending ? null : <ArrowLeft {...ICON} />}
            Giữ lịch
          </Button>
          <Button variant="danger" size="sm" loading={pending} onClick={onConfirm}>
            {pending ? null : <Clock {...ICON} />}
            {pending ? "Đang lưu…" : "Đóng bây giờ"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
