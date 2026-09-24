import { describe, expect, it } from "vitest";
import {
  CLIENT_IP_HEADER,
  EVERYONE,
  LOCAL_CLIENT,
  RATE_BUCKETS,
  RATE_RULES,
  clientIpOf,
  rateKeyOf,
  rateLimitMessage,
  subjectOf,
  type RateBucket,
} from "./rate-limit";

/**
 * The rules of the public demo's rate limits (slice B4b), and the three pure
 * pieces around them: whose request it is, what that visitor is called in the
 * counter table, and what the screen says when the answer is "not now".
 *
 * The table below is the brief's §2.5, restated on purpose rather than read
 * from the module: a number changed in `lib/rate-limit.ts` has to change here
 * too, by hand, or this fails.
 */
const TABLE: Record<RateBucket, { limit: number; windowSeconds: number; per: "visitor" | "everyone" }> = {
  order_place: { limit: 5, windowSeconds: 10 * 60, per: "visitor" },
  order_units: { limit: 60, windowSeconds: 24 * 3600, per: "visitor" },
  sign_in: { limit: 10, windowSeconds: 5 * 60, per: "visitor" },
  sign_up: { limit: 3, windowSeconds: 3600, per: "visitor" },
  password: { limit: 5, windowSeconds: 10 * 60, per: "visitor" },
  account: { limit: 30, windowSeconds: 10 * 60, per: "visitor" },
  admin: { limit: 120, windowSeconds: 10 * 60, per: "visitor" },
  admin_create: { limit: 20, windowSeconds: 3600, per: "visitor" },
  upload: { limit: 40, windowSeconds: 3600, per: "visitor" },
  upload_global: { limit: 300, windowSeconds: 24 * 3600, per: "everyone" },
  reset: { limit: 3, windowSeconds: 10 * 60, per: "visitor" },
};

describe("RATE_RULES", () => {
  it("has exactly the eleven buckets of the brief, no more", () => {
    expect([...RATE_BUCKETS].sort()).toEqual(Object.keys(TABLE).sort());
    expect(Object.keys(RATE_RULES).sort()).toEqual(Object.keys(TABLE).sort());
    expect(RATE_BUCKETS).toHaveLength(11);
  });

  it("matches the table, bucket by bucket", () => {
    for (const bucket of RATE_BUCKETS) {
      expect(RATE_RULES[bucket], bucket).toEqual(TABLE[bucket]);
    }
  });

  it("stays inside what take_rate() accepts: a limit of at least 1, a window of 1 s to a day", () => {
    for (const bucket of RATE_BUCKETS) {
      const { limit, windowSeconds } = RATE_RULES[bucket];
      expect(Number.isInteger(limit) && limit >= 1, bucket).toBe(true);
      expect(Number.isInteger(windowSeconds) && windowSeconds >= 1 && windowSeconds <= 86_400, bucket).toBe(true);
    }
  });

  it("counts only the photo bucket for everybody at once", () => {
    const shared = RATE_BUCKETS.filter((b) => RATE_RULES[b].per === "everyone");
    expect(shared).toEqual(["upload_global"]);
  });
});

describe("clientIpOf", () => {
  /** A header list the way `headers()` answers: `get` by name, null when absent. */
  const from = (values: Record<string, string>) => (name: string) => values[name.toLowerCase()] ?? null;

  it("reads x-forwarded-for, the header Vercel overwrites", () => {
    expect(CLIENT_IP_HEADER).toBe("x-forwarded-for");
    expect(clientIpOf(from({ "x-forwarded-for": "203.0.113.7" }))).toBe("203.0.113.7");
  });

  it("takes the first of several values, trimmed", () => {
    expect(clientIpOf(from({ "x-forwarded-for": "203.0.113.7, 10.0.0.1, 10.0.0.2" }))).toBe("203.0.113.7");
    expect(clientIpOf(from({ "x-forwarded-for": "  2001:db8::1  ,10.0.0.1" }))).toBe("2001:db8::1");
    expect(clientIpOf(from({ "x-forwarded-for": "\t198.51.100.4\t" }))).toBe("198.51.100.4");
  });

  it("answers `local` with no header, an empty one, or an empty first value", () => {
    expect(LOCAL_CLIENT).toBe("local");
    expect(clientIpOf(from({}))).toBe("local");
    expect(clientIpOf(from({ "x-forwarded-for": "" }))).toBe("local");
    expect(clientIpOf(from({ "x-forwarded-for": "   " }))).toBe("local");
    expect(clientIpOf(from({ "x-forwarded-for": " , 10.0.0.1" }))).toBe("local");
  });

  it("ignores the other client-IP headers a visitor could type themselves", () => {
    expect(
      clientIpOf(from({ "x-real-ip": "198.51.100.9", "x-vercel-forwarded-for": "198.51.100.9" })),
    ).toBe("local");
  });
});

