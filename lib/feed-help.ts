import { SIZES, type Fit, type PaymentMethod } from "@/data/types";
import type { Catalog } from "./catalog";
import { FIT_LABELS, fitLabel } from "./catalog-query";
import { clockDayLabel } from "./datetime";
import { EXPRESS_CITY_EN, feedDelivery, feedPayments } from "./feed-checkout";
import { homeMoment } from "./feed-home";
import { picker, plural, pluralNoun, type Locale } from "./i18n";
import { issueLabel } from "./lexicon";
import { vnd } from "./money";
import { TRANSFER_HOLD_HOURS } from "./orders";
import { PHOTO_REASONS, RETURN_REASONS, RETURNS, SHOP_FAULT, returnReasonLabel, type ReturnReason } from "./returns";
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
 * In English since round v6 slice E3b (`helpGroups(next, "en")`): the same
 * groups, questions, ids and links, every figure read from the same rules
 * through the language's own writing of it (`vnd`, `clockDayLabel`,
 * `issueLabel`, `feedPayments`, `feedDelivery`, `returnReasonLabel`). A
 * return reason named inside an English sentence is quoted, the way English
 * names a choice it offers.
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

/** A return reason named inside an English sentence: “Not as pictured”. */
const quoted = (reason: ReturnReason) => `“${returnReasonLabel(reason, "en")}”`;
/** "“a”, “b” or “c”": `anyOf` in English. */
const anyOfEn = (items: readonly string[]) =>
  items.length > 1 ? `${items.slice(0, -1).join(", ")} or ${items[items.length - 1]}` : items.join("");

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

function payment(method: PaymentMethod, locale: Locale) {
  const p = feedPayments(locale).find((x) => x.method === method);
  if (!p) throw new Error(`no payment card for ${method}`);
  return p;
}

/** "oversize, regular": the fits as a sentence names them, in the catalogue's order. */
const fitsInSentence = (locale: Locale) =>
  (Object.keys(FIT_LABELS) as Fit[]).map((f) => fitLabel(f, locale).toLowerCase()).join(", ");

/** "“a”, “b” and “c”": several return reasons named together in English. */
const allOfEn = (items: readonly string[]) =>
  items.length > 1 ? `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}` : items.join("");

/**
 * The six groups and their answers (the mock's `GROUPS`), the next issue read
 * from `next`, in one language. The groups' ids, the answers' ids and every
 * link's address are the same in both: only the words change.
 */
