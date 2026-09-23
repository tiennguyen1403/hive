import { afterEach, describe, it, expect, vi } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, sep } from "node:path";
import { DROPS, CATALOG } from "@/data/catalog";
import { ORDERS } from "@/data/orders";
import { PROMOTIONS } from "@/data/promotions";
import { DEMO_ANCHOR, demoNow, demoNowMs } from "./clock";
import { toVnIso } from "./datetime";
import { dropState } from "./drop";
import { effectiveStatus } from "./customer-orders";
import { promoState } from "./admin-rows";

const ANCHOR = Date.parse(DEMO_ANCHOR);
const DAY = 86_400_000;

/** Pretend the real wall clock reads `realIso`. */
function atRealTime(realIso: string) {
  vi.useFakeTimers();
  vi.setSystemTime(Date.parse(realIso));
}

afterEach(() => {
  vi.useRealTimers();
});

/**
 * Slice B3a retired the QĐ-24 demo clock: "now" is the real one, and it is
 * the DATA that moves — `reset_demo(demo_anchor())` shifts the sample onto
 * the most recent 18:50 in Vietnam by a whole number of days.
 */
describe("demoNow is the real clock", () => {
  it("reads the wall clock, whatever the date", () => {
    for (const real of [
      "2026-09-20T18:50:00+07:00",
      "2026-09-24T09:15:00+07:00",
      "2027-03-08T23:59:00+07:00",
    ]) {
      atRealTime(real);
      expect(demoNowMs()).toBe(Date.parse(real));
      expect(demoNow().getTime()).toBe(Date.parse(real));
      vi.useRealTimers();
    }
  });

  it("no longer wraps the date back to 20/09 at 18:50", () => {
    atRealTime("2026-10-05T18:51:00+07:00");
    expect(toVnIso(demoNow())).toBe("2026-10-05T18:51:00+07:00");
  });

  it("keeps DEMO_ANCHOR as the minute the fixture was frozen at", () => {
    expect(DEMO_ANCHOR).toBe("2026-09-20T18:50:00+07:00");
  });
});

/**
 * Why a shift by whole days is the right one: every hour and minute the
 * sample records survives it, so "hạn 19:50", "đóng lúc 20:00" and the
 * reviewed screens keep their times on whatever date the reset lands.
 */
describe("the sample survives a shift by whole days", () => {
  const stamps = ORDERS.flatMap((o) => {
    const s = o.status;
    const at =
      s.state === "AWAITING_TRANSFER" ? s.dueAt
      : s.state === "PAID" ? s.paidAt
      : s.state === "SHIPPING" ? s.shippedAt
      : s.state === "DELIVERED" ? s.deliveredAt
      : s.state === "CANCELLED" ? s.cancelledAt
      : null;
    return [o.placedAt, ...(at ? [at] : [])];
  });

  it("keeps every hour and minute, whatever the number of days", () => {
    for (const days of [1, 3, 30, 365]) {
      for (const iso of stamps) {
        const moved = toVnIso(new Date(Date.parse(iso) + days * DAY));
        expect(moved.slice(11, 16), `${iso} + ${days}d`).toBe(iso.slice(11, 16));
      }
    }
  });
});

// ────────────────────────────────────────── the data the anchoring relies on
/**
 * A reset lands the sample on the most recent 18:50, so for up to a day
 * after it the real clock sits between the anchor and anchor + 24h. The
 * screens only stay truthful across that day if the fixtures bracket it:
 * everything they report as HAVING HAPPENED is at or before the anchor, and
 * every deadline they count DOWN to is more than a day away from it. Miss
 * either and a state flips halfway through an afternoon — an issue closes,
 * an unpaid order cancels itself — on the very day it was reset.
 */
