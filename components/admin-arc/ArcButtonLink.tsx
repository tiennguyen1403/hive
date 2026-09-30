import Link from "next/link";
import type { ComponentProps } from "react";
import type { ButtonSize, ButtonVariant } from "@/registry/components/button/button";
import buttonStyles from "@/registry/components/button/button.module.css";

type ArcButtonLinkProps = Omit<ComponentProps<typeof Link>, "className"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
};

/**
 * A link that looks like an Arc `Button`. "In phiếu giao" goes somewhere, so
 * it has to be a link (a new tab, a copied address), and Arc's free `Button`
 * renders only `<button>`.
 *
 * It borrows the button's own stylesheet rather than patching the component:
 * the classes `button`, the variant (`primary`, `secondary`, `ghost`,
 * `danger`) and the size (`sm`, `md`, `lg`) of
 * `registry/components/button/button.module.css`. Those are Arc's internal
 * class names, so `registry/PATCHES.md` lists this file: a new Arc release
 * that renames them breaks the look here, not the build. The label and its
 * icon sit straight in the flex box; the button's own label slot only exists
 * to morph a changing label, which a link never has.
 */
export function ArcButtonLink({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ArcButtonLinkProps) {
  const classes = [buttonStyles.button, buttonStyles[variant], buttonStyles[size], className]
    .filter(Boolean)
    .join(" ");
  return (
    <Link {...props} className={classes}>
      {children}
    </Link>
  );
}
