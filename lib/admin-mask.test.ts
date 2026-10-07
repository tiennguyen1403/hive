import { describe, expect, it } from "vitest";
import { CUSTOMERS } from "@/data/customers";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";
import { ORDERS } from "@/data/orders";
import { addressId, customerId, orderCode, type Address } from "@/data/types";
import { diffText, logAuthorLabel, logHaystack, logRows, logStamp } from "./activity-log";
import { customerRows, isSampleAccount, type AdminCustomer, type AdminCustomerDetail } from "./admin-customers";
import {
  MASK,
  maskAdminCustomer,
  maskAdminCustomerDetail,
  maskAdminEvents,
  maskAdminOrder,
  maskEmail,
  maskName,
  maskPhone,
  maskText,
  sampleOrderCodes,
} from "./admin-mask";
import { isSampleOrder, isSampleOrderJson, type AdminOrder } from "./admin-orders";
import { plainText } from "./admin-text";
import type { AdminEvent } from "./db/event-dto";
import type { Locale } from "./i18n";
import { ordersCsvRows } from "./orders-csv";
import { PHONE_GAP, formatPhone } from "./phone";

/**
 * Slice B17 (QĐ-44): the public back office masks what belongs to real
 * people, in its reads, before anything reaches a component — so no screen,
 * payload, search or CSV built from those reads can carry the real value, and
 * the sample comes through as the very same objects.
 */

const NOW = new Date("2026-09-20T18:50:00+07:00");
const AT = "2026-09-20T18:52:00+07:00";

/** A real person, as they typed themselves in. Nothing here collides with the fixture. */
const REAL = {
  name: "Peter Smith",
  email: "peter.smith@gmail.com",
  phone: "0987654678",
  line: "47 Hẻm Mười Bảy",
  note: "Gọi trước khi giao, cổng xanh",
};
/** A guest, typing at checkout. */
const GUEST = {
  name: "Mai Thị Hồng",
  email: "hong.mai@example.test",
  phone: "0933444555",
  line: "88 Ngõ Thử Nghiệm",
  note: "Để ở phòng bảo vệ",
};

/** Every string of a real value, raw and as a screen would print it. */
const SECRETS = [REAL, GUEST].flatMap((p) => [
  p.name,
  p.email,
  p.phone,
  formatPhone(p.phone),
  formatPhone(p.phone).replace(new RegExp(PHONE_GAP, "g"), " "),
  p.line,
  p.note,
]);
/** The same, as a search box would compare them. */
const NEEDLES = SECRETS.map((s) => s.toLocaleLowerCase("vi"));

function leaks(value: unknown): string[] {
  const text = JSON.stringify(value).toLocaleLowerCase("vi");
  return NEEDLES.filter((s) => text.includes(s));
}

/** The sample book as `admin_orders()` returns it: each order with its account. */
const BOOK: AdminOrder[] = ORDERS.map((o) => {
  const c = CUSTOMERS.find((x) => x.id === o.customerId)!;
  return {
    ...o,
    owner: {
      id: `uuid-${c.id}`,
      handle: String(c.id),
      name: c.name,
      email: c.email,
      phone: c.phone.replace(/\s/g, ""),
      joinedAt: c.joinedAt,
    },
  };
});

const base = ORDERS.find((o) => o.code === "DH-2431")!;

/** An order of an account somebody signed up for: no handle anywhere. */
const REAL_ORDER: AdminOrder = {
  ...base,
  code: orderCode("DH-2433"),
  customerId: customerId(""),
  shipTo: { ...base.shipTo, recipient: REAL.name, phone: REAL.phone, line: REAL.line },
  email: REAL.email,
  note: REAL.note,
  owner: { id: "uuid-real", handle: null, name: REAL.name, email: REAL.email, phone: REAL.phone, joinedAt: AT },
};

/** A guest's order: no account at all. */
const GUEST_ORDER: AdminOrder = {
  ...base,
  code: orderCode("DH-2432"),
  customerId: customerId(""),
  shipTo: { ...base.shipTo, recipient: GUEST.name, phone: GUEST.phone, line: GUEST.line },
  email: GUEST.email,
  note: GUEST.note,
  owner: null,
};

