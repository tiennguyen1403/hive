"use client";

import { ArrowLeft, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocale } from "@/components/i18n/LocaleContext";
import type { Order } from "@/data/types";
import { CANCEL_REASONS } from "@/lib/admin-orders";
import { cancelReasonLabel } from "@/lib/feed-account";
import { picker, type Locale } from "@/lib/i18n";
import { vnd } from "@/lib/money";
import { orderTotalVnd } from "@/lib/orders";
import { Button } from "@/registry/components/button/button";
import { Dialog, DialogContent } from "@/registry/components/dialog/dialog";
import { Input } from "@/registry/components/input/input";
import { Select } from "@/registry/components/select/select";
import styles from "./ArcDialog.module.css";
import { keepOpenForToasts } from "./arc-toasts";

/**
 * The four reasons, fixed (user, 22/09), from the list the Server Action checks
 * against. The value sent is always the Vietnamese reason, which the database
 * stores; the label is in the page's language (round v6 slice E4), in the
 * shop's English for them (`cancelReasonLabel`, slice E2).
 */
function reasonOptions(locale: Locale) {
  return CANCEL_REASONS.map((r) => ({ value: r, label: cancelReasonLabel(r, locale) }));
}

/**
 * "Huỷ đơn", with the reason the shopper will be given: the v3 sheet
 * (`components/admin/CancelOrderModal.tsx`) as an Arc `Dialog`, with its logic
 * and every word unchanged. The v3 sheet still serves the order's own page.
 *
 * The confirm button names the job that is left, "Chọn lý do", until a
 * reason is chosen, then reads "Huỷ đơn"; while the cancellation is on its
 * way it shows Arc's spinner with "Đang huỷ…" and the dialog cannot close.
 * A disabled button carries no icon.
 *
 * Radix hands focus back only to a `DialogTrigger`, and this dialog opens
 * from a row menu (the order book) or from "Thao tác khác" (an order's
 * page), so the screen says where focus goes when it shuts
 * (`onCloseAutoFocus`, slice 5b), as the issues' dialogs do (slice 4).
 *
 * Every word follows the page's language (round v6 slice E4), and is written
 * at render, so switching the language with the dialog open rewords it in
 * place and keeps the reason and the note.
 */
export function ArcCancelOrderDialog({
  order,
  pending = false,
  onClose,
  onConfirm,
  onCloseAutoFocus,
}: {
  /** The order being cancelled, or null when the dialog is shut. */
  order: Order | null;
  /** The cancellation is on its way to the server. */
  pending?: boolean;
  onClose: () => void;
  onConfirm: (reason: string, note: string) => void;
  /** Where focus goes when the dialog shuts: the menu that opened it. */
  onCloseAutoFocus: (event: Event) => void;
}) {
  const locale = useLocale();
  const t = picker(locale);
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState(false);
  // The dialog animates out after `order` is gone: it keeps printing the last
  // order until then, or its title would change to "Huỷ đơn ?" on the way out.
  const [shown, setShown] = useState<Order | null>(order);
  if (order && order !== shown) setShown(order);

  // Reopening on another order must not show the last one's reason. Keyed by
  // the order's CODE, not the object: the order's page hands a new object in
  // whenever the server renders it again — a switch of language does (round v6
  // slice E4) — and the reason and the note somebody had chosen must stay.
  // Closing passes through null, so reopening on the same order still starts
  // empty.
  const openCode = order ? String(order.code) : null;
  useEffect(() => {
    if (!openCode) return;
    setReason(null);
    setNote("");
    setError(false);
  }, [openCode]);

  // Money has arrived only on a PAID order: a transfer still waiting and a
  // COD or card order the shop has merely taken have nothing to refund.
  const paid = shown !== null && shown.status.state === "PAID";
  const total = shown ? orderTotalVnd(shown) : 0;

  return (
    <Dialog
      open={order !== null}
      onOpenChange={(next) => {
        if (!next && !pending) onClose();
      }}
    >
      <DialogContent
        onInteractOutside={keepOpenForToasts}
        onCloseAutoFocus={onCloseAutoFocus}
        title={t({ vi: `Huỷ đơn ${shown?.code ?? ""}?`, en: `Cancel order ${shown?.code ?? ""}?` })}
        description={t({
          vi: `${
            paid
              ? `Đơn đã thanh toán ${vnd(total)}. Huỷ thì phải hoàn tiền tay.`
              : `Đơn ${vnd(total)} chưa nhận được tiền. Huỷ là đóng lại, không có gì phải hoàn.`
          } Khách thấy lý do ở màn đơn của họ. Hàng về kệ ngay.`,
          en: `${
            paid
              ? `Paid ${vnd(total, "en")}, so cancelling means a refund by hand.`
              : `This ${vnd(total, "en")} order is unpaid, so there is nothing to refund.`
          } The customer sees the reason on their order. Items go back in stock at once.`,
        })}
      >
        <div className={styles.fields}>
          <div className={styles.field}>
            <Select
              label={t({ vi: "Lý do", en: "Reason" })}
              placeholder={t({ vi: "Chọn lý do", en: "Choose a reason" })}
              options={reasonOptions(locale)}
              value={reason ?? ""}
              onValueChange={(v) => {
                setReason(v);
                setError(false);
              }}
            />
            {error && (
              <p className={styles.error} role="alert">
                {t({ vi: "Chọn một lý do trước khi huỷ.", en: "Choose a reason before cancelling." })}
              </p>
            )}
          </div>
          <Input
            label={t({ vi: "Ghi chú nội bộ · không bắt buộc", en: "Internal note · optional" })}
            placeholder={t({ vi: "Khách không thấy dòng này", en: "The customer won't see this" })}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <div className={styles.actions}>
          <Button variant="secondary" size="sm" disabled={pending} onClick={onClose}>
            {pending ? null : <ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" />}
            {t({ vi: "Giữ đơn", en: "Keep order" })}
          </Button>
          <Button
            variant="danger"
            size="sm"
            disabled={!reason}
            loading={pending}
            onClick={() => {
              if (!reason) return setError(true);
              onConfirm(reason, note.trim());
            }}
          >
            {reason && !pending ? <X size={16} strokeWidth={1.75} aria-hidden="true" /> : null}
            {pending
              ? t({ vi: "Đang huỷ…", en: "Cancelling…" })
              : reason
                ? t({ vi: "Huỷ đơn", en: "Cancel order" })
                : t({ vi: "Chọn lý do", en: "Choose a reason" })}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
