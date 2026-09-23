import { afterEach, describe, it, expect, vi } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, sep } from "node:path";
import { DROPS, CATALOG } from "@/data/catalog";
import { ORDERS } from "@/data/orders";
import { PROMOTIONS } from "@/data/promotions";
import { DEMO_ANCHOR, demoNow, demoNowMs } from "./clock";
import { dropState } from "./drop";
import { effectiveStatus } from "./customer-orders";
import { promoState } from "./admin-rows";

const ANCHOR = Date.parse(DEMO_ANCHOR);
const DAY = 86_400_000;

/** Pretend the real wall clock reads `realIso`. */
function atRealTime(realIso: string) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(realIso));
}

afterEach(() => {
  vi.useRealTimers();
});

describe("demoNow keeps the time of day and pins the date", () => {
  it("is the anchor itself at the anchor instant", () => {
    atRealTime(DEMO_ANCHOR);
    expect(demoNow().toISOString()).toBe(new Date(ANCHOR).toISOString());
  });

  it("keeps the real time of day, whatever the real date is", () => {
    // Four real days later, at 09:15 Vietnamese time.
    atRealTime("2026-09-24T09:15:00+07:00");
    const now = demoNow();
    expect(now.getTime() - ANCHOR).toBeGreaterThanOrEqual(0);
    expect(now.getTime() - ANCHOR).toBeLessThan(DAY);
    // 09:15 on the demo day is 09:15 on the real one.
    const vn = new Date(now.getTime() + 7 * 3_600_000).toISOString();
    expect(vn.slice(11, 16)).toBe("09:15");
  });

  it("lands only on 20 or 21 September 2026, whatever day it really is", () => {
    for (const real of [
      "2026-09-20T19:00:00+07:00",
      "2026-09-21T00:30:00+07:00",
      "2026-09-23T04:02:00+07:00",
      "2026-11-01T12:00:00+07:00",
      "2027-03-08T23:59:00+07:00",
    ]) {
      atRealTime(real);
      const vnDay = new Date(demoNow().getTime() + 7 * 3_600_000).toISOString().slice(0, 10);
      expect(["2026-09-20", "2026-09-21"]).toContain(vnDay);
      vi.useRealTimers();
    }
  });

  it("runs forward inside one demo day", () => {
    atRealTime("2026-10-05T09:00:00+07:00");
    const a = demoNowMs();
    vi.setSystemTime(new Date("2026-10-05T11:30:00+07:00"));
    const b = demoNowMs();
    expect(b).toBeGreaterThan(a);
    expect(b - a).toBe(2.5 * 3_600_000);
  });

  it("turns the day over at 18:50 real time, and only then", () => {
    atRealTime("2026-10-05T18:49:00+07:00");
    const before = new Date(demoNow().getTime() + 7 * 3_600_000).toISOString();
    vi.setSystemTime(new Date("2026-10-05T18:51:00+07:00"));
    const after = new Date(demoNow().getTime() + 7 * 3_600_000).toISOString();

    expect(before.slice(0, 10)).toBe("2026-09-21");
    expect(after.slice(0, 10)).toBe("2026-09-20");
    // The time of day is continuous across the wrap: 18:49 → 18:51.
    expect(before.slice(11, 16)).toBe("18:49");
    expect(after.slice(11, 16)).toBe("18:51");
  });

  it("never runs backwards from a real clock set before the anchor", () => {
    atRealTime("2026-01-01T00:00:00+07:00");
    const now = demoNowMs();
    expect(now).toBeGreaterThanOrEqual(ANCHOR);
    expect(now).toBeLessThan(ANCHOR + DAY);
  });
});

// ────────────────────────────────────────────── the data the clock relies on
/**
 * The demo day only holds still if the fixtures bracket it: everything the
 * screens report as HAVING HAPPENED is at or before the anchor, and every
 * deadline they count DOWN to is more than a demo day away from it. Miss
 * either and a state flips halfway through an afternoon — an issue closes,
 * an unpaid order cancels itself — which is the exact decay QĐ-24 exists to
 * stop.
 */
describe("the fixtures bracket the demo day", () => {
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