const REAL_ACCOUNT: AdminCustomer = {
  id: "uuid-real",
  handle: null,
  name: REAL.name,
  email: REAL.email,
  phone: REAL.phone,
  joinedAt: AT,
};

const REAL_ADDRESS: Address = {
  id: addressId("addr-real"),
  recipient: REAL.name,
  phone: REAL.phone,
  line: REAL.line,
  provinceCode: "79",
  wardCode: "26734",
  label: "Nhà",
  isDefault: true,
};

const SAMPLE_ACCOUNT: AdminCustomer = {
  id: "uuid-c-minhanh",
  handle: "c-minhanh",
  name: CUSTOMERS[0]!.name,
  email: CUSTOMERS[0]!.email,
  phone: CUSTOMERS[0]!.phone.replace(/\s/g, ""),
  joinedAt: CUSTOMERS[0]!.joinedAt,
};

// ───────────────────────────────────────────────────────── the masks
describe("maskName", () => {
  it("keeps the first word and the last one's initial", () => {
    expect(maskName("Peter Smith")).toBe("Peter S.");
    expect(maskName("Nguyễn Văn Tiến")).toBe("Nguyễn T.");
    expect(maskName("  Trần   Anh  ")).toBe("Trần A.");
    expect(maskName("Lê Ánh")).toBe("Lê Á.");
  });

  it("shows a one-word name as its initial and three dots", () => {
    expect(maskName("Peter")).toBe(`P${MASK}${MASK}${MASK}`);
    expect(maskName("Peter")).toBe("P•••");
    expect(maskName("Ánh")).toBe("Á•••");
    expect(maskName("đức")).toBe("đ•••");
  });

  it("keeps a letter typed as a base and its marks whole", () => {
    const decomposed = "Ánh".normalize("NFD");
    expect(maskName(decomposed)).toBe(`${"Á".normalize("NFD")}•••`);
    expect(maskName(`Lê ${decomposed}`)).toBe(`Lê ${"Á".normalize("NFD")}.`);
  });

  it("takes the initial from the first letter or digit of a word", () => {
    expect(maskName("Peter (Pete)")).toBe("Peter P.");
    expect(maskName("@peter")).toBe("p•••");
  });

  it("never prints a first word that carries an email or a number", () => {
    expect(maskName("peter.smith@gmail.com")).toBe("p•••");
    expect(maskName("peter.smith@gmail.com Smith")).toBe("p••• S.");
    expect(maskName("0987654678 Peter")).toBe("0••• P.");
  });

  it("leaves a blank name blank", () => {
    expect(maskName("")).toBe("");
    expect(maskName("   ")).toBe("");
  });
});

describe("maskEmail", () => {
  it("keeps two characters before the @ and the whole domain", () => {
    expect(maskEmail("peter.smith@gmail.com")).toBe("pe•••@gmail.com");
    expect(maskEmail("  PETER@Gmail.com ")).toBe("PE•••@Gmail.com");
  });

  it("keeps one character when there are only one or two before the @", () => {
    expect(maskEmail("pe@gmail.com")).toBe("p•••@gmail.com");
    expect(maskEmail("p@gmail.com")).toBe("p•••@gmail.com");
  });

  it("leaves no address blank, and hides an address without a domain all the same", () => {
    expect(maskEmail("")).toBe("");
    expect(maskEmail("nodomain")).toBe("no•••");
  });
});

describe("maskPhone", () => {
  it("keeps the first two and the last three digits, grouped like a sample number", () => {
    expect(maskPhone("0987654678")).toBe(`09••${PHONE_GAP}•••${PHONE_GAP}678`);
    expect(maskPhone("0987654678").replace(new RegExp(PHONE_GAP, "g"), " ")).toBe("09•• ••• 678");
    expect(maskPhone("0987 654 678")).toBe(maskPhone("0987654678"));
  });

  it("is printed as it is by formatPhone, which every screen calls", () => {
    expect(formatPhone(maskPhone("0987654678"))).toBe(maskPhone("0987654678"));
  });

  it("leaves an empty number empty", () => {
    expect(maskPhone("")).toBe("");
  });

  it("hides a number too short to keep five digits of", () => {
    expect(maskPhone("12345")).toBe("•••••");
    expect(maskPhone("1234567")).toBe(`12••${PHONE_GAP}567`);
  });
});

