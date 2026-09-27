import { describe, expect, it } from "vitest";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";
import type { Drop } from "@/data/types";
import { buildCatalog, type Catalog } from "./catalog";
import {
  FOOT_HELP,
  LEAD_DAYS,
  STORY_COVER,
  countdownText,
  coverLines,
  dateParts,
  fixedLead,
  footDelivery,
  footPayments,
  homeMoment,
  issueFacts,
  lineIssue,
  storyPicture,
} from "./feed-home";
import { FEED_DASH, FEED_TIGHT_DASH } from "./feed-range";

const C = FIXTURE_CATALOG;
const at = (iso: string) => new Date(iso);
const nos = (ds: { no: number }[]) => ds.map((d) => d.no);

/** The same catalogue with only the issues `keep` lets through (and their teasers). */
function catalogOf(c: Catalog, keep: (d: Drop) => boolean): Catalog {
  const drops = c.drops.filter(keep);
  return buildCatalog({
    products: [...c.products],
    drops,
    teasers: c.teasers.filter((t) => drops.some((d) => d.no === t.dropNo)),
    promotions: [...c.promotions],
  });
}

/**
 * The fixture's calendar: Số 03 and 04 long shut, Số 05 11/09 → 25/09 20:00,
 * Số 06 announced for 02/10 20:00. The mock's four moments are the same
 * calendar read at four instants, with Số 06 taken off for the two gaps
 * (nothing announced).
 */
describe("the moment the home page is in", () => {
  it("is open while an issue sells, with the next one and every closed issue", () => {
    const m = homeMoment(C, at("2026-09-21T19:02:00+07:00"));
    expect(m.kind).toBe("open");
    if (m.kind !== "open") return;
    expect(m.issue.no).toBe(5);
    expect(m.next?.no).toBe(6);
    expect(nos(m.closed)).toEqual([4, 3]);
    expect(lineIssue(m)?.no).toBe(5);
  });

  it("is upcoming once the issue has shut and the next is announced", () => {
    const m = homeMoment(C, at("2026-09-30T19:02:00+07:00"));
    expect(m.kind).toBe("upcoming");
    if (m.kind !== "upcoming") return;
    expect(m.next.no).toBe(6);
    expect(m.last?.no).toBe(5);
    expect(nos(m.closed)).toEqual([4, 3]);
    expect(lineIssue(m)?.no).toBe(5);
  });

  const gap = catalogOf(C, (d) => d.no !== 6);

  it("recaps the issue that just shut for LEAD_DAYS when nothing is announced", () => {
    expect(LEAD_DAYS).toBe(7);
    const m = homeMoment(gap, at("2026-09-28T19:02:00+07:00"));
    expect(m.kind).toBe("recap");
    if (m.kind !== "recap") return;
    expect(m.last.no).toBe(5);
    expect(nos(m.closed)).toEqual([4, 3]);
    // Still a recap a minute before the seventh day ends, quiet on it.
    expect(homeMoment(gap, at("2026-10-02T19:59:00+07:00")).kind).toBe("recap");
    expect(homeMoment(gap, at("2026-10-02T20:00:00+07:00")).kind).toBe("quiet");
  });

  it("is quiet after that: every closed issue, the last first", () => {
    const m = homeMoment(gap, at("2026-10-05T19:02:00+07:00"));
    expect(m.kind).toBe("quiet");
    if (m.kind !== "quiet") return;
    expect(nos(m.closed)).toEqual([5, 4, 3]);
    expect(lineIssue(m)?.no).toBe(5);
  });

  it("is quiet, with nothing to list, in a shop that has never had an issue", () => {
    const empty = buildCatalog({ products: [...C.products], drops: [], teasers: [], promotions: [] });
    expect(homeMoment(empty, at("2026-09-21T19:02:00+07:00"))).toEqual({ kind: "quiet", closed: [] });
  });
});

