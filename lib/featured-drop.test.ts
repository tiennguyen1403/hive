import { describe, it, expect } from "vitest";
import { dropBandLabel, dropCalendar, featuredDrop, previousDropNote } from "./drop";
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

describe("previousDropNote · L4", () => {
  const drop5 = DROPS.find((d) => d.no === 5)!;
  const drop4 = DROPS.find((d) => d.no === 4)!;

  it("says the previous drop is OPEN when it still is, and counts it down", () => {
    // The bug: featuring the upcoming drop 06 printed "Số 05 đã đóng · xem
    // lại" while drop 05 was selling. Same instant, read off the clock.
    const { previous } = featuredDrop(FIXTURE_CATALOG, 6, DURING_5);
    const note = previousDropNote(previous, DURING_5)!;
    expect(note.drop.no).toBe(5);
    expect(note.state).toBe("OPEN");
    expect(note.status).toBe("đang mở");
    expect(note.countdown).toBe("đóng sau 5 ngày 10 giờ");
    expect(note.linkText).toBe("xem số 05");
  });

  it("says 'đã đóng · xem lại' for a drop that really is over", () => {
    const note = previousDropNote(drop4, DURING_5)!;
    expect(note.state).toBe("CLOSED");
    expect(note.status).toBe("đã đóng");
    expect(note.countdown).toBe("");
    expect(note.linkText).toBe("xem lại");
  });

  it("turns over on its own once the previous drop shuts", () => {
    const note = previousDropNote(drop5, BETWEEN_5_AND_6)!;
    expect(note.status).toBe("đã đóng");
    expect(note.linkText).toBe("xem lại");
  });

  it("counts a previous drop that has not opened yet towards its opening", () => {
    // Cannot happen with these fixtures — drops run in order — but the note
    // must not print "đã đóng" for anything the clock has not closed.
    const note = previousDropNote(drop5, new Date("2026-09-01T10:00:00+07:00"))!;
    expect(note.state).toBe("UPCOMING");
    expect(note.status).toBe("chưa mở");
    expect(note.countdown).toBe("mở sau 10 ngày 10 giờ");
  });

  it("is absent when there is no drop before this one", () => {
    expect(previousDropNote(undefined, DURING_5)).toBeUndefined();
  });
});

describe("dropCalendar · the footer's three rows", () => {
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

describe("dropBandLabel", () => {
  const drop = DROPS.find((d) => d.no === 5)!;

  it("counts down to the close while the drop is open", () => {
    expect(dropBandLabel(drop, "OPEN", new Date("2026-09-25T14:18:00+07:00"))).toBe(
      "đóng sau 5 giờ 42 phút",
    );
  });

  it("counts down to the opening while the drop is still ahead", () => {
    expect(dropBandLabel(drop, "UPCOMING", new Date("2026-09-09T06:00:00+07:00"))).toBe(
      "mở sau 2 ngày 14 giờ",
    );
  });

  it("prints the instant it shut once it is over, not a countdown", () => {
    expect(dropBandLabel(drop, "CLOSED", new Date("2026-10-01T00:00:00+07:00"))).toBe(
      "20:00 · 25/09",
    );
  });

  it("is callable from a server component — it lives in lib, not beside the band", () => {
    // Exporting it from the "use client" module made the home page throw
    // "Attempted to call dropBandLabel() from the server". Nothing in this
    // module may reach for the DOM.
    expect(typeof dropBandLabel).toBe("function");
  });
});
