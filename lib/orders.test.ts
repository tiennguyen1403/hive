import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { PaymentMethod } from "@/data/types";
import { TRANSFER_HOLD_HOURS, paysByTransfer } from "./orders";

const METHODS: PaymentMethod[] = ["BANK_TRANSFER", "CARD", "COD"];

describe("paysByTransfer — which orders wait twelve hours for a transfer", () => {
  it("holds a transfer, and a card order while no card gateway is connected (slice B7)", () => {
    expect(paysByTransfer("BANK_TRANSFER")).toBe(true);
    expect(paysByTransfer("CARD")).toBe(true);
  });

  it("never holds a COD order: it is paid at the door", () => {
    expect(paysByTransfer("COD")).toBe(false);
  });
});

/**
 * The screens print the rule; `place_order()` applies it. If the two named
 * different methods, checkout would promise a card order a hold the database
 * never gives it — or the database would cancel an order the screens never
 * warned about — with every other unit test still green. The db suite checks
 * the same thing against a running Postgres (`card-transfer.dbtest.ts`); this
 * is the half that runs without Docker.
 */
describe("the migration holds exactly the methods paysByTransfer() names", () => {
  const dir = join(process.cwd(), "supabase", "migrations");
  // Migrations apply in name order, so the last file that replaces the
  // function is the definition the database runs.
  const latest = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => readFileSync(join(dir, f), "utf8"))
    .filter((sql) => sql.includes("create or replace function public.place_order("))
    .at(-1)!;
  const body = latest.slice(latest.indexOf("create or replace function public.place_order("));
  const held = METHODS.filter(paysByTransfer)
    .map((m) => `'${m}'`)
    .join(", ");

  it("puts those methods, and only those, in AWAITING_TRANSFER with a deadline", () => {
    expect(body).toContain(`when v_payment in (${held}) then 'AWAITING_TRANSFER' else 'RECEIVED' end`);
    expect(body).toContain(`when v_payment in (${held}) then p_now + hold end`);
  });

  it("holds them for the hours the screens print", () => {
    expect(body).toContain(`hold constant interval := interval '${TRANSFER_HOLD_HOURS} hours'`);
  });
});
