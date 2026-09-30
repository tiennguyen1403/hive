import { describe, it, expect } from "vitest";
import { dropCalendar, featuredDrop, issueHref } from "./drop";
import { DROPS } from "@/data/catalog";
import { TEASERS } from "@/data/catalog";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";

/** Fixture windows, so a failure below reads without opening the catalog.
 *
 *   Số 03  06/03 → 20/03  ·  Số 04  05/06 → 19/06
 *   Số 05  11/09 → 25/09  ·  Số 06  02/10 → 16/10
 */
const DURING_5 = new Date("2026-09-20T10:00:00+07:00");
const BETWEEN_5_AND_6 = new Date("2026-09-28T10:00:00+07:00");
const AFTER_EVERYTHING = new Date("2027-01-01T10:00:00+07:00");

describe("featuredDrop · no drop asked for", () => {
  it("features the drop that is open right now", () => {
    const { drop, state } = featuredDrop(FIXTURE_CATALOG, undefined, DURING_5);
    expect(drop.no).toBe(5);
    expect(state).toBe("OPEN");
  });

  it("features the next one once the open drop has closed", () => {
    // The gap between two drops is not a dead shop. It is the moment the
    // countdown to the next one is the most useful thing on the page.
    const { drop, state } = featuredDrop(FIXTURE_CATALOG, undefined, BETWEEN_5_AND_6);
    expect(drop.no).toBe(6);
    expect(state).toBe("UPCOMING");
  });

  it("falls back to the last drop that ran when nothing is scheduled", () => {
    const { drop, state } = featuredDrop(FIXTURE_CATALOG, undefined, AFTER_EVERYTHING);
    expect(drop.no).toBe(6);
    expect(state).toBe("CLOSED");
  });
});

describe("featuredDrop · a drop asked for by number", () => {
  it("features the drop named in the URL", () => {
    // "Số 04 đã đóng · xem lại" is a link, and it has to land somewhere.
    const { drop, state } = featuredDrop(FIXTURE_CATALOG, 4, DURING_5);
    expect(drop.no).toBe(4);
    expect(state).toBe("CLOSED");
  });

  it("still reads the state off the clock, never off the request", () => {
    // Asking for a drop picks WHICH one. It never says what state to draw it
    // in — that stays derived, so a drop cannot be shown as open after it shut.
    expect(featuredDrop(FIXTURE_CATALOG, 6, DURING_5).state).toBe("UPCOMING");
    expect(featuredDrop(FIXTURE_CATALOG, 6, AFTER_EVERYTHING).state).toBe("CLOSED");
  });

  it("ignores a number that is not a drop and features the live one instead", () => {
    expect(featuredDrop(FIXTURE_CATALOG, 99, DURING_5).drop.no).toBe(5);
    expect(featuredDrop(FIXTURE_CATALOG, Number.NaN, DURING_5).drop.no).toBe(5);
  });
});

describe("the drop before the featured one", () => {
  it("is named, so the home page can offer 'xem lại'", () => {
    expect(featuredDrop(FIXTURE_CATALOG, undefined, DURING_5).previous?.no).toBe(4);
  });

  it("is absent for the very first drop, rather than a number that is not there", () => {
    expect(featuredDrop(FIXTURE_CATALOG, 3, DURING_5).previous).toBeUndefined();
  });
});

describe("dropCalendar · its three rows", () => {
  it("names the drop selling now, the next one, and the last one that ran", () => {
    const cal = dropCalendar(FIXTURE_CATALOG, DURING_5);
    expect(cal.open?.no).toBe(5);
    expect(cal.upcoming?.no).toBe(6);
    expect(cal.closed?.no).toBe(4);
  });

  it("leaves the open row out in the gap between two drops", () => {
    const cal = dropCalendar(FIXTURE_CATALOG, BETWEEN_5_AND_6);
    expect(cal.open).toBeUndefined();
    expect(cal.upcoming?.no).toBe(6);
    expect(cal.closed?.no).toBe(5);
  });

  it("keeps only the MOST RECENT closed drop, not the first one", () => {
    expect(dropCalendar(FIXTURE_CATALOG, AFTER_EVERYTHING).closed?.no).toBe(6);
    expect(dropCalendar(FIXTURE_CATALOG, AFTER_EVERYTHING).upcoming).toBeUndefined();
  });
});

describe("teasers", () => {
  it("announces styles for the drop that has not opened", () => {
    expect(TEASERS.filter((t) => t.dropNo === 6).length).toBeGreaterThan(0);
  });

  it("carries no price and no stock, because neither has been published", () => {
    // Modelling a teaser as a Product would mean writing 0 into priceVnd and
    // an empty stock table — which read as "free" and "sold out". It is a
    // different thing, so it gets a different type.
    for (const t of TEASERS) {
      expect(t).not.toHaveProperty("priceVnd");
      expect(t).not.toHaveProperty("stock");
    }
  });

  it("gives every teaser a slug of its own", () => {
    const slugs = TEASERS.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("does not collide with a style already in the catalog", async () => {
    const { bySlug } = await import("@/data/catalog");
    for (const t of TEASERS) expect(bySlug.has(t.slug)).toBe(false);
  });
});

describe("drop fixtures", () => {
  it("runs four drops, back to back and never overlapping", () => {
    expect(DROPS.map((d) => d.no)).toEqual([3, 4, 5, 6]);
    for (let i = 1; i < DROPS.length; i++) {
      expect(Date.parse(DROPS[i]!.opensAt)).toBeGreaterThan(
        Date.parse(DROPS[i - 1]!.closesAt),
      );
    }
  });
});

describe("issueHref · an issue's own page (v3 slice 11)", () => {
  it("is /so/N, the number as it is", () => {
    expect(issueHref(5)).toBe("/so/5");
    expect(issueHref(12)).toBe("/so/12");
  });
});
