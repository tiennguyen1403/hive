import { type Promotion, promoCode } from "./types";

/**
 * Simulated. No discount here was ever offered to anyone — these exist so the
 * admin promotion screen has rows, and so checkout has something to apply.
 *
 * Deliberately spans live, expired and exhausted codes: the admin table needs
 * all three states to be worth looking at, and "expired" is the state most
 * likely to be rendered wrong because nobody builds a fixture for it.
 */
export const PROMOTIONS: Promotion[] = [
  {
    code: promoCode("DOT05"),
    kind: "PERCENT",
    percent: 10,
    maxDiscountVnd: 150_000,
    minOrderVnd: 500_000,
    startsAt: "2026-09-11T20:00:00+07:00",
    endsAt: "2026-09-25T20:00:00+07:00",
    usageLimit: 200,
    usedCount: 46,
  },
  {
    code: promoCode("CHAOBAN"),
    kind: "AMOUNT",
    amountVnd: 50_000,
    minOrderVnd: 400_000,
    startsAt: "2026-09-11T20:00:00+07:00",
    endsAt: "2026-09-25T20:00:00+07:00",
    usageLimit: null,
    usedCount: 31,
  },
  {
    code: promoCode("FREESHIP"),
    kind: "FREE_SHIPPING",
    minOrderVnd: 800_000,
    startsAt: "2026-09-11T20:00:00+07:00",
    endsAt: "2026-09-25T20:00:00+07:00",
    usageLimit: 100,
    usedCount: 18,
  },
  {
    // Exhausted: inside its window but the cap is reached. The admin table
    // has to show this apart from "expired" — the operator's next move is
    // different for each.
    code: promoCode("VIP20"),
    kind: "PERCENT",
    percent: 20,
    maxDiscountVnd: 300_000,
    minOrderVnd: 2_000_000,
    startsAt: "2026-09-11T20:00:00+07:00",
    endsAt: "2026-09-25T20:00:00+07:00",
    usageLimit: 50,
    usedCount: 50,
  },
  {
    // Expired with the previous drop.
    code: promoCode("DOT04"),
    kind: "AMOUNT",
    amountVnd: 100_000,
    minOrderVnd: 1_000_000,
    startsAt: "2026-06-05T20:00:00+07:00",
    endsAt: "2026-06-19T20:00:00+07:00",
    usageLimit: 150,
    usedCount: 87,
  },
  {
    // Expired long ago; kept so the table has an old row to scroll past.
    code: promoCode("TET2026"),
    kind: "PERCENT",
    percent: 15,
    maxDiscountVnd: 200_000,
    startsAt: "2026-02-10T00:00:00+07:00",
    endsAt: "2026-02-24T00:00:00+07:00",
    usageLimit: null,
    usedCount: 124,
  },
];

export const promoByCode = new Map(PROMOTIONS.map((p) => [p.code, p]));
