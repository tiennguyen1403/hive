import { describe, it, expect } from "vitest";
import {
  clockFirst,
  findDeviceOrder,
  findFixtureOrder,
  lastUpdateLabel,
  lookupOrder,
  normaliseOrderCode,
  notFoundMessage,
  phoneDigits,
  samePhone,
  totalRowLabel,
  trackHref,
  trackedOfOrder,
  trackedOfPlaced,
} from "./lookup";
import type { PlacedOrder } from "./placed-order";

/** DH-2425 belongs to Lê Hoàng Nam, whose number is 0908 221 447. */
const NAM = "0908 221 447";
/** Somebody else's — Trần Minh Anh's. */
const OTHER = "0912 345 678";

const DURING_5 = new Date("2026-09-20T10:00:00+07:00");

const placed: PlacedOrder = {
  code: "DH-9001",
  placedAt: "2026-09-20T09:00:00+07:00",
  lines: [
    {
      slug: "khoi",
      name: "KHÓI",
      kind: "Áo thun oversize",
      colorLabel: "Đen",
      size: "M",
      qty: 1,
      unitPriceVnd: 390_000,
      photoKey: "khoi",
    },
  ],
  recipient: "Trần Minh Anh",
  phone: "0912345678",
  email: "minhanh@vidu.vn",
  addressLine: "12 Nguyễn Huệ, Phường Sài Gòn, TP. Hồ Chí Minh",
  note: "Gọi trước 10 phút",
  delivery: "STANDARD",
  payment: "BANK_TRANSFER",
  subtotalVnd: 390_000,
  shippingFeeVnd: 30_000,
  codFeeVnd: 0,
  discountVnd: 0,
  totalVnd: 420_000,
};

describe("normaliseOrderCode", () => {
  it("upper-cases and trims", () => {
    expect(normaliseOrderCode(" dh-2425 ")).toBe("DH-2425");
  });

  it("adds the prefix to a code typed as digits only", () => {
    expect(normaliseOrderCode("2425")).toBe("DH-2425");
  });

  it("puts the dash back when it was left out", () => {
    expect(normaliseOrderCode("dh2425")).toBe("DH-2425");
  });

  it("returns empty for empty", () => {
    expect(normaliseOrderCode("   ")).toBe("");
  });
});

describe("phoneDigits / samePhone", () => {
  it("reads the same number written four ways", () => {
    for (const written of ["0908221447", "0908 221 447", "0908.221.447", "+84908221447"]) {
      expect(phoneDigits(written)).toBe("0908221447");
    }
  });

  it("refuses something that is not a ten-digit mobile", () => {
    expect(phoneDigits("12345")).toBe("");
    expect(phoneDigits("")).toBe("");
  });

  it("does not call two empties equal", () => {
    expect(samePhone("", "")).toBe(false);
  });

  it("matches across punctuation", () => {
    expect(samePhone("0908 221 447", "0908221447")).toBe(true);
  });
});

describe("findFixtureOrder", () => {
  it("finds an order for the number it was placed with", () => {
    expect(findFixtureOrder("DH-2425", NAM)?.code).toBe("DH-2425");
  });

  it("accepts the code typed loosely", () => {
    expect(findFixtureOrder("dh2425", "0908.221.447")?.code).toBe("DH-2425");
  });

  it("refuses the right code with somebody else's number", () => {
    expect(findFixtureOrder("DH-2425", OTHER)).toBeUndefined();
  });

  it("refuses a code that does not exist", () => {
    expect(findFixtureOrder("DH-0000", NAM)).toBeUndefined();
  });

  it("refuses a code with no number at all — that is the whole point", () => {
    expect(findFixtureOrder("DH-2425", "")).toBeUndefined();
  });
});

describe("findDeviceOrder", () => {
  it("finds an order placed in this browser", () => {
    expect(findDeviceOrder("DH-9001", "0912 345 678", [placed])?.code).toBe("DH-9001");
  });

  it("refuses it to a different number", () => {
    expect(findDeviceOrder("DH-9001", NAM, [placed])).toBeUndefined();
  });
});

describe("lookupOrder", () => {
  it("prefers the fixtures when a device order shares the code", () => {
    const clash: PlacedOrder = { ...placed, code: "DH-2425", phone: "0912345678" };
    expect(lookupOrder("DH-2425", NAM, [clash])).toEqual({
      source: "fixture",
      order: expect.objectContaining({ code: "DH-2425" }),
    });
  });

  it("falls back to the device list", () => {
    const hit = lookupOrder("DH-9001", OTHER, [placed]);
    expect(hit?.source).toBe("device");
  });

  it("returns nothing when neither matches", () => {
    expect(lookupOrder("DH-9001", NAM, [placed])).toBeNull();
  });
});

describe("notFoundMessage", () => {
  it("names the code that was tried and where to find the right one", () => {
    expect(notFoundMessage("dh2425")).toBe(
      "Không tìm thấy đơn DH-2425 với số này. Kiểm lại mã trong email hoặc màn xác nhận.",
    );
  });
});

