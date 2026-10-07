import { describe, expect, it } from "vitest";
import { COLOR_LABEL_TEXT, COLORS, colorLabel } from "@/data/colors";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";
import {
  COLOR_KEYS,
  FAMILIES,
  FAMILY_LABELS,
  FAMILY_SHORT_LABELS,
  familyLabel,
  familyShortLabel,
  productId,
  type Product,
} from "@/data/types";
import { FIT_LABELS, fitLabel } from "./catalog-query";
import { clockDayLabel, dayAndMonth } from "./datetime";
import {
  SHOP_SORT_LABELS,
  SHOP_SORTS,
  lineLabel,
  lineOfStyle,
  pictureAlt,
  sizeOption,
  sizeRowLabel,
  sortLabel,
  stockFacts,
  swatchNote,
} from "./feed";
import { TEASER_NOTE, TEASER_NOTE_TEXT, countdownText, dateParts, issueFacts } from "./feed-home";
import { ARCHIVE_TITLE } from "./feed-issue";
import { buyLabel, buyState, shipRows, specRows, styleLine } from "./feed-product";
import { FEED_DASH, FEED_TIGHT_DASH, feedDayRange } from "./feed-range";
import { SEARCH_SUGGEST, SEARCH_SUGGEST_EN, searchPool, searchRail, searchStyles, suggestTerms } from "./feed-search";
import { kindInSentence } from "./lexicon";
import { keepFailureMessage, type KeepFailure, type KeepTopic } from "./my-state";
import { chartNumber, heightRange } from "./pants-chart";
import { nameLang, productText } from "./product-text";
import { SITE_DESCRIPTION, SITE_DESCRIPTION_TEXT } from "./site";

/**
 * Round v6 slice E1 (QĐ-40): the English of what the home page, the shop, a
 * style's page, the search and the drops' pages print, in the words of the
 * user's glossary (`tasks/plan.md`, "Thuật ngữ tiếng Anh"). The Vietnamese
 * side is pinned by each function's own test, untouched; these also check that
 * asking for Vietnamese by name gives the same as asking for nothing.
 */

const C = FIXTURE_CATALOG;
const NBSP = " ";
const style = (stem: string): Product => {
  const p = C.byId.get(productId(`p-${stem}`));
  if (!p) throw new Error(`no fixture style ${stem}`);
  return p;
};
/** The fixture's calendar: Số 05 sells 11/09 20:00 → 25/09 20:00, Số 06 opens 02/10 20:00. */
const OPEN = new Date("2026-09-21T19:02:00+07:00");
const AFTER = new Date("2026-09-28T19:02:00+07:00");
const names = (ps: readonly Product[]) => ps.map((p) => productText(p, "en").name);

describe("the colours in English", () => {
  it("are the glossary's seven", () => {
    expect(COLOR_KEYS.map((k) => colorLabel(k, "en"))).toEqual(["Black", "Cream", "Grey", "Moss", "Brown", "White", "Navy"]);
  });

  it("keep COLORS the Vietnamese side", () => {
    for (const k of COLOR_KEYS) {
      expect(COLORS[k].label).toBe(COLOR_LABEL_TEXT[k].vi);
      expect(colorLabel(k, "vi")).toBe(colorLabel(k));
      expect(colorLabel(k)).toBe(COLORS[k].label);
    }
  });
});

describe("the families and the fits in English", () => {
  it("name the six families as the glossary does, long and short alike", () => {
    expect(FAMILIES.map((f) => familyLabel(f, "en"))).toEqual(["Tees", "Hoodies", "Jackets", "Gilets", "Shirts", "Bottoms"]);
    expect(FAMILIES.map((f) => familyShortLabel(f, "en"))).toEqual(FAMILIES.map((f) => familyLabel(f, "en")));
  });

  it("keep the two Vietnamese tables as they were", () => {
    for (const f of FAMILIES) {
      expect(familyLabel(f, "vi")).toBe(FAMILY_LABELS[f]);
      expect(familyShortLabel(f)).toBe(FAMILY_SHORT_LABELS[f]);
    }
  });

  it("call the fits Oversized and Regular", () => {
    expect(fitLabel("OVERSIZE", "en")).toBe("Oversized");
    expect(fitLabel("REGULAR", "en")).toBe("Regular");
    expect(fitLabel("OVERSIZE", "vi")).toBe(FIT_LABELS.OVERSIZE);
    expect(FIT_LABELS).toEqual({ OVERSIZE: "Oversize", REGULAR: "Regular" });
  });
});

