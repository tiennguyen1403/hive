import { describe, it, expect } from "vitest";
import {
  clockFirst,
  isOrderCode,
  lastUpdateLabel,
  normaliseOrderCode,
  notFoundMessage,
  phoneDigits,
  samePhone,
  totalRowLabel,
  trackHref,
  trackedOfOrder,
} from "./lookup";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";
import { orderByCode } from "@/data/orders";
import { orderCode, productId, type Order } from "@/data/types";

const DURING_5 = new Date("2026-09-20T10:00:00+07:00");

/** A sample order, by its code. */
const sample = (code: string) => orderByCode.get(orderCode(code))!;

/**
 * An order checkout placed since slice B2 — cash on delivery, with a note for
 * the courier and the handling fee on it — as `order_json()` returns it.
 */
const placed: Order = {
  code: orderCode("DH-2432"),
  customerId: "" as Order["customerId"],
  lines: [
    { productId: productId("p-khoi"), size: "M", color: "black", qty: 1, unitPriceVnd: 390_000 },
  ],
  status: { state: "RECEIVED" },
  payment: "COD",
  delivery: "EXPRESS",
  shippingFeeVnd: 45_000,
  codFeeVnd: 15_000,
  discountVnd: 0,
  shipTo: {
    recipient: "Trần Minh Anh",
    phone: "0912345678",
    line: "12 Nguyễn Huệ",
    provinceCode: "29",
    wardCode: "70101063",
  },
  email: "minhanh@vidu.vn",
  note: "Gọi trước 10 phút",
  placedAt: "2026-09-20T09:00:00+07:00",
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

describe("isOrderCode", () => {
  it("accepts a code the database issues, four digits or more", () => {
    expect(isOrderCode("DH-2432")).toBe(true);
    expect(isOrderCode("DH-12345")).toBe(true);
  });

  it("refuses anything else, so the question is never sent", () => {
    for (const bad of ["", "2432", "dh-2432", "DH-243", "DH-2432 ", "DH-24a2", "DH--2432"]) {
      expect(isOrderCode(bad), bad).toBe(false);
    }
  });

  it("agrees with normaliseOrderCode on what a shopper types", () => {
    expect(isOrderCode(normaliseOrderCode("dh2432"))).toBe(true);
    expect(isOrderCode(normaliseOrderCode(" 2432 "))).toBe(true);
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
  // DH-2425 belongs to Lê Hoàng Nam and is on the road.
  const order = sample("DH-2425");
  const tracked = trackedOfOrder(FIXTURE_CATALOG, order, "88 Xuân Thuỷ, Phường Cầu Giấy, TP. Hà Nội", DURING_5);

  it("carries the courier's number on a shipping order", () => {
    expect(tracked.trackingCode).toBe("VNP-8842204");
    expect(tracked.state).toBe("SHIPPING");
  });

  it("names no courier for a sample parcel that recorded none", () => {
    expect("carrier" in tracked).toBe(false);
  });

  it("names the courier beside the number once a handover recorded one (slice B3a)", () => {
    const handed = {
      ...order,
      status: {
        state: "SHIPPING" as const,
        shippedAt: "2026-09-20T09:00:00+07:00",
        trackingCode: "VNP-2425-01",
        carrier: "Giao tiêu chuẩn · 2–4 ngày",
      },
    };
    const t = trackedOfOrder(FIXTURE_CATALOG, handed, "x", DURING_5);
    expect(t.trackingCode).toBe("VNP-2425-01");
    expect(t.carrier).toBe("Giao tiêu chuẩn · 2–4 ngày");
  });

  it("totals the order from its own lines, never from a typed figure", () => {
    // 390.000 + 450.000 goods, 30.000 delivery, CHAOBAN takes 50.000 off.
    expect(tracked.subtotalVnd).toBe(840_000);
    expect(tracked.totalVnd).toBe(820_000);
    expect(tracked.units).toBe(2);
  });

  it("prints the milestone on the road as it is, with no note about the courier feed", () => {
    // "đơn vị vận chuyển chưa nối, mốc này cập nhật tay từ cửa hàng" went
    // with the explanatory copy the user dropped (v3 slice 13).
    const now = tracked.steps.find((s) => s.state === "now");
    expect(now?.detail).toMatch(/^\d{2}:\d{2} · \d{2}\/\d{2} · mã vận đơn VNP-8842204$/);
    expect(now?.detail).not.toContain("cập nhật tay");
  });

  it("stamps the milestones clock first", () => {
    expect(tracked.steps[0]!.detail).toBe("14:50 · 15/09");
  });

  it("counts a shipped order as paid", () => {
    expect(tracked.paid).toBe(true);
  });

  it("carries what the sample recorded about delivery: the standard service, no note", () => {
    expect(tracked.delivery).toBe("STANDARD");
    expect(tracked.note).toBe("");
    expect(tracked.codFeeVnd).toBe(0);
  });
});

describe("trackedOfOrder — an order placed at checkout", () => {
  const t = trackedOfOrder(FIXTURE_CATALOG, placed, "12 Nguyễn Huệ, Phường Sài Gòn, TP. Hồ Chí Minh", DURING_5);

  it("keeps the note typed for the courier, and the service chosen", () => {
    expect(t.note).toBe("Gọi trước 10 phút");
    expect(t.delivery).toBe("EXPRESS");
  });

  it("prints the handling fee and counts it into the total", () => {
    expect(t.codFeeVnd).toBe(15_000);
    expect(t.totalVnd).toBe(390_000 + 45_000 + 15_000);
  });

  it("never claims a COD order was paid — the money is collected at the door", () => {
    expect(t.state).toBe("RECEIVED");
    expect(t.paid).toBe(false);
    expect(totalRowLabel(t.state)).toBe("Cần thanh toán");
  });

  it("reads its names and photos out of the catalogue", () => {
    // The name the shop shows it under: the issue's code in front (v3 slice 11).
    expect(t.lines[0]).toMatchObject({ name: "S05\u00a0– KHÓI", colorLabel: "Đen", size: "M", qty: 1 });
  });

  it("shows the order and the two steps still ahead", () => {
    expect(t.steps.map((s) => s.title)).toEqual(["Đã nhận đơn", "Đóng gói", "Giao hàng"]);
    expect(t.steps[0]!.detail).toBe("09:00 · 20/09");
  });
});

describe("trackedOfOrder — a transfer that ran out of time", () => {
  // DH-2430 waits for a transfer, due 21/09 19:50.
  const order = sample("DH-2430");

  it("is only waiting while the deadline is ahead", () => {
    const t = trackedOfOrder(FIXTURE_CATALOG, order, "…", new Date("2026-09-21T10:00:00+07:00"));
    expect(t.steps.find((s) => s.title === "Chờ chuyển khoản")!.state).toBe("todo");
  });

  it("is a CANCELLED order once it has passed, not a late step", () => {
    // `effectiveStatus`: the hold is the shop's own promise, so an unpaid
    // transfer past its deadline is cancelled on every surface that reads
    // it — the stamp is the DEADLINE, not the moment somebody looked.
    const t = trackedOfOrder(FIXTURE_CATALOG, order, "…", new Date("2026-09-22T10:00:00+07:00"));
    expect(t.state).toBe("CANCELLED");
    expect(t.steps.some((s) => s.title === "Chờ chuyển khoản")).toBe(false);
    const last = t.steps[t.steps.length - 1]!;
    expect(last.title).toBe("Đã huỷ — quá hạn chuyển khoản");
    expect(last.detail).toBe("19:50 · 21/09");
    expect(t.paid).toBe(false);
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
    const order = sample("DH-2425");
    const t = trackedOfOrder(FIXTURE_CATALOG, order, "…", DURING_5);
    expect(lastUpdateLabel(t.steps)).toBe("09:15 · 17/09");
  });

  it("is empty when nothing carries a stamp", () => {
    expect(lastUpdateLabel([{ title: "Đã giao", state: "todo" }])).toBe("");
  });
});
