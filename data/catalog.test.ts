import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { CATALOG, DROPS, CURRENT_DROP_NO, TEASERS, TEASER_LEAD_HOURS } from "./catalog";
import { COLORS } from "./colors";
import { FIXTURE_CATALOG } from "./fixture-catalog";
import { COLOR_KEYS, SIZES } from "./types";
import {
  dropRevenueVnd,
  dropSummary,
  isFixed,
  isIssueStyle,
  onHand,
  soldUnits,
} from "@/lib/inventory";
import { issueCode } from "@/lib/lexicon";

/**
 * The numbers on the right-hand side of these assertions come from the
 * approved prototype (`prototype/src/mocklib.py`), read out of the running
 * module rather than retyped. They are the contract: the React build has to
 * show the same figures the mock was signed off on.
 */
const PROTOTYPE_DROP_5 = [
  // slug (since slice B5),  priceVnd,  cutUnits, onHand, sold
  ["s05-khoi", 390_000, 35, 17, 18],
  ["s05-bui", 890_000, 18, 2, 16],
  ["s05-nguoi", 1_290_000, 12, 5, 7],
  ["s05-nang", 450_000, 26, 12, 14],
  ["s05-suong", 1_450_000, 8, 3, 5],
  ["s05-muoi", 690_000, 14, 0, 14],
  ["s05-than", 1_350_000, 10, 6, 4],
  ["s05-cat", 420_000, 31, 15, 16],
  ["s05-gio", 750_000, 15, 7, 8],
  ["s05-da", 980_000, 12, 6, 6],
] as const;

/**
 * The eight fixed styles (slice B5), row for row as the approved board has
 * them — `LINE` in `prototype/v3/line/line-mock.js`, round 4 — in its order.
 * Stock is S · M · L · XL per colour, the colours in band order.
 */
const BOARD_FIXED = [
  {
    slug: "ao-thun-tron", name: "ÁO THUN TRƠN", kind: "Áo thun", family: "TEE",
    material: "Cotton 220gsm", fit: "REGULAR", priceVnd: 400_000,
    stock: { white: [10, 14, 11, 6], black: [8, 12, 9, 5], grey: [6, 9, 7, 4] },
    photoKeys: ["flat-tee-white", "flat-tee-black", "flat-tee-grey"],
  },
  {
    slug: "ao-thun-tay-dai", name: "ÁO THUN TAY DÀI", kind: "Áo thun tay dài", family: "TEE",
    material: "Cotton 220gsm", fit: "REGULAR", priceVnd: 450_000,
    stock: { black: [5, 8, 6, 3], white: [6, 7, 5, 3] },
    photoKeys: ["flat-longsleeve-black", "flat-longsleeve-white"],
  },
  {
    slug: "hoodie-tron", name: "HOODIE TRƠN", kind: "Áo hoodie", family: "HOODIE",
    material: "Nỉ bông 340gsm", fit: "OVERSIZE", priceVnd: 750_000,
    stock: { grey: [5, 0, 4, 2], black: [4, 0, 6, 3], cream: [3, 0, 2, 2] },
    photoKeys: ["flat-hoodie-grey", "flat-hoodie-black", "flat-hoodie-cream"],
  },
  {
    slug: "ao-khoac-du", name: "ÁO KHOÁC DÙ", kind: "Áo khoác dù", family: "JACKET",
    material: "Dù 1 lớp", fit: "OVERSIZE", priceVnd: 850_000,
    stock: { black: [3, 5, 4, 3], navy: [3, 4, 3, 3] },
    photoKeys: ["flat-jacket-black", "flat-jacket-navy"],
  },
  {
    slug: "gile-phao", name: "GILE PHAO", kind: "Áo gile phao", family: "VEST",
    material: "Dù chần bông", fit: "REGULAR", priceVnd: 750_000,
    stock: { black: [3, 5, 5, 2] },
    photoKeys: ["flat-vest-black"],
  },
  {
    slug: "so-mi-oxford", name: "SƠ MI OXFORD", kind: "Áo sơ mi oxford", family: "SHIRT",
    material: "Cotton oxford", fit: "REGULAR", priceVnd: 590_000,
    stock: { white: [4, 7, 6, 3], navy: [3, 5, 4, 3] },
    photoKeys: ["flat-shirt-white", "flat-shirt-navy"],
  },
  {
    slug: "quan-kaki", name: "QUẦN KAKI", kind: "Quần kaki", family: "PANTS",
    material: "Kaki 280gsm", fit: "REGULAR", priceVnd: 650_000,
    stock: { cream: [3, 5, 4, 3], black: [4, 7, 6, 3] },
    photoKeys: ["flat-trousers-cream", "flat-trousers-black"],
  },
  {
    slug: "quan-short-ni", name: "QUẦN SHORT NỈ", kind: "Quần short nỉ", family: "PANTS",
    material: "Nỉ da cá 300gsm", fit: "REGULAR", priceVnd: 450_000,
    stock: { grey: [5, 6, 5, 0], black: [6, 9, 7, 0] },
    photoKeys: ["flat-shorts-grey", "flat-shorts-black"],
  },
] as const;