describe("maskText", () => {
  it("hides a street line or a typed note whole, and keeps nothing as nothing", () => {
    expect(maskText(REAL.line)).toBe("•••");
    expect(maskText(REAL.note)).toBe("•••");
    expect(maskText("")).toBe("");
    expect(maskText("   ")).toBe("");
  });
});

// ─────────────────────────────────────────────── sample or real
describe("which data is the sample's", () => {
  it("reads an account by its handle", () => {
    expect(isSampleAccount({ handle: "c-minhanh" })).toBe(true);
    expect(isSampleAccount({ handle: "a-quanly" })).toBe(true);
    expect(isSampleAccount({ handle: null })).toBe(false);
  });

  it("reads an order by the handle it was placed under", () => {
    expect(ORDERS.every(isSampleOrder)).toBe(true);
    expect(isSampleOrder(REAL_ORDER)).toBe(false);
    expect(isSampleOrder(GUEST_ORDER)).toBe(false);
  });

  it("reads a raw order_json() document the same way, anything unexpected as real", () => {
    expect(isSampleOrderJson({ code: "DH-2431", customerId: "c-vynguyen" })).toBe(true);
    expect(isSampleOrderJson({ code: "DH-2433", customerId: "" })).toBe(false);
    for (const odd of [null, undefined, [], {}, "c-minhanh", 7, { customerId: 7 }]) {
      expect(isSampleOrderJson(odd)).toBe(false);
    }
  });
});

// ──────────────────────────────────────────────────────── the DTOs
describe("maskAdminOrder", () => {
  it("hands every sample order back as the same object", () => {
    for (const o of BOOK) expect(maskAdminOrder(o)).toBe(o);
  });

  it("masks a real account's order, and keeps what the shop works with", () => {
    const m = maskAdminOrder(REAL_ORDER);
    expect(m.shipTo).toEqual({
      recipient: "Peter S.",
      phone: `09••${PHONE_GAP}•••${PHONE_GAP}678`,
      line: "•••",
      provinceCode: REAL_ORDER.shipTo.provinceCode,
      wardCode: REAL_ORDER.shipTo.wardCode,
    });
    expect(m.email).toBe("pe•••@gmail.com");
    expect(m.note).toBe("•••");
    expect(m.owner).toEqual({
      id: "uuid-real",
      handle: null,
      name: "Peter S.",
      email: "pe•••@gmail.com",
      phone: `09••${PHONE_GAP}•••${PHONE_GAP}678`,
      joinedAt: AT,
    });
    const { shipTo: _s, email: _e, note: _n, owner: _o, ...rest } = m;
    const { shipTo: _s2, email: _e2, note: _n2, owner: _o2, ...same } = REAL_ORDER;
    expect(rest).toEqual(same);
    expect(leaks(m)).toEqual([]);
  });

  it("masks a guest's order, and keeps an e-mail nobody typed as none", () => {
    const m = maskAdminOrder(GUEST_ORDER);
    expect(m.owner).toBeNull();
    expect(m.shipTo.recipient).toBe("Mai H.");
    expect(m.email).toBe("ho•••@example.test");
    expect(leaks(m)).toEqual([]);
    const silent = maskAdminOrder({ ...GUEST_ORDER, email: null, note: "" });
    expect(silent.email).toBeNull();
    expect(silent.note).toBe("");
  });
});

