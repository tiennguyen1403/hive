"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icon/Icon";
import { CopyButton } from "@/components/shop/CopyButton";
import { usePrefs, writePrefs } from "@/components/shop/prefs";
import { useReminders, writeReminders } from "@/components/shop/reminders";
import { Toast } from "@/components/shop/Toast";
import { useDropLabel } from "@/components/shop/useDropLabel";
import type { Drop, DropState, Order } from "@/data/types";
import { dayMonth } from "@/lib/datetime";
import { isFixed } from "@/lib/inventory";
import { LEX, issueLabel, issueNo, styleName } from "@/lib/lexicon";
import { vnd } from "@/lib/money";
import { stampLabel } from "@/lib/notifications";
import { orderRows, type OrderRow } from "@/lib/order-rows";
import { photoUrl } from "@/lib/photos";
import { setPref, setSizePref, type PrefKey } from "@/lib/prefs";
import { hasReminder, toggleReminder } from "@/lib/reminder";
import { useCatalog } from "@/components/shop/CatalogContext";
import { resolveWishlist } from "@/lib/wishlist";
import type { Me } from "@/lib/me";
import { useNotifCenter } from "./notif-center";
import { OrderRow3 } from "./OrderRow3";
import { useWishlist } from "./WishlistContext";
import { demoNow } from "@/lib/clock";

/** One running code, flattened on the server so `data/promotions.ts` stays there. */
export interface LiveCode {
  code: string;
  /** "Giảm 10%, tối đa 150.000₫" */
  offer: string;
  /** "Đơn từ 500.000₫ · còn 82 lượt" */
  terms: string;
}

interface AccountHomeProps {
  /** Read on the server; the page redirects when nobody is signed in. */
  me: Me;
  /** The account's orders, read on the server (`listMyOrders()`). */
  orders: Order[];
  drop: Drop;
  dropState: DropState;
  dropLabel: string;
  codes: LiveCode[];
  /** "tới 25/09" — how long the codes above last. */
  codesWindow: string;
  /** The issue the codes run with, when they all run inside one. */
  codesIssueNo?: number;
  /** "20:00 · 25/09" — when the last of them expires. */
  codesEndLabel?: string;
  /** The issue about to open, when there is one. */
  nextDropNo?: number;
  /** "Số 06 mở 20:00 ngày 02/10". */
  nextDropLine?: string;
}

/**
 * The account hub: what is moving, what is running, what this device
 * remembers.
 *
 * Every figure under every heading is read from the data at render time —
 * the orders, the codes, the saved styles, the count of orders per issue.
 * Nothing on this screen is typed in, which is what lets five panels of
 * numbers stand beside each other without a disclaimer.
 *
 * They are in the order somebody scans them: what did I order, what can I
 * use, what is new, what did I save, and what has this browser agreed to
 * remember. A panel with nothing in it is NOT drawn — an empty frame saying
 * "chưa có mã nào" is a row that costs a scroll to read.
 */
