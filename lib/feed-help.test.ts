import { describe, expect, it } from "vitest";
import { FIXTURE_CATALOG as C } from "@/data/fixture-catalog";
import type { Drop } from "@/data/types";
import { buildCatalog } from "./catalog";
import {
  HELP_GROUP_IDS,
  answerText,
  foldHelp,
  helpGroups,
  helpHits,
  helpNext,
  helpQuery,
  helpSearch,
  helpWords,
  isHelpGroupId,
  markPieces,
  type HelpGroup,
  type HelpItem,
} from "./feed-help";
import { vnd } from "./money";
import { COD_SURCHARGE_VND, EXPRESS_FEE_VND, FREE_SHIPPING_FROM_VND, RETURN_WINDOW_DAYS, STANDARD_FEE_VND } from "./shipping";

/** The fixture's own moment: 18:50 20/09, Số 05 selling (11–25/09), Số 06 announced for 20:00 02/10. */
const OPEN = new Date("2026-09-20T18:50:00+07:00");
/** Between two issues: Số 05 closed on 25/09 and Số 06 left out of the catalogue. */
const GAP = new Date("2026-09-28T19:02:00+07:00");
const withoutSix = buildCatalog({
  products: [...C.products],
  drops: C.drops.filter((d: Drop) => d.no !== 6),
  teasers: C.teasers.filter((t) => t.dropNo !== 6),
  promotions: [...C.promotions],
});

const groups = helpGroups(helpNext(C, OPEN));
const item = (q: string): HelpItem => {
  for (const g of groups) for (const it of g.items) if (it.q === q) return it;
  throw new Error(`no question ${q}`);
};
const answer = (q: string) => answerText(item(q).a);
const bold = (q: string) => item(q).a.flatMap((bit) => (typeof bit === "string" ? [] : [bit.b]));

describe("Hỏi đáp: the groups, as the mock's help.js lays them out", () => {
  it("has six groups in the mock's order, each with its anchor", () => {
    expect(groups.map((g) => g.id)).toEqual([...HELP_GROUP_IDS]);
    expect(groups.map((g) => g.title)).toEqual(["Đặt hàng", "Thanh toán", "Giao hàng", "Đổi trả", "Size", "Tài khoản"]);
    expect(groups.map((g) => g.items.length)).toEqual([5, 4, 4, 6, 3, 4]);
    expect(isHelpGroupId("doi-tra")).toBe(true);
    expect(isHelpGroupId("returns")).toBe(false);
  });

  it("asks the mock's questions, in its order", () => {
    expect(groups.flatMap((g) => g.items.map((it) => it.q))).toEqual([
      "Mua có cần tài khoản không?",
      "Khi nào có Số mới?",
      "Hết size thì có về lại không?",
      "Huỷ đơn thế nào?",
      "Dùng mã giảm giá ở đâu?",
      "Có những cách thanh toán nào?",
      "Chuyển khoản thế nào?",
      "COD có mất thêm phí không?",
      "Trả bằng thẻ được chưa?",
      "Giao tới đâu?",
      "Phí giao hàng bao nhiêu?",
      "Bao lâu thì nhận được hàng?",
      "Theo dõi đơn ở đâu?",
      "Đổi trả trong bao lâu?",
      "Gửi yêu cầu đổi trả thế nào?",
      "Ai trả phí gửi hàng về?",
      "Hoàn tiền thế nào?",
      "Đổi sang size khác được không?",
      "Lý do nào được đổi trả?",
      "Chọn size thế nào?",
      "Size có chia nam nữ không?",
      "Lưu size của mình ở đâu?",
      "Đăng nhập bằng gì?",
      "Quên mật khẩu thì sao?",
      "Đổi email ở đâu?",
      "Nhắc mở bán gửi qua đâu?",
    ]);
  });

  it("gives every answer the mock's id, one per question", () => {
    const ids = groups.flatMap((g) => g.items.map((it) => it.id));
    expect(new Set(ids).size).toBe(26);
    expect(item("Đổi trả trong bao lâu?").id).toBe("q-doi-tra-0");
    expect(item("Nhắc mở bán gửi qua đâu?").id).toBe("q-tai-khoan-3");
  });
});

