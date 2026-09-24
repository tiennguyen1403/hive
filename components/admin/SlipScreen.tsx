"use client";

import { AdminTop } from "@/components/admin/AdminTop";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Empty } from "@/components/shop/Empty";
import { COLORS } from "@/data/colors";
import { useCatalog } from "@/components/shop/CatalogContext";
import { findProvince, findWard, provinceLabel, wardLabel } from "@/data/regions";
import { isPaidFor, type AdminOrder } from "@/lib/admin-orders";
import { issueOf } from "@/lib/customer-tags";
import { clockLabel, dayMonth } from "@/lib/datetime";
import { LEX, issueNo } from "@/lib/lexicon";
import { vnd } from "@/lib/money";
import { orderTotalVnd, orderUnits } from "@/lib/orders";
import { formatPhone } from "@/lib/phone";
import { deliveryOption, COD_SURCHARGE_VND, EXPRESS_FEE_VND } from "@/lib/shipping";

/**
 * "In phiếu giao" — a real document, on real paper.
 *
 * It is a ROUTE rather than a dialog so it can be opened for one order or
 * for a whole selection, linked to, and reloaded; the print rules in
 * `admin.css` drop the sidebar and the heading, because on paper they are
 * noise, and two slips fit one A4 sheet.
 *
 * Since slice B3a the orders are the database's, chosen on the server
 * (`app/admin/slips/page.tsx`): the address printed is the one the parcel
 * carries — an address the shop edited has replaced the order's own copy,
 * and the reason is printed beside it — and the shopper's note for the
 * courier, typed at checkout, is on the slip where the courier will read it.
 *
 * COD is the one line that changes the parcel's handling, so it is stated in
 * full where the courier will look — including the surcharge, which is what
 * they actually collect (`lib/shipping.ts`).
 *
 * The QR box is EMPTY and says so. There is no encoder in this build and no
 * bank account behind one; a drawn square pretending to be scannable would
 * be the worst kind of placeholder, because somebody would try it.
 */
export function SlipScreen({
  orders,
  editReasons,
  nowIso,
}: {
  /** The orders to print, already chosen — the ticked codes, or every paid order. */
  orders: AdminOrder[];
  /** Why an order's address was last edited, by code, for the ones that were. */
  editReasons: Record<string, string>;
  nowIso: string;
}) {
  const catalog = useCatalog();

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
            const carrier = o.status.state === "SHIPPING" ? o.status.carrier : undefined;
            const delivery = deliveryOption(
              o.shippingFeeVnd === EXPRESS_FEE_VND ? "EXPRESS" : "STANDARD",
            );
            const cod = o.payment === "COD";
            const edited = editReasons[code];
            // What the courier collects. An order placed since slice B2
            // already carries the COD surcharge in its total; the sample's
            // were never charged it, and the slip adds it as it always did.
            const collect = orderTotalVnd(o) + (o.codFeeVnd > 0 ? 0 : COD_SURCHARGE_VND);
            return (
              <section className="slip" key={code}>
                <div className="hd">
                  <span className="wm">HIVE</span>
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
                    <span className="muted">{carrier ?? delivery.label}</span>
                    {edited && (
                      <>
                        <br />
                        <span className="muted">Địa chỉ đã sửa · {edited}</span>
                      </>
                    )}
                    {o.note && (
                      <>
                        <br />
                        <span className="muted">Ghi chú của khách: {o.note}</span>
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
                    {cod ? "thu khi giao" : isPaidFor(o) ? "đã thanh toán" : "chưa thanh toán"}
                  </span>
                  <b>{vnd(orderTotalVnd(o))}</b>
                </div>

                {cod && (
                  <div className="cod">
                    <span>Thu hộ khi giao</span>
                    <b>{vnd(collect)}</b>
                  </div>
                )}

                <p className="foot">
                  Mã vận đơn: {tracking ?? "chờ bàn giao"}
                  {/* An order of fixed styles only (slice B5) belongs to no issue. */}
                  {issueOf(catalog, o) !== undefined ? ` · ${LEX.t} ${issueNo(issueOf(catalog, o)!)}` : ""} ·
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
          từ đơn hàng trên máy chủ — chưa nối đơn vị vận chuyển nào, nên không hệ thống vận đơn nào
          nhận bản in này.
        </p>
      )}
    </>
  );
}
