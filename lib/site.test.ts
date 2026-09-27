import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { THEME_COLOR, siteOrigin } from "./site";

describe("siteOrigin", () => {
  it("is the production domain on Vercel, over https", () => {
    const url = siteOrigin({ VERCEL_PROJECT_PRODUCTION_URL: "hive-neon-three.vercel.app", PORT: "3200" });
    expect(url.href).toBe("https://hive-neon-three.vercel.app/");
  });

  it("is this machine on the port `next start -p` was given", () => {
    expect(siteOrigin({ PORT: "3200" }).href).toBe("http://localhost:3200/");
  });

  it("falls back to Next's own default port", () => {
    expect(siteOrigin({}).href).toBe("http://localhost:3000/");
    expect(siteOrigin({ VERCEL_PROJECT_PRODUCTION_URL: "", PORT: "" }).href).toBe("http://localhost:3000/");
  });
});

describe("THEME_COLOR", () => {
  it("is the Feed's ground, as the mock's theme-color and the zone's --f-bg (round v4 slice 1a)", () => {
    expect(THEME_COLOR).toBe("#FCFCFD");
    const zoneGround = readFileSync("app/globals.css", "utf8").match(/--f-bg:\s*(#[0-9a-fA-F]{6})/)?.[1];
    expect(zoneGround?.toLowerCase()).toBe(THEME_COLOR.toLowerCase());
    const mock = readFileSync("prototype/explore/feed/home.html", "utf8").match(/name="theme-color" content="(#[0-9a-fA-F]{6})"/)?.[1];
    expect(mock).toBe(THEME_COLOR);
  });
});
