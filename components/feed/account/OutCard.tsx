import Link from "next/link";
import { signHref } from "@/lib/feed-sign-in";

interface OutCardProps {
  /** The page's own invitation: "Đăng nhập để xem đơn", "Đăng nhập để lưu địa chỉ". */
  title: string;
  /** The heading's id. */
  id: string;
  /** This page, so signing in (or up) comes back to it. */
  here: string;
}

/**
 * A signed-out account page's way in (`account.js`: `signedOut` without the
 * perks, which belong to Tôi): the dark card with the page's invitation and
 * the two buttons, "Đăng nhập" first. From 900px it is a banner, the buttons
 * at their own width (`account.css`). Both carry the page in `next`, so the
 * shopper lands back on it.
 */
export function OutCard({ title, id, here }: OutCardProps) {
  return (
    <section className="out-card on-dark" aria-labelledby={id}>
      <h2 className="out-title disp" id={id}>
        {title}
      </h2>
      <div className="out-acts">
        <Link className="btn btn-blue" href={signHref("in", here)}>
          Đăng nhập
        </Link>
        <Link className="btn btn-line" href={signHref("up", here)}>
          Tạo tài khoản
        </Link>
      </div>
    </section>
  );
}