/** The twenty-one ids the sample shop had before slice B5 — none may move. */
const IDS_BEFORE_B5 = [
  "p-khoi", "p-bui", "p-nguoi", "p-nang", "p-suong", "p-muoi", "p-than", "p-cat", "p-gio", "p-da",
  "p-reu", "p-tro", "p-song", "p-vo", "p-mua", "p-kho",
  "p-dat", "p-lua", "p-bao", "p-men", "p-voi",
];

describe("catalog identity", () => {
  it("gives every product a distinct id", () => {
    const ids = CATALOG.map((p) => p.id);
    expect(new Set(ids).size).toBe(CATALOG.length);
  });

  it("gives every product a distinct slug, since the slug is the URL", () => {
    const slugs = CATALOG.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(CATALOG.length);
  });

  it("keeps BÃO, MEN and VÔI apart from BỤI, NẮNG and SƯƠNG", () => {
    // The prototype reused the image keys `bui`, `nang` and `suong` for three
    // drop-3 products. Harmless while they only picked a photo; a collision
    // the moment they become ids. This is the regression guard.
    const byName = (name: string) => CATALOG.filter((p) => p.name === name);
    for (const name of ["BÃO", "MEN", "VÔI", "BỤI", "NẮNG", "SƯƠNG"]) {
      expect(byName(name), `expected exactly one ${name}`).toHaveLength(1);
    }
    const reused = ["BÃO", "BỤI", "MEN", "NẮNG", "VÔI", "SƯƠNG"].map(
      (n) => byName(n)[0]!.id,
    );
    expect(new Set(reused).size).toBe(6);
  });
});

