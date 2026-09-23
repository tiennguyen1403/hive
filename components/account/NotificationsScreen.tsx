"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/icon/Icon";
import { useCatalog } from "@/components/shop/CatalogContext";
import { usePrefs, writePrefs } from "@/components/shop/prefs";
import { useReminders, writeReminders } from "@/components/shop/reminders";
import type { Order } from "@/data/types";
import type { Me } from "@/lib/me";
import { LEX } from "@/lib/lexicon";
import { groupNotifications, stampLabel, type Notif } from "@/lib/notifications";
import { setPref, type PrefKey } from "@/lib/prefs";
import { hasReminder, toggleReminder } from "@/lib/reminder";
import { useNotifCenter } from "./notif-center";
import { demoNow } from "@/lib/clock";

interface NotificationsScreenProps {
  /** Read on the server; the page redirects when nobody is signed in. */
  me: Me;
  /** The account's orders, read on the server — two of the sources are orders. */
  orders: Order[];
  /** The issue about to open — the only one a reminder can be set for. */
  nextDropNo?: number;
}

/**
 * "Thông báo" — computed on this device, every time the screen opens.
 *
 * Nothing was delivered here. There is no push channel, so the screen works
 * out — from the account's orders, read on the server, and from what the
 * browser keeps — which things would have been worth telling somebody: an
 * order still owing a transfer, a
 * reminder that is set, a code about to expire, a parcel that arrived, an
 * issue that closed. The note at the top says exactly that, because a list
 * that looks like an inbox and is not one is the kind of thing a mock should
 * admit rather than imply.
 *
 * All the deciding is in `lib/notifications.ts`, which is pure and tested.
 * The three switches turn SOURCES off: a source that is off is not counted
 * anywhere, the rail included.
 */
export function NotificationsScreen({ me, orders, nextDropNo }: NotificationsScreenProps) {
  return (
    <NotificationsBody
      me={me}
      orders={orders}
      {...(nextDropNo !== undefined ? { nextDropNo } : {})}
    />
  );
}

/**
 * A component of its own, so the optional `nextDropNo` can be narrowed once
 * at the boundary and the hooks below can be read without it.
 */
function NotificationsBody({
  me,
  orders,
  nextDropNo,
}: {
  me: Me;
  orders: Order[];
  nextDropNo?: number;
}) {
  const catalog = useCatalog();
  const { prefs, ready: prefsReady } = usePrefs();
  const { list: reminders, ready: remindersReady } = useReminders();
  const { list, unread, ready, markAllRead } = useNotifCenter(catalog, me, orders);

  // One instant for the whole render, so the groups and the stamps inside
  // them are judged against the same clock.
  const now = useMemo(() => demoNow(), [list]);
  const groups = groupNotifications(list, now);

  function flip(key: PrefKey) {
    writePrefs(setPref(prefs, key, !prefs[key]));
  }

  return (
    <>
      <div className="pghead">
        <h1>Thông báo</h1>
        <span className="meta">
          {ready ? `${unread} mới` : "đang mở…"} · lưu trên thiết bị này
        </span>
        {unread > 0 && (
          <Button
            tone="quiet"
            icon="confirm"
            style={{ marginLeft: "auto" }}
            onClick={markAllRead}
          >
            Đánh dấu đã đọc
          </Button>
        )}
      </div>

      <p className="note3">
        <Icon name="info" bulk className="ic sm" />
        <span>
          Gom ba nguồn đang có: nhắc giờ mở, trạng thái đơn, mã sắp hết hạn. Không có
          máy chủ đẩy: mục này tính lại mỗi lần mở, từ đồng hồ, đơn trong tài khoản và
          kho trên thiết bị, nên không có “thông báo” nào bịa.
        </span>
      </p>

      {ready && groups.length === 0 && (
        <p className="fine3">
          Chưa có gì. Đặt nhắc cho {LEX.tl} sắp mở, hoặc bật thêm nguồn bên dưới.
        </p>
      )}

      {groups.map((group) => (
        <div className="sec" key={group.key}>
          <div className="hd">
            <h2>{group.title}</h2>
            {group.meta && <span className="meta">{group.meta}</span>}
          </div>
          {group.items.map((item) => (
            <NotifRow key={item.id} notif={item} now={now} />
          ))}
        </div>
      ))}

      <section className="panel3" style={{ marginTop: "var(--s6)" }}>
        <h3>
          Nhận thông báo về
          <span className="meta">lưu trên thiết bị này</span>
        </h3>

        {/* The first switch is the SAME state as "Đặt nhắc" on the home page
            and in Tuỳ chọn: one key, `brand.reminder`, so three screens
            cannot disagree about whether a reminder is set. */}
        <SourceRow
          title={`Giờ mở ${LEX.tl} mới`}
          detail={
            nextDropNo !== undefined
              ? "Ở đây và dải nhắc trang chủ."
              : `Chưa có ${LEX.tl} nào sắp mở.`
          }
          {...(nextDropNo !== undefined && remindersReady
            ? {
                on: hasReminder(reminders, nextDropNo),
                onFlip: () => writeReminders(toggleReminder(reminders, nextDropNo)),
              }
            : {})}
        />
        <SourceRow
          title="Trạng thái đơn"
          detail="Chờ thanh toán, đã giao, và hạn đổi trả."
          on={prefsReady && prefs.notifOrders}
          onFlip={() => flip("notifOrders")}
        />
        <SourceRow
          title="Mã sắp hết hạn"
          detail="Trước 5 ngày, cho mã đang chạy."
          on={prefsReady && prefs.notifPromo}
          onFlip={() => flip("notifPromo")}
        />
      </section>
    </>
  );
}

/**
 * One row.
 *
 * Unread is said three ways — a honey dot, a heavier title, and the count in
 * words at the top of the screen — because colour is never the only channel
 * (PRODUCT.md's floor).
 */
function NotifRow({ notif, now }: { notif: Notif; now: Date }) {
  return (
    <div className={notif.read ? "notif read" : "notif"}>
      <i aria-hidden="true" />
      <div>
        <b>{notif.title}</b>
        <span>{notif.body}</span>
        {notif.action && (
          <div className="act">
            <Link className="lnk" href={notif.action.href}>
              {notif.action.text}
            </Link>
          </div>
        )}
      </div>
      <time dateTime={notif.at}>{stampLabel(notif, now)}</time>
    </div>
  );
}

/** A source, as a real switch. No handler means there is nothing to switch. */
function SourceRow({
  title,
  detail,
  on,
  onFlip,
}: {
  title: string;
  detail: string;
  on?: boolean;
  onFlip?: () => void;
}) {
  return (
    <div className="prefrow">
      <div>
        <b>{title}</b>
        <span>{detail}</span>
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
