import { SIZES, type PaymentMethod } from "@/data/types";
import type { Catalog } from "./catalog";
import { FIT_LABELS } from "./catalog-query";
import { clockDayLabel } from "./datetime";
import { FEED_PAYMENTS, feedDelivery } from "./feed-checkout";
import { homeMoment } from "./feed-home";
import { issueLabel } from "./lexicon";
import { vnd } from "./money";
import { PHOTO_REASONS, RETURN_REASONS, RETURNS, SHOP_FAULT } from "./returns";
import { COD_SURCHARGE_VND, FREE_SHIPPING_FROM_VND, RETURN_WINDOW_DAYS, deliveryOption } from "./shipping";

/**
 * Hỏi đáp (round v4 slice 4b): the approved mock's `prototype/explore/feed/help.js`
 * — short answers grouped as the shopper meets them (đặt hàng, thanh toán, giao
 * hàng, đổi trả, size, tài khoản) and the search over them.
 *
 * The words are the mock's. Every figure in an answer is read from the app's
 * own rules, as the mock reads its data layer: the delivery fees, the free
 * delivery floor and the days (`lib/shipping.ts`), the COD fee, the transfer's
 * hold (`FEED_PAYMENTS`, the checkout's cards), the return window and the
 * return rules (`lib/returns.ts`), the size range (`SIZES`), the fits
 * (`FIT_LABELS`) — and one answer follows the clock: when the next issue
 * opens, from the catalogue.
 *
 * Four answers are not the mock's: they promise what the app does not do yet
 * (a return request on the order's page, QĐ-34; email, QĐ-35), so they say it
 * is being prepared, in the words the main session set in the slice's brief
 * (`tasks/briefs/v4-lat-4b.md` §3.1).
 *
 * Pure and safe for the browser.
 */

/** A piece of an answer: plain words, or words set bold (the mock's `<b>`). */
export type HelpBit = string | { b: string };

export interface HelpLink {
  href: string;
  label: string;
}

export interface HelpItem {
  /** The element's id, as the mock writes it: `q-doi-tra-0`. */
  id: string;
  q: string;
  a: readonly HelpBit[];
  /** The way to act on the answer ("Tra cứu đơn", "Xem Bảng size"), when there is one. */
  go?: HelpLink;
}

export const HELP_GROUP_IDS = ["dat-hang", "thanh-toan", "giao-hang", "doi-tra", "size", "tai-khoan"] as const;
export type HelpGroupId = (typeof HELP_GROUP_IDS)[number];

export interface HelpGroup {
  /** Its anchor: `#doi-tra` opens it with every answer. */
  id: HelpGroupId;
  title: string;
  items: readonly HelpItem[];
}

/** The next issue announced, for "Khi nào có Số mới?": its number and when it opens. */
export interface HelpNext {
  no: number;
  opensAt: string;
}

/** The mock's `F.low1`: the first letter in lower case, for a label set inside a sentence. */
const low1 = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
/** "a, b, c": a list inside a sentence, the first as written and the rest in lower case (`list`). */
const list = (items: readonly string[]) => items.map((x, i) => (i ? low1(x) : x)).join(", ");
/** "a, b hay c" (`anyOf`). */
const anyOf = (items: readonly string[]) =>
  items.length > 1 ? `${items.slice(0, -1).join(", ")} hay ${items[items.length - 1]}` : items.join("");
/** "A và b": two things named together, the second in lower case. */
const both = (items: readonly string[]) => items.map((x, i) => (i ? low1(x) : x)).join(" và ");

/**
 * The next issue the shop has announced, as the mock's `F.NEXT` finds it: the
 * one after the issue selling now, or the one the shop is waiting for. None
 * between two issues.
 */
export function helpNext(catalog: Catalog, now: Date): HelpNext | null {
  const m = homeMoment(catalog, now);
  const next = m.kind === "open" || m.kind === "upcoming" ? m.next : undefined;
  return next ? { no: next.no, opensAt: next.opensAt } : null;
}

function payment(method: PaymentMethod) {
  const p = FEED_PAYMENTS.find((x) => x.method === method);
  if (!p) throw new Error(`no payment card for ${method}`);
  return p;
}

