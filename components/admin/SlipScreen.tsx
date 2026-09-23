"use client";

import { useEffect, useState } from "react";
import { AdminTop } from "@/components/admin/AdminTop";
import { useSim } from "@/components/admin/SimContext";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Empty } from "@/components/shop/Empty";
import { COLORS } from "@/data/colors";
import { useCatalog } from "@/components/shop/CatalogContext";
import { ORDERS } from "@/data/orders";
import { findProvince, findWard, provinceLabel, wardLabel } from "@/data/regions";
import { addressEditReason, carrierOf, simOrders } from "@/lib/admin-sim";
import { issueOf } from "@/lib/customer-tags";
import { clockLabel, dayMonth } from "@/lib/datetime";
import { LEX, issueNo } from "@/lib/lexicon";
import { vnd } from "@/lib/money";
import { PLACED_ORDERS_KEY, parsePlacedOrders } from "@/lib/placed-order";
import { orderTotalVnd, orderUnits } from "@/lib/orders";
import { formatPhone } from "@/lib/phone";
import { deliveryOption, COD_SURCHARGE_VND, EXPRESS_FEE_VND } from "@/lib/shipping";

/**
 * "In phiếu giao" — a real document, on real paper.
 *
 * The one back-office action a browser can genuinely carry out with no
 * server behind it. It is a ROUTE rather than a dialog so it can be opened
 * for one order or for a whole selection, linked to, and reloaded; the print
 * rules in `admin.css` drop the sidebar and the heading, because on paper
 * they are noise, and two slips fit one A4 sheet.
 *
 * COD is the one line that changes the parcel's handling, so it is stated in
 * full where the courier will look — including the surcharge, which is what
 * they actually collect (`lib/shipping.ts`).
 *
 * The QR box is EMPTY and says so. There is no encoder in this build and no
 * bank account behind one; a drawn square pretending to be scannable would
 * be the worst kind of placeholder, because somebody would try it.
 */
