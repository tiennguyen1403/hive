"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useCatalog } from "@/components/shop/CatalogContext";
import type { Drop, NotifyKey } from "@/data/types";
import { clockDayLabel } from "@/lib/datetime";
import { dropCalendar } from "@/lib/drop";
import { inboxGroups, inboxTime, type InboxKind } from "@/lib/feed-inbox";
import { issueLabel } from "@/lib/lexicon";
import { RemindButton } from "../FeedBlocks";
import { FeedClock } from "../FeedClock";
import { useFeedToast } from "../FeedToast";
import { FeedIcon, type FeedIconName } from "../icon/FeedIcon";
import { ReadAllButton, useInbox, type InboxRow } from "../inbox";
import { useNow, useNowMs } from "../now";
import { useKeep } from "../useKeep";
import { cx } from "../useReveal";

/** Each kind's glyph (`notifications.js`: `KIND`). */
const KIND_ICON: Readonly<Record<InboxKind, FeedIconName>> = {
  order: "package",
  drop: "calendar-star",
  reminder: "alarm",
  wishlist: "heart",
  promo: "ticket",
};

/** "Nhận thông báo về": the four switches of the account, in the mock's order (`PREFS`). */
const PREFS: readonly (readonly [NotifyKey, string, FeedIconName])[] = [
  ["order", "Đơn hàng", "package"],
  ["drop", "Số mới", "calendar-star"],
  ["wishlist", "Mẫu đã lưu sắp hết", "heart"],
  ["promo", "Mã sắp hết hạn", "ticket"],
];

/**
 * Thông báo, signed in (round v4 slice 4a): the approved mock's
 * `notifications.html` and `notifications.js`.
 *
 * The inbox is the account's (`useInbox`: the frame builds it from the
 * account's orders, the issues, the saved styles, the codes and the
 * reminders), grouped Hôm nay / Tuần này / Trước đó, newest first. An unread
 * row sits on an ink icon with a bold title — two cues that are not a colour —
 * until it is opened or "Đánh dấu đã đọc" is pressed; each row opens what it
 * is about.
 *
 * Beside it from 900px, under it on the phone:
 * · "Nhắc mở bán": the next issue and the time to its opening, with the
 *   Feed's "Nhắc tôi" — or, once asked, the one channel there is, "Trong app"
 *   (QĐ-35: no e-mail yet, so the mock's Email row is not drawn). Turning it
 *   off turns the reminder off, with "Hoàn tác", as the mock's last channel
 *   does;
 * · "Nhận thông báo về": the four switches the account keeps
 *   (`setNotifyAction`), each taking its kind of row off the inbox.
 */
export function NotificationsView() {
  const inbox = useInbox();
  const now = useNow();
  const groups = inboxGroups(inbox.rows, now);
  const unread = inbox.rows.some((r) => r.unread);

  return (
    <>
      <div className="b-head">
        <h1 className="b-title disp" tabIndex={-1}>
          Thông báo
        </h1>
        {unread && <ReadAllButton className="b-desk-only" />}
      </div>
      <div className="b-notif">
        <section className="b-inbox" aria-label="Hộp thư">
          {groups.length === 0 ? (
            <div className="empty-state b-empty">
              <span className="empty-ic">
                <FeedIcon name="bell" />
              </span>
              <p className="empty-title">Chưa có thông báo</p>
            </div>
          ) : (
            groups.map((g) => (
              <section className="b-ngroup" aria-labelledby={`ng-${g.group}`} key={g.group}>
                <h2 className="b-ngroup-title" id={`ng-${g.group}`}>
                  {g.title}
                </h2>
                <ul>
                  {g.items.map((row) => (
                    <NotifRow key={row.key} row={row} time={inboxTime(row.at, g.group)} onOpen={inbox.markRead} />
                  ))}
                </ul>
              </section>
            ))
          )}
        </section>
        <div className="b-nside">
          <section className="b-sec" aria-labelledby="h-rem">
            <h2 className="sect-title" id="h-rem">
              Nhắc mở bán
            </h2>
            <ReminderCard />
          </section>
          <section className="b-sec" id="cai-dat" aria-labelledby="h-prefs">
            <h2 className="sect-title" id="h-prefs">
              Nhận thông báo về
            </h2>
            <Switches />
          </section>
        </div>
      </div>
    </>
  );
}

