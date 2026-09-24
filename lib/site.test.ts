import { describe, expect, it } from "vitest";
import { siteOrigin } from "./site";

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
