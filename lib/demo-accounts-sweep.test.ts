import { describe, expect, it } from "vitest";
import { CUSTOMERS } from "@/data/customers";
import { DEMO_ADMIN } from "./demo-admin";
import { DEMO_EMAILS, accountsToDelete } from "./demo-accounts";

/**
 * Slice B17 (QĐ-45): the daily reset deletes every account that is not part
 * of the sample. The database names the candidates (no handle,
 * `real_accounts()`); this is the app's own fixed check on top of it — none
 * of the nine shared demo accounts is ever deleted, whatever its row says.
 */
describe("accountsToDelete", () => {
  it("keeps every one of the nine shared accounts, however its e-mail is written", () => {
    const rows = [
      ...CUSTOMERS.map((c, i) => ({ id: `u-${i}`, email: c.email })),
      { id: "u-admin", email: DEMO_ADMIN.email },
      { id: "u-loud", email: `  ${CUSTOMERS[0]!.email.toUpperCase()} ` },
    ];
    expect(rows).toHaveLength(DEMO_EMAILS.length + 1);
    expect(accountsToDelete(rows)).toEqual([]);
  });

  it("names every other account, in the order it was given, e-mail or not", () => {
    const rows = [
      { id: "u-1", email: "peter.smith@gmail.com" },
      { id: "u-2", email: CUSTOMERS[1]!.email },
      { id: "u-3", email: "" },
      { id: "u-4", email: "hong.mai@example.test" },
    ];
    expect(accountsToDelete(rows).map((r) => r.id)).toEqual(["u-1", "u-3", "u-4"]);
  });

  it("drops a row that names no account", () => {
    expect(accountsToDelete([{ id: "", email: "nobody@example.test" }])).toEqual([]);
  });
});