describe("stock is size × colour", () => {
  it("carries every listed colour, with all four sizes spelled out", () => {
    for (const p of CATALOG) {
      for (const c of p.colors) {
        const perSize = p.stock[c];
        expect(perSize, `${p.slug} is missing stock for ${c}`).toBeDefined();
        for (const s of SIZES) {
          expect(
            typeof perSize![s],
            `${p.slug}/${c}/${s} must be written out, zero included`,
          ).toBe("number");
        }
      }
    }
  });

  it("carries no stock for a colour the product does not come in", () => {
    for (const p of CATALOG) {
      for (const c of COLOR_KEYS) {
        if (!p.colors.includes(c)) {
          expect(p.stock[c], `${p.slug} has stray stock for ${c}`).toBeUndefined();
        }
      }
    }
  });

  it("never holds a negative count", () => {
    for (const p of CATALOG) {
      for (const perSize of Object.values(p.stock)) {
        for (const s of SIZES) expect(perSize[s]).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("never holds more on hand than was cut", () => {
    // An issue's style. A fixed one (slice B5) has no cut to hold against.
    for (const p of CATALOG.filter(isIssueStyle)) {
      expect(onHand(p), `${p.slug} holds more than it cut`).toBeLessThanOrEqual(
        p.cutUnits,
      );
    }
  });
});

describe("addresses and ids since slice B5", () => {
  it("publishes an issue's style behind its issue's code, and a fixed style by its stem", () => {
    for (const p of CATALOG) {
      const stem = p.id.slice(2);
      expect(p.slug).toBe(p.dropNo === null ? stem : `${issueCode(p.dropNo).toLowerCase()}-${stem}`);
    }
    expect(CATALOG.find((p) => p.id === "p-khoi")!.slug).toBe("s05-khoi");
    expect(CATALOG.find((p) => p.id === "p-reu")!.slug).toBe("s04-reu");
    expect(CATALOG.find((p) => p.id === "p-voi")!.slug).toBe("s03-voi");
  });

  it("keeps every id the sample shop had, in the order it had them", () => {
    expect(CATALOG.slice(0, IDS_BEFORE_B5.length).map((p) => p.id)).toEqual(IDS_BEFORE_B5);
  });
});

describe("the eight fixed styles (slice B5)", () => {
  const fixed = CATALOG.filter(isFixed);

  it("are the board's eight, in its order, after every style the shop already had", () => {
    expect(fixed.map((p) => p.slug)).toEqual(BOARD_FIXED.map((b) => b.slug));
    expect(CATALOG.slice(-8)).toEqual(fixed);
    expect(CATALOG).toHaveLength(IDS_BEFORE_B5.length + 8);
  });

  it.each(BOARD_FIXED)("$slug: the board's name, kind, cloth, fit, price, colours, stock and photos", (b) => {
    const p = fixed.find((x) => x.slug === b.slug)!;
    expect(p.id).toBe(`p-${b.slug}`);
    expect(p.name).toBe(b.name);
    expect(p.kind).toBe(b.kind);
    expect(p.family).toBe(b.family);
    expect(p.material).toBe(b.material);
    expect(p.fit).toBe(b.fit);
    expect(p.priceVnd).toBe(b.priceVnd);
    expect(p.colors).toEqual(Object.keys(b.stock));
    for (const [color, sizes] of Object.entries(b.stock)) {
      expect(SIZES.map((s) => p.stock[color as keyof typeof p.stock]![s])).toEqual([...sizes]);
    }
    expect(p.photoKeys).toEqual([...b.photoKeys]);
  });

  it("belong to no issue and have no cut, and are never stamped sold out", () => {
    for (const p of fixed) {
      expect(p.dropNo).toBeNull();
      expect(p.cutUnits).toBeNull();
      expect("soldOutAt" in p).toBe(false);
    }
  });

  it("are the only styles without an issue, and every issue's style has a cut", () => {
    for (const p of CATALOG) expect(p.dropNo === null).toBe(p.cutUnits === null);
    expect(CATALOG.filter((p) => p.dropNo === null)).toHaveLength(8);
  });
});

describe("drop 5 matches the approved prototype", () => {
  it.each(PROTOTYPE_DROP_5)(
    "%s: price, cut, on hand and sold all line up",
    (slug, priceVnd, cutUnits, expectedOnHand, expectedSold) => {
      const p = CATALOG.filter(isIssueStyle).find((x) => x.slug === slug);
      expect(p, `no product with slug ${slug}`).toBeDefined();
      expect(p!.priceVnd).toBe(priceVnd);
      expect(p!.cutUnits).toBe(cutUnits);
      expect(onHand(p!)).toBe(expectedOnHand);
      expect(soldUnits(p!)).toBe(expectedSold);
    },
  );

  it("totals ten styles, 181 cut, 108 sold, 73 left", () => {
    expect(dropSummary(FIXTURE_CATALOG, CURRENT_DROP_NO)).toEqual({
      styles: 10,
      cutUnits: 181,
      soldUnits: 108,
      onHand: 73,
    });
  });

  it("earns 77.500.000₫, derived rather than typed in", () => {
    expect(dropRevenueVnd(FIXTURE_CATALOG, 5)).toBe(77_500_000);
  });

  it("carries the closed drops forward unchanged", () => {
    expect(dropRevenueVnd(FIXTURE_CATALOG, 4)).toBe(171_600_000);
    expect(dropRevenueVnd(FIXTURE_CATALOG, 3)).toBe(133_020_000);
  });
});

describe("photos", () => {
  it("needs one photo set per colour — 21 for the open drop", () => {
    const open = CATALOG.filter((p) => p.dropNo === CURRENT_DROP_NO);
    const sets = open.reduce((n, p) => n + p.colors.length, 0);
    expect(sets).toBe(21);
  });

  it("hands every colour a photo", () => {
    for (const p of CATALOG) {
      expect(p.photoKeys, `${p.slug} photo count`).toHaveLength(p.colors.length);
    }
  });

  it("gives every colour of Số 05 its own packshot, shot-<style>-<colour>, in band order (v3 slice 14)", () => {
    for (const p of CATALOG.filter((x) => x.dropNo === CURRENT_DROP_NO)) {
      const stem = p.id.slice("p-".length);
      expect(p.photoKeys, p.slug).toEqual(p.colors.map((c) => `shot-${stem}-${c}`));
    }
    expect(CATALOG.find((p) => p.id === "p-khoi")!.photoKeys).toEqual(["shot-khoi-black", "shot-khoi-cream"]);
  });
});

describe("colour vocabulary", () => {
  it("describes every key the catalog uses", () => {
    const used = new Set(CATALOG.flatMap((p) => p.colors));
    for (const key of used) {
      expect(COLORS[key], `no colour defined for ${key}`).toBeDefined();
      expect(COLORS[key].hex).toMatch(/^#[0-9A-F]{6}$/i);
      expect(COLORS[key].label.length).toBeGreaterThan(0);
    }
  });
});

describe("drops", () => {
  it("closes every drop after it opens", () => {
    for (const d of DROPS) {
      expect(Date.parse(d.closesAt)).toBeGreaterThan(Date.parse(d.opensAt));
    }
  });

  it("has a record for every drop the catalog references", () => {
    // A fixed style (slice B5) references none.
    const referenced = new Set(CATALOG.filter(isIssueStyle).map((p) => p.dropNo));
    for (const no of referenced) {
      expect(DROPS.find((d) => d.no === no), `no drop ${no}`).toBeDefined();
    }
  });
});

describe("the hour a style ran out", () => {
  // `soldOutAt` is the shop's own record, the way `cutUnits` is: the order
  // fixtures are a recent SAMPLE and cannot prove when the last unit of a
  // closed issue went (`lib/sold-out-times.ts`).
  const stamped = CATALOG.filter((p) => p.soldOutAt !== undefined);

  it("is only ever set on a style with nothing left", () => {
    for (const p of stamped) expect(onHand(p)).toBe(0);
  });

  it("falls inside its own issue's window", () => {
    for (const p of stamped) {
      const drop = DROPS.find((d) => d.no === p.dropNo)!;
      const at = Date.parse(p.soldOutAt!);
      expect(at).toBeGreaterThan(Date.parse(drop.opensAt));
      expect(at).toBeLessThanOrEqual(Date.parse(drop.closesAt));
    }
  });

  it("covers every style of both closed issues", () => {
    for (const no of [3, 4]) {
      const styles = CATALOG.filter((p) => p.dropNo === no);
      expect(styles.length).toBeGreaterThan(0);
      expect(styles.every((p) => p.soldOutAt !== undefined)).toBe(true);
    }
  });

  it("leaves the open issue alone — nothing there has run out for good", () => {
    expect(CATALOG.filter((p) => p.dropNo === 5 && p.soldOutAt !== undefined)).toEqual([]);
  });

  it("closes each issue with one style going at the closing hour", () => {
    for (const no of [3, 4]) {
      const drop = DROPS.find((d) => d.no === no)!;
      const atClose = CATALOG.filter(
        (p) => p.dropNo === no && p.soldOutAt === drop.closesAt,
      );
      expect(atClose).toHaveLength(1);
    }
  });
});

/**
 * The construction lines (backend slice B6) are the Feed mock's, word for
 * word: `ISSUE_05[].details` in `prototype/explore/shared/data.js`, which took
 * them from the garment briefs Số 05's photos were made from
 * (`tasks/anh-san-pham-prompt.md`).
 *
 * Read out of the mock's own source rather than retyped here, the way
 * `lib/flats.test.ts` reads the board: the mock is an IIFE that reads
 * `window.location`, so it cannot be imported, but its `ISSUE_05` is a plain
 * literal and can be lifted out as written. A line edited in either file,
 * one accent included, turns this red.
 */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FEED_DATA = readFileSync(join(ROOT, "prototype/explore/shared/data.js"), "utf8");

function feedIssue05(): Array<{ slug: string; details: string[] }> {
  const start = "const ISSUE_05 = [";
  const end = "\n  ];";
  const from = FEED_DATA.indexOf(start);
  expect(from, "the mock no longer has ISSUE_05").toBeGreaterThan(-1);
  const to = FEED_DATA.indexOf(end, from);
  expect(to, "the mock's ISSUE_05 no longer ends where it did").toBeGreaterThan(from);
  return new Function(`${FEED_DATA.slice(from, to + end.length)}\nreturn ISSUE_05;`)() as Array<{
    slug: string;
    details: string[];
  }>;
}

describe("the construction lines (backend slice B6)", () => {
  const mock = feedIssue05();

  it("are the mock's for Số 05 — the same ten styles, every line in its order, character for character", () => {
    const open = CATALOG.filter((p) => p.dropNo === CURRENT_DROP_NO);
    expect(mock.map((m) => `p-${m.slug}`)).toEqual(open.map((p) => p.id));
    for (const m of mock) {
      const p = CATALOG.find((x) => x.id === `p-${m.slug}`)!;
      expect(m.details.length, `${m.slug} has no lines in the mock`).toBeGreaterThan(0);
      expect(p.details, p.slug).toEqual(m.details);
    }
  });

  it("are empty for every other style — Số 03 and 04 and the eight fixed ones", () => {
    const others = CATALOG.filter((p) => p.dropNo !== CURRENT_DROP_NO);
    expect(others).toHaveLength(19);
    for (const p of others) expect(p.details, p.slug).toEqual([]);
  });
});

/**
 * When the teasers were announced (backend slice B12): sample data authored by
 * one rule, `TEASER_LEAD_HOURS` before the issue opens, taken from the Feed
 * mock's own inbox. Read out of the mock rather than retyped, as the lines
 * above are: its `NOTIFICATIONS` is a plain literal, and the opening is the
 * issue's own line in `ISSUES`.
 */
function feedNotifications(): Array<{ kind: string; at: string; title: string; issue?: number }> {
  const start = "const NOTIFICATIONS = [";
  const end = "\n  ];";
  const from = FEED_DATA.indexOf(start);
  expect(from, "the mock no longer has NOTIFICATIONS").toBeGreaterThan(-1);
  const to = FEED_DATA.indexOf(end, from);
  expect(to, "the mock's NOTIFICATIONS no longer ends where it did").toBeGreaterThan(from);
  return new Function(`${FEED_DATA.slice(from, to + end.length)}\nreturn NOTIFICATIONS;`)() as Array<{
    kind: string;
    at: string;
    title: string;
    issue?: number;
  }>;
}

function feedOpening(no: number): string {
  const line = new RegExp(`\{ no: ${no}, opensAt: "([^"]+)"`).exec(FEED_DATA);
  expect(line, `the mock's ISSUES has no issue ${no}`).not.toBeNull();
  return line![1]!;
}

const HOUR = 3_600_000;

describe("the teasers' announcement (backend slice B12)", () => {
  it("is the mock's own offset: Số 06 announced at 12:00 on 18/09 for 20:00 on 02/10", () => {
    const told = feedNotifications().filter((n) => n.kind === "drop" && n.issue === 6 && n.title.startsWith("Số 06 công bố"));
    expect(told).toHaveLength(1);
    expect(told[0]!.at).toBe("2026-09-18T12:00:00+07:00");
    expect(feedOpening(6)).toBe("2026-10-02T20:00:00+07:00");
    expect((Date.parse(feedOpening(6)) - Date.parse(told[0]!.at)) / HOUR).toBe(TEASER_LEAD_HOURS);
    expect(TEASER_LEAD_HOURS).toBe(14 * 24 + 8);
  });

  it("dates every sample teaser TEASER_LEAD_HOURS before its issue opens — Số 06's at the mock's own minute", () => {
    expect(TEASERS.length).toBeGreaterThan(0);
    for (const t of TEASERS) {
      const drop = DROPS.find((d) => d.no === t.dropNo)!;
      expect(t.announcedAt, t.slug).not.toBeNull();
      expect((Date.parse(drop.opensAt) - Date.parse(t.announcedAt!)) / HOUR, t.slug).toBe(TEASER_LEAD_HOURS);
      expect(t.announcedAt, t.slug).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+07:00$/);
    }
    expect(TEASERS.filter((t) => t.dropNo === 6).map((t) => t.announcedAt)).toEqual([
      "2026-09-18T12:00:00+07:00",
      "2026-09-18T12:00:00+07:00",
      "2026-09-18T12:00:00+07:00",
      "2026-09-18T12:00:00+07:00",
    ]);
  });

  it("are Số 06's four printed tees, each in its own packshot (round v6, 08/10/2026, replacing SỎI and NGÓI)", () => {
    // `en` (slice B15) is checked with the rest of the English, below.
    expect(TEASERS.map(({ announcedAt: _told, en: _english, ...t }) => t)).toEqual([
      { slug: "s06-out-of-character", name: "OUT OF CHARACTER", kind: "Áo thun in", family: "TEE", dropNo: 6, photoKey: "shot-out-of-character" },
      { slug: "s06-still-in-motion", name: "STILL IN MOTION", kind: "Áo thun in", family: "TEE", dropNo: 6, photoKey: "shot-still-in-motion" },
      { slug: "s06-midnight-unedited", name: "MIDNIGHT, UNEDITED", kind: "Áo thun in", family: "TEE", dropNo: 6, photoKey: "shot-midnight-unedited" },
      { slug: "s06-for-reference-only", name: "FOR REFERENCE ONLY", kind: "Áo thun in", family: "TEE", dropNo: 6, photoKey: "shot-for-reference-only" },
    ]);
    expect(TEASERS.map((t) => t.en)).toEqual(TEASERS.map((t) => ({ name: t.name, kind: "Printed tee" })));
  });

  it("dates no style's sales: lastSoldAt is read off the orders by the database, never kept in the fixture", () => {
    expect(CATALOG.filter((p) => p.lastSoldAt !== undefined)).toEqual([]);
  });
});

/**
 * The English (backend slice B15, round v6). The words themselves are the
 * main session's to read line by line; these pin the rules they follow
 * (`tasks/plan.md`, "Thuật ngữ tiếng Anh", and brief B15 §2).
 */
describe("the English (backend slice B15)", () => {
  /** The eight fixed styles' English names, as the glossary table has them. */
  const BASICS_EN: Record<string, string> = {
    "ÁO THUN TRƠN": "PLAIN TEE",
    "ÁO THUN TAY DÀI": "LONG-SLEEVE TEE",
    "HOODIE TRƠN": "PLAIN HOODIE",
    "ÁO KHOÁC DÙ": "NYLON JACKET",
    "GILE PHAO": "PUFFER GILET",
    "SƠ MI OXFORD": "OXFORD SHIRT",
    "QUẦN KAKI": "CHINOS",
    "QUẦN SHORT NỈ": "FLEECE SHORTS",
  };

  /** Every letter Vietnamese has and English does not. */
  const VIETNAMESE = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
  /** A print's title, which stays as it is, like the style's own name. */
  const TITLE = /"[^"]*"/g;

  /** Every English string the fixture carries, with where it comes from. */
  const english = [
    ...CATALOG.flatMap((p) => [
      ...(["name", "kind", "material"] as const).flatMap((k) => (p.en?.[k] === undefined ? [] : [[`${p.slug}.${k}`, p.en[k]!]])),
      ...(p.en?.details ?? []).map((line, i) => [`${p.slug}.details[${i}]`, line]),
    ]),
    ...TEASERS.flatMap((t) => (["name", "kind"] as const).flatMap((k) => (t.en?.[k] === undefined ? [] : [[`${t.slug}.${k}`, t.en[k]!]]))),
  ] as Array<[string, string]>;

  it("names the eight fixed styles by the glossary, leaves every issue's style its Vietnamese name, and translates no teaser's", () => {
    for (const p of CATALOG) {
      if (p.dropNo === null) expect(p.en?.name, p.slug).toBe(BASICS_EN[p.name]);
      else expect(p.en?.name, p.slug).toBeUndefined();
    }
    expect(CATALOG.filter((p) => p.en?.name !== undefined)).toHaveLength(8);
    // Số 06's teasers are named in English (round v6): their English name is the name itself, never another one.
    for (const t of TEASERS) expect(t.en?.name ?? t.name, t.slug).toBe(t.name);
  });

  it("gives every style an English kind and material, and every teaser an English kind", () => {
    for (const p of CATALOG) {
      expect(p.en?.kind, p.slug).toBeTruthy();
      expect(p.en?.material, p.slug).toBeTruthy();
    }
    for (const t of TEASERS) expect(t.en?.kind, t.slug).toBeTruthy();
  });

  it("translates the lines one for one, exactly where there are lines, each print's title as it stands", () => {
    for (const p of CATALOG) {
      if (p.details.length === 0) {
        // The column holds null or a line, never an empty list.
        expect(p.en?.details, p.slug).toBeUndefined();
        continue;
      }
      expect(p.en?.details, p.slug).toHaveLength(p.details.length);
      p.details.forEach((line, i) => {
        expect(p.en!.details![i]!.match(TITLE) ?? [], `${p.slug}.details[${i}]`).toEqual(line.match(TITLE) ?? []);
      });
    }
    expect(CATALOG.filter((p) => p.en?.details !== undefined)).toHaveLength(10);
  });

  it("gives the same Vietnamese the same English across the catalogue", () => {
    const seen = new Map<string, string>();
    const once = (vi: string, en: string | undefined, where: string) => {
      if (en === undefined) return;
      const before = seen.get(vi);
      if (before !== undefined) expect(en, `${where}: "${vi}"`).toBe(before);
      seen.set(vi, en);
    };
    for (const p of CATALOG) {
      once(`kind:${p.kind}`, p.en?.kind, p.slug);
      once(`material:${p.material}`, p.en?.material, p.slug);
      p.details.forEach((line, i) => once(`line:${line}`, p.en?.details?.[i], p.slug));
    }
    for (const t of TEASERS) once(`kind:${t.kind}`, t.en?.kind, t.slug);
  });

  it("is English: no Vietnamese letter outside a print's title, no decimal comma, nothing blank", () => {
    expect(english.length).toBeGreaterThan(0);
    for (const [where, text] of english) {
      expect(text.trim(), where).not.toBe("");
      expect(text.replace(TITLE, ""), where).not.toMatch(VIETNAMESE);
      expect(text, where).not.toMatch(/\d,\d/);
    }
  });

  it("capitalises a kind's first letter only, as the Vietnamese does", () => {
    for (const [where, kind] of english.filter(([w]) => w.endsWith(".kind"))) {
      expect(kind[0], where).toBe(kind[0]!.toUpperCase());
      expect(kind.slice(1), where).toBe(kind.slice(1).toLowerCase());
    }
  });
});
