import { describe, it, expect } from "vitest";
import { DROPS } from "@/data/catalog";
import {
  REMINDER_LEAD_MS,
  hasReminder,
  parseReminders,
  reminderNotice,
  serializeReminders,
  toggleReminder,
} from "./reminder";

/** Fixture windows, so a failure below reads without opening the catalog.
 *
 *   Số 05  11/09 → 25/09   ·   Số 06  02/10 20:00 → 16/10
 */
const DROP_6_OPENS = Date.parse("2026-10-02T20:00:00+07:00");
const at = (ms: number) => new Date(ms);

describe("the reminder list", () => {
  it("adds a drop that is not there and removes one that is", () => {
    expect(toggleReminder([], 6)).toEqual([6]);
    expect(toggleReminder([6], 6)).toEqual([]);
    expect(hasReminder([6], 6)).toBe(true);
    expect(hasReminder([6], 5)).toBe(false);
  });

  it("never stores the same drop twice", () => {
    expect(toggleReminder([6, 6], 7)).toEqual([6, 7]);
  });

  it("survives a round trip through storage", () => {
    expect(parseReminders(serializeReminders([6, 7]))).toEqual([6, 7]);
  });

  it("returns an empty list for anything it did not write", () => {
    // A stranger's value, a stale schema and a corrupt string all have to
    // fail the same way: no reminders, no crash on a page that is rendering.
    expect(parseReminders(null)).toEqual([]);
    expect(parseReminders("not json")).toEqual([]);
    expect(parseReminders(JSON.stringify({ v: 99, drops: [6] }))).toEqual([]);
    expect(parseReminders(JSON.stringify({ v: 1, drops: "6" }))).toEqual([]);
    expect(parseReminders(JSON.stringify({ v: 1, drops: ["6", 6] }))).toEqual([6]);
  });
});

describe("reminderNotice · the two-hour window", () => {
  const list = [6];

  it("says nothing while the drop is still more than two hours away", () => {
    const justOutside = at(DROP_6_OPENS - REMINDER_LEAD_MS - 60_000);
    expect(reminderNotice(DROPS, list, justOutside)).toBeUndefined();
  });

  it("appears exactly two hours before the doors open", () => {
    const edge = at(DROP_6_OPENS - REMINDER_LEAD_MS);
    const notice = reminderNotice(DROPS, list, edge);
    expect(notice?.state).toBe("UPCOMING");
    // Same instant, same words as the cover and the footer calendar print.
    expect(notice?.text).toBe("Số 06 mở lúc 20:00 thứ Sáu 02/10 — bạn đã đặt nhắc");
    expect(notice?.href).toBe("/?drop=6");
  });

  it("still stands one minute before the drop opens", () => {
    const notice = reminderNotice(DROPS, list, at(DROP_6_OPENS - 60_000));
    expect(notice?.state).toBe("UPCOMING");
  });

  it("turns into an invitation the moment the drop opens", () => {
    const notice = reminderNotice(DROPS, list, at(DROP_6_OPENS));
    expect(notice?.state).toBe("OPEN");
    expect(notice?.text).toBe("Số 06 đã mở — bạn đã đặt nhắc");
    expect(notice?.href).toBe("/so/6");
  });

  it("stays up for the whole selling window, not just the first minute", () => {
    const midway = at(Date.parse("2026-10-09T12:00:00+07:00"));
    expect(reminderNotice(DROPS, list, midway)?.state).toBe("OPEN");
  });

  it("goes away once the drop has closed", () => {
    // A reminder about something nobody can buy is noise. The previous-drop
    // line under the grid already reports what happened.
    const after = at(Date.parse("2026-10-17T12:00:00+07:00"));
    expect(reminderNotice(DROPS, list, after)).toBeUndefined();
  });

  it("says nothing at all when this device asked for nothing", () => {
    expect(reminderNotice(DROPS, [], at(DROP_6_OPENS))).toBeUndefined();
  });

  it("ignores a drop number the catalog does not have", () => {
    expect(reminderNotice(DROPS, [99], at(DROP_6_OPENS))).toBeUndefined();
  });
});
