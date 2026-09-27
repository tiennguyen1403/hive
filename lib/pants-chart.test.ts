import { describe, expect, it } from "vitest";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";
import { SIZES, productId } from "@/data/types";
import { sizeChart } from "@/data/size-chart";
import { FEED_TIGHT_DASH } from "./feed-range";
import { chartNumber, heightRange, isShorts, pantsChart } from "./pants-chart";

const style = (stem: string) => {
  const p = FIXTURE_CATALOG.byId.get(productId(`p-${stem}`));
  if (!p) throw new Error(`no fixture style ${stem}`);
  return p;
};

describe("the trousers' chart", () => {
  it("knows a pair of shorts by its kind", () => {
    expect(isShorts(style("quan-short-ni"))).toBe(true);
    expect(isShorts(style("kho"))).toBe(true);
    expect(isShorts(style("da"))).toBe(false);
    expect(isShorts(style("muoi"))).toBe(false);
    expect(isShorts(style("quan-kaki"))).toBe(false);
  });

  it("carries the mock's figures for long trousers (`pantsChart` in shared/data.js)", () => {
    const rows = pantsChart(style("da"));
    expect(rows.map((r) => r.size)).toEqual([...SIZES]);
    expect(rows.map((r) => r.waist)).toEqual([70, 74, 78, 82]);
    expect(rows.map((r) => r.hip)).toEqual([96, 100, 104, 108]);
    expect(rows.map((r) => r.length)).toEqual([98, 100, 102, 104]);
    expect(rows.map((r) => r.thigh)).toEqual([30, 31.5, 33, 34.5]);
  });

  it("gives shorts their own length and a little more room", () => {
    const rows = pantsChart(style("quan-short-ni"));
    expect(rows.map((r) => r.waist)).toEqual([70, 74, 78, 82]);
    expect(rows.map((r) => r.hip)).toEqual([98, 102, 106, 110]);
    expect(rows.map((r) => r.length)).toEqual([46, 48, 50, 52]);
    expect(rows.map((r) => r.thigh)).toEqual([32, 33.5, 35, 36.5]);
  });

  it("reads the wearer's height off the tops' chart, so one height picks both", () => {
    const tops = sizeChart("OVERSIZE");
    const rows = pantsChart(style("muoi"));
    expect(rows.map((r) => heightRange(r.heightFrom, r.heightTo))).toEqual(
      tops.map((r) => heightRange(r.heightFrom, r.heightTo)),
    );
    expect(heightRange(rows[0]!.heightFrom, rows[0]!.heightTo)).toBe(`1m55${FEED_TIGHT_DASH}1m65`);
    expect(heightRange(rows[3]!.heightFrom, rows[3]!.heightTo)).toBe(`1m78${FEED_TIGHT_DASH}1m88`);
  });

  it("writes a half centimetre the Vietnamese way", () => {
    expect(chartNumber(31.5)).toBe("31,5");
    expect(chartNumber(98)).toBe("98");
  });
});
