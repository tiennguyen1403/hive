import { describe, expect, it } from "vitest";
import { FIXTURE_CATALOG as C } from "@/data/fixture-catalog";
import { SIZES } from "@/data/types";
import { fitLabel } from "./catalog-query";
import { clockDayLabel } from "./datetime";
import { feedDelivery } from "./feed-checkout";
import {
  HELP_GROUP_IDS,
  answerText,
  helpGroups,
  helpNext,
  helpSearch,
  helpWords,
  markPieces,
  type HelpGroup,
  type HelpItem,
} from "./feed-help";
import { FEED_TIGHT_DASH } from "./feed-range";
import {
  GUIDE_HEIGHTS,
  PANTS_HEAD_TEXT,
  TOP_HEAD_TEXT,
  guideMeasure,
  heightName,
  heightNameIn,
  sizeGuide,
} from "./feed-size-guide";
import {
  ABOUT_LEAD,
  ABOUT_LEAD_TEXT,
  FOUR_RULES,
  FOUR_RULES_SCOPE,
  FOUR_RULES_SCOPE_TEXT,
  HOME_COVER,
  HOME_COVER_LEAD_TEXT,
  aboutLead,
  fourRules,
  fourRulesScope,
  issueLabel,
} from "./lexicon";
import { vnd } from "./money";
import { TRANSFER_HOLD_HOURS } from "./orders";
import { PHOTO_REASONS, RETURN_REASONS, SHOP_FAULT, returnReasonLabel } from "./returns";
import {
  COD_SURCHARGE_VND,
  EXPRESS_FEE_VND,
  FREE_SHIPPING_FROM_VND,
  RETURN_WINDOW_DAYS,
  STANDARD_FEE_VND,
  deliveryOption,
} from "./shipping";

/**
 * Round v6 slice E3b: the help pages in English — Hỏi đáp's answers, Bảng
 * size's charts, Giới thiệu's sentence and rules. The Vietnamese is pinned by
 * the old tests (`feed-help.test.ts`, `feed-size-guide.test.ts`,
 * `lexicon.test.ts`, `returns.test.ts`), which this slice did not touch.
 */

/** The fixture's own moment: Số 05 selling, Số 06 announced for 20:00 02/10. */
const OPEN = new Date("2026-09-20T18:50:00+07:00");
const NBSP = " ";
const VI_LETTER = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

const next = helpNext(C, OPEN);
const vi = helpGroups(next);
const en = helpGroups(next, "en");

const items = (groups: readonly HelpGroup[]) => groups.flatMap((g) => g.items);
const byId = (id: string): HelpItem => {
  const it = items(en).find((x) => x.id === id);
  if (!it) throw new Error(`no answer ${id}`);
  return it;
};
const answer = (id: string) => answerText(byId(id).a);
const bold = (id: string) => byId(id).a.flatMap((bit) => (typeof bit === "string" ? [] : [bit.b]));
/** Every word an English page prints from the groups: titles, questions, answers, link labels. */
const everyString = (groups: readonly HelpGroup[]) =>
  groups.flatMap((g) => [g.title, ...g.items.flatMap((it) => [it.q, answerText(it.a), it.go?.label ?? ""])]).filter(Boolean);

