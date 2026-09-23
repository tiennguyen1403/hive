import { describe, it, expect } from "vitest";
import {
  vnd,
  plainVnd,
  compactVnd,
  countWord,
  moneyInitial,
  moneyInput,
  parseVnd,
  styleCountLabel,
} from "./money";
import { dropState, timeLeft, closesInLabel } from "./drop";

describe("vnd", () => {
  it("groups thousands with a dot and suffixes ₫, the Vietnamese way", () => {
    expect(vnd(1_290_000)).toBe("1.290.000₫");
    expect(vnd(390_000)).toBe("390.000₫");
    expect(vnd(77_500_000)).toBe("77.500.000₫");
  });

  it("handles the small end without inventing a separator", () => {
    expect(vnd(0)).toBe("0₫");
    expect(vnd(999)).toBe("999₫");
    expect(vnd(1_000)).toBe("1.000₫");
  });

  it("shows a discount as negative rather than dropping the sign", () => {
    expect(vnd(-50_000)).toBe("-50.000₫");
  });

  it("can leave the symbol off for a column that carries its own header", () => {
    expect(plainVnd(1_290_000)).toBe("1.290.000");
  });
});

describe("compactVnd", () => {
  it("writes millions with one decimal, Vietnamese comma and all", () => {
    // The admin stat tile is 23px type in a quarter-width box; the full
    // 18.816.000₫ does not fit, and shrinking the type to make it fit is how
    // a number stops being the thing you read first.
    expect(compactVnd(18_816_000)).toBe("18,8tr₫");
    expect(compactVnd(9_600_000)).toBe("9,6tr₫");
  });

  it("drops a trailing zero decimal rather than printing 19,0tr", () => {
    expect(compactVnd(19_000_000)).toBe("19tr₫");
    expect(compactVnd(1_000_000)).toBe("1tr₫");
  });

  it("falls to thousands below a million", () => {
    expect(compactVnd(910_000)).toBe("910k₫");
    expect(compactVnd(1_500)).toBe("1,5k₫");
  });

  it("leaves small change alone", () => {
    expect(compactVnd(0)).toBe("0₫");
    expect(compactVnd(999)).toBe("999₫");
  });

  it("keeps the sign", () => {
    expect(compactVnd(-2_400_000)).toBe("-2,4tr₫");
  });

  it("never rounds up into the next unit and lies about it", () => {
    // 999.960 is not a million. Rounding the decimal first would print
    // "1000k₫", and rounding after would print "1tr₫" for a figure that
    // has not reached one.
    expect(compactVnd(999_960)).toBe("999,9k₫");
  });
});

describe("countWord", () => {
  it("spells small numbers out, because they sit inside a sentence", () => {
    expect(countWord(1)).toBe("một");
    expect(countWord(10)).toBe("mười");
    expect(countWord(12)).toBe("mười hai");
  });

  it("falls back to digits past the point where words help", () => {
    expect(countWord(13)).toBe("13");
    expect(countWord(181)).toBe("181");
  });

  it("reads naturally in the sentence it was written for", () => {
    expect(styleCountLabel(10)).toBe("mười mẫu");
    expect(styleCountLabel(13)).toBe("13 mẫu");
  });
});

describe("dropState", () => {
  const drop = {
    no: 5,
    opensAt: "2026-09-11T20:00:00+07:00",
    closesAt: "2026-09-25T20:00:00+07:00",
  };

  it("is upcoming before the window opens", () => {
    expect(dropState(drop, new Date("2026-09-10T12:00:00+07:00"))).toBe("UPCOMING");
  });

  it("is open inside the window", () => {
    expect(dropState(drop, new Date("2026-09-20T12:00:00+07:00"))).toBe("OPEN");
  });

  it("is closed after the window", () => {
    expect(dropState(drop, new Date("2026-09-26T12:00:00+07:00"))).toBe("CLOSED");
  });

  it("is open on the opening instant and closed on the closing instant", () => {
    // The boundary decides whether a shopper who arrives exactly on the hour
    // can buy. Open-inclusive, close-exclusive — the same rule as a shop door.
    expect(dropState(drop, new Date("2026-09-11T20:00:00+07:00"))).toBe("OPEN");
    expect(dropState(drop, new Date("2026-09-25T20:00:00+07:00"))).toBe("CLOSED");
  });
});

describe("timeLeft", () => {
  const closes = "2026-09-25T20:00:00+07:00";

  it("breaks the remaining span into days, hours, minutes and seconds", () => {
    expect(timeLeft(closes, new Date("2026-09-25T14:18:30+07:00"))).toEqual({
      days: 0,
      hours: 5,
      minutes: 41,
      seconds: 30,
      totalMs: 5 * 3600_000 + 41 * 60_000 + 30_000,
    });
  });

  it("floors at zero instead of counting upward past the close", () => {
    expect(timeLeft(closes, new Date("2026-09-26T09:00:00+07:00"))).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalMs: 0,
    });
  });
});

describe("closesInLabel", () => {
  const closes = "2026-09-25T20:00:00+07:00";

  it("reads the way the band reads in the prototype", () => {
    expect(closesInLabel(closes, new Date("2026-09-25T14:18:00+07:00"))).toBe(
      "đóng sau 5 giờ 42 phút",
    );
  });

  it("leads with days once there is more than a day to go", () => {
    expect(closesInLabel(closes, new Date("2026-09-23T14:00:00+07:00"))).toBe(
      "đóng sau 2 ngày 6 giờ",
    );
  });

  it("drops to minutes in the last hour, where the minute is what matters", () => {
    expect(closesInLabel(closes, new Date("2026-09-25T19:23:00+07:00"))).toBe(
      "đóng sau 37 phút",
    );
  });

  it("says it is over rather than showing a row of zeros", () => {
    expect(closesInLabel(closes, new Date("2026-09-26T09:00:00+07:00"))).toBe(
      "đã đóng",
    );
  });
});

describe("money boxes (fix L8)", () => {
  it("groups what the box shows", () => {
    expect(moneyInput("390000")).toBe("390.000");
    expect(moneyInput("1290000")).toBe("1.290.000");
  });

  it("keeps an empty box empty rather than showing a zero nobody typed", () => {
    expect(moneyInput("")).toBe("");
    expect(moneyInput("abc")).toBe("");
    // A digit that IS there stays there — which is exactly why a box seeded
    // with `String(0)` used to print a zero on a brand-new product.
    expect(moneyInput("0")).toBe("0");
  });

  it("starts a new style's price box empty and an existing one at its amount", () => {
    expect(moneyInitial(0)).toBe("");
    expect(moneyInput(moneyInitial(0))).toBe("");
    expect(moneyInitial(390_000)).toBe("390000");
    expect(moneyInput(moneyInitial(390_000))).toBe("390.000");
  });

  it("reads back what was typed, however it was pasted", () => {
    expect(parseVnd("390.000₫")).toBe(390000);
    expect(parseVnd("390000")).toBe(390000);
    expect(parseVnd("")).toBe(0);
  });

  it("survives a round trip", () => {
    expect(parseVnd(moneyInput("1290000"))).toBe(1290000);
  });
});