export function AccountHome({
  me,
  orders,
  drop,
  dropState: state,
  dropLabel,
  codes,
  codesWindow,
  codesIssueNo,
  codesEndLabel,
  nextDropNo,
  nextDropLine,
}: AccountHomeProps) {
  const catalog = useCatalog();
  const { list, ready: wishReady } = useWishlist();
  const { prefs, ready: prefsReady } = usePrefs();
  const { list: reminders, ready: remindersReady } = useReminders();
  const [toast, setToast] = useState<string | null>(null);
  const label = useDropLabel(drop, state, dropLabel);

  const now = useMemo(() => demoNow(), []);
  const saved = resolveWishlist(catalog, now, list);

  function flip(key: PrefKey) {
    writePrefs(setPref(prefs, key, !prefs[key]));
  }

  const rows = orderRows(catalog, orders, now);
  const bought = boughtByIssue(rows);

  return (
    <>
      <div className="pghead">
        <h1>Tổng quan</h1>
        <span className="meta">
          {issueLabel(drop.no)}{" "}
          {state === "OPEN" ? "đang bán" : state === "UPCOMING" ? "sắp mở" : "đã đóng"}{" "}
          · {label}
        </span>
      </div>

      {/* Where an order placed signed out went: not into this list, because
          it was placed without an account. Said here because an account that
          cannot find its order is the first thing somebody would ask. */}
      <p className="note3">
        <Icon name="info" className="ic sm" />
        <span>
          Đơn đặt khi chưa đăng nhập không nằm trong tài khoản — tra cứu bằng mã đơn và
          số điện thoại.
        </span>
      </p>

      <div className="acctgrid3" style={{ marginTop: 16 }}>
        {rows.length > 0 && (
          <section className="panel3">
            <h3>
              Đơn gần nhất
              <Link className="more" href="/account/orders">
                Xem cả {rows.length}
              </Link>
            </h3>
            <div className="rows3">
              {rows.slice(0, 3).map((row) => (
                <OrderRow3
                  key={row.code}
                  row={row}
                  currentDropNo={drop.no}
                  variant="compact"
                />
              ))}
            </div>
          </section>
        )}

        {codes.length > 0 && (
          <section className="panel3">
            <h3>
              Mã đang chạy
              <span className="meta">
                {codesIssueNo !== undefined
                  ? `trong ${LEX.tl} ${issueNo(codesIssueNo)}`
                  : codesWindow}
              </span>
            </h3>
            <div className="codes">
              {codes.map((c) => (
                <CodeRow key={c.code} code={c} />
              ))}
            </div>
            {codesEndLabel && (
              <p className="fine3" style={{ marginTop: 8 }}>
                Mã hết hạn {codesEndLabel}
                {codesIssueNo !== undefined
                  ? ` cùng ${LEX.tl} ${issueNo(codesIssueNo)}.`
                  : "."}
              </p>
            )}
          </section>
        )}

        <NewNotifications me={me} orders={orders} now={now} />

        {wishReady && saved.items.length > 0 && (
          <section className="panel3">
            <h3>
              Đã lưu
              <Link className="more" href="/account/wishlist">
                Xem cả {saved.items.length}
              </Link>
            </h3>
            <div className="rows3">
              {saved.items.slice(0, 2).map((item) => {
                // A fixed style (v3 slice 11) gives no count, as nowhere else
                // in the shop does: only an empty shelf is said, "đã hết".
                const stock = item.soldOut ? (
                  <span style={{ color: "var(--hot)" }}>đã hết</span>
                ) : isFixed(item.product) ? null : (
                  <span style={item.low ? { color: "var(--hot)" } : undefined}>
                    còn {item.onHand}
                  </span>
                );
                return (
                  <Link
                    className="row"
                    key={item.product.id}
                    href={`/products/${item.product.slug}`}
                  >
                    <b>
                      <span className="nm">{styleName(item.product.name, item.product.dropNo)}</span>
                    </b>
                    <span className="sub">
                      {stock}
                      {stock && " · "}
                      {vnd(item.product.priceVnd)}
                      {item.savedAt ? ` · lưu ${dayMonth(item.savedAt)}` : ""}
                    </span>
                    <span className="right">
                      <span className="thumbs3">
                        <Image
                          src={photoUrl(item.product.photoKeys[0]!, 120, 60)}
                          alt=""
                          width={120}
                          height={150}
                        />
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <section className="panel3 full">
          <h3>Tuỳ chọn</h3>

          {/* The reminder is the one switch here that DOES something
              beyond being kept: the home page reads the same key and
              shows its band in the last two hours before the issue
              opens, and the notifications screen counts it. */}
          <PrefRow
            title={`Nhắc giờ mở ${LEX.tl} mới`}
            {...(nextDropNo === undefined ? { detail: `Chưa có ${LEX.tl} nào sắp mở.` } : {})}
            {...(nextDropNo !== undefined && remindersReady
              ? {
                  on: hasReminder(reminders, nextDropNo),
                  onFlip: () => {
                    const next = toggleReminder(reminders, nextDropNo);
                    writeReminders(next);
                    setToast(
                      hasReminder(next, nextDropNo)
                        ? `Đã đặt nhắc · ${nextDropLine ?? issueLabel(nextDropNo)}`
                        : "Đã bỏ nhắc",
                    );
                  },
                }
              : {})}
          />

          <PrefRow
            title="Email khi đơn đổi trạng thái"
            detail="Đang chuẩn bị."
            on={prefsReady && prefs.emailOnStatus}
            onFlip={() => flip("emailOnStatus")}
          />

          <PrefRow
            title={prefs.size ? `Size ghi nhớ · ${prefs.size}` : "Chưa ghi nhớ size nào"}
            detail={
              prefs.size
                ? `Chọn sẵn size ${prefs.size} ở trang sản phẩm và sheet chọn size.`
                : "Bật ở trang sản phẩm, sau khi chọn một size."
            }
            {...(prefsReady && prefs.size
              ? {
                  on: true,
                  onFlip: () => {
                    writePrefs(setSizePref(prefs, null));
                    setToast("Đã bỏ ghi nhớ size");
                  },
                }
              : {})}
          />

          <div className="prefrow" style={{ borderBottom: 0 }}>
            <div>
              <b>Đã mua</b>
              <span>
                {bought.length > 0
                  ? bought.map((b) => `${issueLabel(b.no)} · ${b.orders} đơn`).join(" · ")
                  : "Chưa có đơn nào."}
              </span>
            </div>
          </div>
        </section>
      </div>

      <Toast message={toast} onDone={() => setToast(null)} />
    </>
  );
}

/**
 * The two newest unread notifications, or a line saying there are none.
 *
 * It reads the same module the notifications screen does, so the two can
 * never disagree about what is new.
 */
function NewNotifications({ me, orders, now }: { me: Me; orders: Order[]; now: Date }) {
  const catalog = useCatalog();
  const { list, ready } = useNotifCenter(catalog, me, orders);
  if (!ready) return null;

  const unread = list.filter((n) => !n.read).slice(0, 2);

  return (
    <section className="panel3">
      <h3>
        Thông báo mới
        <Link className="more" href="/account/notifications">
          Xem cả
        </Link>
      </h3>
      {unread.length === 0 ? (
        <p className="fine3" style={{ marginTop: 0 }}>
          Không có gì mới.
        </p>
      ) : (
        unread.map((n) => (
          <div className="notif" key={n.id}>
            <i aria-hidden="true" />
            <div>
              <b>{n.title}</b>
              <span>{n.body}</span>
            </div>
            <time dateTime={n.at}>{stampLabel(n, now)}</time>
          </div>
        ))
      )}
    </section>
  );
}

/**
 * A code, what it takes off, and a button that really copies it.
 *
 * Where the browser refuses — an insecure origin, a permission policy —
 * `CopyButton` selects the text instead of claiming a copy that did not
 * happen.
 */
function CodeRow({ code }: { code: LiveCode }) {
  const ref = useRef<HTMLElement>(null);

  return (
    <div className="code">
      <b ref={ref}>{code.code}</b>
      <span>
        {code.offer} · {code.terms}
      </span>
      <CopyButton value={code.code} selectRef={ref} />
    </div>
  );
}

/**
 * A preference, as a real switch — `role="switch"` with `aria-checked`,
 * because the two states take effect immediately and there is no form to
 * submit.
 *
 * With no handler the row is a STATEMENT rather than a control: there is
 * nothing to switch, so no switch is drawn. That is the "Chưa ghi nhớ size
 * nào" case and the "no issue is coming" one — a switch that cannot do
 * anything is the dead button DESIGN.md §9 rules out.
 */
function PrefRow({
  title,
  detail,
  on,
  onFlip,
}: {
  title: string;
  /** The line under the title; a switch that needs none has none. */
  detail?: string;
  on?: boolean;
  onFlip?: () => void;
}) {
  return (
    <div className="prefrow">
      <div>
        <b>{title}</b>
        {detail && <span>{detail}</span>}
      </div>
      {onFlip && (
        <button
          type="button"
          className="switch3"
          role="switch"
          aria-checked={on ?? false}
          aria-label={title}
          onClick={onFlip}
        />
      )}
    </div>
  );
}

/**
 * How many orders this shopper placed in each issue, newest issue first.
 *
 * Cancelled orders are not purchases and are left out. An order whose styles
 * have left the catalog has no issue to count against and is left out too,
 * rather than being filed under a number nobody can check.
 */
function boughtByIssue(rows: OrderRow[]): { no: number; orders: number }[] {
  const counts = new Map<number, number>();
  for (const row of rows) {
    if (row.state === "CANCELLED" || row.dropNo === undefined) continue;
    counts.set(row.dropNo, (counts.get(row.dropNo) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([no, orders]) => ({ no, orders }))
    .sort((a, b) => b.no - a.no);
}
