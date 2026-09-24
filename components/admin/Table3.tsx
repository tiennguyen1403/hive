"use client";

import Link from "next/link";
import { Fragment } from "react";
import { createPortal } from "react-dom";
import { Icon, Tick, type IconName } from "@/components/icon/Icon";
import { useAnchoredPanel, usePanelKeys } from "@/components/ui/useAnchoredPanel";
import { PER_PAGE_CHOICES, hrefWith, type Paged, type Query } from "@/lib/admin-url";

/**
 * The parts every back-office table is made of, v3 — `.dt3` in
 * `prototype/v3/v3-pages.css`.
 *
 * NOT the v2 `DataTable` this replaced (deleted at v3 slice 6). That one was
 * a TanStack table owning its own sorting, filtering, paging and selection in
 * React state; every one of those is supposed to live in the address bar
 * (QĐ-8), and a component that holds them cannot be driven from a `<Link>`.
 * What is left after moving them out is not a table component at all — it is
 * five small controls that screens compose, each with exactly one job:
 *
 *   `Stabs`      the status tabs, which are LINKS with counts
 *   `ChipMenu`   a filter chip whose menu is links (a URL) or buttons (state)
 *   `Cb`         the row checkbox, 20px with a 46px overlay
 *   `ActionMenu` the `⋯` menu of ACTIONS — icons, a rule, one destructive
 *   `TableFoot`  the count, the rows-per-page chip and the page numbers
 *
 * Every floating panel here is `.menu3`, PORTALLED to `<body>` — so it
 * inherits nothing from `.s` and every rule for it starts at `.menu3`
 * (DESIGN.md §6). It has to be `position:fixed`: a menu on the last row of a
 * table inside any `overflow` box is otherwise clipped away entirely.
 */

// ────────────────────────────────────────────────────────────────── the tabs
export interface Stab {
  /** The value written to the URL, or null for "everything". */
  value: string | null;
  label: React.ReactNode;
  count: number;
  /**
   * Where the tab leads, when it is not `param=value` — a row whose tabs set
   * different keys (v3 slice 12: "Cố định" is `?fixed=1`, an issue `?drop=5`).
   */
  href?: string;
  /** Drawn after the count — the Cố định tab's red dot (v3 slice 12). */
  after?: React.ReactNode;
}