export function helpGroups(next: HelpNext | null, locale: Locale = "vi"): HelpGroup[] {
  const t = picker(locale);
  const transfer = payment("BANK_TRANSFER", locale);
  const cod = payment("COD", locale);
  const card = payment("CARD", locale);
  const standard = feedDelivery("STANDARD", locale);
  const express = feedDelivery("EXPRESS", locale);
  const [leadFrom, leadTo] = deliveryOption("STANDARD").leadDays;
  const money = (n: number) => vnd(n, locale);

  const nextIssue: Pick<HelpItem, "a" | "go"> = next
    ? {
        a: t<readonly HelpBit[]>({
          vi: [{ b: issueLabel(next.no) }, " mở lúc ", { b: clockDayLabel(next.opensAt) }, "."],
          en: [{ b: issueLabel(next.no, "en") }, " opens at ", { b: clockDayLabel(next.opensAt, "en") }, "."],
        }),
        go: { href: "/#sap-mo", label: t({ vi: "Xem Sắp mở", en: "View Coming soon" }) },
      }
    : {
        a: [t({ vi: "Chưa có Số mới.", en: "No new drop yet." })],
        go: {
          href: "/account/notifications#cai-dat",
          label: t({ vi: "Bật báo Số mới", en: "Turn on new drop alerts" }),
        },
      };

  const groups: { id: HelpGroupId; title: string; items: Omit<HelpItem, "id">[] }[] = [
    {
      id: "dat-hang",
      title: t({ vi: "Đặt hàng", en: "Ordering" }),
      items: [
        {
          q: t({ vi: "Mua có cần tài khoản không?", en: "Do I need an account to buy?" }),
          a: [
            t({
              vi: "Không cần. Có tài khoản thì mọi đơn nằm ở mục Đơn hàng.",
              en: "No. With an account, all your orders are under Orders.",
            }),
          ],
        },
        { q: t({ vi: "Khi nào có Số mới?", en: "When is the next drop?" }), ...nextIssue },
        {
          q: t({ vi: "Hết size thì có về lại không?", en: "Will a sold-out size come back?" }),
          a: [
            t({
              vi: "Mẫu trong một Số cắt một lần, hết là hết. Dòng Cố định về thêm theo từng size.",
              en: "Styles in a drop are cut once; when they're gone, they're gone. Basics are restocked size by size.",
            }),
          ],
          go: { href: "/products?line=fixed", label: t({ vi: "Xem Cố định", en: "View Basics" }) },
        },
        {
          q: t({ vi: "Huỷ đơn thế nào?", en: "How do I cancel an order?" }),
          // A card order cancels and runs out of its hold as a transfer does since slice B18; the user's words, 07/10.
          a: [
            t({
              vi:
                "Ở trang đơn: đơn chuyển khoản hoặc thẻ huỷ được tới khi trả tiền, đơn COD tới khi cửa hàng gọi xác nhận. " +
                "Đơn chuyển khoản hoặc thẻ hết hạn giữ hàng mà chưa trả thì tự huỷ.",
              en:
                "On the order page: a bank transfer or card order can be cancelled until it's paid, a COD order until the " +
                "shop calls to confirm. An unpaid bank transfer or card order cancels itself when its reservation runs out.",
            }),
          ],
        },
        {
          q: t({ vi: "Dùng mã giảm giá ở đâu?", en: "Where do I use a discount code?" }),
          a: [t({ vi: "Nhập ở mục Mã giảm giá khi thanh toán.", en: "Enter it under Discount code at checkout." })],
        },
      ],
    },
    {
      id: "thanh-toan",
      title: t({ vi: "Thanh toán", en: "Payment" }),
      items: [
        {
          q: t({ vi: "Có những cách thanh toán nào?", en: "How can I pay?" }),
          a: [`${list(feedPayments(locale).map((p) => p.title))}.`],
        },
        {
          q: t({ vi: "Chuyển khoản thế nào?", en: "How does bank transfer work?" }),
          a: [
            t({
              vi: `${transfer.note} Số tài khoản và tên ngân hàng đang chuẩn bị.`,
              en:
                `Reserved for ${plural(TRANSFER_HOLD_HOURS, "hour", "hours")} after you order. ` +
                "The transfer reference is on the confirmation screen. Account number and bank name coming soon.",
            }),
          ],
        },
        {
          q: t({ vi: "COD có mất thêm phí không?", en: "Does COD cost extra?" }),
          a: t<readonly HelpBit[]>({
            vi: ["Có, thêm ", { b: money(COD_SURCHARGE_VND) }, `. Cửa hàng gọi xác nhận trước khi giao. ${cod.note}`],
            en: [
              "Yes, an extra ",
              { b: money(COD_SURCHARGE_VND) },
              `. The shop calls to confirm before delivery. ${cod.note}`,
            ],
          }),
        },
        {
          // Since slice B18 a card pays on Stripe's page, in test mode (QĐ-46): the checkout card's own note, and the
          // hold, which a card order keeps as a transfer does.
          q: t({ vi: "Trả bằng thẻ được chưa?", en: "Can I pay by card yet?" }),
          a: [
            t({
              vi: `Được. ${card.note} Đơn chọn thẻ có cùng hạn giữ hàng với chuyển khoản.`,
              en: `Yes. ${card.note} Card orders have the same reservation time as bank transfers.`,
            }),
          ],
        },
      ],
    },
    {
      id: "giao-hang",
      title: t({ vi: "Giao hàng", en: "Delivery" }),
      items: [
        {
          q: t({ vi: "Giao tới đâu?", en: "Where do you deliver?" }),
          a: [
            t({
              vi: `${standard.title} tới mọi tỉnh thành. Giao nhanh ${low1(express.note ?? "")}.`,
              en: `${standard.title} to every province and city. Express only in central ${EXPRESS_CITY_EN}, during office hours.`,
            }),
          ],
        },
        {
          q: t({ vi: "Phí giao hàng bao nhiêu?", en: "How much is delivery?" }),
          a: t<readonly HelpBit[]>({
            vi: [
              `${standard.title} `,
              { b: money(deliveryOption("STANDARD").feeVnd) },
              ", miễn phí cho đơn từ ",
              { b: money(FREE_SHIPPING_FROM_VND) },
              ". Giao nhanh ",
              { b: money(deliveryOption("EXPRESS").feeVnd) },
              ".",
            ],
            en: [
              `${standard.title} `,
              { b: money(deliveryOption("STANDARD").feeVnd) },
              ", free on orders from ",
              { b: money(FREE_SHIPPING_FROM_VND) },
              ". Express ",
              { b: money(deliveryOption("EXPRESS").feeVnd) },
              ".",
            ],
          }),
        },
        {
          q: t({ vi: "Bao lâu thì nhận được hàng?", en: "How long does delivery take?" }),
          a: [
            t({
              vi: `${standard.title} ${leadFrom} đến ${leadTo} ngày, giao nhanh trong ${express.days}.`,
              en: `${standard.title} ${leadFrom} to ${leadTo} ${pluralNoun(leadTo, "day", "days")}, express within ${express.days}.`,
            }),
          ],
        },
        {
          q: t({ vi: "Theo dõi đơn ở đâu?", en: "Where can I track my order?" }),
          a: [
            t({
              vi:
                "Mã vận đơn hiện ở trang đơn khi hàng đang giao. " +
                "Không có tài khoản thì tra bằng mã đơn và số điện thoại đặt hàng.",
              en:
                "The tracking number shows on the order page while it's shipping. " +
                "Without an account, look it up with the order code and the order's phone number.",
            }),
          ],
          go: { href: "/track", label: t({ vi: "Tra cứu đơn", en: "Track an order" }) },
        },
      ],
    },
    {
      id: "doi-tra",
      title: t({ vi: "Đổi trả", en: "Returns" }),
      items: [
        {
          q: t({ vi: "Đổi trả trong bao lâu?", en: "How long do I have for a return?" }),
          a: t<readonly HelpBit[]>({
            vi: ["Trong ", { b: `${RETURN_WINDOW_DAYS} ngày` }, " kể từ khi nhận hàng. Hàng chưa mặc, còn nhãn."],
            en: ["Within ", { b: plural(RETURN_WINDOW_DAYS, "day", "days") }, " of delivery. Unworn, with tags on."],
          }),
        },
        // The mock sends the shopper to the order's page, whose request flow comes later (QĐ-34).
        {
          q: t({ vi: "Gửi yêu cầu đổi trả thế nào?", en: "How do I request a return?" }),
          a: [t({ vi: "Yêu cầu đổi trả trên trang đơn đang chuẩn bị.", en: "Return requests on the order page are coming soon." })],
        },
        {
          q: t({ vi: "Ai trả phí gửi hàng về?", en: "Who pays to send it back?" }),
          a: [
            RETURNS.shipBackBy === "shop"
              ? t({ vi: "Cửa hàng trả.", en: "The shop does." })
              : t({ vi: "Bạn trả.", en: "You do." }),
          ],
        },
        {
          q: t({ vi: "Hoàn tiền thế nào?", en: "How do refunds work?" }),
          a: [
            t({
              vi:
                "Chuyển khoản vào tài khoản ngân hàng của bạn, đúng số đã trả cho những món trả lại: giá món trừ phần mã " +
                `giảm giá. Trả cả đơn vì ${anyOf(SHOP_FAULT.map(low1))} thì hoàn cả phí giao hàng và phụ phí COD.`,
              en:
                "By bank transfer to your account, for exactly what you paid for the returned items: their price minus " +
                `any discount code. If a whole order is returned for ${anyOfEn(SHOP_FAULT.map(quoted))}, the delivery ` +
                "fee and the COD surcharge are refunded too.",
            }),
          ],
        },
        {
          q: t({ vi: "Đổi sang size khác được không?", en: "Can I exchange for another size?" }),
          a: [
            t({
              vi: "Được, trong hạn đổi trả, sang size cùng màu còn hàng, kể cả khi Số đã đóng.",
              en: "Yes, within the return window, for a size in the same colour that's in stock, even after the drop has closed.",
            }),
          ],
        },
        {
          q: t({ vi: "Lý do nào được đổi trả?", en: "Which reasons qualify for a return?" }),
          a: [
            t({
              vi: `${list(RETURN_REASONS)}. ${both(PHOTO_REASONS)} cần ít nhất một ảnh.`,
              en:
                `${list(RETURN_REASONS.map((r) => returnReasonLabel(r, "en")))}. ` +
                `${allOfEn(PHOTO_REASONS.map(quoted))} need at least one photo.`,
            }),
          ],
        },
      ],
    },
    {
      id: "size",
      title: t({ vi: "Size", en: "Sizing" }),
      items: [
        {
          q: t({ vi: "Chọn size thế nào?", en: "How do I choose a size?" }),
          a: [
            t({
              vi: `Số đo áo theo form ${fitsInSentence("vi")}, quần dài và quần short đều ở Bảng size.`,
              en: `Measurements for tops by fit (${fitsInSentence("en")}), trousers and shorts are all in the Size guide.`,
            }),
          ],
          go: { href: "/size-guide", label: t({ vi: "Xem Bảng size", en: "View Size guide" }) },
        },
        {
          q: t({ vi: "Size có chia nam nữ không?", en: "Are there men's and women's sizes?" }),
          a: [
            t({
              vi: `Không. Một dải size ${SIZES[0]} đến ${SIZES[SIZES.length - 1]} cho tất cả.`,
              en: `No. One size range, ${SIZES[0]} to ${SIZES[SIZES.length - 1]}, for everyone.`,
            }),
          ],
        },
        {
          q: t({ vi: "Lưu size của mình ở đâu?", en: "Where do I save my size?" }),
          a: [
            t({
              vi: "Ở Hồ sơ, mục Size của tôi. Trang sản phẩm chọn sẵn size này khi còn hàng.",
              en: "In Profile, under My sizes. Product pages preselect that size when it's in stock.",
            }),
          ],
          go: { href: "/account/profile#size", label: t({ vi: "Mở Size của tôi", en: "Open My sizes" }) },
        },
      ],
    },
    {
      id: "tai-khoan",
      title: t({ vi: "Tài khoản", en: "Account" }),
      items: [
        {
          q: t({ vi: "Đăng nhập bằng gì?", en: "What do I sign in with?" }),
          a: [
            // Slice B16: "Tiếp tục với Google" works.
            t({
              vi: "Email và mật khẩu, hoặc tài khoản Google.",
              en: "Email and password, or your Google account.",
            }),
          ],
        },
        // The three below promise email in the mock; the app has none yet (QĐ-35).
        {
          q: t({ vi: "Quên mật khẩu thì sao?", en: "What if I forget my password?" }),
          a: [t({ vi: "Đặt lại mật khẩu qua email đang chuẩn bị.", en: "Password reset by email is coming soon." })],
        },
        {
          q: t({ vi: "Đổi email ở đâu?", en: "Where do I change my email?" }),
          a: [t({ vi: "Đổi email đang chuẩn bị.", en: "Changing your email is coming soon." })],
        },
        {
          q: t({ vi: "Nhắc mở bán gửi qua đâu?", en: "How are drop reminders sent?" }),
          a: [
            t({
              vi: "Qua Thông báo trong app. Bật hoặc tắt ở mục Thông báo.",
              en: "Through Notifications in the app. Turn them on or off there.",
            }),
          ],
          go: { href: "/account/notifications", label: t({ vi: "Mở Thông báo", en: "Open Notifications" }) },
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
