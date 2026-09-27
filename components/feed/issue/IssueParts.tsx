"use client";

import Link from "next/link";
import { COLORS } from "@/data/colors";
import type { ColorKey } from "@/data/types";
import { issueLabel } from "@/lib/lexicon";
import type { IssueNow } from "@/lib/feed-issue";
import { RemindButton } from "../FeedBlocks";
import { FeedClock } from "../FeedClock";
import { FeedIcon } from "../icon/FeedIcon";
import { useNowMs } from "../now";

/*
 * What the closed issues' two pages share (`archive.js`, `issue.js`): the
 * colour chips of a style that has no photo, and what is live beside the
 * closed issues — the strip at the top of the archive, the block after an
 * issue's styles.
 */

/** A style's colours as chips, named for screen readers; nothing when it has none. */
export function ColorChips({ colors }: { colors: readonly ColorKey[] }) {
  const cs = colors.filter((c) => COLORS[c]);
  if (cs.length === 0) return null;
  return (
    <span className="b-chips">
      {cs.map((c) => (
        <i key={c} className="b-chip" style={{ background: COLORS[c].hex }} aria-hidden="true" />
      ))}
      <span className="sr-only">{cs.map((c) => COLORS[c].label).join(", ")}</span>
    </span>
  );
}

/**
 * The archive's strip: the issue selling now, to the shop's grid on it; or
 * the next one announced, to the home page's Sắp mở; or nothing between two
 * issues (`archive.js`: `now`).
 */
export function NowStrip({ live }: { live: IssueNow }) {
  const now = useNowMs();
  if (live.kind === "none") return null;
  const d = live.drop;
  const selling = live.kind === "live";
  return (
    <Link className="b-now" href={selling ? `/products?line=${d.no}` : "/#sap-mo"}>
      {selling ? (
        <span className="chip-live">
          <span className="dot" aria-hidden="true" />
          ĐANG MỞ
        </span>
      ) : (
        <span className="chip-line">SẮP MỞ</span>
      )}
      <span className="b-now-no disp">{issueLabel(d.no)}</span>
      <span>
        {selling ? "Đóng sau" : "Mở sau"} <FeedClock until={selling ? d.closesAt : d.opensAt} now={now} tag="span" />
      </span>
      <FeedIcon name="arrow-right" />
    </Link>
  );
}

/**
 * After an issue's styles: the issue selling now, with its clock and the way
 * to its styles; or the next one, with its clock and Nhắc tôi; or, between
 * two issues, the fixed line — named like the other two name their issue
 * (`issue.js`: `live`).
 */
export function NextNow({
  live,
  opens,
  styles,
  fixed,
}: {
  live: IssueNow;
  /** "20:00 thứ Sáu 02/10", the next issue's opening. */
  opens: string;
  /** How many styles the issue selling has. */
  styles: number;
  /** How many fixed styles there are. */
  fixed: number;
}) {
  const now = useNowMs();
  if (live.kind === "live") {
    const d = live.drop;
    return (
      <div className="b-next-now">
        <h2 className="sect-title">{issueLabel(d.no)} đang mở</h2>
        <p className="b-state-cd">
          <span className="cd-label">Đóng sau</span>
          <FeedClock until={d.closesAt} now={now} tag="span" />
        </p>
        <Link className="btn btn-blue" href={`/products?line=${d.no}`}>
          Xem {styles} mẫu
        </Link>
      </div>
    );
  }
  if (live.kind === "next") {
    const d = live.drop;
    return (
      <div className="b-next-now">
        <h2 className="sect-title">
          {issueLabel(d.no)} mở {opens}
        </h2>
        <p className="b-state-cd">
          <span className="cd-label">Mở sau</span>
          <FeedClock until={d.opensAt} now={now} tag="span" />
        </p>
        <RemindButton no={d.no} />
      </div>
    );
  }
  return (
    <div className="b-next-now">
      <h2 className="sect-title">Cố định</h2>
      <Link className="btn btn-blue" href="/products?line=fixed">
        Xem {fixed} mẫu
      </Link>
    </div>
  );
}
