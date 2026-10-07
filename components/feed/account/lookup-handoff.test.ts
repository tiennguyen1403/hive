import { describe, expect, it } from "vitest";
import { handOver, takeOver } from "./lookup-handoff";

/** Slice B19: the number travels from a lookup form to `/track?code=…` in memory, once. */
describe("the lookup's handoff", () => {
  it("hands the number to the page it was left for, once", () => {
    handOver("/track?code=DH-2430", "0912 345 678");
    expect(takeOver("/track?code=DH-2430")).toBe("0912 345 678");
    expect(takeOver("/track?code=DH-2430")).toBe("");
  });

  it("gives nothing to another page, and forgets the number all the same", () => {
    handOver("/track?code=DH-2430", "0912345678");
    expect(takeOver("/track?code=DH-2431")).toBe("");
    expect(takeOver("/track?code=DH-2430")).toBe("");
  });

  it("keeps only the newest number", () => {
    handOver("/track?code=DH-2430", "0912345678");
    handOver("/track?code=DH-2431", "0987654321");
    expect(takeOver("/track?code=DH-2431")).toBe("0987654321");
  });
});