describe("dates and ranges in English", () => {
  it("writes the instant a drop announces with the clock first", () => {
    expect(clockDayLabel("2026-09-25T20:00:00+07:00", "en")).toBe(`20:00, Friday 25${NBSP}Sep`);
    expect(clockDayLabel("2026-10-02T20:00:00+07:00", "en")).toBe(`20:00, Friday 2${NBSP}Oct`);
    expect(clockDayLabel("2026-10-02T20:00:00+07:00", "vi")).toBe(clockDayLabel("2026-10-02T20:00:00+07:00"));
    expect(clockDayLabel("", "en")).toBe("");
  });

  it("sets a date block's day and month apart, read off the fields", () => {
    expect(dayAndMonth("2026-10-02T20:00:00+07:00", "en")).toEqual({ day: "2", month: "Oct" });
    expect(dayAndMonth("2026-10-02T20:00:00+07:00")).toEqual({ day: "02", month: "10" });
    expect(dateParts("2026-10-02T20:00:00+07:00", "en")).toEqual({ dd: "2", mm: "Oct", dow: "Friday", time: "20:00" });
    expect(dateParts("2026-10-02T20:00:00+07:00", "vi")).toEqual(dateParts("2026-10-02T20:00:00+07:00"));
  });

  it("writes a run of days the English way, never broken", () => {
    expect(feedDayRange("2026-09-11T20:00:00+07:00", "2026-09-25T20:00:00+07:00", "en")).toBe(
      `11${NBSP}Sep${FEED_DASH}25${NBSP}Sep`,
    );
  });

  it("counts down in days, one or several", () => {
    const close = "2026-09-25T20:00:00+07:00";
    expect(countdownText(close, Date.parse("2026-09-21T19:02:03+07:00"), "en")).toBe("4 days 00:57:57");
    expect(countdownText(close, Date.parse("2026-09-24T19:00:00+07:00"), "en")).toBe("1 day 01:00:00");
    expect(countdownText(close, Date.parse("2026-09-25T19:00:00+07:00"), "en")).toBe("01:00:00");
    expect(countdownText(close, Date.parse("2026-09-21T19:02:03+07:00"), "vi")).toBe("4 ngày 00:57:57");
  });

  it("lowers a kind's first letter by the English rules", () => {
    expect(kindInSentence("Oversized tee", "en")).toBe("oversized tee");
    expect(kindInSentence("Áo thun", "vi")).toBe(kindInSentence("Áo thun"));
  });
});

describe("a style's name and its language", () => {
  it("is marked Vietnamese on an English page when the name printed is the Vietnamese one", () => {
    expect(nameLang(style("khoi"), "en")).toBe("vi");
    expect(nameLang(style("ao-thun-tron"), "en")).toBeUndefined();
    const soi = C.teasers.find((t) => t.slug === "s06-soi")!;
    expect(nameLang(soi, "en")).toBe("vi");
    // A fixed style the back office renamed has lost its English name: its Vietnamese one is printed, and marked.
    const renamed: Product = { ...style("ao-thun-tron"), en: { kind: "Tee" } };
    expect(nameLang(renamed, "en")).toBe("vi");
  });

  it("is never marked on a Vietnamese page", () => {
    expect(nameLang(style("khoi"), "vi")).toBeUndefined();
    expect(nameLang(style("ao-thun-tron"), "vi")).toBeUndefined();
  });
});

