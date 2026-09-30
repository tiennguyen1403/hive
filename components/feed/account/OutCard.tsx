import Link from "next/link";
import { signHref } from "@/lib/feed-sign-in";
import { FeedIcon } from "../icon/FeedIcon";

interface OutCardProps {
  /** The page's own invitation: "Đăng nhập để xem đơn", "Đăng nhập để lưu địa chỉ"; Tôi's is "Tôi". */
  title: string;
  /** The heading's id. */
  id: string;
  /** This page, so signing in (or up) comes back to it. */
  here: string;
  /**
   * What an account holds, as three tiles — Đơn hàng, Yêu thích, Nhắc giờ mở:
   * Tôi's card on the phone only (slice 3b). From 900px Tôi draws its two
   * columns instead, and every other page keeps the card without them.
   */
  perks?: boolean;
}

/** `account.js`: `perks` — labels only. */
const PERKS = [
  ["package", "Đơn hàng"],
  ["heart", "Yêu thích"],
  ["bell", "Nhắc giờ mở"],
] as const;

/**
 * A signed-out account page's way in (`account.js`: `signedOut`): the dark
 * card with the page's invitation and the two buttons, "Đăng nhập" first.
 * From 900px it is a banner, the buttons at their own width (`account.css`).
 * Both carry the page in `next`, so the shopper lands back on it.
 */
export function OutCard({ title, id, here, perks = false }: OutCardProps) {
  return (
    // A Server Component: the class is spelled out here (`cx` lives in a client module).
    <section className={perks ? "out-card on-dark has-perks" : "out-card on-dark"} aria-labelledby={id}>
      <h2 className="out-title disp" id={id}>
        {title}
      </h2>
      {perks && (
        <ul className="out-perks">
          {PERKS.map(([icon, label]) => (
            <li className="out-perk" key={label}>
              <FeedIcon name={icon} />
              <span>{label}</span>
            </li>
          ))}
        </ul>
      )}
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
