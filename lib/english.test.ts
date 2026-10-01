import { describe, expect, it } from "vitest";
import { issueState, ISSUE_STATE } from "@/components/admin-arc/arc-issue-state";
import { adminFailureMessage } from "./admin-orders";
import { dropStateLabel, DROP_STATE_LABEL } from "./admin-rows";
import { clockLabel, dateTimeLabel, dayMonth, dayMonthYear, weekdayLabel } from "./datetime";
import { coverLines, FOOT_HELP, footDelivery, footHelp, footPayments } from "./feed-home";
import { FEED_TIGHT_DASH } from "./feed-range";
import { FIXED_WORD, FIXED_WORD_TEXT, HOME_COVER, HOME_HEADLINE, issueLabel, LEX, lexicon } from "./lexicon";
import { plainVnd, vnd } from "./money";
import { PAYMENT_LABEL, paymentLabel, STATE_LABEL, stateLabel } from "./order-labels";

/**
 * Round v6 slice E0 (QĐ-40): the English side of every table in `lib/` the
 * slice made bilingual, in the words of the user's glossary
 * (`tasks/plan.md`, "Thuật ngữ tiếng Anh"). The Vietnamese side is pinned by
 * each table's own test, untouched; these check that asking for Vietnamese
 * by name gives the same as asking for nothing.
 */

const NBSP = " ";

describe("money in English", () => {
  it("writes đồng with a comma between thousands", () => {
    expect(vnd(390000, "en")).toBe("390,000₫");
    expect(vnd(1290000, "en")).toBe("1,290,000₫");
    expect(plainVnd(45000, "en")).toBe("45,000");
    expect(vnd(390000, "vi")).toBe(vnd(390000));
  });
});

describe("dates in English", () => {
  const at = "2026-10-01T18:50:00+07:00";

  it("keeps the 24-hour clock", () => {
    expect(clockLabel(at)).toBe("18:50");
  });

  it("writes the day without a leading zero and a three-letter month, held together", () => {
    expect(dayMonth(at, "en")).toBe(`1${NBSP}Oct`);
    expect(dayMonthYear(at, "en")).toBe(`1${NBSP}Oct${NBSP}2026`);
    expect(dateTimeLabel(at, "en")).toBe(`18:50, 1${NBSP}Oct`);
    expect(dayMonth("2026-09-25T20:00:00+07:00", "en")).toBe(`25${NBSP}Sep`);
    expect(dayMonth("2026-12-31T23:59:00+07:00", "en")).toBe(`31${NBSP}Dec`);
    expect(dayMonth("2026-01-05T08:00:00+07:00", "en")).toBe(`5${NBSP}Jan`);
  });

  it("names the weekday in English, from the Vietnamese calendar date", () => {
    expect(weekdayLabel(at, "en")).toBe("Thursday");
    expect(weekdayLabel("2026-09-25T20:00:00+07:00", "en")).toBe("Friday");
    // 00:30 on a Monday in Hồ Chí Minh City is still Sunday in UTC: the day is read off the text.
    expect(weekdayLabel("2026-10-05T00:30:00+07:00", "en")).toBe("Monday");
  });

  it("gives the Vietnamese forms when asked for Vietnamese by name", () => {
    expect(dayMonth(at, "vi")).toBe("01/10");
    expect(dayMonthYear(at, "vi")).toBe("01/10/2026");
    expect(dateTimeLabel(at, "vi")).toBe("18:50 ngày 01/10");
    expect(weekdayLabel(at, "vi")).toBe(weekdayLabel(at));
  });

  it("stays empty for what is not a timestamp", () => {
    expect(dayMonth("", "en")).toBe("");
    expect(dateTimeLabel("hôm qua", "en")).toBe("");
  });
});

describe("the lexicon in English", () => {
  it("calls an issue a drop, everywhere", () => {
    expect(lexicon("en")).toEqual({
      t: "Drop",
      tl: "drop",
      tu: "DROP",
      cal: "Drop calendar",
      adm: "Drops",
      in: "In this drop",
      inl: "in this drop",
      next: "Next drop",
      prev: "Previous drop",
    });
    expect(issueLabel(5, "en")).toBe("Drop 05");
    expect(issueLabel(12, "en")).toBe("Drop 12");
  });

  it("keeps LEX the Vietnamese side", () => {
    expect(lexicon("vi")).toEqual(LEX);
    expect(lexicon()).toEqual(LEX);
    expect(issueLabel(5, "vi")).toBe("Số 05");
  });

  it("calls the fixed line Basics", () => {
    expect(FIXED_WORD_TEXT).toEqual({ vi: FIXED_WORD, en: "Basics" });
  });

  it("sets the cover line on two lines: Cut once. / No restocks.", () => {
    expect(HOME_HEADLINE.vi).toBe(HOME_COVER.headline);
    expect(HOME_HEADLINE.en).toBe("Cut once. No restocks.");
    expect(coverLines(HOME_HEADLINE.en)).toEqual(["Cut once.", "No restocks."]);
  });
});

