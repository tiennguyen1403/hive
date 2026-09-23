"use client";

import { useEffect, useState } from "react";
import { AdminSheet } from "@/components/admin/AdminSheet";
import { Button } from "@/components/ui/Button";
import { Field3 } from "@/components/ui/Field3";
import { Select, type SelectOption } from "@/components/ui/Select";
import type { Order } from "@/data/types";
import { useCatalog } from "@/components/shop/CatalogContext";
import { orderItemsLabel } from "@/lib/admin-rows";
import { vnd } from "@/lib/money";
import { orderTotalVnd } from "@/lib/orders";

/**
 * Why an order was cancelled, in the shop's own words.
 *
 * Four reasons, fixed (user, 22/09). Three of them are what the order book
 * has actually recorded; "Hết hàng thật" is the one addition, and it is the
 * state the rest of the app already names everywhere.
 */
export const CANCEL_REASONS: SelectOption[] = [
  { value: "Khách đổi ý", label: "Khách đổi ý" },
  { value: "Quá hạn chuyển khoản", label: "Quá hạn chuyển khoản" },
  { value: "Hết hàng thật", label: "Hết hàng thật" },
  { value: "Khác", label: "Khác" },
];

/**
 * "Huỷ đơn", with the reason the shopper will be given.
 *
 * A sheet rather than an inline form, because this is the one action on the
 * screen that cannot be undone in the simulation and the reason is required:
 * an order cancelled with no reason tells the next person nothing, and it is
 * what the shopper is shown on their own order screen.
 *
 * THE CONFIRM BUTTON IS THE HONEY ONE, not a red one. Red is the colour of
 * the MENU ITEM that opens this sheet — the warning belongs where somebody is
 * still choosing. Inside the sheet the decision is already made, and every
 * confirm in this system looks the same.
 *
 * The copy does not promise the pieces go back on the shelf. Stock here is a
 * fixture field rather than something derived from the order book, so
 * cancelling moves nothing — and the line points at the action that does
 * ("Điều chỉnh tồn kho") instead of claiming it happened by itself.
 */
export function CancelOrderModal({
  order,
  onClose,
  onConfirm,
}: {
  /** The order being cancelled, or null when the sheet is shut. */
  order: Order | null;
  onClose: () => void;
  onConfirm: (reason: string, note: string) => void;
}) {
  const catalog = useCatalog();
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

  const paid = order !== null && order.status.state !== "AWAITING_TRANSFER";
  const total = order ? orderTotalVnd(order) : 0;

  return (
    <AdminSheet
      open={order !== null}
      onClose={onClose}
      title={`Huỷ đơn ${order?.code ?? ""}?`}
      sub={
        order && (
          <>
            {paid
              ? `Đơn đã thanh toán ${vnd(total)}. Huỷ thì phải hoàn tiền tay — chưa nối cổng thanh toán nào.`
              : `Đơn ${vnd(total)} chưa nhận được tiền. Huỷ là đóng lại, không có gì phải hoàn.`}{" "}
            Khách thấy lý do ở màn đơn của họ. Tồn kho không tự đổi: muốn đưa{" "}
            {orderItemsLabel(catalog, order)} lại lên kệ thì dùng Điều chỉnh tồn kho ở Mẫu.
          </>
        )
      }
      footer={
        <>
          <Button tone="ink sm" icon="back" onClick={onClose}>
            Giữ đơn
          </Button>
          {/* Disabled until a reason is chosen, and it says which job is
              left — the same rule as every other confirm in the back office
              (DESIGN.md §9 rule 3). */}
          <Button
            tone="sm"
            {...(reason ? { icon: "check" as const } : {})}
            disabled={!reason}
            onClick={() => {
              if (!reason) return setError(true);
              onConfirm(reason, note.trim());
            }}
          >
            {reason ? "Huỷ đơn" : "Chọn lý do"}
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
            options={CANCEL_REASONS}
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
