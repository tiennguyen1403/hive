import Link from "next/link";
import { Icon, type IconName } from "@/components/icon/Icon";

type Tone = "" | "pri" | "ghost" | "quiet" | "bare" | "full" | "sm";

interface Common {
  children: React.ReactNode;
  /** One or more of the system's button tones, space separated. */
  tone?: Tone | string;
  /** Icon before the label. */
  icon?: IconName;
  className?: string;
}

type ButtonProps = Common &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

type LinkProps = Common & { href: string };

/**
 * The system's button.
 *
 * It stands 40px tall so it reads light, but a finger still gets 44px — an
 * invisible overlay in `buttons.css` widens the touch target by 2px on each
 * side, costing the layout nothing. Nothing here has to think about that.
 *
 * An icon passed here sits BEFORE the label and gets its transparent margins
 * trimmed out of the layout box, so the `gap` in CSS is the gap you see.
 */
export function Button({
  children,
  tone = "",
  icon,
  className = "",
  ...rest
}: ButtonProps) {
  return (
    <button type="button" className={cls(tone, className)} {...rest}>
      {icon && <Icon name={icon} className="ic sm" />}
      {children}
    </button>
  );
}

/**
 * A button that navigates. Rendered as an anchor, because it goes somewhere —
 * middle-click, open-in-new-tab and "copy link address" all have to work.
 */
export function ButtonLink({
  children,
  tone = "",
  icon,
  className = "",
  href,
}: LinkProps) {
  return (
    <Link href={href} className={cls(tone, className)}>
      {icon && <Icon name={icon} className="ic sm" />}
      {children}
    </Link>
  );
}

function cls(tone: string, className: string) {
  return ["btn", tone, className].filter(Boolean).join(" ");
}