describe("the fixtures bracket the day after any reset", () => {
  it("records nothing after the anchor", () => {
    for (const o of ORDERS) {
      expect(Date.parse(o.placedAt)).toBeLessThanOrEqual(ANCHOR);
      const s = o.status;
      const at =
        s.state === "PAID"
          ? s.paidAt
          : s.state === "SHIPPING"
            ? s.shippedAt
            : s.state === "DELIVERED"
              ? s.deliveredAt
              : s.state === "CANCELLED"
                ? s.cancelledAt
                : null;
      if (at) expect(Date.parse(at)).toBeLessThanOrEqual(ANCHOR);
    }
    for (const p of CATALOG) {
      if (p.soldOutAt) expect(Date.parse(p.soldOutAt)).toBeLessThanOrEqual(ANCHOR);
    }
  });

  it("keeps every unpaid transfer waiting for the whole demo day", () => {
    const waiting = ORDERS.filter((o) => o.status.state === "AWAITING_TRANSFER");
    expect(waiting.length).toBeGreaterThan(0);
    for (const o of waiting) {
      if (o.status.state !== "AWAITING_TRANSFER") continue;
      expect(Date.parse(o.status.dueAt)).toBeGreaterThan(ANCHOR + DAY);
    }
  });

  it("keeps the open issue open for the whole demo day", () => {
    const open = DROPS.filter((d) => dropState(d, new Date(ANCHOR)) === "OPEN");
    expect(open).toHaveLength(1);
    for (const d of open) expect(Date.parse(d.closesAt)).toBeGreaterThan(ANCHOR + DAY);
  });

  it("keeps the upcoming issue upcoming, and the closed ones closed", () => {
    const upcoming = DROPS.filter((d) => dropState(d, new Date(ANCHOR)) === "UPCOMING");
    expect(upcoming.length).toBeGreaterThan(0);
    for (const d of upcoming) expect(Date.parse(d.opensAt)).toBeGreaterThan(ANCHOR + DAY);
    for (const d of DROPS.filter((x) => dropState(x, new Date(ANCHOR)) === "CLOSED")) {
      expect(Date.parse(d.closesAt)).toBeLessThanOrEqual(ANCHOR);
    }
  });

  it("keeps every live discount code live for the whole demo day", () => {
    const live = PROMOTIONS.filter((p) => promoState(p, new Date(ANCHOR)) === "LIVE");
    expect(live.length).toBeGreaterThan(0);
    for (const p of live) expect(Date.parse(p.endsAt)).toBeGreaterThan(ANCHOR + DAY);
  });

  it("holds every order in one state across the whole demo day", () => {
    const first = new Date(ANCHOR);
    const last = new Date(ANCHOR + DAY - 1);
    for (const o of ORDERS) {
      expect(effectiveStatus(o, last).state).toBe(effectiveStatus(o, first).state);
    }
  });
});

// ───────────────────────────────────────────────── one clock, and only one
/**
 * A single missed `new Date()` is a screen quietly living in a different
 * year from the one beside it — the drop band saying "đã đóng" over a
 * catalogue that is still selling. The sweep is the only thing that can
 * catch it, because both renders type-check and both look fine alone.
 */
describe("nothing outside this module reads the wall clock", () => {
  function sources(dir: string): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) out.push(...sources(path));
      else if (/\.tsx?$/.test(entry) && !entry.includes(".test.")) out.push(path);
    }
    return out;
  }

  const files = [...sources("lib"), ...sources("components"), ...sources("app")].filter(
    (f) => !f.endsWith(`lib${sep}clock.ts`),
  );

  it("reads every source file", () => {
    expect(files.length).toBeGreaterThan(80);
  });

  it("finds no `new Date()` outside lib/clock.ts", () => {
    const found: string[] = [];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      source.split("\n").forEach((line, i) => {
        if (line.includes("new Date()")) found.push(`${file}:${i + 1}`);
      });
    }
    expect(found).toEqual([]);
  });

  it("would catch one if it came back", () => {
    expect("const now = new Date();".includes("new Date()")).toBe(true);
  });
});
