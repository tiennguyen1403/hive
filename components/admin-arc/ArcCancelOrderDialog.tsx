"use client";

import { ArrowLeft, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Order } from "@/data/types";
import { CANCEL_REASONS } from "@/lib/admin-orders";
import { vnd } from "@/lib/money";
import { orderTotalVnd } from "@/lib/orders";
import { Button } from "@/registry/components/button/button";
import { Dialog, DialogContent } from "@/registry/components/dialog/dialog";
import { Input } from "@/registry/components/input/input";
import { Select } from "@/registry/components/select/select";
import styles from "./ArcDialog.module.css";
import { keepOpenForToasts } from "./arc-toasts";

/** The four reasons, fixed (user, 22/09), from the list the Server Action checks against. */
const REASON_OPTIONS = CANCEL_REASONS.map((r) => ({ value: r, label: r }));

/**
 * "Huỷ đơn", with the reason the shopper will be given: the v3 sheet
 * (`components/admin/CancelOrderModal.tsx`) as an Arc `Dialog`, with its logic
 * and every word unchanged. The v3 sheet still serves the order's own page.
 *
 * The confirm button names the job that is left, "Chọn lý do", until a
 * reason is chosen, then reads "Huỷ đơn"; while the cancellation is on its
 * way it shows Arc's spinner with "Đang huỷ…" and the dialog cannot close.
 * A disabled button carries no icon.
 */
export function ArcCancelOrderDialog({
  order,
  pending = false,
  onClose,
  onConfirm,
}: {
  /** The order being cancelled, or null when the dialog is shut. */
  order: Order | null;
  /** The cancellation is on its way to the server. */
  pending?: boolean;
  onClose: () => void;
  onConfirm: (reason: string, note: string) => void;
}) {
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState(false);
  // The dialog animates out after `order` is gone: it keeps printing the last
  // order until then, or its title would change to "Huỷ đơn ?" on the way out.
  const [shown, setShown] = useState<Order | null>(order);
  if (order && order !== shown) setShown(order);

  // Reopening on another order must not show the last one's reason.
  useEffect(() => {
    if (!order) return;
    setReason(null);
    setNote("");
    setError(false);
  }, [order]);

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
        title={`Huỷ đơn ${shown?.code ?? ""}?`}
        description={`${
          paid
            ? `Đơn đã thanh toán ${vnd(total)}. Huỷ thì phải hoàn tiền tay.`
            : `Đơn ${vnd(total)} chưa nhận được tiền. Huỷ là đóng lại, không có gì phải hoàn.`
        } Khách thấy lý do ở màn đơn của họ. Hàng về kệ ngay.`}
      >
        <div className={styles.fields}>
          <div className={styles.field}>
            <Select
              label="Lý do"
              placeholder="Chọn lý do"
              options={REASON_OPTIONS}
              value={reason ?? ""}
              onValueChange={(v) => {
                setReason(v);
                setError(false);
              }}
            />
            {error && (
              <p className={styles.error} role="alert">
                Chọn một lý do trước khi huỷ.
              </p>
            )}
          </div>
          <Input
            label="Ghi chú nội bộ · không bắt buộc"
            placeholder="Khách không thấy dòng này"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <div className={styles.actions}>
          <Button variant="secondary" size="sm" disabled={pending} onClick={onClose}>
            {pending ? null : <ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" />}
            Giữ đơn
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
            {pending ? "Đang huỷ…" : reason ? "Huỷ đơn" : "Chọn lý do"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