describe("the cards in English", () => {
  it("describe a photo in English, the drops' names kept", () => {
    expect(pictureAlt(style("nguoi"), "black", true, "en")).toBe("Model wearing NGUỘI in black");
    expect(pictureAlt(style("khoi"), "cream", false, "en")).toBe("KHÓI, oversized tee in cream");
    expect(pictureAlt(style("than"), "navy", false, "en")).toBe("THAN, bomber jacket in navy");
    expect(pictureAlt(style("ao-thun-tron"), "white", false, "en")).toBe("PLAIN TEE, tee in white");
    expect(pictureAlt(style("khoi"), "cream", false, "vi")).toBe(pictureAlt(style("khoi"), "cream", false));
  });

  it("note a size and a colour as the glossary does", () => {
    expect(sizeOption(0, 0, "en")).toEqual({ open: false, note: "Sold out" });
    expect(sizeOption(1, 1, "en")).toEqual({ open: false, note: "In your bag" });
    expect(sizeOption(1, 0, "en")).toEqual({ open: true, note: "1 left" });
    expect(sizeOption(2, 1, "en")).toEqual({ open: true, note: "2 left" });
    expect(sizeOption(9, 0, "en")).toEqual({ open: true, note: null });
    expect(sizeOption(2, 1, "vi")).toEqual(sizeOption(2, 1));
    expect(swatchNote(style("khoi"), "black", "en")).toBe("10 left");
    expect(swatchNote(style("muoi"), "grey", "en")).toBe("Sold out");
    expect(swatchNote(style("ao-thun-tron"), "white", "en")).toBeNull();
    expect(sizeRowLabel("M", "M", "en")).toBe("My size");
    expect(sizeRowLabel("L", "M", "en")).toBe("Size");
  });

  it("name the lines and the orders", () => {
    expect([lineLabel("all", "en"), lineLabel(5, "en"), lineLabel("fixed", "en")]).toEqual(["All", "Drop 05", "Basics"]);
    expect(lineOfStyle(style("khoi"), "en")).toBe("Drop 05");
    expect(lineOfStyle(style("ao-thun-tron"), "en")).toBe("Basics");
    expect(SHOP_SORTS.map((s) => sortLabel(s, "en"))).toEqual(["Newest", "Price: low to high", "Price: high to low"]);
    expect(SHOP_SORTS.map((s) => sortLabel(s))).toEqual(SHOP_SORTS.map((s) => SHOP_SORT_LABELS[s]));
  });

  it("date a closed drop's style the English way", () => {
    expect(stockFacts(C, style("khoi"), AFTER, {}, "en")).toEqual({ kind: "closed", day: `25${NBSP}Sep` });
    expect(stockFacts(C, style("khoi"), AFTER, {}, "vi")).toEqual(stockFacts(C, style("khoi"), AFTER));
  });
});

describe("a drop's figures in English", () => {
  it("writes the run the English way and marks the Vietnamese names", () => {
    const five = issueFacts(C, C.dropByNo.get(5)!, "en");
    expect(five).toMatchObject({ styles: 10, cut: 181, sold: 108, run: `11${NBSP}Sep${FEED_DASH}25${NBSP}Sep`, namesLang: "vi" });
    expect(five.names).toBe("KHÓI, BỤI, NGUỘI, NẮNG, SƯƠNG, MUỐI, THAN, CÁT, GIÓ, ĐÁ");
    expect("namesLang" in issueFacts(C, C.dropByNo.get(5)!)).toBe(false);
    expect(issueFacts(C, C.dropByNo.get(5)!, "vi")).toEqual(issueFacts(C, C.dropByNo.get(5)!));
  });

  it("says when prices are announced, and names the archive", () => {
    expect(TEASER_NOTE_TEXT).toEqual({ vi: TEASER_NOTE, en: "Price and quantity at opening." });
    expect(ARCHIVE_TITLE).toEqual({ vi: "Các Số đã đóng", en: "Closed drops" });
  });
});

