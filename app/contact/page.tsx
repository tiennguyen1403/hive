import Link from "next/link";
import type { Metadata } from "next";
import { ShopFrame } from "@/components/shop/ShopFrame";

export const metadata: Metadata = {
  title: "Liên hệ",
  description: "Tra cứu đơn bằng mã và số điện thoại, không cần đăng nhập.",
};

/**
 * Contact.
 *
 * Mostly empty on purpose, and that is the honest outcome: no email address,
 * phone number, opening hours or postal address exists anywhere in this
 * build, so every one of them would have to be invented — and a made-up
 * email is one people really would write to.
 *
 * What IS real is where somebody can look their own order up without asking
 * anyone, so that goes first. It answers most of why people write in.
 */
export default function ContactPage() {
  return (
    <ShopFrame>
      <div className="wrap3 readpage">
        <div className="pghead">
          <h1>Liên hệ</h1>
        </div>

        <div className="prose">
          <p>
            Về đơn hàng:{" "}
            <Link className="lnk" href="/track">
              tra cứu đơn
            </Link>{" "}
            bằng mã đơn và số điện thoại, không cần đăng nhập. Phần lớn câu hỏi có trong{" "}
            <Link className="lnk" href="/faq">
              câu hỏi thường gặp
            </Link>
            .
          </p>

          <div className="prep">
            <b>Kênh liên hệ đang chuẩn bị.</b>
            Email, số điện thoại, giờ làm việc, mạng xã hội: hiện khi có thông tin thật.
          </div>
        </div>
      </div>
    </ShopFrame>
  );
}
