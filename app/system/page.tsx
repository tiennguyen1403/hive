import type { Metadata } from "next";
import { FeedLogo } from "@/components/feed/FeedLogo";
import { FeedScope } from "@/components/feed/FeedScope";
import { FeedIcon } from "@/components/feed/icon/FeedIcon";
import { FEED_ICON_NAMES } from "@/components/feed/icon/paths";
import { FAMILY_SHORT_LABELS, type Family } from "@/data/types";
import { vnd } from "@/lib/money";
import { TRANSFER_HOLD_HOURS } from "@/lib/orders";
import { COD_SURCHARGE_VND } from "@/lib/shipping";
import { KitChips } from "./KitChips";
import { KitSort } from "./KitSort";
import { KitTokens } from "./KitTokens";

export const metadata: Metadata = {
  title: "Bộ kit Feed",
  // A review page, linked from nowhere: no search engine should list it.
  robots: { index: false, follow: false },
};

/** The families in the order the mock's filter row lists them (`HIVE.FAMILIES`). */
const MOCK_FAMILY_ORDER: readonly Family[] = ["TEE", "HOODIE", "JACKET", "SHIRT", "PANTS", "VEST"];

/** `direction.json` → `type`: the display weights, then the interface weights. */
const DISPLAY_WEIGHTS = [800, 850, 900] as const;
const UI_WEIGHTS = [450, 520, 560, 620, 680, 700] as const;

/**
 * `/system` — the Feed round's kit (v4 slice 0): the tokens, Mona Sans, the
 * Phosphor set, the black-and-white logo and the controls the later slices
 * build with, inside the Feed zone, for the main session to review. Linked
 * from nowhere, `noindex`, and deleted when the round is done.
 *
 * Every control is the mock's own markup and words (`feed.js`,
 * `checkout.js`); the figures come from `lib/`. The buttons are specimens:
 * they press, hover and take focus, and do nothing else.
 */