/** One row (`notifications.js`: `row`): its glyph, its title and line, when. Opening it reads it. */
function NotifRow({ row, time, onOpen }: { row: InboxRow; time: string; onOpen: (key: string) => void }) {
  return (
    <li>
      <Link className={cx("b-nrow", row.unread && "is-unread")} href={row.href} onClick={() => onOpen(row.key)}>
        <span className="b-nic">
          <FeedIcon name={KIND_ICON[row.kind]} />
        </span>
        <span className="b-nmain">
          <span className="b-ntitle">{row.title}</span>
          {row.body && <span className="b-nbody">{row.body}</span>}
        </span>
        <span className="b-ntime">{time}</span>
        {row.unread && <span className="sr-only">, chưa đọc</span>}
      </Link>
    </li>
  );
}

/**
 * A settings row: the whole row is the switch (`setRow`), the pill on its
 * right shows the state.
 */
function SetRow({
  icon,
  label,
  on,
  onPress,
  data,
}: {
  icon: FeedIconName;
  label: string;
  on: boolean;
  onPress: () => void;
  /** `data-ch` or `data-pref`, as the mock marks them: where the focus is sent back to. */
  data: Record<string, string>;
}) {
  return (
    <button className="b-setrow" type="button" role="switch" aria-checked={on} onClick={onPress} {...data}>
      <FeedIcon name={icon} />
      <span className="b-setrow-label">{label}</span>
      <span className="b-switch" aria-hidden="true" />
    </button>
  );
}

/**
 * "Nhắc mở bán" (`remHTML`): the next issue to open and its countdown, then
 * "Nhắc tôi", or the reminder's channel once it is on. No issue announced:
 * "Chưa có Số mới".
 */
function ReminderCard() {
  const catalog = useCatalog();
  const now = useNow();
  const next = dropCalendar(catalog, now).upcoming;
  if (!next) return <p className="b-quiet">Chưa có Số mới</p>;
  return <Reminder next={next} />;
}

function Reminder({ next }: { next: Drop }) {
  const keep = useKeep();
  const toast = useFeedToast();
  const nowMs = useNowMs();
  const focusNext = useRef<string | null>(null);
  const on = keep.hasReminder(next.no);
  const label = issueLabel(next.no);

  // Once the card has redrawn: the focus where the press sent it — the channel that replaced "Nhắc tôi", or
  // "Nhắc tôi" back in place of the channel turned off (`focusAfter`).
  useEffect(() => {
    const target = focusNext.current;
    if (!target) return;
    const el = document.querySelector<HTMLElement>(`[data-ui='feed'] .b-rem ${target}`);
    if (!el) return;
    focusNext.current = null;
    el.focus({ preventScroll: true });
  });

  // The one channel off is the last one off: the reminder goes, and can come back as it was.
  function channelOff() {
    focusNext.current = ".remind";
    keep.setReminder(next.no, false);
    toast(`Đã tắt nhắc ${label}`, {
      label: "Hoàn tác",
      run: () => {
        focusNext.current = '[data-ch="push"]';
        keep.setReminder(next.no, true);
      },
    });
  }

  return (
    <div className="b-rem">
      <p className="b-rem-no disp">{label}</p>
      <p className="b-rem-cd">
        <span className="cd-label">Mở sau</span>
        <FeedClock until={next.opensAt} now={nowMs} tag="span" label={`Mở ${clockDayLabel(next.opensAt)}`} />
      </p>
      {on ? (
        <div className="b-set" role="group" aria-label={`Nhắc ${label} qua`}>
          <SetRow icon="device-mobile" label="Trong app" on onPress={channelOff} data={{ "data-ch": "push" }} />
        </div>
      ) : (
        <RemindButton
          no={next.no}
          onToggle={(turnedOn) => {
            if (turnedOn) focusNext.current = '[data-ch="push"]';
          }}
        />
      )}
    </div>
  );
}

/** "Nhận thông báo về" (`prefsHTML`): each switch kept on the account at once, drawn before the server answers. */
function Switches() {
  const keep = useKeep();
  const notify = keep.state?.notify;
  if (!notify) return null;
  return (
    <div className="b-set" role="group" aria-labelledby="h-prefs">
      {PREFS.map(([key, label, icon]) => (
        <SetRow
          key={key}
          icon={icon}
          label={label}
          on={notify[key]}
          onPress={() => keep.setNotify(key, !notify[key])}
          data={{ "data-pref": key }}
        />
      ))}
    </div>
  );
}
