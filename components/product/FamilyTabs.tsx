import Link from "next/link";
import { FAMILY_SHORT_LABELS, type Product } from "@/data/types";
import { familyCounts, listingHref, type ListingQuery } from "@/lib/catalog-query";

interface FamilyTabsProps {
  /** Every style in the drop — what the counts are counted over. */
  pool: Product[];
  applied: ListingQuery;
  path: string;
}

/**
 * The row of garment families above the grid, each with the number of styles
 * behind it.
 *
 * Links, not tabs. They change the URL, so `aria-current="page"` is what says
 * which one you are on — `role="tab"` would promise a panel that switches in
 * place, and Back would then not work the way the role implies.
 *
 * `.tabs3` (v3 slice 2) and not the `.tabs` the account screens use: this row
 * is 44px links over an ink rule with a honey mark under the open one, and
 * one class serving two rows is how `.sub` and `.box` each cost an
 * afternoon (DESIGN.md §8).
 *
 * Only families the drop actually carries get a tab: a "Áo gile 0" leading to
 * an empty grid is worse than no tab, the rule `familiesIn` already follows.
 * The counts are arithmetic over the pool, never typed.
 *
 * Choosing a family REPLACES the previous one rather than adding to it. Two
 * families at once is a combination, and combinations are what the filter
 * sheet and the rail are for — a row of one-tap shortcuts that silently
 * accumulate is a row nobody can undo.
 */
export function FamilyTabs({ pool, applied, path }: FamilyTabsProps) {
  const counts = familyCounts(pool);
  const only = applied.families.length === 1 ? applied.families[0] : undefined;
  const all = applied.families.length === 0;

  return (
    <nav className="tabs3" aria-label="Loại">
      <Link
        href={listingHref(path, { ...applied, families: [] })}
        className={all ? "on" : ""}
        aria-current={all ? "page" : undefined}
      >
        Tất cả<span className="cnt">{pool.length}</span>
      </Link>
      {counts.map((t) => (
        <Link
          key={t.value}
          href={listingHref(path, { ...applied, families: [t.value] })}
          className={t.value === only ? "on" : ""}
          aria-current={t.value === only ? "page" : undefined}
        >
          {FAMILY_SHORT_LABELS[t.value]}
          <span className="cnt">{t.styles}</span>
        </Link>
      ))}
    </nav>
  );
}