describe("maskAdminCustomer and maskAdminCustomerDetail", () => {
  it("hands a sample account back as the same object", () => {
    expect(maskAdminCustomer(SAMPLE_ACCOUNT)).toBe(SAMPLE_ACCOUNT);
    const detail: AdminCustomerDetail = { ...SAMPLE_ACCOUNT, addresses: [REAL_ADDRESS] };
    expect(maskAdminCustomerDetail(detail)).toBe(detail);
  });

  it("masks a real account, and every address of its book", () => {
    expect(maskAdminCustomer(REAL_ACCOUNT)).toEqual({
      ...REAL_ACCOUNT,
      name: "Peter S.",
      email: "pe•••@gmail.com",
      phone: `09••${PHONE_GAP}•••${PHONE_GAP}678`,
    });
    const second: Address = { ...REAL_ADDRESS, id: addressId("addr-2"), isDefault: false, label: "Công ty" };
    const m = maskAdminCustomerDetail({ ...REAL_ACCOUNT, addresses: [REAL_ADDRESS, second] });
    expect(m.addresses.map((a) => [a.recipient, a.line, a.label, a.isDefault, a.provinceCode])).toEqual([
      ["Peter S.", "•••", "Nhà", true, "79"],
      ["Peter S.", "•••", "Công ty", false, "79"],
    ]);
    expect(leaks(m)).toEqual([]);
  });

  it("keeps a sign-up without a number without one", () => {
    expect(maskAdminCustomer({ ...REAL_ACCOUNT, phone: "" }).phone).toBe("");
  });
});

describe("maskAdminEvents", () => {
  const book = [...BOOK, REAL_ORDER, GUEST_ORDER].map(maskAdminOrder);
  const samples = sampleOrderCodes(book);
  let id = 0;
  const ev = (e: Record<string, unknown>): AdminEvent =>
    ({ id: ++id, at: AT, actorRole: "admin", actor: "quanly@email.com", code: "DH-2431", ...e }) as AdminEvent;
  const shipTo = (who: typeof REAL) => ({
    recipient: who.name,
    phone: who.phone,
    line: who.line,
    provinceCode: "79",
    wardCode: "26734",
  });

  it("knows the book's sample orders, and only those", () => {
    expect(samples.size).toBe(BOOK.length);
    expect(samples.has("DH-2433")).toBe(false);
    expect(samples.has("DH-2432")).toBe(false);
  });

  it("leaves the system, the shared demo accounts and their events as they are", () => {
    const events = [
      ev({ actorRole: "system", actor: "", kind: "ORDER_EXPIRED" }),
      ev({ kind: "ORDER_NOTE", text: "gọi khách" }),
      ev({ actorRole: "customer", actor: "minhanh@email.com", code: "DH-2430", kind: "ORDER_PLACED" }),
      ev({
        kind: "ORDER_ADDRESS_EDITED",
        before: shipTo(REAL),
        after: shipTo(GUEST),
        reason: "khách nhắn đổi số nhà",
      }),
    ];
    const out = maskAdminEvents(events, samples);
    out.forEach((e, i) => expect(e).toBe(events[i]));
  });

  it("masks a real actor, and a real order's address change before and after", () => {
    const placed = ev({ actorRole: "customer", actor: REAL.email, code: "DH-2433", kind: "ORDER_PLACED" });
    const moved = ev({
      code: "DH-2433",
      kind: "ORDER_ADDRESS_EDITED",
      before: shipTo(REAL),
      after: shipTo(GUEST),
      reason: "khách nhắn đổi số nhà",
    });
    const unknown = ev({ code: "DH-9999", kind: "ORDER_ADDRESS_EDITED", before: shipTo(REAL), after: shipTo(REAL), reason: "x" });
    const [p, m, u] = maskAdminEvents([placed, moved, unknown], samples);
    expect(p!.actor).toBe("pe•••@gmail.com");
    expect(m).toMatchObject({
      actor: "quanly@email.com",
      reason: "khách nhắn đổi số nhà",
      before: { recipient: "Peter S.", line: "•••", provinceCode: "79" },
      after: { recipient: "Mai H.", line: "•••", wardCode: "26734" },
    });
    expect(u).toMatchObject({ before: { line: "•••" }, after: { line: "•••" } });
    expect(leaks([p, m, u])).toEqual([]);
  });

  it("keeps what the shop typed on a real order: its note and a tracking number", () => {
    const note = ev({ code: "DH-2433", kind: "ORDER_NOTE", text: "khách hẹn giao sau 18 giờ" });
    const shipped = ev({ code: "DH-2433", kind: "ORDER_SHIPPED", trackingCode: "VNP-2433-01" });
    const out = maskAdminEvents([note, shipped], samples);
    expect(out[0]).toBe(note);
    expect(out[1]).toBe(shipped);
  });
});

