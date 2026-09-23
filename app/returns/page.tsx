import type { Metadata } from "next";
import { ShopFrame } from "@/components/shop/ShopFrame";
import { RETURN_WINDOW_DAYS } from "@/lib/shipping";

export const metadata: Metadata = {
  title: "Đổi trả",
  description: `${RETURN_WINDOW_DAYS} ngày kể từ khi nhận, nếu chưa qua sử dụng.`,
};

/**
 * Returns — the half that is settled, and the half that is not.
 *
 * The WINDOW is settled: `RETURN_WINDOW_DAYS` is the number the cart's row
 * of commitments, the consent line at checkout, the product page and the
 * footer all print, so this page states it as the fact it already is.
 *
 * The CONDITIONS are not. Whether a tag has to be on it, who pays the return
 * leg, whether a discounted style can go back — none of that exists anywhere
 * in this build, and every one of them is a commitment the shop's owner
 * makes rather than something a mock invents. The dashed block says which
 * questions are open, which is the useful thing to leave behind.
 */
export default function ReturnsPage() {
  return (
    <ShopFrame>
      <div className="wrap3 readpage">
        <div className="pghead">
          <h1>Đổi trả</h1>
        </div>

        <div className="prose">
          <p>
            <b>{RETURN_WINDOW_DAYS} ngày kể từ khi nhận, nếu chưa qua sử dụng.</b> Đây là
            điều thanh toán và trang sản phẩm đang cam kết.
          </p>

          <div className="prep">
            <b>Điều kiện chi tiết đang chuẩn bị.</b>
            Còn tag hay không, ai chịu phí gửi về, mẫu giảm giá có đổi được không: hiện
            khi có quyết định, không viết tạm.
          </div>
        </div>
      </div>
    </ShopFrame>
  );
}