describe("a style's page in English", () => {
  it("states why the button cannot buy", () => {
    expect(buyLabel(buyState(C, style("muoi"), OPEN), "en")).toBe("Sold out");
    expect(buyLabel(buyState(C, style("khoi"), AFTER), "en")).toBe("Drop 05 closed");
    const empty: Product = { ...style("gile-phao"), stock: { black: { S: 0, M: 0, L: 0, XL: 0 } } };
    expect(buyLabel(buyState(C, empty, OPEN), "en")).toBe("Out of stock");
    const early: Product = { ...style("khoi"), dropNo: 6 };
    expect(buyLabel(buyState(C, early, OPEN), "en")).toBe("Drop 06 hasn't opened yet");
    expect(buyLabel(buyState(C, style("khoi"), OPEN), "en")).toBeNull();
    expect(buyLabel(buyState(C, style("khoi"), AFTER), "vi")).toBe(buyLabel(buyState(C, style("khoi"), AFTER)));
  });

  it("lists the material, the fit and the print, the print's name Vietnamese and marked", () => {
    expect(specRows(style("bui"), "en")).toEqual([
      { label: "Material", value: "Fleece 380gsm" },
      { label: "Fit", value: "Oversized" },
      { label: "Print", value: "Bản đồ mòn", lang: "vi" },
    ]);
    expect(specRows(style("ao-thun-tron"), "en")).toEqual([
      { label: "Material", value: "Cotton 220gsm" },
      { label: "Fit", value: "Regular" },
    ]);
    expect(specRows(style("bui"), "vi")).toEqual(specRows(style("bui")));
  });

  it("prints delivery and returns with the shop's figures, the English way", () => {
    const rows = shipRows("en");
    expect(rows.map((r) => r.label)).toEqual([
      `Standard delivery, 2${FEED_TIGHT_DASH}4 days`,
      "Express delivery in HCMC, 24 hours",
      "Free delivery from",
      "COD surcharge",
      "Returns",
      "Payment",
    ]);
    expect(rows.map((r) => r.value)).toEqual(["30,000₫", "45,000₫", "1,000,000₫", "15,000₫", "7 days", "Bank transfer, Card, COD"]);
    expect(rows.filter((r) => r.href).map((r) => r.href)).toEqual(["/faq#doi-tra"]);
    expect(shipRows("vi")).toEqual(shipRows());
  });

  it("names the style's line and its rail", () => {
    expect(styleLine(C, style("khoi"), OPEN, "en")).toMatchObject({ label: "Drop 05", railTitle: "More from Drop 05" });
    expect(styleLine(C, style("ao-thun-tron"), OPEN, "en")).toMatchObject({ label: "Basics", railTitle: "More from Basics" });
    expect(styleLine(C, style("khoi"), OPEN, "vi")).toEqual(styleLine(C, style("khoi"), OPEN));
  });
});

describe("the search in English", () => {
  const pool = searchPool(C, OPEN);

  it("finds a style by its English words", () => {
    expect(names(searchStyles(pool, "hoodie", "en"))).toEqual(["BỤI", "NGUỘI", "PLAIN HOODIE"]);
    expect(names(searchStyles(pool, "bomber", "en"))).toEqual(["THAN"]);
    expect(names(searchStyles(pool, "chinos", "en"))).toEqual(["CHINOS"]);
  });

  it("finds a family by the family itself, not by a kind's words", () => {
    const hoodies = searchStyles(pool, "Hoodies", "en");
    expect(hoodies.map((p) => p.id)).toEqual(pool.filter((p) => p.family === "HOODIE").map((p) => p.id));
    const bottoms = searchStyles(pool, "Bottoms", "en");
    expect(bottoms.map((p) => p.id)).toEqual(pool.filter((p) => p.family === "PANTS").map((p) => p.id));
    expect(names(bottoms)).toEqual(expect.arrayContaining(["CHINOS", "FLEECE SHORTS"]));
    // "Bottoms" is in no English kind: only the family finds them.
    expect(bottoms.every((p) => !productText(p, "en").kind.toLowerCase().includes("bottoms"))).toBe(true);
  });

  it("still finds a drop's style by its Vietnamese name, accents aside, and a print by its name", () => {
    expect(names(searchStyles(pool, "khoi", "en"))).toEqual(["KHÓI"]);
    expect(names(searchStyles(pool, "ban do mon", "en"))).toEqual(["BỤI"]);
  });

  it("reads the fit in English", () => {
    const oversized = searchStyles(pool, "oversized", "en");
    expect(oversized.length).toBeGreaterThan(5);
    expect(oversized.every((p) => p.fit === "OVERSIZE")).toBe(true);
  });

  it("suggests five English terms, each finding something while Drop 05 sells and after", () => {
    expect(suggestTerms(pool, "en")).toEqual([...SEARCH_SUGGEST_EN]);
    expect(suggestTerms(searchPool(C, AFTER), "en")).toEqual([...SEARCH_SUGGEST_EN]);
    expect(suggestTerms(pool, "vi")).toEqual([...SEARCH_SUGGEST]);
  });

  it("leads its rail with Drop 05 while it sells, Basics after", () => {
    expect(searchRail(C, OPEN, "en").sub).toBe("Drop 05");
    expect(searchRail(C, AFTER, "en").sub).toBe("Basics");
    expect(searchRail(C, AFTER, "vi")).toEqual(searchRail(C, AFTER));
  });

  it("searches Vietnamese as before", () => {
    expect(searchStyles(pool, "quần", "vi").map((p) => p.id)).toEqual(searchStyles(pool, "quần").map((p) => p.id));
  });
});

