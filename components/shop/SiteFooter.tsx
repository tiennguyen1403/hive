"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NeedWrite } from "@/components/shop/NeedWrite";
import { useCatalog } from "@/components/shop/CatalogContext";
import type { Drop } from "@/data/types";
import { teasersIn, type Catalog } from "@/lib/catalog";
import { clockDayLabel, dayMonth } from "@/lib/datetime";
import { closesInLabel, dropCalendar } from "@/lib/drop";
import { productsInDrop, soldUnits } from "@/lib/inventory";
import { LEX, issueLabel } from "@/lib/lexicon";
import { vnd } from "@/lib/money";
import { PAYMENT_LABEL } from "@/lib/order-labels";
import {
  EXPRESS_FEE_VND,
  FREE_SHIPPING_FROM_VND,
  RETURN_WINDOW_DAYS,
  STANDARD_FEE_VND,
} from "@/lib/shipping";
import { demoNow } from "@/lib/clock";

/**
 * The footer, on every shopper-facing route.
 *
 * Four columns, and every line in them is something this codebase can
 * actually prove: the issue calendar comes out of the fixtures, the support
 * links point at pages that exist, the delivery and payment terms are read
 * from `lib/shipping.ts` and `lib/order-labels.ts` — the same constants
 * checkout charges — and the two things nobody has written yet say so.
 *
 * PRODUCT.md rules out a brand story, partners, awards and testimonials, so
 * there are none. There is no newsletter box either: nothing here could
 * deliver a newsletter.
 *
 * The countdown on the open issue is filled in after mount, for the same
 * reason the nav's is: a clock printed into a prerendered frame is wrong the
 * moment the frame is cached, and React discards a tree that disagrees with
 * the HTML it hydrates.
 */
export function SiteFooter() {
  const catalog = useCatalog();
  const cal = dropCalendar(catalog);
  const [closesIn, setClosesIn] = useState("");

  const open = cal.open;
  useEffect(() => {
    if (!open) return;
    const tick = () => setClosesIn(closesInLabel(open.closesAt, demoNow()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [open]);

  // The size table lives on a product page, so the link has to name one. The
  // newest issue that actually has styles in it is the one whose
  // measurements a shopper is about to need.
  const guideSlug = productsInDrop(
    catalog,
    (cal.open ?? cal.closed ?? cal.upcoming)?.no ?? 0,
  )[0]?.slug;

  const payment = [PAYMENT_LABEL.BANK_TRANSFER, PAYMENT_LABEL.COD, PAYMENT_LABEL.CARD].join(
    " · ",
  );

  return (
    <footer className="foot3">
      <div className="in">
        <div className="cols">
          <div>
            <h4>{LEX.cal}</h4>
            <ul className="cal">
              {cal.open && (
                <li>
                  <Link href="/products">
                    <b>{issueLabel(cal.open.no)} · đang bán</b>
                    <span className="st on">{closesIn}</span>
                  </Link>
                </li>
              )}
              {cal.upcoming && (
                <li>
                  <Link href={`/?drop=${cal.upcoming.no}`}>
                    <b>{issueLabel(cal.upcoming.no)} · sắp mở</b>
                    {/* The weekday, not just the date: a calendar row is
                        read to plan around, and "02/10" makes a shopper
                        count days on their fingers (`clockDayLabel`). */}
                    <span className="st">
                      {clockDayLabel(cal.upcoming.opensAt)}
                      {teasersIn(catalog, cal.upcoming.no).length > 0 &&
                        ` · ${teasersIn(catalog, cal.upcoming.no).length} mẫu hé lộ`}
                    </span>
                  </Link>
                </li>
              )}
              {cal.closed && (
                <li>
                  {/* A closed issue has a page of its own since v3 slice 4 —
                      `/so/N`, where "xem lại" actually lands on the record. */}
                  <Link href={`/so/${cal.closed.no}`}>
                    <b>{issueLabel(cal.closed.no)} · đã đóng</b>
                    {/* How much of the cut went, not how many styles there
                        were: on an issue that is over, that ratio is the one
                        stock fact still worth printing. */}
                    <span className="st">
                      {dayMonth(cal.closed.closesAt)} · {soldInDrop(catalog, cal.closed)} đã bán · xem lại
                    </span>
                  </Link>
                </li>
              )}
            </ul>
          </div>

          <div>
            <h4>Hỗ trợ</h4>
            <ul>
              <li>
                <Link href="/faq">Câu hỏi thường gặp</Link>
              </li>
              <li>
                <Link href="/returns">{`Đổi trả ${RETURN_WINDOW_DAYS} ngày`}</Link>
              </li>
              <li>
                {/* `/track` since v3 slice 3: looking an order up takes a
                    code and the phone number it was placed with, not an
                    account. It pointed at the signed-in order list, which
                    is the one place a guest cannot go. */}
                <Link href="/track">Tra cứu đơn</Link>
              </li>
              {guideSlug && (
                <li>
                  <Link href={`/products/${guideSlug}#size`}>Bảng số đo</Link>
                </li>
              )}
              <li>
                <Link href="/contact">Liên hệ</Link>
              </li>
            </ul>
          </div>

          <div>
            <h4>Giao &amp; thanh toán</h4>
            <ul>
              <li>
                <span>Giao 2–4 ngày · {vnd(STANDARD_FEE_VND)}</span>
              </li>
              <li>
                <span>Miễn phí từ {vnd(FREE_SHIPPING_FROM_VND)}</span>
              </li>
              <li>
                <span>
                  Nội thành TP.HCM 24 giờ · {vnd(EXPRESS_FEE_VND)}
                </span>
              </li>
              <li>
                <span>{payment}</span>
              </li>
            </ul>
          </div>

          <div>
            <h4>Về HIVE</h4>
            <ul>
              <li>
                <Link href="/about">Giới thiệu</Link>
              </li>
              <li>
                <Link href="/#rules">Bốn quy tắc</Link>
              </li>
            </ul>
            <NeedWrite title="Kênh liên hệ và mạng xã hội.">
              Email, Instagram, giờ làm việc chưa chốt nên chỗ này để trống.
            </NeedWrite>
          </div>
        </div>

        <div className="colophon">
          <span className="wm nm">HIVE</span>
          <span>Streetwear unisex. Mỗi {LEX.tl} cắt một lần.</span>
          {/* Not a copyright line: nobody has told this build what the
              company is called, and inventing one is exactly what NeedWrite
              exists to stop. It says so instead. */}
          <span className="legal">Tên pháp nhân · MST — chờ chốt</span>
        </div>
      </div>
    </footer>
  );
}

/** `"30 / 30"` — how much of a finished issue's cut went. */
function soldInDrop(catalog: Catalog, drop: Drop): string {
  const styles = productsInDrop(catalog, drop.no);
  const sold = styles.reduce((n, p) => n + soldUnits(p), 0);
  const cut = styles.reduce((n, p) => n + p.cutUnits, 0);
  return `${sold} / ${cut}`;
}
