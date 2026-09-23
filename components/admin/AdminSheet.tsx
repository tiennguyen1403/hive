"use client";

import { Sheet } from "@/components/ui/Sheet";

/**
 * The back office's dialog: the shop's own sheet, wearing a form.
 *
 * A title in the display face, one quiet line saying what the action will
 * really do, the form, and a footer ruled off with the way out to the left
 * of the honey confirm. Not a second component from `Modal` (v2) — that one
 * drew its own chrome; this is `Sheet` with the four pieces the mock puts
 * inside every admin panel, so Escape, the scrim, the focus trap and the
 * return of focus are the ones the whole app already uses.
 */
export function AdminSheet({
  open,
  onClose,
  title,
  sub,
  wide = false,
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  /** Shown as the heading and used as the dialog's accessible name. */
  title: React.ReactNode;
  /** What this will do, in the shop's own words. */
  sub?: React.ReactNode;
  wide?: boolean;
  footer: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      wide={wide}
      label={typeof title === "string" ? title : "Hộp thoại"}
    >
      <div className="grab" />
      <h3 className="title">{title}</h3>
      {sub && <p className="sub">{sub}</p>}
      {children}
      <div className="ft">{footer}</div>
    </Sheet>
  );
}