export function Stabs({
  tabs,
  param,
  active,
  path,
  query,
  label,
}: {
  tabs: Stab[];
  /** Which key in the address this row of tabs owns. */
  param: string;
  active: string | null;
  path: string;
  query: Query;
  /** Names the row for assistive tech. */
  label: string;
}) {
  return (
    <nav className="stabs" aria-label={label}>
      {tabs.map((t) => {
        const on = (t.value ?? null) === (active ?? null);
        return (
          <Link
            key={t.value ?? "all"}
            href={t.href ?? hrefWith(path, query, { [param]: t.value, page: null })}
            className={on ? "on" : undefined}
            aria-current={on ? "page" : undefined}
            scroll={false}
          >
            {t.label}
            <span className="cnt">{t.count}</span>
            {t.after}
          </Link>
        );
      })}
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────── filter chips
export interface ChipOption {
  value: string | null;
  label: React.ReactNode;
  /** Right-aligned hint or count. */
  note?: string;
}

/**
 * A chip that opens a list of choices.
 *
 * The choices are LINKS when the chip drives the address (the common case)
 * and buttons when it drives something that has no business in a URL — which
 * in this build is exactly one thing, the columns somebody wants to see,
 * because that is a preference of the person and not a description of the
 * screen.
 */
export function ChipMenu({
  label,
  icon,
  options,
  active,
  hrefFor,
  onPick,
  note,
  chevron = true,
}: {
  label: React.ReactNode;
  icon?: IconName;
  options: ChipOption[];
  /** The chosen value, or the chosen values for a many-of chip. */
  active: string | null | string[];
  /** Given a value, where the choice leads. Omit for a button menu. */
  hrefFor?: (value: string | null) => string;
  onPick?: (value: string | null) => void;
  /** Shown on the chip beside its label — the chosen value, a count. */
  note?: string;
  chevron?: boolean;
}) {
  const panel = useAnchoredPanel<HTMLButtonElement, HTMLDivElement>();
  const keys = usePanelKeys(panel.open, options.length, panel.panelRef);
  const many = Array.isArray(active);
  const isOn = (v: string | null) => (many ? (active as string[]).includes(v ?? "") : active === v);

  return (
    <>
      <button
        ref={panel.anchorRef}
        type="button"
        className="chip3"
        aria-haspopup="menu"
        aria-expanded={panel.open}
        onClick={panel.toggle}
        onKeyDown={(e) => {
          if (!panel.open) {
            if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              panel.toggle();
            }
            return;
          }
          keys.onKeyDown(
            e,
            (i) => {
              const o = options[i];
              if (o && onPick) {
                onPick(o.value);
                panel.close();
              }
            },
            panel.close,
          );
        }}
      >
        {icon && <Icon name={icon} className="ic sm" />}
        {label}
        {note && <span className="cnt">{note}</span>}
        {chevron && !icon && <Icon name="down" className="ic sm" />}
      </button>

      {panel.open &&
        panel.box &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={panel.panelRef}
            className="menu3"
            role="menu"
            aria-label={typeof label === "string" ? label : "Lọc"}
            style={{ top: panel.box.top, left: panel.box.left, maxHeight: panel.box.maxHeight }}
          >
            {options.map((o, i) => {
              const on = isOn(o.value);
              const body = (
                <>
                  <span className="mk">{on && <Tick />}</span>
                  <span>{o.label}</span>
                  {o.note && <em className="tally">{o.note}</em>}
                </>
              );
              return hrefFor ? (
                <Link
                  key={o.value ?? "all"}
                  href={hrefFor(o.value)}
                  role="menuitemradio"
                  aria-checked={on}
                  className={on ? "ticked" : undefined}
                  data-active={i === keys.active || undefined}
                  onPointerEnter={() => keys.setActive(i)}
                  onClick={panel.close}
                  scroll={false}
                >
                  {body}
                </Link>
              ) : (
                <button
                  key={o.value ?? "all"}
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={on}
                  className={on ? "ticked" : undefined}
                  data-active={i === keys.active || undefined}
                  onPointerEnter={() => keys.setActive(i)}
                  onClick={() => {
                    onPick?.(o.value);
                    if (!many) panel.close();
                  }}
                >
                  {body}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}

/** A chip that is simply on or off — "Sắp hết", "Hôm nay". */
export function ToggleChip({
  label,
  count,
  on,
  href,
}: {
  label: React.ReactNode;
  count?: number;
  on: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={on ? "chip3 on" : "chip3"}
      aria-pressed={on}
      role="button"
      scroll={false}
    >
      {label}
      {count !== undefined && <span className="cnt">{count}</span>}
    </Link>
  );
}

// ─────────────────────────────────────────────────────────── the row checkbox
export function Cb({
  checked,
  label,
  onToggle,
}: {
  checked: boolean | "mixed";
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      className="cb"
      aria-checked={checked === "mixed" ? "mixed" : checked}
      aria-label={label}
      onClick={onToggle}
    >
      {/* A HALF selection is a dash, not a tick. Both states paint the box
          black with honey ink, so a tick in both would say "everything on
          this page" while two rows out of ten are ticked. */}
      {checked === "mixed" ? <i className="dash" /> : <Tick />}
    </button>
  );
}

// ────────────────────────────────────────────────────────── the actions menu
export interface ActionItem {
  label: string;
  icon: IconName;
  /** Goes somewhere: rendered as a link so the link gestures all work. */
  href?: string;
  /** Opens in a new tab — only for leaving the back office. */
  newTab?: boolean;
  onRun?: () => void;
  /** Destructive: `.hot`, in the red family. */
  danger?: boolean;
  /** Draw a rule above this item. */
  rule?: boolean;
  /** Already the case — the item carries a tick instead of an icon. */
  ticked?: boolean;
}

/**
 * The `⋯` menu on a row, and the same menu beside a screen's title.
 *
 * Every item DOES ITS THING or is not passed in: there is no `disabled` here
 * (DESIGN.md §9 rule 3), so an order that cannot be handed over simply has
 * no handover item rather than a greyed one that explains itself on hover.
 */
export function ActionMenu({
  items,
  label,
  variant = "rowmenu",
}: {
  items: ActionItem[];
  /** The opener's accessible name: "Thao tác DH-2431". */
  label: string;
  variant?: "rowmenu" | "btn";
}) {
  const panel = useAnchoredPanel<HTMLButtonElement, HTMLDivElement>();
  const keys = usePanelKeys(panel.open, items.length, panel.panelRef);

  const pick = (item: ActionItem) => {
    panel.close();
    panel.anchorRef.current?.focus();
    item.onRun?.();
  };

  return (
    <>
      <button
        ref={panel.anchorRef}
        type="button"
        className={variant === "btn" ? "btn ink sm" : "rowmenu"}
        aria-haspopup="menu"
        aria-expanded={panel.open}
        aria-label={label}
        onClick={panel.toggle}
        onKeyDown={(e) => {
          if (!panel.open) {
            if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              panel.toggle();
            }
            return;
          }
          keys.onKeyDown(
            e,
            (i) => {
              const it = items[i];
              if (it && !it.href) pick(it);
            },
            panel.close,
          );
        }}
      >
        <Icon name="more" className="ic sm" />
      </button>

      {panel.open &&
        panel.box &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={panel.panelRef}
            className="menu3"
            role="menu"
            aria-label={label}
            style={{ top: panel.box.top, left: panel.box.left, maxHeight: panel.box.maxHeight }}
          >
            {items.map((it, i) => (
              <Fragment key={it.label}>
                {it.rule && <div className="sep" />}
                {it.href ? (
                  <Link
                    href={it.href}
                    role="menuitem"
                    className={it.danger ? "hot" : undefined}
                    data-active={i === keys.active || undefined}
                    onPointerEnter={() => keys.setActive(i)}
                    onClick={panel.close}
                    {...(it.newTab ? { target: "_blank", rel: "noreferrer" } : {})}
                  >
                    <Icon name={it.icon} className="ic" />
                    {it.label}
                  </Link>
                ) : (
                  <button
                    type="button"
                    role="menuitem"
                    className={it.danger ? "hot" : undefined}
                    data-active={i === keys.active || undefined}
                    onPointerEnter={() => keys.setActive(i)}
                    onClick={() => pick(it)}
                  >
                    <Icon name={it.icon} className="ic" />
                    {it.label}
                  </button>
                )}
              </Fragment>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}

// ──────────────────────────────────────────────────────────────── the footer
export function TableFoot({
  page,
  unit,
  path,
  query,
  children,
}: {
  page: Paged<unknown>;
  /** "đơn", "khách" — what the count is counting. */
  unit: string;
  path: string;
  query: Query;
  /** A line of explanation instead of the default count. */
  children?: React.ReactNode;
}) {
  const per = page.rows.length;
  const numbers = Array.from({ length: page.pages }, (_, i) => i + 1);

  return (
    <div className="foot">
      <span>
        {children ?? `Hiện ${per} / ${page.total} ${unit}`}
      </span>
      <ChipMenu
        label={`${page.total <= 10 ? 10 : perOf(query)} dòng mỗi trang`}
        active={String(perOf(query))}
        options={PER_PAGE_CHOICES.map((n) => ({ value: String(n), label: String(n) }))}
        hrefFor={(v) => hrefWith(path, query, { per: v, page: null })}
      />
      {page.pages > 1 && (
        <span className="pages">
          {numbers.map((n) => (
            <Link
              key={n}
              href={hrefWith(path, query, { page: n === 1 ? null : n })}
              className={n === page.page ? "on" : undefined}
              aria-current={n === page.page ? "page" : undefined}
              aria-label={`Trang ${n}`}
              scroll={false}
            >
              {n}
            </Link>
          ))}
        </span>
      )}
    </div>
  );
}

function perOf(query: Query): number {
  const n = Number(query.per);
  return (PER_PAGE_CHOICES as readonly number[]).includes(n) ? n : 10;
}
