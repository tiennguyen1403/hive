import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { ShopFrame } from "@/components/shop/ShopFrame";
import { closesInLabel, dropCalendar } from "@/lib/drop";
import { LEX, issueLabel, issueNo } from "@/lib/lexicon";

/**
 * The 404.
 *
 * On a drop model this page is reached routinely, not exceptionally: last
 * issue's links keep circulating long after the styles behind them are gone.
 * So it says where the shop is NOW instead of apologising — and both of its
 * answers are read off the clock, so neither can point at an issue that has
 * closed since the page was written.
 */
export default function NotFound() {
  const cal = dropCalendar();
  const open = cal.open;
  const closed = cal.closed;

  return (
    <ShopFrame>
      <div className="wrap3 readpage">
        <div className="nf">
          <span className="num">404</span>
          <h1>Trang này không có.</h1>
          <p>
            Liên kết có thể thuộc một {LEX.tl} đã đóng, hoặc gõ sai.
            {open
              ? ` ${issueLabel(open.no)} đang bán, ${closesInLabel(open.closesAt)}.`
              : cal.upcoming
                ? ` ${issueLabel(cal.upcoming.no)} sắp mở.`
                : ""}
          </p>
          <div className="cta">
            {open && (
              <ButtonLink href="/products">
                Xem {LEX.tl} {issueNo(open.no)}
              </ButtonLink>
            )}
            {closed && (
              <Link className="btn ink" href={`/so/${closed.no}`}>
                Các {LEX.tl} đã đóng
              </Link>
            )}
          </div>
        </div>
      </div>
    </ShopFrame>
  );
}