describe("Hỏi đáp in English: the same page, other words", () => {
  it("keeps the groups, their anchors, the answers' ids and every link's address", () => {
    expect(en.map((g) => g.id)).toEqual([...HELP_GROUP_IDS]);
    expect(en.map((g) => g.items.map((it) => it.id))).toEqual(vi.map((g) => g.items.map((it) => it.id)));
    expect(items(en).map((it) => it.go?.href)).toEqual(items(vi).map((it) => it.go?.href));
    expect(helpGroups(null, "en")[0]!.items[1]!.go?.href).toBe(helpGroups(null)[0]!.items[1]!.go?.href);
  });

  it("names the groups by the glossary", () => {
    expect(en.map((g) => g.title)).toEqual(["Ordering", "Payment", "Delivery", "Returns", "Sizing", "Account"]);
  });

  it("asks the questions in English, in the same order", () => {
    expect(items(en).map((it) => it.q)).toEqual([
      "Do I need an account to buy?",
      "When is the next drop?",
      "Will a sold-out size come back?",
      "How do I cancel an order?",
      "Where do I use a discount code?",
      "How can I pay?",
      "How does bank transfer work?",
      "Does COD cost extra?",
      "Can I pay by card yet?",
      "Where do you deliver?",
      "How much is delivery?",
      "How long does delivery take?",
      "Where can I track my order?",
      "How long do I have for a return?",
      "How do I request a return?",
      "Who pays to send it back?",
      "How do refunds work?",
      "Can I exchange for another size?",
      "Which reasons qualify for a return?",
      "How do I choose a size?",
      "Are there men's and women's sizes?",
      "Where do I save my size?",
      "What do I sign in with?",
      "What if I forget my password?",
      "Where do I change my email?",
      "How are drop reminders sent?",
    ]);
  });

  it("labels the links with the names the English screens already use", () => {
    expect(items(en).flatMap((it) => (it.go ? [[it.go.href, it.go.label]] : []))).toEqual([
      ["/#sap-mo", "View Coming soon"],
      ["/products?line=fixed", "View Basics"],
      ["/track", "Track an order"],
      ["/size-guide", "View Size guide"],
      ["/account/profile#size", "Open My sizes"],
      ["/account/notifications", "Open Notifications"],
    ]);
    const none = helpGroups(null, "en")[0]!.items[1]!;
    expect(answerText(none.a)).toBe("No new drop yet.");
    expect(none.go?.label).toBe("Turn on new drop alerts");
  });

  it("leaves no Vietnamese and no dash of the kind the shop's English does not use", () => {
    for (const s of [...everyString(en), ...everyString(helpGroups(null, "en"))]) {
      expect(s, s).not.toMatch(VI_LETTER);
      expect(s, s).not.toMatch(/[—–]/);
    }
  });
});