describe("rateKeyOf", () => {
  it("counts an IPv6 address by its /64, written short", () => {
    expect(rateKeyOf("2001:db8:0:1:abcd::1")).toBe("2001:db8:0:1::/64");
    expect(rateKeyOf("2001:DB8::1:2:3:4")).toBe("2001:db8:0:0::/64");
    expect(rateKeyOf("2001:0db8:0000:0001:0000:0000:0000:0001")).toBe("2001:db8:0:1::/64");
    expect(rateKeyOf("::1")).toBe("0:0:0:0::/64");
    expect(rateKeyOf("::")).toBe("0:0:0:0::/64");
  });

  it("drops the zone before it counts", () => {
    expect(rateKeyOf("fe80::1%eth0")).toBe("fe80:0:0:0::/64");
  });

  it("counts an IPv4-mapped address as the IPv4 address it carries, in either spelling", () => {
    expect(rateKeyOf("::ffff:127.0.0.1")).toBe("127.0.0.1");
    expect(rateKeyOf("::FFFF:203.0.113.5")).toBe("203.0.113.5");
    expect(rateKeyOf("::ffff:7f00:1")).toBe("127.0.0.1");
    expect(rateKeyOf("0:0:0:0:0:ffff:cb00:7105")).toBe("203.0.113.5");
  });

  it("leaves IPv4, `local` and anything that is not an address as it is", () => {
    expect(rateKeyOf("203.0.113.5")).toBe("203.0.113.5");
    expect(rateKeyOf("local")).toBe("local");
    for (const junk of [
      "2001:::1",
      ":::",
      "1:2:3:4:5:6:7",
      "1:2:3:4:5:6:7:8:9",
      "1:2:3:4:5:6:7:8::",
      "1::2::3",
      "2001:db8::g",
      "12345::1",
      ":1:2:3:4:5:6:7",
      "::ffff:999.0.0.1",
      "64:ff9b::192.0.2.1",
      "not an address",
      "",
    ]) {
      expect(rateKeyOf(junk), junk).toBe(junk);
    }
  });

  it("gives one visitor per /64, and a different one for the next /64", () => {
    const KEY = "a-test-key-not-a-real-one";
    const as = (ip: string) => subjectOf(rateKeyOf(ip), KEY);
    expect(as("2001:db8:0:1::5")).toBe(as("2001:db8:0:1:ffff:ffff:ffff:9"));
    expect(as("2001:db8:0:1::5")).not.toBe(as("2001:db8:0:2::5"));
    expect(as("::ffff:127.0.0.1")).toBe(as("127.0.0.1"));
  });
});

describe("subjectOf", () => {
  const KEY = "a-test-key-not-a-real-one";

  it("is stable: the same visitor and key always name the same row", () => {
    expect(subjectOf("203.0.113.7", KEY)).toBe(subjectOf("203.0.113.7", KEY));
  });

  it("is 32 lower-case hex characters — the column takes 64 at most", () => {
    for (const ip of ["203.0.113.7", "2001:db8::1", "local", ""]) {
      expect(subjectOf(ip, KEY), ip).toMatch(/^[0-9a-f]{32}$/);
    }
  });

  it("differs by visitor and by key, and never carries the address itself", () => {
    const a = subjectOf("203.0.113.7", KEY);
    expect(subjectOf("203.0.113.8", KEY)).not.toBe(a);
    expect(subjectOf("203.0.113.7", `${KEY}-other`)).not.toBe(a);
    expect(a).not.toContain("203");
    expect(a).not.toBe(EVERYONE);
  });

  it("is HMAC-SHA256, not a bare hash: a known vector", async () => {
    const { createHmac } = await import("node:crypto");
    const expected = createHmac("sha256", KEY).update("203.0.113.7", "utf8").digest("hex").slice(0, 32);
    expect(subjectOf("203.0.113.7", KEY)).toBe(expected);
  });
});

describe("rateLimitMessage", () => {
  const cases: Array<[number, string]> = [
    [30, "1 phút"],
    [60, "1 phút"],
    [61, "2 phút"],
    [3_599, "60 phút"],
    [3_600, "1 giờ"],
    [3_601, "2 giờ"],
  ];

  it("the default sentence, in minutes rounded up and from an hour on in hours", () => {
    for (const [seconds, wait] of cases) {
      expect(rateLimitMessage("sign_in", seconds), String(seconds)).toBe(
        `Quá nhiều lượt liên tiếp. Thử lại sau ${wait}.`,
      );
    }
    // Every bucket but the two with their own sentence says the same.
    for (const bucket of RATE_BUCKETS.filter((b) => b !== "order_units" && b !== "upload_global")) {
      expect(rateLimitMessage(bucket, 120), bucket).toBe("Quá nhiều lượt liên tiếp. Thử lại sau 2 phút.");
    }
  });

  it("order_units names the daily ceiling, from the rule rather than typed", () => {
    expect(RATE_RULES.order_units.limit).toBe(60);
    for (const [seconds, wait] of cases) {
      expect(rateLimitMessage("order_units", seconds), String(seconds)).toBe(
        `Mỗi người mua đặt tối đa 60 chiếc mỗi ngày. Thử lại sau ${wait}.`,
      );
    }
  });

  it("upload_global says the bucket is full for today", () => {
    for (const [seconds, wait] of cases) {
      expect(rateLimitMessage("upload_global", seconds), String(seconds)).toBe(
        `Kho ảnh hôm nay đã nhận đủ ảnh. Thử lại sau ${wait}.`,
      );
    }
  });

  it("never says zero minutes, whatever arrives", () => {
    for (const seconds of [0, -5, 0.4, Number.NaN]) {
      expect(rateLimitMessage("reset", seconds), String(seconds)).toBe(
        "Quá nhiều lượt liên tiếp. Thử lại sau 1 phút.",
      );
    }
  });
});
