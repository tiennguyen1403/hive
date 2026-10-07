import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DAILY_RESET_UTC_HOUR, dailyResetWindow, vietnamHourWindow } from "./daily-reset";

/** The crons `vercel.json` schedules, read from the file Vercel deploys with. */
function crons(): { path: string; schedule: string }[] {
  const config = JSON.parse(readFileSync("vercel.json", "utf8")) as { crons?: { path: string; schedule: string }[] };
  return config.crons ?? [];
}

describe("the daily reset's hour (round v6 slice P)", () => {
  it("is the hour vercel.json schedules /api/reset at: daily, on the hour", () => {
    const reset = crons().filter((c) => c.path === "/api/reset");
    expect(reset).toHaveLength(1);
    const [minute, hour, dayOfMonth, month, dayOfWeek, ...rest] = reset[0]!.schedule.trim().split(/\s+/);
    expect(rest).toEqual([]);
    // On the hour and every day, or the window a screen prints would not be the one Vercel keeps.
    expect([minute, dayOfMonth, month, dayOfWeek]).toEqual(["0", "*", "*", "*"]);
    expect(Number(hour)).toBe(DAILY_RESET_UTC_HOUR);
  });

  it("is 19:00 to 20:00 on the Vietnamese clock, the window /privacy states (a change here is a change of that page's words)", () => {
    expect(dailyResetWindow()).toEqual({ from: "19:00", to: "20:00" });
    expect(dailyResetWindow()).toEqual(vietnamHourWindow(DAILY_RESET_UTC_HOUR));
  });

  it("turns a UTC hour into the Vietnamese hour it covers, across midnight too", () => {
    expect(vietnamHourWindow(0)).toEqual({ from: "07:00", to: "08:00" });
    expect(vietnamHourWindow(3)).toEqual({ from: "10:00", to: "11:00" });
    expect(vietnamHourWindow(16)).toEqual({ from: "23:00", to: "00:00" });
    expect(vietnamHourWindow(17)).toEqual({ from: "00:00", to: "01:00" });
    expect(vietnamHourWindow(23)).toEqual({ from: "06:00", to: "07:00" });
  });
});