describe("Hỏi đáp in English: every figure is the app's own", () => {
  it("prices delivery from lib/shipping, written the English way, the three figures bold", () => {
    expect(answer("q-giao-hang-1")).toBe(
      `${feedDelivery("STANDARD", "en").title} ${vnd(STANDARD_FEE_VND, "en")}, free on orders from ` +
        `${vnd(FREE_SHIPPING_FROM_VND, "en")}. Express ${vnd(EXPRESS_FEE_VND, "en")}.`,
    );
    expect(answer("q-giao-hang-1")).toBe("Standard delivery 30,000₫, free on orders from 1,000,000₫. Express 45,000₫.");
    expect(bold("q-giao-hang-1")).toEqual([vnd(STANDARD_FEE_VND, "en"), vnd(FREE_SHIPPING_FROM_VND, "en"), vnd(EXPRESS_FEE_VND, "en")]);
  });

  it("counts the days from the services", () => {
    const [from, to] = deliveryOption("STANDARD").leadDays;
    expect(answer("q-giao-hang-2")).toBe(
      `Standard delivery ${from} to ${to} days, express within ${feedDelivery("EXPRESS", "en").days}.`,
    );
    expect(answer("q-giao-hang-2")).toBe("Standard delivery 2 to 4 days, express within 24 hours.");
    expect(answer("q-giao-hang-0")).toBe(
      "Standard delivery to every province and city. Express only in central HCMC, during office hours.",
    );
  });

  it("names the ways to pay as the English checkout does, and the transfer's hold and the COD fee", () => {
    // The card's name for Stripe's test mode since slice B18 (QĐ-46).
    expect(answer("q-thanh-toan-0")).toBe(`Bank transfer, cash on delivery${NBSP}(COD), card (Visa, Mastercard).`);
    expect(answer("q-thanh-toan-1")).toBe(
      `Reserved for ${TRANSFER_HOLD_HOURS} hours after you order. The transfer reference is on the confirmation ` +
        "screen. Account number and bank name coming soon.",
    );
    expect(answer("q-thanh-toan-2")).toBe(
      `Yes, an extra ${vnd(COD_SURCHARGE_VND, "en")}. The shop calls to confirm before delivery. Check before you pay.`,
    );
    expect(bold("q-thanh-toan-2")).toEqual(["15,000₫"]);
  });

  it("states the return rules from lib/returns and lib/shipping", () => {
    expect(answer("q-doi-tra-0")).toBe(`Within ${RETURN_WINDOW_DAYS} days of delivery. Unworn, with tags on.`);
    expect(bold("q-doi-tra-0")).toEqual(["7 days"]);
    expect(answer("q-doi-tra-2")).toBe("The shop does.");
    const quoted = (r: (typeof RETURN_REASONS)[number]) => `“${returnReasonLabel(r, "en")}”`;
    expect(answer("q-doi-tra-3")).toBe(
      "By bank transfer to your account, for exactly what you paid for the returned items: their price minus any " +
        `discount code. If a whole order is returned for ${SHOP_FAULT.slice(0, -1).map(quoted).join(", ")} or ` +
        `${quoted(SHOP_FAULT[SHOP_FAULT.length - 1]!)}, the delivery fee and the COD surcharge are refunded too.`,
    );
    expect(answer("q-doi-tra-5")).toBe(
      "Doesn't fit, not as pictured, sewing or print fault, wrong item sent, change of mind. " +
        "“Sewing or print fault” and “Wrong item sent” need at least one photo.",
    );
    expect(PHOTO_REASONS.every((r) => answer("q-doi-tra-5").includes(`“${returnReasonLabel(r, "en")}”`))).toBe(true);
  });

  it("reads the size range and the fits from the catalogue's own lists", () => {
    expect(answer("q-size-1")).toBe(`No. One size range, ${SIZES[0]} to ${SIZES[SIZES.length - 1]}, for everyone.`);
    expect(answer("q-size-0")).toBe(
      `Measurements for tops by fit (${fitLabel("OVERSIZE", "en").toLowerCase()}, ${fitLabel("REGULAR", "en").toLowerCase()}), ` +
        "trousers and shorts are all in the Size guide.",
    );
  });

  it("says when the next drop opens, the English way, bold", () => {
    expect(next).toEqual({ no: 6, opensAt: "2026-10-02T20:00:00+07:00" });
    expect(answer("q-dat-hang-1")).toBe(`${issueLabel(6, "en")} opens at ${clockDayLabel(next!.opensAt, "en")}.`);
    expect(answer("q-dat-hang-1")).toBe(`Drop 06 opens at 20:00, Friday 2${NBSP}Oct.`);
    expect(bold("q-dat-hang-1")).toEqual(["Drop 06", `20:00, Friday 2${NBSP}Oct`]);
  });

  it("prints no number the rules did not give: every figure in the English is one of theirs", () => {
    const NUMBER = /\d+(?:[.,:]\d+)*/g;
    const tokens = (s: string) => s.match(NUMBER) ?? [];
    const [from, to] = deliveryOption("STANDARD").leadDays;
    const allowed = new Set(
      [
        vnd(STANDARD_FEE_VND, "en"),
        vnd(EXPRESS_FEE_VND, "en"),
        vnd(FREE_SHIPPING_FROM_VND, "en"),
        vnd(COD_SURCHARGE_VND, "en"),
        String(TRANSFER_HOLD_HOURS),
        String(RETURN_WINDOW_DAYS),
        String(from),
        String(to),
        feedDelivery("EXPRESS", "en").days,
        issueLabel(next!.no, "en"),
        clockDayLabel(next!.opensAt, "en"),
      ].flatMap(tokens),
    );
    const found = everyString(en).flatMap(tokens);
    expect(found.length).toBeGreaterThan(10);
    for (const n of found) expect(allowed, n).toContain(n);
  });

  it("prints the same figures as the Vietnamese, answer for answer, the date aside", () => {
    const figures = (s: string) =>
      (s.match(/\d+(?:[.,]\d{3})*/g) ?? []).map((n) => Number(n.replace(/[.,]/g, ""))).sort((a, b) => a - b);
    for (const [i, it] of items(en).entries()) {
      if (it.id === "q-dat-hang-1") continue; // "20:00 thứ Sáu 02/10" and "20:00, Friday 2 Oct" write the day differently
      expect(figures(answerText(it.a)), it.id).toEqual(figures(answerText(items(vi)[i]!.a)));
    }
  });
});

