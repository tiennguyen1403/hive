"use client";

import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { clockLabel, dayMonth } from "@/lib/datetime";
import { issueLabel } from "@/lib/lexicon";
import { vnd } from "@/lib/money";
import { ROW_STATE_LABEL } from "@/lib/order-labels";
import type { OrderRow } from "@/lib/order-rows";
import { photoUrl } from "@/lib/photos";

interface OrderRow3Props {
  row: OrderRow;
  /** The issue selling right now — it decides how the row dates itself. */
  currentDropNo: number;
  /**
   * `full` is the order list: counts per style, the hold or the delivery
   * date, and the thumbnails. `compact` is the overview panel, where the row
   * is one of three in half a column.
   */
  variant?: "full" | "compact";
  /** This row's detail is open below the list. */
  open?: boolean;
}

/**
 * One order, as a row.
 *
 * The same row on the overview and in the list, because they are the same
 * thing — one component, so the two cannot drift into dating an order two
 * ways or naming a state in two words.
 *
 * HOW IT DATES ITSELF is the one decision worth explaining. An order from
 * the issue selling now carries its HOUR ("18:50 · 20/09"): it is recent,
 * and the hour is what tells two of today's orders apart. An older one
 * carries its ISSUE ("12/06 · Số 04"), because six months later the issue is
 * what places it and the minute means nothing.
 */
export function OrderRow3({ row, currentDropNo, variant = "full", open }: OrderRow3Props) {
  const label = ROW_STATE_LABEL[row.state];
  const recent = row.dropNo === undefined || row.dropNo === currentDropNo;

  const when = recent
    ? `${clockLabel(row.placedAt)} · ${dayMonth(row.placedAt)}`
    : `${dayMonth(row.placedAt)} · ${issueLabel(row.dropNo!)}`;

  const styles =
    variant === "full"
      ? row.items.map((i) => `${i.name} ×${i.qty}`).join(", ")
      : row.names;

  // What the order is waiting for, or where it got to. An unpaid transfer
  // says the deadline, because that is the only fact on the row somebody can
  // still act on.
  const tail =
    row.state === "AWAITING_TRANSFER" && row.dueAt
      ? `giữ hàng tới ${clockLabel(row.dueAt)} ${dayMonth(row.dueAt)}`
      : row.note;

  const sub = [
    when,
    // On the overview there is no room for counts, so the fact that the
    // order lives only in this browser takes that space instead.
    variant === "compact" && row.onDevice ? "lưu trên thiết bị này" : null,
    styles,
    variant === "full" ? tail : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      className={open ? "row on" : "row"}
      href={`/account/orders/${row.code}`}
      {...(open ? { "aria-current": "true" as const } : {})}
    >
      <b>
        <span className="nm">{row.code}</span>
        {variant === "full" && row.onDevice && (
          <Badge tone="flat" dot={false}>
            lưu trên thiết bị này
          </Badge>
        )}
      </b>
      <span className="sub">{sub}</span>
      <span className="right">
        <Badge tone={label.tone}>{label.text}</Badge>
        <span className="sub">{vnd(row.totalVnd)}</span>
      </span>
      {variant === "full" && row.photoKeys.length > 0 && (
        <span className="thumbs3">
          {row.photoKeys.map((key, i) => (
            <Image
              key={`${key}-${i}`}
              src={photoUrl(key, 120, 60)}
              alt=""
              width={120}
              height={150}
            />
          ))}
        </span>
      )}
    </Link>
  );
}