describe("order labels in English", () => {
  it("names the six states as the glossary does", () => {
    expect(stateLabel("AWAITING_TRANSFER", "en").text).toBe("Awaiting transfer");
    expect(stateLabel("RECEIVED", "en").text).toBe("Order received");
    expect(stateLabel("PAID", "en").text).toBe("Paid");
    expect(stateLabel("SHIPPING", "en").text).toBe("Shipping");
    expect(stateLabel("DELIVERED", "en").text).toBe("Delivered");
    expect(stateLabel("CANCELLED", "en").text).toBe("Cancelled");
  });

  it("keeps each state's tone in both languages, and STATE_LABEL the Vietnamese side", () => {
    for (const state of Object.keys(STATE_LABEL) as (keyof typeof STATE_LABEL)[]) {
      expect(stateLabel(state, "en").tone).toBe(STATE_LABEL[state].tone);
      expect(stateLabel(state, "vi")).toEqual(STATE_LABEL[state]);
    }
  });

  it("names the three ways to pay", () => {
    expect(paymentLabel("BANK_TRANSFER", "en")).toBe("Bank transfer");
    expect(paymentLabel("CARD", "en")).toBe("Card");
    expect(paymentLabel("COD", "en")).toBe("Cash on delivery (COD)");
    expect(paymentLabel("CARD", "vi")).toBe(PAYMENT_LABEL.CARD);
  });
});

describe("issue states in English", () => {
  it("calls an open issue Live, never On sale", () => {
    expect(dropStateLabel("OPEN", "en")).toBe("Live");
    expect(dropStateLabel("UPCOMING", "en")).toBe("Coming soon");
    expect(dropStateLabel("CLOSED", "en")).toBe("Closed");
    expect(issueState("OPEN", "en")).toEqual({ text: "Live", tone: "success" });
    expect(issueState("UPCOMING", "en")).toEqual({ text: "Coming soon", tone: "info" });
    expect(issueState("CLOSED", "en")).toEqual({ text: "Closed", tone: "neutral" });
  });

  it("keeps the Vietnamese tables as they were", () => {
    expect(DROP_STATE_LABEL).toEqual({ UPCOMING: "Sắp mở", OPEN: "Đang mở", CLOSED: "Đã đóng" });
    expect(ISSUE_STATE.OPEN).toEqual({ text: "Đang bán", tone: "success" });
    expect(issueState("CLOSED", "vi")).toEqual(ISSUE_STATE.CLOSED);
  });
});

describe("the footer in English", () => {
  it("prints delivery with the same figures, the units and amounts the English way", () => {
    expect(footDelivery("en")).toEqual([
      { label: `Standard delivery, 2${FEED_TIGHT_DASH}4 days`, value: "30,000₫" },
      { label: "Express delivery in HCMC, 24 hours", value: "45,000₫" },
      { label: "Free delivery from", value: "1,000,000₫" },
    ]);
    expect(footDelivery("vi")).toEqual(footDelivery());
  });

  it("lists the three ways to pay, COD by its short name with its surcharge", () => {
    // "COD" in the footer in both languages, so the payment column holds one line at 900-1199px;
    // the checkout's full name stays "Cash on delivery (COD)" (paymentLabel, above).
    expect(footPayments("en")).toEqual([
      { label: "Bank transfer", value: "" },
      { label: "Card", value: "" },
      { label: "COD", value: "+15,000₫" },
    ]);
  });

  it("links the same five help pages, named as the glossary names them", () => {
    expect(footHelp("en")).toEqual([
      { label: "FAQ", href: "/faq" },
      { label: "7-day returns", href: "/faq#doi-tra" },
      { label: "Track an order", href: "/track" },
      { label: "Size guide", href: "/size-guide" },
      { label: "Contact", href: "/contact" },
    ]);
    expect(footHelp("vi")).toEqual(FOOT_HELP);
  });
});

describe("the back office's refusals in English", () => {
  it("says why, without an em dash", () => {
    expect(adminFailureMessage("RESET", "NOT_ADMIN", "", "en")).toBe(
      "Your admin session has ended. Sign in again with an admin account.",
    );
    expect(adminFailureMessage("RESET", "UNAVAILABLE", "", "en")).toBe("Couldn't save. Try again in a few minutes.");
    expect(adminFailureMessage("HAND_OVER", "BAD_INPUT", "", "en")).toBe(
      "A tracking number can only contain letters, digits, dots and hyphens, up to 40 characters.",
    );
    expect(adminFailureMessage("NOTE", "BAD_INPUT", "", "en")).toBe("The note is empty or longer than 500 characters.");
    expect(adminFailureMessage("RESET", "BAD_INPUT", "", "en")).toBe("The submitted data isn't valid.");
    expect(adminFailureMessage("NOTE", "NOT_FOUND", "DH-9999", "en")).toBe("Order DH-9999 not found.");
    expect(adminFailureMessage("MARK_PAID", "NOT_ALLOWED", "DH-2430", "en")).toBe(
      "DH-2430 is no longer awaiting payment. Reload the page to see its status.",
    );
    const moves = ["MARK_PAID", "HAND_OVER", "MARK_DELIVERED", "CANCEL", "NOTE", "EDIT_ADDRESS", "RESET"] as const;
    const failures = ["NOT_ADMIN", "NOT_FOUND", "NOT_ALLOWED", "BAD_INPUT", "UNAVAILABLE"] as const;
    for (const move of moves) {
      for (const failure of failures) {
        const en = adminFailureMessage(move, failure, "DH-1", "en");
        expect(en.length, `${move} ${failure}`).toBeGreaterThan(0);
        expect(en, `${move} ${failure}`).not.toContain("—");
        expect(adminFailureMessage(move, failure, "DH-1", "vi")).toBe(adminFailureMessage(move, failure, "DH-1"));
      }
    }
  });
});