/** The six groups and their answers (the mock's `GROUPS`), the next issue read from `next`. */
export function helpGroups(next: HelpNext | null): HelpGroup[] {
  const transfer = payment("BANK_TRANSFER");
  const cod = payment("COD");
  const standard = feedDelivery("STANDARD");
  const express = feedDelivery("EXPRESS");
  const [leadFrom, leadTo] = deliveryOption("STANDARD").leadDays;

  const nextIssue: Pick<HelpItem, "a" | "go"> = next
    ? {
        a: [{ b: issueLabel(next.no) }, " mở lúc ", { b: clockDayLabel(next.opensAt) }, "."],
        go: { href: "/#sap-mo", label: "Xem Sắp mở" },
      }
    : { a: ["Chưa có Số mới."], go: { href: "/account/notifications#cai-dat", label: "Bật báo Số mới" } };

  const groups: { id: HelpGroupId; title: string; items: Omit<HelpItem, "id">[] }[] = [
    {
      id: "dat-hang",
      title: "Đặt hàng",
      items: [
        { q: "Mua có cần tài khoản không?", a: ["Không cần. Có tài khoản thì mọi đơn nằm ở mục Đơn hàng."] },
        { q: "Khi nào có Số mới?", ...nextIssue },
        {
          q: "Hết size thì có về lại không?",
          a: ["Mẫu trong một Số cắt một lần, hết là hết. Dòng Cố định về thêm theo từng size."],
          go: { href: "/products?line=fixed", label: "Xem Cố định" },
        },
        {
          q: "Huỷ đơn thế nào?",
          a: [
            "Ở trang đơn: đơn chuyển khoản huỷ được tới khi trả tiền, đơn COD tới khi cửa hàng gọi xác nhận. " +
              "Đơn chuyển khoản hết hạn giữ hàng mà chưa trả thì tự huỷ.",
          ],
        },
        { q: "Dùng mã giảm giá ở đâu?", a: ["Nhập ở mục Mã giảm giá khi thanh toán."] },
      ],
    },
    {
      id: "thanh-toan",
      title: "Thanh toán",
      items: [
        { q: "Có những cách thanh toán nào?", a: [`${list(FEED_PAYMENTS.map((p) => p.title))}.`] },
        { q: "Chuyển khoản thế nào?", a: [`${transfer.note} Số tài khoản và tên ngân hàng đang chuẩn bị.`] },
        {
          q: "COD có mất thêm phí không?",
          a: ["Có, thêm ", { b: vnd(COD_SURCHARGE_VND) }, `. Cửa hàng gọi xác nhận trước khi giao. ${cod.note}`],
        },
        {
          q: "Trả bằng thẻ được chưa?",
          a: ["Cổng thẻ đang chuẩn bị. Đơn chọn thẻ trả bằng chuyển khoản, cùng hạn giữ hàng."],
        },
      ],
    },
    {
      id: "giao-hang",
      title: "Giao hàng",
      items: [
        {
          q: "Giao tới đâu?",
          a: [`${standard.title} tới mọi tỉnh thành. Giao nhanh ${low1(express.note ?? "")}.`],
        },
        {
          q: "Phí giao hàng bao nhiêu?",
          a: [
            `${standard.title} `,
            { b: vnd(deliveryOption("STANDARD").feeVnd) },
            ", miễn phí cho đơn từ ",
            { b: vnd(FREE_SHIPPING_FROM_VND) },
            ". Giao nhanh ",
            { b: vnd(deliveryOption("EXPRESS").feeVnd) },
            ".",
          ],
        },
        {
          q: "Bao lâu thì nhận được hàng?",
          a: [`${standard.title} ${leadFrom} đến ${leadTo} ngày, giao nhanh trong ${express.days}.`],
        },
        {
          q: "Theo dõi đơn ở đâu?",
          a: [
            "Mã vận đơn hiện ở trang đơn khi hàng đang giao. " +
              "Không có tài khoản thì tra bằng mã đơn và số điện thoại đặt hàng.",
          ],
          go: { href: "/track", label: "Tra cứu đơn" },
        },
      ],
    },
    {
      id: "doi-tra",
      title: "Đổi trả",
      items: [
        {
          q: "Đổi trả trong bao lâu?",
          a: ["Trong ", { b: `${RETURN_WINDOW_DAYS} ngày` }, " kể từ khi nhận hàng. Hàng chưa mặc, còn nhãn."],
        },
        // The mock sends the shopper to the order's page, whose request flow comes later (QĐ-34).
        { q: "Gửi yêu cầu đổi trả thế nào?", a: ["Yêu cầu đổi trả trên trang đơn đang chuẩn bị."] },
        { q: "Ai trả phí gửi hàng về?", a: [RETURNS.shipBackBy === "shop" ? "Cửa hàng trả." : "Bạn trả."] },
        {
          q: "Hoàn tiền thế nào?",
          a: [
            "Chuyển khoản vào tài khoản ngân hàng của bạn, đúng số đã trả cho những món trả lại: giá món trừ phần mã " +
              `giảm giá. Trả cả đơn vì ${anyOf(SHOP_FAULT.map(low1))} thì hoàn cả phí giao hàng và phụ phí COD.`,
          ],
        },
        {
          q: "Đổi sang size khác được không?",
          a: ["Được, trong hạn đổi trả, sang size cùng màu còn hàng, kể cả khi Số đã đóng."],
        },
        {
          q: "Lý do nào được đổi trả?",
          a: [`${list(RETURN_REASONS)}. ${both(PHOTO_REASONS)} cần ít nhất một ảnh.`],
        },
      ],
    },
    {
      id: "size",
      title: "Size",
      items: [
        {
          q: "Chọn size thế nào?",
          a: [
            `Số đo áo theo form ${Object.values(FIT_LABELS)
              .map((f) => f.toLowerCase())
              .join(", ")}, quần dài và quần short đều ở Bảng size.`,
          ],
          go: { href: "/size-guide", label: "Xem Bảng size" },
        },
        {
          q: "Size có chia nam nữ không?",
          a: [`Không. Một dải size ${SIZES[0]} đến ${SIZES[SIZES.length - 1]} cho tất cả.`],
        },
        {
          q: "Lưu size của mình ở đâu?",
          a: ["Ở Hồ sơ, mục Size của tôi. Trang sản phẩm chọn sẵn size này khi còn hàng."],
          go: { href: "/account/profile#size", label: "Mở Size của tôi" },
        },
      ],
    },
    {
      id: "tai-khoan",
      title: "Tài khoản",
      items: [
        { q: "Đăng nhập bằng gì?", a: ["Email và mật khẩu. Đăng nhập bằng Google đang chuẩn bị."] },
        // The three below promise email in the mock; the app has none yet (QĐ-35).
        { q: "Quên mật khẩu thì sao?", a: ["Đặt lại mật khẩu qua email đang chuẩn bị."] },
        { q: "Đổi email ở đâu?", a: ["Đổi email đang chuẩn bị."] },
        {
          q: "Nhắc mở bán gửi qua đâu?",
          a: ["Qua Thông báo trong app. Bật hoặc tắt ở mục Thông báo."],
          go: { href: "/account/notifications", label: "Mở Thông báo" },
        },
      ],
    },
  ];

  return groups.map((g) => ({ ...g, items: g.items.map((it, i) => ({ ...it, id: `q-${g.id}-${i}` })) }));
}