describe("Hỏi đáp in English: the search runs over the English words", () => {
  const found = (q: string) => helpSearch(en, helpWords(q)).map((g) => [g.id, g.items.map((it) => it.id)] as const);

  it("finds for ?q=cod what holds the letters, as the mock's search does: in English “code” holds them too", () => {
    expect(found("cod")).toEqual([
      ["dat-hang", ["q-dat-hang-3", "q-dat-hang-4"]],
      ["thanh-toan", ["q-thanh-toan-0", "q-thanh-toan-2"]],
      ["giao-hang", ["q-giao-hang-3"]],
      ["doi-tra", ["q-doi-tra-3"]],
    ]);
    // The four the Vietnamese finds are among them.
    const viFound = helpSearch(vi, helpWords("cod")).flatMap((g) => g.items.map((it) => it.id));
    const enFound = found("cod").flatMap(([, ids]) => ids);
    for (const id of viFound) expect(enFound).toContain(id);
  });

  it("needs every word, and marks them where they stand", () => {
    expect(found("refund")).toEqual([["doi-tra", ["q-doi-tra-3"]]]);
    expect(found("track order")).toEqual([["giao-hang", ["q-giao-hang-3"]]]);
    expect(markPieces("How do refunds work?", helpWords("REFUND"))).toEqual([
      { text: "How do ", hit: false },
      { text: "refund", hit: true },
      { text: "s work?", hit: false },
    ]);
  });
});

describe("Bảng size in English", () => {
  const open = sizeGuide(C, OPEN, "en");

  it("names the charts and their columns as the product page's sheet does (slice E1)", () => {
    expect(open.tops.map((c) => [c.id, c.title, c.caption])).toEqual([
      ["OVERSIZE", "Oversized tops", "Oversized tops, simulated measurements, cm"],
      ["REGULAR", "Regular tops", "Regular tops, simulated measurements, cm"],
    ]);
    expect(open.pants.map((c) => [c.id, c.title])).toEqual([
      ["long", "Trousers"],
      ["short", "Shorts"],
    ]);
    expect(open.tops[0]!.head).toEqual(["Chest", "Length", "Shoulder", "Height"]);
    expect(open.pants[0]!.head).toEqual(["Waist", "Hip", "Length", "Thigh", "Height"]);
    expect(TOP_HEAD_TEXT.vi).toEqual(sizeGuide(C, OPEN).tops[0]!.head);
    expect(PANTS_HEAD_TEXT.vi).toEqual(sizeGuide(C, OPEN).pants[0]!.head);
  });

  it("writes a half centimetre with a point and the wearer's height in centimetres, held tight", () => {
    expect(open.tops[0]!.rows[0]!.cells).toEqual(["54", "68", "50", `155${FEED_TIGHT_DASH}165`]);
    expect(open.pants[0]!.rows.map((r) => r.cells[3])).toEqual(["30", "31.5", "33", "34.5"]);
    expect(open.pants[1]!.rows[1]!.cells).toEqual(["74", "102", "48", "33.5", `163${FEED_TIGHT_DASH}172`]);
    // The figures are the Vietnamese chart's, only written differently.
    const viGuide = sizeGuide(C, OPEN);
    for (const [k, chart] of [...open.tops, ...open.pants].entries()) {
      const viChart = [...viGuide.tops, ...viGuide.pants][k]!;
      expect(chart.rows.map((r) => r.cells.slice(0, -1))).toEqual(
        viChart.rows.map((r) => r.cells.slice(0, -1).map((c) => c.replace(",", "."))),
      );
    }
  });

  it("lists the styles on sale by their English names where they have one, and marks the Vietnamese ones", () => {
    expect(open.tops.map((c) => c.names.join(", "))).toEqual([
      "KHÓI, BỤI, NGUỘI, SƯƠNG, THAN, CÁT, PLAIN HOODIE, NYLON JACKET",
      "NẮNG, GIÓ, PLAIN TEE, LONG-SLEEVE TEE, PUFFER GILET, OXFORD SHIRT",
    ]);
    expect(open.pants.map((c) => c.names.join(", "))).toEqual(["ĐÁ, CHINOS", "FLEECE SHORTS"]);
    // An issue's style keeps its Vietnamese name (THAN too, though it has no accent); a Basics style has an English one.
    expect([...open.tops, ...open.pants].map((c) => c.nameLangs)).toEqual([
      ["vi", "vi", "vi", "vi", "vi", "vi", undefined, undefined],
      ["vi", "vi", undefined, undefined, undefined, undefined],
      ["vi", undefined],
      [undefined],
    ]);
    for (const c of [...open.tops, ...open.pants]) {
      c.names.forEach((name, i) => {
        if (VI_LETTER.test(name)) expect(c.nameLangs?.[i], name).toBe("vi");
      });
    }
    // A Vietnamese page carries no marks: its <html lang> says it already.
    expect(sizeGuide(C, OPEN).tops.every((c) => c.nameLangs === undefined)).toBe(true);
  });

  it("names the heights in centimetres, the unit held to the number", () => {
    expect(GUIDE_HEIGHTS.map((h) => heightNameIn(h, "en"))).toEqual(
      ["155", "160", "165", "170", "175", "180", "185"].map((n) => `${n}${NBSP}cm`),
    );
    expect(GUIDE_HEIGHTS.map((h) => heightNameIn(h, "vi"))).toEqual(GUIDE_HEIGHTS.map(heightName));
  });

  it("says how to measure with the names the columns carry", () => {
    expect(guideMeasure("tops", "en")).toBe(
      `Lay a top that fits you flat, measure across the chest, then compare with the ${TOP_HEAD_TEXT.en[0]} column.`,
    );
    expect(guideMeasure("pants", "en")).toContain(`the ${PANTS_HEAD_TEXT.en[0]} column`);
    expect(guideMeasure("pants", "en")).toContain(`the ${PANTS_HEAD_TEXT.en[2]} column`);
    expect(guideMeasure("tops")).toBe("Trải phẳng một chiếc áo đang mặc vừa, đo ngang ngực rồi so với cột Ngang ngực.");
    expect(guideMeasure("pants")).toBe(
      "Trải phẳng một chiếc quần đang mặc vừa: đo ngang cạp rồi nhân đôi để so với cột Vòng eo, đo từ cạp tới gấu để so " +
        "với cột Dài quần.",
    );
  });

  it("leaves no Vietnamese in a chart's words", () => {
    for (const c of [...open.tops, ...open.pants]) {
      for (const s of [c.title, c.caption, ...c.head, ...c.rows.flatMap((r) => r.cells)]) expect(s, s).not.toMatch(VI_LETTER);
    }
  });
});