describe("trackHref", () => {
  it("carries both values, the phone as digits", () => {
    expect(trackHref("dh2425", "0908 221 447")).toBe("/track?code=DH-2425&phone=0908221447");
  });

  it("leaves the phone out when there is none", () => {
    expect(trackHref("DH-2425")).toBe("/track?code=DH-2425");
  });
});

describe("clockFirst", () => {
  it("swaps the day and the clock, which is how v3 stamps a milestone", () => {
    expect(clockFirst("17/09 · 09:15 · mã vận đơn VNP-8842204")).toBe(
      "09:15 · 17/09 · mã vận đơn VNP-8842204",
    );
  });

  it("leaves a detail with no stamp alone", () => {
    expect(clockFirst("Chưa tới")).toBe("Chưa tới");
  });
});

describe("trackedOfOrder", () => {
  const order = findFixtureOrder("DH-2425", NAM)!;
  const tracked = trackedOfOrder(order, "88 Xuân Thuỷ, Phường Cầu Giấy, TP. Hà Nội", DURING_5);

  it("carries the courier's number on a shipping order", () => {
    expect(tracked.trackingCode).toBe("VNP-8842204");
    expect(tracked.state).toBe("SHIPPING");
  });

  it("totals the order from its own lines, never from a typed figure", () => {
    // 390.000 + 450.000 goods, 30.000 delivery, CHAOBAN takes 50.000 off.
    expect(tracked.subtotalVnd).toBe(840_000);
    expect(tracked.totalVnd).toBe(820_000);
    expect(tracked.units).toBe(2);
  });

  it("says out loud that the courier feed is not connected", () => {
    const now = tracked.steps.find((s) => s.state === "now");
    expect(now?.detail).toContain("cập nhật tay từ cửa hàng");
  });

  it("stamps the milestones clock first", () => {
    expect(tracked.steps[0]!.detail).toBe("14:50 · 15/09");
  });

  it("counts a shipped order as paid", () => {
    expect(tracked.paid).toBe(true);
  });
});

describe("trackedOfOrder — a transfer that ran out of time", () => {
  // DH-2430 waits for a transfer, due 21/09 19:50.
  const order = findFixtureOrder("DH-2430", OTHER)!;

  it("is only waiting while the deadline is ahead", () => {
    const t = trackedOfOrder(order, "…", new Date("2026-09-21T10:00:00+07:00"));
    expect(t.steps.find((s) => s.title === "Chờ chuyển khoản")!.state).toBe("todo");
  });

  it("is a CANCELLED order once it has passed, not a late step", () => {
    // `effectiveStatus`: the hold is the shop's own promise, so an unpaid
    // transfer past its deadline is cancelled on every surface that reads
    // it — the stamp is the DEADLINE, not the moment somebody looked.
    const t = trackedOfOrder(order, "…", new Date("2026-09-22T10:00:00+07:00"));
    expect(t.state).toBe("CANCELLED");
    expect(t.steps.some((s) => s.title === "Chờ chuyển khoản")).toBe(false);
    const last = t.steps[t.steps.length - 1]!;
    expect(last.title).toBe("Đã huỷ — quá hạn chuyển khoản");
    expect(last.detail).toBe("19:50 · 21/09");
    expect(t.paid).toBe(false);
  });
});

describe("trackedOfPlaced", () => {
  it("keeps the note typed for the courier", () => {
    expect(trackedOfPlaced(placed, DURING_5).note).toBe("Gọi trước 10 phút");
  });

  it("never claims a device order was paid — no server took any money", () => {
    const paidLooking: PlacedOrder = { ...placed, payment: "COD" };
    expect(trackedOfPlaced(paidLooking, DURING_5).paid).toBe(false);
  });

  it("marks the wait late once the twelve hours are up", () => {
    const after = new Date("2026-09-20T22:00:00+07:00");
    const t = trackedOfPlaced(placed, after);
    expect(t.state).toBe("CANCELLED");
    expect(t.steps.some((s) => s.state === "late")).toBe(false); // cancelled has no wait left
  });

  it("marks it late while the wait is still on screen but overdue", () => {
    // Placed at 09:00, so the hold runs to 21:00. One minute before the
    // device state flips, the wait itself is still the current step.
    const t = trackedOfPlaced(placed, new Date("2026-09-20T20:59:00+07:00"));
    expect(t.state).toBe("AWAITING_TRANSFER");
    expect(t.steps.find((s) => s.title === "Chờ chuyển khoản")!.state).toBe("todo");
  });
});

describe("totalRowLabel", () => {
  it("says what the number means for each state", () => {
    expect(totalRowLabel("DELIVERED")).toBe("Đã thanh toán");
    expect(totalRowLabel("AWAITING_TRANSFER")).toBe("Cần thanh toán");
    expect(totalRowLabel("CANCELLED")).toBe("Tổng đơn");
  });
});

describe("lastUpdateLabel", () => {
  it("is the stamp of the newest milestone that actually happened", () => {
    const order = findFixtureOrder("DH-2425", NAM)!;
    const t = trackedOfOrder(order, "…", DURING_5);
    expect(lastUpdateLabel(t.steps)).toBe("09:15 · 17/09");
  });

  it("is empty when nothing carries a stamp", () => {
    expect(lastUpdateLabel([{ title: "Đã giao", state: "todo" }])).toBe("");
  });
});
