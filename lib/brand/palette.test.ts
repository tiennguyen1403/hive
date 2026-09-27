import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HONEY, MONO } from "./palette";

const LOGO_DIR = join("prototype", "name", "logo");

/** The disc's and the bee's fill in a mark file, the name's fill in a wordmark file. */
function markColours(file: string) {
  const svg = readFileSync(join(LOGO_DIR, file), "utf8");
  return {
    disc: svg.match(/<circle r="500" fill="(#[0-9a-f]{6})"\/>/)?.[1],
    bee: svg.match(/<path fill="(#[0-9a-f]{6})" d=/)?.[1],
  };
}
const nameColour = (file: string) =>
  readFileSync(join(LOGO_DIR, file), "utf8").match(/<path fill="(#[0-9a-f]{6})" d=/)?.[1];

/**
 * QĐ-33: the logo in black and white. The rule is not restated here: it is
 * read off the variants the logo sheet already drew, so the app and the
 * approved files cannot disagree about which part is which colour.
 */
describe("the black-and-white logo", () => {
  it("on a light ground is hive-mark-black.svg and hive-wordmark.svg: ink disc, white bee, ink name", () => {
    expect(MONO.light).toEqual({ ...markColours("hive-mark-black.svg"), name: nameColour("hive-wordmark.svg") });
    expect(MONO.light).toEqual({ disc: "#171410", bee: "#ffffff", name: "#171410" });
  });

  it("on a dark ground is hive-mark-negative.svg and hive-wordmark-white.svg: white disc, ink bee, white name", () => {
    expect(MONO.dark).toEqual({ ...markColours("hive-mark-negative.svg"), name: nameColour("hive-wordmark-white.svg") });
    expect(MONO.dark).toEqual({ disc: "#ffffff", bee: "#171410", name: "#ffffff" });
  });

  it("keeps the geometry of the honey mark: only the fills differ", () => {
    const shape = (f: string) => readFileSync(join(LOGO_DIR, f), "utf8").replace(/fill="#[0-9a-f]{6}"/g, "");
    expect(shape("hive-mark-black.svg")).toBe(shape("hive-mark.svg"));
    expect(shape("hive-mark-negative.svg")).toBe(shape("hive-mark.svg"));
  });

  it("carries no honey anywhere", () => {
    const fills = [...Object.values(MONO.light), ...Object.values(MONO.dark)];
    expect(fills).not.toContain(HONEY);
    expect(new Set(fills)).toEqual(new Set(["#171410", "#ffffff"]));
  });
});