describe("Hỏi đáp: every figure is the app's own", () => {
  it("prices delivery from lib/shipping, the three figures bold", () => {
    expect(answer("Phí giao hàng bao nhiêu?")).toBe(
      `Giao tiêu chuẩn ${vnd(STANDARD_FEE_VND)}, miễn phí cho đơn từ ${vnd(FREE_SHIPPING_FROM_VND)}. Giao nhanh ${vnd(EXPRESS_FEE_VND)}.`,
    );
    expect(bold("Phí giao hàng bao nhiêu?")).toEqual(["30.000₫", "1.000.000₫", "45.000₫"]);
  });

  it("counts the days from the services, and says where each goes", () => {
    expect(answer("Bao lâu thì nhận được hàng?")).toBe("Giao tiêu chuẩn 2 đến 4 ngày, giao nhanh trong 24 giờ.");
    expect(answer("Giao tới đâu?")).toBe(
      "Giao tiêu chuẩn tới mọi tỉnh thành. Giao nhanh chỉ nội thành TP. Hồ Chí Minh, trong giờ hành chính.",
    );
  });

  it("names the ways to pay as the checkout's cards do, and the COD fee", () => {
    expect(answer("Có những cách thanh toán nào?")).toBe("Chuyển khoản, thanh toán khi nhận (COD), thẻ (nội địa, Visa).");
    expect(answer("COD có mất thêm phí không?")).toBe(
      `Có, thêm ${vnd(COD_SURCHARGE_VND)}. Cửa hàng gọi xác nhận trước khi giao. Kiểm hàng trước khi trả.`,
    );
    expect(bold("COD có mất thêm phí không?")).toEqual(["15.000₫"]);
    expect(answer("Chuyển khoản thế nào?")).toBe(
      "Giữ hàng 12 giờ kể từ khi đặt. Nội dung chuyển khoản hiện ở màn xác nhận. Số tài khoản và tên ngân hàng đang chuẩn bị.",
    );
    expect(answer("Trả bằng thẻ được chưa?")).toBe("Cổng thẻ đang chuẩn bị. Đơn chọn thẻ trả bằng chuyển khoản, cùng hạn giữ hàng.");
  });

  it("states the return rules the user settled on 27/09, from lib/returns", () => {
    expect(answer("Đổi trả trong bao lâu?")).toBe(`Trong ${RETURN_WINDOW_DAYS} ngày kể từ khi nhận hàng. Hàng chưa mặc, còn nhãn.`);
    expect(bold("Đổi trả trong bao lâu?")).toEqual(["7 ngày"]);
    expect(answer("Ai trả phí gửi hàng về?")).toBe("Cửa hàng trả.");
    expect(answer("Hoàn tiền thế nào?")).toBe(
      "Chuyển khoản vào tài khoản ngân hàng của bạn, đúng số đã trả cho những món trả lại: giá món trừ phần mã giảm giá. " +
        "Trả cả đơn vì khác với ảnh, lỗi may hoặc in hay giao nhầm món thì hoàn cả phí giao hàng và phụ phí COD.",
    );
    expect(answer("Đổi sang size khác được không?")).toBe(
      "Được, trong hạn đổi trả, sang size cùng màu còn hàng, kể cả khi Số đã đóng.",
    );
    expect(answer("Lý do nào được đổi trả?")).toBe(
      "Không vừa size, khác với ảnh, lỗi may hoặc in, giao nhầm món, đổi ý. Lỗi may hoặc in và giao nhầm món cần ít nhất một ảnh.",
    );
  });

  it("reads the size range and the fits from the catalogue's own lists", () => {
    expect(answer("Size có chia nam nữ không?")).toBe("Không. Một dải size S đến XL cho tất cả.");
    expect(answer("Chọn size thế nào?")).toBe(
      "Số đo áo theo form oversize, regular, quần dài và quần short đều ở Bảng size.",
    );
  });
});

describe("Hỏi đáp: the four answers the app words its own way (brief 4b, QĐ-34, QĐ-35)", () => {
  it("promises no return request, no reset link and no email, and links nowhere for them", () => {
    expect(answer("Gửi yêu cầu đổi trả thế nào?")).toBe("Yêu cầu đổi trả trên trang đơn đang chuẩn bị.");
    expect(answer("Quên mật khẩu thì sao?")).toBe("Đặt lại mật khẩu qua email đang chuẩn bị.");
    expect(answer("Đổi email ở đâu?")).toBe("Đổi email đang chuẩn bị.");
    for (const q of ["Gửi yêu cầu đổi trả thế nào?", "Quên mật khẩu thì sao?", "Đổi email ở đâu?"]) {
      expect(item(q).go, q).toBeUndefined();
    }
  });

  it("sends reminders through Thông báo alone, with the way to it", () => {
    expect(answer("Nhắc mở bán gửi qua đâu?")).toBe("Qua Thông báo trong app. Bật hoặc tắt ở mục Thông báo.");
    expect(item("Nhắc mở bán gửi qua đâu?").go).toEqual({ href: "/account/notifications", label: "Mở Thông báo" });
  });

  it("never mentions email where the app has none", () => {
    const all = groups.flatMap((g) => g.items.map((it) => answerText(it.a))).join(" ");
    expect(all.match(/email/gi)).toHaveLength(3); // "Email và mật khẩu", "qua email đang chuẩn bị", "Đổi email đang chuẩn bị"
    expect(all).not.toContain("gửi về email");
  });
});

