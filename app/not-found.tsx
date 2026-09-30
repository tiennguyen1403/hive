import type { Metadata } from "next";
import Link from "next/link";
import { FeedFrame } from "@/components/feed/FeedFrame";
import { FeedIcon, type FeedIconName } from "@/components/feed/icon/FeedIcon";

export const metadata: Metadata = {
  title: "Không tìm thấy",
};

/** The three ways back (`404.html`), each its glyph before and an arrow after. */
const WAYS: readonly (readonly [string, FeedIconName, string])[] = [
  ["/", "newspaper", "Bảng tin"],
  ["/products", "storefront", "Cửa hàng"],
  ["/track", "package", "Tra cứu đơn"],
];

/**
 * The 404, round v4 "Feed" (slice 4a): the approved mock's
 * `prototype/explore/feed/404.html` for the whole app — every address that
 * matches no route, and every `notFound()` without a page of its own (the
 * order's "Không tìm thấy đơn" keeps its own, slice 3b). "Không tìm thấy",
 * then Bảng tin, Cửa hàng and Tra cứu đơn as three large ways back; the light
 * footer and the tab bar, nothing lit; on the phone a bar with the logo alone.
 *
 * Next answers 404 and asks search engines to leave the page out by itself
 * (`03-api-reference/04-functions/not-found.md`).
 */
export default function NotFound() {
  return (
    <FeedFrame page="other" foot="lite" mainClass="b-wrap b-page" mbar="brand">
      <div className="b-nf">
        <h1 className="b-nf-title disp">Không tìm thấy</h1>
        <nav className="b-nf-links" aria-label="Về lại">
          {WAYS.map(([href, icon, label]) => (
            <Link key={href} href={href}>
              <FeedIcon name={icon} />
              <span className="disp">{label}</span>
              <FeedIcon name="arrow-right" className="i-arrow-right" />
            </Link>
          ))}
        </nav>
      </div>
    </FeedFrame>
  );
}
