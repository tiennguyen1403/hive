"use client";

import { useEffect, useState } from "react";
import { AdminSheet } from "@/components/admin/AdminSheet";
import { Button } from "@/components/ui/Button";
import { Field3 } from "@/components/ui/Field3";
import { Select, type SelectOption } from "@/components/ui/Select";
import type { Order } from "@/data/types";
import { CANCEL_REASONS } from "@/lib/admin-orders";
import { vnd } from "@/lib/money";
import { orderTotalVnd } from "@/lib/orders";

/**
 * Why an order was cancelled, in the shop's own words.
 *
 * Four reasons, fixed (user, 22/09) and kept in `lib/admin-orders.ts`, where
 * the Server Action checks the one sent against the same list. Three of them
 * are what the order book has actually recorded; "Hết hàng thật" is the one
 * addition, and it is the state the rest of the app already names everywhere.
 */
const REASON_OPTIONS: SelectOption[] = CANCEL_REASONS.map((r) => ({ value: r, label: r }));

/**
 * "Huỷ đơn", with the reason the shopper will be given.
 *
 * A sheet rather than an inline form, because this is the one action on the
 * screen that cannot be undone and the reason is required: an order
 * cancelled with no reason tells the next person nothing, and it is what the
 * shopper is shown on their own order screen.
 *
 * SINCE SLICE B3A IT IS REAL: `admin_cancel_order()` cancels the order in the
 * database and puts its pieces back on the shelf in the same transaction —
 * the same rule the shopper's own cancellation follows — and the shopper's
 * "Đơn hàng", receipt and `/track` all read the reason. The sheet says both,
 * and no longer points at a stock adjustment to do by hand.
 *
 * THE CONFIRM BUTTON IS THE HONEY ONE, not a red one. Red is the colour of
 * the MENU ITEM that opens this sheet — the warning belongs where somebody is
 * still choosing. Inside the sheet the decision is already made, and every
 * confirm in this system looks the same.
 */
export function CancelOrderModal({
  order,
  pending = false,
  onClose,
  onConfirm,
}: {
  /** The order being cancelled, or null when the sheet is shut. */
  order: Order | null;
  /** The cancellation is on its way to the server. */
  pending?: boolean;
  onClose: () => void;
  onConfirm: (reason: string, note: string) => void;
}) {
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState(false);

  // Reopening on another order must not show the last one's reason.
  useEffect(() => {
    if (!order) return;
    setReason(null);
    setNote("");
    setError(false);
  }, [order]);

  // Money has arrived only on a PAID order: a transfer still waiting and a
  // COD or card order the shop has merely taken have nothing to refund.
  const paid = order !== null && order.status.state === "PAID";
  const total = order ? orderTotalVnd(order) : 0;

  return (
    <AdminSheet
      open={order !== null}
      onClose={() => {
        if (!pending) onClose();
      }}
      title={`Huỷ đơn ${order?.code ?? ""}?`}
      sub={
        order && (
          <>
            {paid
              ? `Đơn đã thanh toán ${vnd(total)}. Huỷ thì phải hoàn tiền tay — chưa nối cổng thanh toán nào.`
              : `Đơn ${vnd(total)} chưa nhận được tiền. Huỷ là đóng lại, không có gì phải hoàn.`}{" "}
            Khách thấy lý do ở màn đơn của họ. Hàng về kệ ngay.
          </>
        )
      }
      footer={
        <>
          <Button tone="ink sm" icon="back" disabled={pending} onClick={onClose}>
            Giữ đơn
          </Button>
          {/* Disabled until a reason is chosen, and it says which job is
              left — the same rule as every other confirm in the back office
              (DESIGN.md §9 rule 3). Disabled, with no icon, while the
              cancellation is on its way. */}
          <Button
            tone="sm"
            {...(reason && !pending ? { icon: "check" as const } : {})}
            disabled={!reason || pending}
            onClick={() => {
              if (!reason) return setError(true);
              onConfirm(reason, note.trim());
            }}
          >
            {pending ? "Đang huỷ…" : reason ? "Huỷ đơn" : "Chọn lý do"}
          </Button>
        </>
      }
    >
      <Field3
        label="Lý do"
        error={error ? "Chọn một lý do trước khi huỷ." : undefined}
        className="cancelreason"
      >
        {({ id }) => (
          <Select
            id={id}
            options={REASON_OPTIONS}
            value={reason}
            placeholder="Chọn lý do"
            onChange={(v) => {
              setReason(v);
              setError(false);
            }}
          />
        )}
      </Field3>
      <Field3 label={<>Ghi chú nội bộ <span className="opt">· không bắt buộc</span></>}>
        {({ id }) => (
          <input
            id={id}
            className="inp"
            placeholder="Khách không thấy dòng này"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        )}
      </Field3>
    </AdminSheet>
  );
}