describe("the story", () => {
  it("sets the cover line on two lines, the last sentence alone", () => {
    expect(coverLines("Cắt 1 lần. Không tái bản.")).toEqual(["Cắt 1 lần.", "Không tái bản."]);
    expect(coverLines("Một. Hai. Ba.")).toEqual(["Một. Hai.", "Ba."]);
    expect(coverLines("Một câu.")).toEqual(["Một câu."]);
  });

  it("wears NGUỘI's black lookbook frame for Số 05, as the mock does", () => {
    expect(STORY_COVER[5]).toBe("shot-nguoi-black");
    const s = storyPicture(C, 5);
    expect(s?.product.name).toBe("NGUỘI");
    expect(s?.color).toBe("black");
    expect(s?.look).toBe(true);
  });

  it("falls back to the first style with a lookbook frame, then to the first style", () => {
    const withoutNguoi = buildCatalog({
      products: C.products.filter((p) => p.name !== "NGUỘI"),
      drops: [...C.drops],
      teasers: [...C.teasers],
      promotions: [...C.promotions],
    });
    expect(storyPicture(withoutNguoi, 5)?.product.name).toBe("KHÓI");
    // Số 04's styles wear borrowed frames: no lookbook, the first style's photo.
    const four = storyPicture(C, 4);
    expect(four?.product.name).toBe("RÊU");
    expect(four?.look).toBe(false);
    expect(storyPicture(C, 9)).toBeUndefined();
  });

  it("leads the quiet moment with the first fixed style, in black when it has black left", () => {
    const lead = fixedLead(C);
    expect(lead?.product.name).toBe("ÁO THUN TRƠN");
    expect(lead?.color).toBe("black");
  });
});

describe("the clock", () => {
  it("splits an instant into the date block's parts", () => {
    expect(dateParts("2026-10-02T20:00:00+07:00")).toEqual({ dd: "02", mm: "10", dow: "thứ Sáu", time: "20:00" });
  });

  it("counts down as the mock prints it, days only while there are any", () => {
    const close = "2026-09-25T20:00:00+07:00";
    expect(countdownText(close, Date.parse("2026-09-21T19:02:03+07:00"))).toBe("4 ngày 00:57:57");
    expect(countdownText(close, Date.parse("2026-09-25T19:00:00+07:00"))).toBe("01:00:00");
    expect(countdownText(close, Date.parse("2026-09-26T19:00:00+07:00"))).toBe("00:00:00");
  });
});

describe("an issue's figures", () => {
  it("counts what the mock prints for Số 05 and Số 04", () => {
    const five = issueFacts(C, C.dropByNo.get(5)!);
    // The run is a Feed range: the mock's hyphen, held by no-break spaces and a word joiner (`lib/feed-range.ts`).
    expect(five).toMatchObject({ styles: 10, cut: 181, left: 73, sold: 108, run: `11/09${FEED_DASH}25/09` });
    expect(five.names).toBe("KHÓI, BỤI, NGUỘI, NẮNG, SƯƠNG, MUỐI, THAN, CÁT, GIÓ, ĐÁ");
    const four = issueFacts(C, C.dropByNo.get(4)!);
    expect(four).toMatchObject({ styles: 6, cut: 200, sold: 200, run: `05/06${FEED_DASH}19/06` });
    expect(four.names).toBe("RÊU, TRO, SÓNG, VỎ, MƯA, KHÔ");
  });
});

describe("the footer", () => {
  it("prints delivery from lib/shipping in the mock's words", () => {
    expect(footDelivery()).toEqual([
      { label: `Giao tiêu chuẩn, 2${FEED_TIGHT_DASH}4 ngày`, value: "30.000₫" },
      { label: "Giao nhanh nội thành TP.HCM, 24 giờ", value: "45.000₫" },
      { label: "Miễn phí giao từ", value: "1.000.000₫" },
    ]);
  });

  it("lists the three ways to pay, COD with its surcharge", () => {
    expect(footPayments()).toEqual([
      { label: "Chuyển khoản", value: "" },
      { label: "Thẻ", value: "" },
      { label: "COD", value: "+15.000₫" },
    ]);
  });

  it("links only the help pages that exist: no Bảng size until its route does", () => {
    expect(FOOT_HELP.map((h) => h.label)).toEqual(["Hỏi đáp", "Đổi trả 7 ngày", "Tra cứu đơn", "Liên hệ"]);
    expect(FOOT_HELP.map((h) => h.href)).toEqual(["/faq", "/returns", "/track", "/contact"]);
  });
});