describe("the size guide in English", () => {
  it("writes a figure with a point and a height in centimetres", () => {
    expect(chartNumber(31.5, "en")).toBe("31.5");
    expect(chartNumber(98, "en")).toBe("98");
    expect(chartNumber(31.5, "vi")).toBe(chartNumber(31.5));
    expect(heightRange(155, 165, "en")).toBe(`155${FEED_TIGHT_DASH}165`);
    expect(heightRange(155, 165, "vi")).toBe(heightRange(155, 165));
  });
});

describe("the saving toasts in English", () => {
  it("invite a signed-out shopper in, for each thing that was pressed", () => {
    expect(keepFailureMessage("SIGNED_OUT", "favorites", "en")).toBe("Sign in to save styles");
    expect(keepFailureMessage("SIGNED_OUT", "reminders", "en")).toBe("Sign in to set a reminder");
    expect(keepFailureMessage("SIGNED_OUT", "sizes", "en")).toBe("Sign in to edit your profile");
    expect(keepFailureMessage("SIGNED_OUT", "notify", "en")).toBe("Sign in to see notifications");
  });

  it("say why a write was refused, without an em dash, the Vietnamese unchanged", () => {
    expect(keepFailureMessage("INVALID", "favorites", "en")).toBe("Couldn't save. Reload the page and try again.");
    expect(keepFailureMessage("NOT_UPCOMING", "reminders", "en")).toBe("You can only set a reminder before a drop opens.");
    expect(keepFailureMessage("NOT_FOUND", "favorites", "en")).toBe("Nothing left to undo.");
    expect(keepFailureMessage("UNAVAILABLE", "favorites", "en")).toBe("Couldn't save. Try again in a few minutes.");
    const reasons: KeepFailure[] = ["SIGNED_OUT", "INVALID", "NOT_UPCOMING", "NOT_FOUND", "RATE_LIMITED", "UNAVAILABLE"];
    const topics: KeepTopic[] = ["favorites", "reminders", "sizes", "notify"];
    for (const reason of reasons) {
      for (const topic of topics) {
        const en = keepFailureMessage(reason, topic, "en");
        expect(en.length, `${reason} ${topic}`).toBeGreaterThan(0);
        expect(en, `${reason} ${topic}`).not.toMatch(/[—–]/);
        expect(keepFailureMessage(reason, topic, "vi")).toBe(keepFailureMessage(reason, topic));
      }
    }
  });
});

describe("the site's description", () => {
  it("is the same Vietnamese line, with its English beside it", () => {
    expect(SITE_DESCRIPTION_TEXT.vi).toBe(SITE_DESCRIPTION);
    expect(SITE_DESCRIPTION_TEXT.en).toBe("Unisex streetwear, sold in drops. Each drop is cut once.");
  });
});
