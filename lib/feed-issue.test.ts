import { describe, expect, it } from "vitest";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";
import {
  archivePicture,
  closedIssues,
  closedNeighbours,
  issueHasPhotos,
  issueNow,
  issueRun,
} from "./feed-issue";
import { FEED_DASH } from "./feed-range";

const C = FIXTURE_CATALOG;
/** The fixture's calendar: Số 05 sells 11/09 20:00 → 25/09 20:00, Số 06 opens 02/10 20:00. */
const OPEN = new Date("2026-09-21T19:02:00+07:00");
const BEFORE_06 = new Date("2026-09-30T19:02:00+07:00");
const DURING_06 = new Date("2026-10-05T19:02:00+07:00");

describe("the closed issues", () => {
  it("are every issue that has shut, the newest first", () => {
    expect(closedIssues(C, OPEN).map((d) => d.no)).toEqual([4, 3]);
    expect(closedIssues(C, BEFORE_06).map((d) => d.no)).toEqual([5, 4, 3]);
  });

  it("print their run as one unbroken range", () => {
    const four = C.dropByNo.get(4)!;
    expect(issueRun(four)).toBe(`05/06${FEED_DASH}19/06`);
  });
});

describe("photos or type", () => {
  it("shows Số 05 in its own photos and sets Số 03 and 04 in type", () => {
    expect(issueHasPhotos(C, 5)).toBe(true);
    expect(issueHasPhotos(C, 4)).toBe(false);
    expect(issueHasPhotos(C, 3)).toBe(false);
  });

  it("dresses Số 05's archive entry in KHÓI, black, worn", () => {
    const pic = archivePicture(C, 5);
    expect(pic?.product.name).toBe("KHÓI");
    expect(pic?.color).toBe("black");
  });
});

describe("the issues either side", () => {
  it("names the older and the newer closed issue", () => {
    const closed = closedIssues(C, BEFORE_06);
    expect(closedNeighbours(closed, 5).older?.no).toBe(4);
    expect(closedNeighbours(closed, 5).newer).toBeUndefined();
    expect(closedNeighbours(closed, 4)).toMatchObject({ older: { no: 3 }, newer: { no: 5 } });
    expect(closedNeighbours(closed, 3).older).toBeUndefined();
    expect(closedNeighbours(closed, 9)).toEqual({});
  });
});

describe("what is live beside them", () => {
  it("is the issue selling, else the next announced, else nothing", () => {
    expect(issueNow(C, OPEN)).toMatchObject({ kind: "live", drop: { no: 5 } });
    expect(issueNow(C, BEFORE_06)).toMatchObject({ kind: "next", drop: { no: 6 } });
    const gap = { ...C, drops: C.drops.filter((d) => d.no !== 6) };
    expect(issueNow(gap, BEFORE_06)).toEqual({ kind: "none" });
    expect(issueNow(C, DURING_06)).toMatchObject({ kind: "live", drop: { no: 6 } });
  });
});
