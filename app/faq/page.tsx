import Link from "next/link";
import type { Metadata } from "next";
import { Icon } from "@/components/icon/Icon";
import { ShopFrame } from "@/components/shop/ShopFrame";
import { LEX } from "@/lib/lexicon";
import { vnd } from "@/lib/money";
import {
  COD_SURCHARGE_VND,
  EXPRESS_FEE_VND,
  FREE_SHIPPING_FROM_VND,
  RETURN_WINDOW_DAYS,
  STANDARD_FEE_VND,
} from "@/lib/shipping";
import { TRANSFER_HOLD_HOURS } from "@/lib/orders";

export const metadata: Metadata = {
  title: "Câu hỏi thường gặp",
  description: "Phí giao, hết size, chuyển khoản, đổi trả, chọn size.",
};

/**
 * Five questions, answered from the rules the build runs on.
 *
 * Every figure is READ FROM THE CONSTANT that checkout uses — the fees, the
 * free-shipping floor, the twelve-hour hold, the return window. Change one
 * in `lib/shipping.ts` and this page says the new number. A FAQ that quietly
 * disagrees with the checkout total is worse than no FAQ, because it is
 * believed.
 *
 * `<details>` rather than the hand-built accordion v2 used: the v3 mock
 * draws exactly what the element does, and the browser gives the semantics
 * for free. The first one is open because it is the question everybody
 * arrives with.
 */
export default function FaqPage() {
  return (
    <ShopFrame>
      <div className="wrap3 readpage">
        <div className="pghead">
          <h1>Câu hỏi thường gặp</h1>
          <span className="meta">chỉ những gì code đang thực thi</span>
        </div>

        <div className="faq3">
          <details open>
            <Summary>Phí giao bao nhiêu, mấy ngày nhận?</Summary>
            <div className="a">
              Giao tiêu chuẩn {vnd(STANDARD_FEE_VND)}, 2–4 ngày; miễn phí cho đơn từ{" "}
              {vnd(FREE_SHIPPING_FROM_VND)}. Nội thành TP. Hồ Chí Minh có giao nhanh 24
              giờ, {vnd(EXPRESS_FEE_VND)}. Thu hộ khi nhận hàng cộng thêm{" "}
              {vnd(COD_SURCHARGE_VND)}.
            </div>
          </details>

          <details>
            <Summary>Hết size thì có về lại không?</Summary>
            <div className="a">
              Không may thêm trong cùng một {LEX.tl}. Một size chỉ có lại khi một đơn size
              đó bị huỷ hoặc trả trong {RETURN_WINDOW_DAYS} ngày. Mẫu có thể quay lại ở{" "}
              {LEX.tl} sau, cũng có thể không.
            </div>
          </details>

          <details>
            <Summary>Chuyển khoản rồi bao lâu đơn đổi trạng thái?</Summary>
            <div className="a">
              Khi cửa hàng nhận được tiền. Ghi đúng mã đơn trong nội dung để khớp nhanh.
              Đơn giữ hàng {TRANSFER_HOLD_HOURS} giờ kể từ khi đặt; quá giờ thì tự huỷ và
              hàng về kệ.
            </div>
          </details>

          <details>
            <Summary>Đổi trả thế nào?</Summary>
            <div className="a">
              {RETURN_WINDOW_DAYS} ngày kể từ khi nhận, nếu chưa qua sử dụng. Điều kiện
              chi tiết ở{" "}
              <Link className="lnk" href="/returns">
                trang Đổi trả
              </Link>
              .
            </div>
          </details>

          <details>
            <Summary>Chọn size ra sao?</Summary>
            <div className="a">
              Mỗi mẫu có bảng số đo theo form. Bật “Size ghi nhớ” ở trang sản phẩm để size
              hay mặc được chọn sẵn ở các mẫu sau, trên thiết bị này.
            </div>
          </details>
        </div>
      </div>
    </ShopFrame>
  );
}

/** The question, with the chevron the open state rotates. */
function Summary({ children }: { children: React.ReactNode }) {
  return (
    <summary>
      {children}
      <Icon name="down" className="ic sm" />
    </summary>
  );
}