describe("Hỏi đáp: the links lead to the app's routes", () => {
  it("links the mock's pages by their app routes", () => {
    const links = groups.flatMap((g) => g.items.flatMap((it) => (it.go ? [[it.q, it.go.href, it.go.label]] : [])));
    expect(links).toEqual([
      ["Khi nào có Số mới?", "/#sap-mo", "Xem Sắp mở"],
      ["Hết size thì có về lại không?", "/products?line=fixed", "Xem Cố định"],
      ["Theo dõi đơn ở đâu?", "/track", "Tra cứu đơn"],
      ["Chọn size thế nào?", "/size-guide", "Xem Bảng size"],
      ["Lưu size của mình ở đâu?", "/account/profile#size", "Mở Size của tôi"],
      ["Nhắc mở bán gửi qua đâu?", "/account/notifications", "Mở Thông báo"],
    ]);
  });
});

describe("Hỏi đáp: when the next issue opens follows the clock", () => {
  it("names the issue announced after the one selling, and its opening, bold", () => {
    expect(helpNext(C, OPEN)).toEqual({ no: 6, opensAt: "2026-10-02T20:00:00+07:00" });
    expect(answer("Khi nào có Số mới?")).toBe("Số 06 mở lúc 20:00 thứ Sáu 02/10.");
    expect(bold("Khi nào có Số mới?")).toEqual(["Số 06", "20:00 thứ Sáu 02/10"]);
  });

  it("still names it once the issue before has closed", () => {
    expect(helpNext(C, GAP)).toEqual({ no: 6, opensAt: "2026-10-02T20:00:00+07:00" });
  });

  it("says there is none between two issues, and offers the switch for new issues", () => {
    expect(helpNext(withoutSix, GAP)).toBeNull();
    const none = helpGroups(null)[0]!.items[1]!;
    expect(answerText(none.a)).toBe("Chưa có Số mới.");
    expect(none.go).toEqual({ href: "/account/notifications#cai-dat", label: "Bật báo Số mới" });
  });
});

describe("Hỏi đáp: the search", () => {
  const found = (q: string) =>
    helpSearch(groups, helpWords(q)).map((g: HelpGroup) => [g.id, g.items.map((it) => it.q)] as const);

  it("folds accents, đ and case, one character for one", () => {
    expect(foldHelp("Đổi trả ĐƠN")).toBe("doi tra don");
    expect(foldHelp("Hoàn tiền thế nào?")).toHaveLength("Hoàn tiền thế nào?".length);
    expect(helpWords("  Đổi   TRẢ ")).toEqual(["doi", "tra"]);
    expect(helpWords("   ")).toEqual([]);
  });

  it("finds what the mock finds for ?q=cod: four answers in three groups", () => {
    expect(found("cod")).toEqual([
      ["dat-hang", ["Huỷ đơn thế nào?"]],
      ["thanh-toan", ["Có những cách thanh toán nào?", "COD có mất thêm phí không?"]],
      ["doi-tra", ["Hoàn tiền thế nào?"]],
    ]);
  });

  it("needs every word, found in the question, the answer or the link", () => {
    expect(found("doi tra 7 ngay")).toEqual([["doi-tra", ["Đổi trả trong bao lâu?"]]]);
    expect(helpHits(item("Chọn size thế nào?"), helpWords("xem bang size"))).toBe(true);
    expect(found("zzzz")).toEqual([]);
  });

  it("shows everything for an empty query", () => {
    expect(helpSearch(groups, [])).toHaveLength(6);
  });

  it("marks each match where it stands, accents kept on screen", () => {
    expect(markPieces("Đổi trả trong bao lâu?", helpWords("doi tra"))).toEqual([
      { text: "Đổi", hit: true },
      { text: " ", hit: false },
      { text: "trả", hit: true },
      { text: " trong bao lâu?", hit: false },
    ]);
    expect(markPieces("thanh toán khi nhận (COD)", ["cod"])).toEqual([
      { text: "thanh toán khi nhận (", hit: false },
      { text: "COD", hit: true },
      { text: ")", hit: false },
    ]);
  });

  it("makes one mark of matches that overlap or touch", () => {
    expect(markPieces("codcod", ["cod", "odc"])).toEqual([{ text: "codcod", hit: true }]);
    expect(markPieces("abc", [])).toEqual([{ text: "abc", hit: false }]);
    expect(markPieces("abc", ["x"])).toEqual([{ text: "abc", hit: false }]);
  });

  it("writes the query into the address, and nothing for none", () => {
    expect(helpQuery(" cod ")).toBe("?q=cod");
    expect(helpQuery("đổi trả")).toBe("?q=%C4%91%E1%BB%95i+tr%E1%BA%A3");
    expect(helpQuery("")).toBe("");
  });
});