export function SlipScreen({ codes, nowIso }: { codes: string[]; nowIso: string }) {
  const catalog = useCatalog();
  const { sim } = useSim();
  const book = simOrders(ORDERS, sim);
  /**
   * When `?codes=` is missing, print what is waiting to be packed. That is
   * the only selection the screen can make on its own that is also the one
   * somebody arriving without a selection meant.
   */
  const orders =
    codes.length > 0
      ? book.filter((o) => codes.includes(String(o.code)))
      : book.filter((o) => o.status.state === "PAID");

  return (
    <>
      <AdminTop
        crumb={{ label: "Đơn hàng", href: "/admin/orders", here: "Phiếu giao" }}
        title={orders.length > 1 ? `Phiếu giao · ${orders.length} đơn` : "Phiếu giao"}
        sub={
          orders.length > 0
            ? `${orders.map((o) => o.code).join(" · ")} · in ${orders.length} phiếu, hai phiếu một trang A4`
            : undefined
        }
      >
        {orders.length > 0 && (
          <Button tone="sm" icon="printer" onClick={() => window.print()}>
            In {orders.length > 1 ? `${orders.length} phiếu` : "phiếu"}
          </Button>
        )}
      </AdminTop>

      {orders.length === 0 ? (
        <Empty
          icon="doc"
          title="Không có đơn nào để in"
          text="Địa chỉ này in phiếu cho những mã đơn được chọn ở danh sách đơn hàng."
          action={
            <ButtonLink tone="ink" icon="bag" href="/admin/orders">
              Xem danh sách đơn
            </ButtonLink>
          }
        />
      ) : (
        <div className="slips">
          {orders.map((o) => {
            const code = String(o.code);
            const province = findProvince(o.shipTo.provinceCode);
            const ward = findWard(o.shipTo.provinceCode, o.shipTo.wardCode);
            const tracking = o.status.state === "SHIPPING" ? o.status.trackingCode : null;
            const carrier = carrierOf(code, sim);
            const delivery = deliveryOption(
              o.shippingFeeVnd === EXPRESS_FEE_VND ? "EXPRESS" : "STANDARD",
            );
            const cod = o.payment === "COD";
            const edited = addressEditReason(code, sim);
            return (
              <section className="slip" key={code}>
                <div className="hd">
                  <span className="wm">BRAND</span>
                  <span className="code">{code}</span>
                </div>

                <div className="grid2">
                  <div className="addrblock">
                    <span className="lbl">Người nhận</span>
                    <b>{o.shipTo.recipient}</b> · {formatPhone(o.shipTo.phone)}
                    <br />
                    {o.shipTo.line}
                    {ward ? `, ${wardLabel(ward)}` : ""}
                    {province ? `, ${provinceLabel(province)}` : ""}
                    <br />
                    <span className="muted">
                      {carrier ?? delivery.label}
                      <ShopperNote code={code} />
                    </span>
                    {edited && (
                      <>
                        <br />
                        <span className="muted">Địa chỉ đã sửa · {edited}</span>
                      </>
                    )}
                  </div>
                  <div className="qrph">
                    <div className="cells" aria-hidden="true" />
                    <span>QR tra cứu đơn · chờ</span>
                  </div>
                </div>

                <table>
                  <tbody>
                    {o.lines.map((l, i) => {
                      const p = catalog.byId.get(l.productId);
                      return (
                        <tr key={`${l.productId}-${l.size}-${l.color}-${i}`}>
                          <td>
                            <b>{p?.name ?? "—"}</b> · {p?.kind ?? ""}
                          </td>
                          <td>
                            {COLORS[l.color].label} · {l.size}
                          </td>
                          <td className="right">×{l.qty}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="totalbar">
                  <span>
                    {orderUnits(o)} chiếc ·{" "}
                    {cod
                      ? "thu khi giao"
                      : o.status.state === "AWAITING_TRANSFER"
                        ? "chưa thanh toán"
                        : "đã thanh toán"}
                  </span>
                  <b>{vnd(orderTotalVnd(o))}</b>
                </div>

                {cod && (
                  <div className="cod">
                    <span>Thu hộ khi giao</span>
                    <b>{vnd(orderTotalVnd(o) + COD_SURCHARGE_VND)}</b>
                  </div>
                )}

                <p className="foot">
                  Mã vận đơn: {tracking ?? "chờ bàn giao"} · {LEX.t} {issueNo(issueOf(catalog, o) ?? 0)} ·
                  in {clockLabel(nowIso)} · {dayMonth(nowIso)}
                </p>
              </section>
            );
          })}
        </div>
      )}

      {orders.length > 0 && (
        <p className="fine3 noprint">
          Đơn COD in thêm ô “Thu hộ” đậm ở cuối phiếu, gồm cả phụ thu{" "}
          {vnd(COD_SURCHARGE_VND)}. Khi in, thanh bên và tiêu đề ẩn; hai phiếu một trang. Phiếu in
          từ dữ liệu mô phỏng trên trình duyệt này — không hệ thống vận đơn nào nhận bản in này.
        </p>
      )}
    </>
  );
}

/**
 * What the shopper asked for at checkout, when this browser is the one that
 * placed the order.
 *
 * `Order` in the fixtures carries no delivery note — the field arrived with
 * the checkout form and lives on the device record (`brand.orders`). So the
 * slip looks there, and prints nothing at all when there is nothing: a
 * courier reading "ghi chú: —" learns less than a courier reading no line.
 */
function ShopperNote({ code }: { code: string }) {
  const [note, setNote] = useState("");

  useEffect(() => {
    try {
      const mine = parsePlacedOrders(window.localStorage.getItem(PLACED_ORDERS_KEY)).find(
        (o) => o.code === code,
      );
      setNote(mine?.note.trim() ?? "");
    } catch {
      setNote("");
    }
  }, [code]);

  if (!note) return null;
  return <> · ghi chú: {note}</>;
}