export function isHelpGroupId(id: string): id is HelpGroupId {
  return (HELP_GROUP_IDS as readonly string[]).includes(id);
}

// ─────────────────────────────────────────────────────────── the search

/**
 * One character folded — accents off, đ to d, lower case — and always one
 * character out for one in, so a match found in the folded text maps back
 * onto the words on screen (the mock's `foldCh`).
 */
function foldChar(c: string): string {
  const f = c
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
  if (f.length === 1) return f;
  const lower = c.toLowerCase();
  return lower.length === 1 ? lower : c;
}

/** A text folded character by character, the same length as the text. */
export function foldHelp(text: string): string {
  let out = "";
  for (let i = 0; i < text.length; i++) out += foldChar(text[i]!);
  return out;
}

/** The words of a query, folded: "Đổi  TRẢ" → ["doi", "tra"]. None for an empty query. */
export function helpWords(query: string): string[] {
  return foldHelp(query).split(/\s+/).filter(Boolean);
}

/** An answer's words without their bold. */
export function answerText(a: readonly HelpBit[]): string {
  return a.map((bit) => (typeof bit === "string" ? bit : bit.b)).join("");
}

/** Whether an answer holds every word: in its question, its answer or its link (the mock's `hits`). */
export function helpHits(item: HelpItem, words: readonly string[]): boolean {
  const hay = foldHelp([item.q, answerText(item.a), item.go?.label ?? ""].join(" "));
  return words.every((w) => hay.includes(w));
}

/** The groups with the answers a search finds, the empty groups left out; everything for no words. */
export function helpSearch(groups: readonly HelpGroup[], words: readonly string[]): HelpGroup[] {
  if (words.length === 0) return [...groups];
  return groups
    .map((g) => ({ ...g, items: g.items.filter((it) => helpHits(it, words)) }))
    .filter((g) => g.items.length > 0);
}

/** A run of text, and whether it is a match to mark. */
export interface HelpPiece {
  text: string;
  hit: boolean;
}

/**
 * A text cut where the words of a search fall in it, accents and case aside:
 * the mock's `mark`, which wraps each match in `<mark class="b-hit">`.
 * Overlapping and touching matches are one mark.
 */
export function markPieces(text: string, words: readonly string[]): HelpPiece[] {
  if (words.length === 0 || text === "") return [{ text, hit: false }];
  const folded = foldHelp(text);
  const spans: [number, number][] = [];
  for (const w of words) {
    for (let at = folded.indexOf(w); at >= 0; at = folded.indexOf(w, at + w.length)) spans.push([at, at + w.length]);
  }
  if (spans.length === 0) return [{ text, hit: false }];
  spans.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const s of spans) {
    const last = merged[merged.length - 1];
    if (last && s[0] <= last[1]) last[1] = Math.max(last[1], s[1]);
    else merged.push([s[0], s[1]]);
  }
  const out: HelpPiece[] = [];
  let pos = 0;
  for (const [a, b] of merged) {
    if (a > pos) out.push({ text: text.slice(pos, a), hit: false });
    out.push({ text: text.slice(a, b), hit: true });
    pos = b;
  }
  if (pos < text.length) out.push({ text: text.slice(pos), hit: false });
  return out;
}

/** The address a search leaves: `?q=cod`, or no query at all, as the mock writes it back. */
export function helpQuery(query: string): string {
  const q = query.trim();
  return q ? `?${new URLSearchParams({ q }).toString()}` : "";
}