describe("Giới thiệu in English: the shop's own sentences", () => {
  it("keeps the Vietnamese exactly as the old tests pin it", () => {
    expect(ABOUT_LEAD_TEXT.vi).toBe(ABOUT_LEAD);
    expect(aboutLead()).toBe(ABOUT_LEAD);
    expect(FOUR_RULES_SCOPE_TEXT.vi).toBe(FOUR_RULES_SCOPE);
    expect(fourRulesScope()).toBe(FOUR_RULES_SCOPE);
    expect(fourRules()).toEqual(FOUR_RULES);
    expect(HOME_COVER_LEAD_TEXT.vi).toBe(HOME_COVER.lead);
  });

  it("says them in English, a drop in lower case, rule for rule", () => {
    expect(aboutLead("en")).toBe(
      "HIVE sells unisex streetwear in drops: each drop opens on time, each style in a drop is cut exactly once, " +
        "and when it's gone, it's gone.",
    );
    expect(fourRulesScope("en")).toBe("applies to every drop");
    expect(fourRules("en")).toEqual([
      { title: "Cut exactly once", body: "Each style is cut from fabric already ordered. Nothing more is made mid-drop." },
      {
        title: "Fixed opening and closing times",
        body: "Opens on a schedule announced in advance. Closes when stock or time runs out.",
      },
      { title: "Stock counts are real", body: "How many are left shows right on the grid, without tapping in to find out." },
      { title: "One size range for everyone", body: "No men's or women's sizes. Choose by fit and measurements." },
    ]);
    for (const s of [aboutLead("en"), fourRulesScope("en"), ...fourRules("en").flatMap((r) => [r.title, r.body]), HOME_COVER_LEAD_TEXT.en]) {
      expect(s, s).not.toMatch(VI_LETTER);
      expect(s, s).not.toMatch(/[—–]/);
    }
  });
});

describe("the return reasons in English", () => {
  it("has a label for every reason, and the Vietnamese is the reason itself", () => {
    expect(RETURN_REASONS.map((r) => returnReasonLabel(r, "en"))).toEqual([
      "Doesn't fit",
      "Not as pictured",
      "Sewing or print fault",
      "Wrong item sent",
      "Change of mind",
    ]);
    expect(RETURN_REASONS.map((r) => returnReasonLabel(r))).toEqual([...RETURN_REASONS]);
  });
});