export default function SystemPage() {
  const chips = ["Mọi loại", ...MOCK_FAMILY_ORDER.map((f) => FAMILY_SHORT_LABELS[f])];

  return (
    <FeedScope className="kit">
      <main className="kit-main">
        <header>
          <h1 className="disp kit-title">Bộ kit Feed</h1>
          <p className="kit-lead">
            Đợt v4, lát 0: token, chữ Mona Sans, icon Phosphor, logo đen trắng. Trang duyệt nội bộ, không liên kết từ
            đâu, xoá khi xong đợt.
          </p>
        </header>

        <section className="kit-sec" aria-labelledby="k-colour">
          <h2 className="kit-h2" id="k-colour">
            Màu
          </h2>
          <KitTokens />
        </section>

        <section className="kit-sec" aria-labelledby="k-type">
          <h2 className="kit-h2" id="k-type">
            Chữ
          </h2>
          <ul className="kit-type">
            {DISPLAY_WEIGHTS.map((w) => (
              <li key={w}>
                <p className={`disp kit-disp kit-w${w}`}>SƯƠNG ĐÃ HẾT NGƯỜI</p>
                <p className="kit-cap">Hiển thị · rộng 75% · {w}</p>
              </li>
            ))}
            {UI_WEIGHTS.map((w) => (
              <li key={w}>
                <p className={`kit-ui kit-w${w}`}>Giá và số lượng công bố lúc mở.</p>
                <p className="kit-cap">Giao diện · rộng 100% · {w}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="kit-sec" aria-labelledby="k-btn">
          <h2 className="kit-h2" id="k-btn">
            Nút
          </h2>
          <div className="kit-btns">
            <button className="btn btn-blue" type="button">
              <FeedIcon name="bag" />
              Thêm vào giỏ
            </button>
            <button className="btn btn-line" type="button">
              Tiếp tục xem
            </button>
            <button className="btn btn-blue" type="button" disabled>
              Đã hết
            </button>
          </div>
          <p className="kit-cap">Chính · viền · vô hiệu. Mẫu hình: bấm không làm gì.</p>
        </section>

        <section className="kit-sec" aria-labelledby="k-chip">
          <h2 className="kit-h2" id="k-chip">
            Chip
          </h2>
          <KitChips labels={chips} />
          <p className="kit-cap">Đang bật · thường.</p>
        </section>

        <section className="kit-sec" aria-labelledby="k-field">
          <h2 className="kit-h2" id="k-field">
            Ô nhập
          </h2>
          <div className="kit-narrow">
            <label className="field">
              <span className="lbl">Họ và tên</span>
              <input name="name" />
            </label>
            <label className="field is-error">
              <span className="lbl">Số điện thoại</span>
              <input
                name="phone"
                type="tel"
                inputMode="tel"
                placeholder="10 số, bắt đầu bằng 0"
                defaultValue="0901 2345"
                aria-invalid="true"
                aria-describedby="k-e-phone"
              />
              <span className="err" id="k-e-phone">
                <FeedIcon name="warning-circle" />
                <span>Số điện thoại gồm 10 số, bắt đầu bằng 0</span>
              </span>
            </label>
            <label className="field">
              <span className="lbl">
                Email <span className="opt">tuỳ chọn</span>
              </span>
              <input name="email" type="email" />
            </label>
          </div>
        </section>

        <section className="kit-sec" aria-labelledby="k-card">
          <h2 className="kit-h2" id="k-card">
            Thẻ lựa chọn
          </h2>
          <div className="rcards kit-narrow" role="radiogroup" aria-labelledby="k-card">
            <label className="rcard">
              <input type="radio" name="kit-payment" value="BANK_TRANSFER" defaultChecked />
              <span className="rcard-ic">
                <FeedIcon name="bank" />
              </span>
              <span className="rcard-main">
                <span className="rcard-title">Chuyển khoản</span>
                <span className="rcard-note">
                  Giữ hàng {TRANSFER_HOLD_HOURS} giờ kể từ khi đặt. Nội dung chuyển khoản hiện ở màn xác nhận.
                </span>
              </span>
            </label>
            <label className="rcard">
              <input type="radio" name="kit-payment" value="COD" />
              <span className="rcard-ic">
                <FeedIcon name="money" />
              </span>
              <span className="rcard-main">
                <span className="rcard-title">Thanh toán khi nhận (COD)</span>
                <span className="rcard-note">Kiểm hàng trước khi trả.</span>
              </span>
              <span className="rcard-price">+{vnd(COD_SURCHARGE_VND)}</span>
            </label>
            <label className="rcard">
              <input type="radio" name="kit-payment" value="CARD" />
              <span className="rcard-ic">
                <FeedIcon name="credit-card" />
              </span>
              <span className="rcard-main">
                <span className="rcard-title">Thẻ (nội địa, Visa)</span>
                <span className="rcard-note">Tạm thời trả bằng chuyển khoản.</span>
              </span>
            </label>
          </div>
        </section>

        <section className="kit-sec" aria-labelledby="k-sheet">
          <h2 className="kit-h2" id="k-sheet">
            Sheet
          </h2>
          <div className="kit-stage">
            <div className="sheet-panel">
              <div className="grab" aria-hidden="true" />
              <div className="sh-head plain">
                <h3 className="sh-title" id="k-sort-title">
                  Sắp xếp
                </h3>
                <button className="sh-x" type="button" aria-label="Đóng">
                  <FeedIcon name="x" />
                </button>
              </div>
              <KitSort labelledBy="k-sort-title" />
            </div>
          </div>
          <p className="kit-cap">Dạng điện thoại: bo 20px hai góc trên, bóng --f-lift.</p>
        </section>

        <section className="kit-sec" aria-labelledby="k-icon">
          <h2 className="kit-h2" id="k-icon">
            Icon <span className="kit-count">{FEED_ICON_NAMES.length}</span>
          </h2>
          <ul className="kit-icons">
            {FEED_ICON_NAMES.map((name) => (
              <li key={name} className="kit-icon">
                <span className="kit-glyphs">
                  <FeedIcon name={name} />
                  <FeedIcon name={name} className="kit-i20" />
                </span>
                <span className="kit-iname">{name}</span>
              </li>
            ))}
          </ul>
          <p className="kit-cap">Phosphor v2, mỗi ô: 24px rồi 20px.</p>
        </section>

        <section className="kit-sec" aria-labelledby="k-logo">
          <h2 className="kit-h2" id="k-logo">
            Logo
          </h2>
          <div className="kit-logos">
            <figure className="kit-logo kit-logo-light">
              <FeedLogo className="kit-lg32" />
              <FeedLogo className="kit-lg64" />
              <figcaption>Trên nền sáng · 32px và 64px</figcaption>
            </figure>
            <figure className="kit-logo kit-logo-dark">
              <FeedLogo tone="dark" className="kit-lg32" />
              <FeedLogo tone="dark" className="kit-lg64" />
              <figcaption>Trên khối tối · 32px và 64px</figcaption>
            </figure>
          </div>
        </section>
      </main>
    </FeedScope>
  );
}
