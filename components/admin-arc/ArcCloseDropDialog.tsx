"use client";

import { ArrowLeft, Clock } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleContext";
import { momentLabel } from "@/lib/datetime";
import { picker, plural } from "@/lib/i18n";
import { LEX, issueLabel, issueNo } from "@/lib/lexicon";
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
  // The page's language (round v6 slice E5).
  const t = picker(useLocale());
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !pending) onClose();
      }}
    >
      <DialogContent
        title={t({
          vi: `Đóng ${LEX.tl} ${issueNo(target?.no ?? 0)} sớm?`,
          en: `Close ${issueLabel(target?.no ?? 0, "en")} early?`,
        })}
        description={
          target
            ? t({
                // The closing moment "giờ · ngày", as the back office writes every moment (round v6 slice R2).
                vi: `Giờ đóng đổi từ ${momentLabel(target.closesAt)} thành bây giờ. ${target.onHand} chiếc còn lại rời kệ; đơn đã đặt không bị ảnh hưởng.`,
                en: `The closing time moves from ${momentLabel(target.closesAt, "en")} to now. The ${plural(target.onHand, "piece", "pieces")} left come off the shelf; orders already placed are not affected.`,
              })
            : undefined
        }
        onCloseAutoFocus={onCloseAutoFocus}
        onInteractOutside={keepOpenForToasts}
      >
        <div className={box.actions}>
          <Button variant="secondary" size="sm" disabled={pending} onClick={onClose}>
            {pending ? null : <ArrowLeft {...ICON} />}
            {t({ vi: "Giữ lịch", en: "Keep schedule" })}
          </Button>
          <Button variant="danger" size="sm" loading={pending} onClick={onConfirm}>
            {pending ? null : <Clock {...ICON} />}
            {pending ? t({ vi: "Đang lưu…", en: "Saving…" }) : t({ vi: "Đóng bây giờ", en: "Close now" })}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
