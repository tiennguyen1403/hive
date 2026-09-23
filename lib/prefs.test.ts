import { describe, it, expect } from "vitest";
import {
  DEFAULT_PREFS,
  parsePrefs,
  serializePrefs,
  setPref,
  setSizePref,
  type Prefs,
} from "./prefs";

describe("setPref", () => {
  it("changes one switch and leaves the others alone", () => {
    const on = setPref(DEFAULT_PREFS, "savedLow", true);
    expect(on).toEqual({ ...DEFAULT_PREFS, savedLow: true });
    expect(setPref(on, "dropOpen", false)).toEqual({
      ...DEFAULT_PREFS,
      savedLow: true,
      dropOpen: false,
    });
  });

  it("carries the switches added at v3 slice 4", () => {
    expect(setPref(DEFAULT_PREFS, "emailOnStatus", false).emailOnStatus).toBe(false);
    expect(setPref(DEFAULT_PREFS, "notifPromo", true).notifPromo).toBe(true);
    expect(setPref(DEFAULT_PREFS, "notifOrders", false).notifOrders).toBe(false);
  });

  it("offers the notification sources in the state the screen expects", () => {
    // Orders on, codes off: an order changing state is something the shopper
    // is already waiting for; a code five days from expiring is a nudge
    // nobody asked for.
    expect(DEFAULT_PREFS.notifOrders).toBe(true);
    expect(DEFAULT_PREFS.notifPromo).toBe(false);
    expect(DEFAULT_PREFS.emailOnStatus).toBe(true);
  });

  it("does not mutate what it was handed", () => {
    const before: Prefs = { ...DEFAULT_PREFS };
    setPref(before, "dropOpen", false);
    expect(before).toEqual(DEFAULT_PREFS);
  });
});

describe("setSizePref", () => {
  it("remembers a size and forgets it again", () => {
    const on = setSizePref(DEFAULT_PREFS, "M");
    expect(on.size).toBe("M");
    expect(setSizePref(on, null).size).toBeNull();
  });

  it("leaves every switch alone", () => {
    const prefs: Prefs = { ...DEFAULT_PREFS, dropOpen: false, savedLow: true };
    expect(setSizePref(prefs, "L")).toEqual({ ...prefs, size: "L" });
  });
});

describe("prefs storage", () => {
  it("round-trips every switch", () => {
    const prefs: Prefs = {
      dropOpen: false,
      savedLow: true,
      emailOnStatus: false,
      notifOrders: false,
      notifPromo: true,
      size: "XL",
    };
    expect(parsePrefs(serializePrefs(prefs))).toEqual(prefs);
  });

  it("falls back to the defaults on nothing, junk, or another version", () => {
    expect(parsePrefs(null)).toEqual(DEFAULT_PREFS);
    expect(parsePrefs("")).toEqual(DEFAULT_PREFS);
    expect(parsePrefs("not json")).toEqual(DEFAULT_PREFS);
    expect(parsePrefs("[]")).toEqual(DEFAULT_PREFS);
    expect(parsePrefs(JSON.stringify({ v: 99, prefs: { dropOpen: false } }))).toEqual(
      DEFAULT_PREFS,
    );
  });

  it("keeps the answer somebody gave even when the other key is missing", () => {
    // An older build that only stored one switch must not lose it, and must
    // not invent a value for the one it never asked about.
    const partial = JSON.stringify({ v: 1, prefs: { savedLow: true } });
    expect(parsePrefs(partial)).toEqual({ ...DEFAULT_PREFS, savedLow: true });
  });

  it("drops a remembered size the catalog no longer carries", () => {
    const stale = JSON.stringify({ v: 1, prefs: { size: "XXL" } });
    expect(parsePrefs(stale).size).toBeNull();
    const ok = JSON.stringify({ v: 1, prefs: { size: "S" } });
    expect(parsePrefs(ok).size).toBe("S");
  });

  it("ignores a value of the wrong type rather than coercing it", () => {
    const wrong = JSON.stringify({ v: 1, prefs: { dropOpen: "yes", savedLow: 1 } });
    expect(parsePrefs(wrong)).toEqual(DEFAULT_PREFS);
  });
});