// ─────────────────────────────────────── what the screens build from it
describe("the files and the searches built from the masked reads", () => {
  const book = [...BOOK, REAL_ORDER, GUEST_ORDER].map(maskAdminOrder);
  const samples = sampleOrderCodes(book);
  let id = 0;
  const events = maskAdminEvents(
    [
      { id: ++id, at: AT, actorRole: "customer", actor: REAL.email, code: "DH-2433", kind: "ORDER_PLACED" },
      { id: ++id, at: AT, actorRole: "customer", actor: GUEST.email, code: "DH-2432", kind: "ORDER_PLACED" },
      {
        id: ++id,
        at: AT,
        actorRole: "admin",
        actor: "quanly@email.com",
        code: "DH-2433",
        kind: "ORDER_ADDRESS_EDITED",
        before: { recipient: REAL.name, phone: REAL.phone, line: REAL.line, provinceCode: "29", wardCode: "70101063" },
        after: { recipient: REAL.name, phone: REAL.phone, line: "12 Phố Thử", provinceCode: "29", wardCode: "70101063" },
        reason: "khách gọi đổi số nhà",
      },
    ],
    samples,
  );
  const customers = [SAMPLE_ACCOUNT, REAL_ACCOUNT].map(maskAdminCustomer);

  for (const locale of ["vi", "en"] as Locale[]) {
    it(`the order book's CSV holds no real value (${locale})`, () => {
      const rows = ordersCsvRows(FIXTURE_CATALOG, book, locale);
      expect(rows).toHaveLength(book.length + 1);
      expect(leaks(rows)).toEqual([]);
      // …and the sample's rows are the ones they always were.
      expect(ordersCsvRows(FIXTURE_CATALOG, BOOK, locale)).toEqual(rows.slice(0, BOOK.length + 1));
    });

    it(`the log, its CSV and its search hold no real value (${locale})`, () => {
      const rows = logRows(FIXTURE_CATALOG, events, book, NOW, locale);
      const csv = rows.map((r) => [
        logStamp(r.at, locale),
        r.action,
        plainText(r.detail),
        plainText(r.subject),
        diffText(r),
        logAuthorLabel(r.author, locale),
      ]);
      expect(leaks(rows)).toEqual([]);
      expect(leaks(csv)).toEqual([]);
      expect(leaks(rows.map(logHaystack))).toEqual([]);
      // The real account's name is in the log, shortened.
      expect(rows.some((r) => plainText(r.subject) === "DH-2433 · Peter S.")).toBe(true);
    });

    it(`the customer list, its CSV and its search hold no real value (${locale})`, () => {
      const rows = customerRows(FIXTURE_CATALOG, customers, book, 5, NOW, locale);
      // The columns `ArcCustomersScreen` writes into "khach-hang.csv" and searches.
      const csv = rows.map(({ customer, facts }) => [customer.name, customer.phone, customer.email, facts.orders.length]);
      expect(leaks(csv)).toEqual([]);
      expect(rows[0]!.customer).toBe(SAMPLE_ACCOUNT);
    });
  }

  it("so no search box finds a real person by the whole of anything real", () => {
    // The order book searches the code, the account's name, number and e-mail,
    // and the delivery name and number (`ArcOrdersScreen`); the customer list
    // the name, number and e-mail (`ArcCustomersScreen`).
    const orderFields = (o: AdminOrder) =>
      [String(o.code), o.owner?.name, o.owner?.phone, o.owner?.email, o.shipTo.recipient, o.shipTo.phone].filter(
        (v): v is string => Boolean(v),
      );
    const customerFields = (c: AdminCustomer) => [c.name, c.phone, c.email];
    for (const needle of NEEDLES) {
      expect(book.some((o) => orderFields(o).some((v) => v.toLocaleLowerCase("vi").includes(needle))), needle).toBe(false);
      expect(customers.some((c) => customerFields(c).some((v) => v.toLocaleLowerCase("vi").includes(needle))), needle).toBe(
        false,
      );
    }
    // What is printed is still found: the shortened name, the last digits.
    expect(book.some((o) => orderFields(o).some((v) => v.toLocaleLowerCase("vi").includes("peter s.")))).toBe(true);
    expect(customers.some((c) => customerFields(c).some((v) => v.includes("678")))).toBe(true);
  });
});
