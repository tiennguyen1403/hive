import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { PAYMENT_LABEL, STATE_LABEL } from "./order-labels";
import type { OrderState, PaymentMethod } from "@/data/types";

const STATES: OrderState[] = [
  "AWAITING_TRANSFER",
  "PAID",
  "SHIPPING",
  "DELIVERED",
  "CANCELLED",
];
const METHODS: PaymentMethod[] = ["BANK_TRANSFER", "CARD", "COD"];

describe("order labels", () => {
  it("names every state a shopper can be shown", () => {
    for (const s of STATES) {
      expect(STATE_LABEL[s].text.length, s).toBeGreaterThan(0);
    }
  });

  it("names every payment method", () => {
    for (const m of METHODS) {
      expect(PAYMENT_LABEL[m].length, m).toBeGreaterThan(0);
    }
  });

  it("never lets two states share a word", () => {
    // Two states reading the same is worse than an ugly label: the admin
    // filters by this text, so a duplicate silently merges two facets.
    const texts = STATES.map((s) => STATE_LABEL[s].text);
    expect(new Set(texts).size).toBe(texts.length);
  });

  it("gives each state the tone family B assigns it", () => {
    // `prototype/v3/badges.html`, family B: a LIVE state is black cloth with
    // honey thread (`ok`), waiting is unbleached cloth (`warn`), something in
    // transit is blue (`info`), something over is quiet cloth (`shut`). Red
    // is reserved for what a shopper can still act on, so a cancelled order
    // is not red.
    expect(STATE_LABEL.PAID.tone).toBe("ok");
    expect(STATE_LABEL.DELIVERED.tone).toBe("ok");
    expect(STATE_LABEL.SHIPPING.tone).toBe("info");
    expect(STATE_LABEL.AWAITING_TRANSFER.tone).toBe("warn");
    expect(STATE_LABEL.CANCELLED.tone).toBe("shut");
  });

  it("carries the state in words, never in the tone alone", () => {
    // PRODUCT.md's accessibility floor: colour is never the only channel.
    for (const s of STATES) expect(STATE_LABEL[s].text).not.toBe("");
  });

  it("lives in a module a SERVER component can import", () => {
    // These labels used to be exported from `OrdersScreen.tsx`, which is
    // `"use client"`. The admin dashboard renders on the server, and
    // importing across that line is what made the home page throw
    // "Attempted to call dropBandLabel() from the server" in Phase 3. The
    // build does not catch it; this does.
    // Checked as the module's FIRST STATEMENT, not as a substring: the file
    // explains this rule in its own header, and a naive `toContain` fails on
    // the explanation rather than on the thing it warns about.
    const src = readFileSync(new URL("./order-labels.ts", import.meta.url), "utf8");
    const firstLine = src.trimStart().split("\n")[0]!;
    expect(firstLine).not.toMatch(/^["']use client["']/);
  });
});
