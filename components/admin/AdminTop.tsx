import Link from "next/link";
import { Badge } from "@/components/ui/Badge";

interface AdminTopProps {
  /** The way back: `["Đơn hàng", "/admin/orders"]` and where we are now. */
  crumb?: { label: string; href: string; here: string };
  title: React.ReactNode;
  /** A badge beside the title — an order's state, an issue's. */
  badge?: React.ReactNode;
  /** One quiet line: what this screen is counting, and any caveat. */
  sub?: React.ReactNode;
  /** Buttons, to the right of the sample-data badge. */
  children?: React.ReactNode;
}

/**
 * The heading strip every admin screen wears.
 *
 * The "Dữ liệu mẫu" badge is not optional and not a prop: PRODUCT.md
 * requires every admin figure to be shown as sample data — since slice B3a the
 * orders are real rows in a real database, but the shop, its customers and
 * its history are still a sample — and a flag that can be turned off is a
 * flag that eventually is. Putting it in the one component every screen must
 * render is what makes the rule structural rather than a thing to remember.
 *
 * Family B's neutral tone — unbleached cloth, dark ink — because the badge is
 * a caveat and not a state; the live states keep the black cloth.
 *
 * The way back reads "Mẫu › KHÓI" (v3 slice 7, the style form's mock): the
 * separator is punctuation, hidden from assistive tech, which reads the link
 * and the page's own heading.
 */
export function AdminTop({ crumb, title, badge, sub, children }: AdminTopProps) {
  return (
    <header className="top">
      <div>
        {crumb && (
          <div className="crumb">
            <Link href={crumb.href}>{crumb.label}</Link>
            <i aria-hidden="true">›</i>
            {crumb.here}
          </div>
        )}
        <h1>
          {title}
          {badge && <> {badge}</>}
        </h1>
        {sub && <div className="sub">{sub}</div>}
      </div>
      <div className="acts">
        <Badge>Dữ liệu mẫu</Badge>
        {children}
      </div>
    </header>
  );
}
