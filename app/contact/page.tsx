import Link from "next/link";
import type { Metadata } from "next";
import { FeedFrame } from "@/components/feed/FeedFrame";
import type { FeedMbarProps } from "@/components/feed/FeedMbar";

export const metadata: Metadata = {
  title: "Liên hệ",
  description: "Tra cứu đơn bằng mã và số điện thoại, không cần đăng nhập.",
};

/** The phone's bar: back to Hỏi đáp (the mock's `data-back`); the title once the page's own has scrolled away. */
const MBAR: FeedMbarProps = { title: "Liên hệ", back: "/faq", watch: "[data-ui='feed'] .b-title" };

/**
 * Contact, round v4 "Feed" (slice 4b). The mock's `contact.html` is a message
 * form, which waits for its own slice with the back office (QĐ-34), so the
 * page keeps the words it had and wears the Feed frame the mock gives it —
 * Tôi lit in the tab bar, the light footer without "Liên hệ" (the mock's
 * `data-foot-skip="contact.html"`), the phone's bar back to Hỏi đáp — and the
 * mock's two columns from 900px: the words where the form will be, the
 * shop's own channels in the side column (`.b-contact`, `.b-cside`).
 *
 * Mostly empty on purpose, and that is the honest outcome: no email address,
 * phone number, opening hours or postal address exists anywhere in this
 * build, so every one of them would have to be invented — and a made-up email
 * is one people really would write to. The channels are the mock's own empty
 * slot on this page, in its words ("Số điện thoại và email cửa hàng", "Đang
 * chuẩn bị"), the way the Feed says a thing is not there yet. What IS real is
 * where somebody can look their own order up without asking anyone, so that
 * goes first; it answers most of why people write in. Hỏi đáp's "Gửi tin
 * nhắn" leads here (the user, 30/09).
 */
export default function ContactPage() {
  return (
    <FeedFrame page="contact" foot="lite" footSkip={["/contact"]} mainClass="b-wrap b-page" mbar={MBAR}>
      <div className="b-head">
        <h1 className="b-title disp">Liên hệ</h1>
      </div>
      <div className="b-contact">
        <div className="b-read">
          <p>
            Về đơn hàng: <Link href="/track">tra cứu đơn</Link> bằng mã đơn và số điện thoại, không cần đăng nhập.
            Phần lớn câu hỏi có trong <Link href="/faq">Hỏi đáp</Link>.
          </p>
        </div>
        <aside className="b-cside" aria-label="Kênh khác">
          <div className="b-slot" role="note">
            <b>Số điện thoại và email cửa hàng</b>
            <span>Đang chuẩn bị</span>
          </div>
        </aside>
      </div>
    </FeedFrame>
  );
}
