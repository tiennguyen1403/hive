/**
 * Every English string Arc's free components (installed 30/09 and 01/10/2026,
 * round v5 slices 0 to 5b) show a person or read to a screen reader, as it stood in
 * the installed source, and the component file it was in. Each one was put
 * into Vietnamese in `registry/components/**` (registry/PATCHES.md).
 *
 * `arc-registry.test.ts` fails when any of them is back, which is what a
 * re-install of an Arc item does: the file is overwritten with the English
 * original. Re-apply the patches in `registry/PATCHES.md`, then run the tests.
 *
 * Each entry is the exact fragment of source, quotes and all, so an
 * identifier (`Pagination`, `Checkbox`) or an ARIA token (`aria-sort`'s
 * "ascending") never matches by accident.
 *
 * SINCE ROUND v6 SLICE E0 (QĐ-40) the patched places speak both languages:
 * each Vietnamese string became a `{ vi, en }` pair whose English side is
 * Arc's own words (`ARC_ENGLISH_SIDE`, below), picked by the page's language
 * (`useLocale()`, provided by `ArcAdminFrame`). The English text is therefore
 * back in the source, inside a pair, and the purpose of `ARC_ENGLISH` is
 * unchanged: a re-install puts the ORIGINAL syntax back, a bare English
 * literal that no language chooses, and the Vietnamese screen would show it.
 * So every entry below is a fragment of the original source that the pair
 * form never reproduces. Where the bare string alone would match the pair's
 * English side, the entry was re-shaped at slice E0 to start at the original's
 * own syntax — the attribute, the call, the default parameter — around the
 * same English words (each marked "E0").
 */
export const ARC_ENGLISH: ReadonlyArray<{ file: string; text: string }> = [
  { file: "avatar/avatar.tsx", text: "`, ${status}`" },
  { file: "checkbox/checkbox.tsx", text: '(label ? undefined : "Checkbox")' },
  { file: "dialog/dialog.tsx", text: 'aria-label="Close dialog"' },
  // E0: was '"All filters cleared"'.
  { file: "filter-toolbar/filter-toolbar.tsx", text: 'return "All filters cleared"' },
  // E0: was "`Added ${".
  { file: "filter-toolbar/filter-toolbar.tsx", text: "added.map(filter => `Added ${" },
  // E0: was " changed to ${".
  { file: "filter-toolbar/filter-toolbar.tsx", text: "changed.map(filter => `${filter.label} changed to ${" },
  // E0: was '?? "any"'.
  { file: "filter-toolbar/filter-toolbar.tsx", text: '?? "any"}`)' },
  // E0: was "`Removed ${".
  { file: "filter-toolbar/filter-toolbar.tsx", text: "removed.map(filter => `Removed ${" },
  { file: "filter-toolbar/filter-toolbar.tsx", text: 'label = "Add filter"' },
  { file: "filter-toolbar/filter-toolbar.tsx", text: 'aria-label="Back to fields"' },
  { file: "filter-toolbar/filter-toolbar.tsx", text: 'label = "Active filters"' },
  // E0: was "`Remove ${".
  { file: "filter-toolbar/filter-toolbar.tsx", text: "aria-label={`Remove ${" },
  { file: "filter-toolbar/filter-toolbar.tsx", text: ">No filters applied<" },
  { file: "filter-toolbar/filter-toolbar.tsx", text: ">Clear all<" },
  { file: "pagination/pagination.tsx", text: 'label = "Pagination"' },
  { file: "pagination/pagination.tsx", text: 'aria-label="Previous page"' },
  // E0: was "`Page ${number}`".
  { file: "pagination/pagination.tsx", text: "aria-label={`Page ${number}`}" },
  { file: "pagination/pagination.tsx", text: 'aria-label="Next page"' },
  { file: "search-field/search-field.tsx", text: 'aria-label="Clear search"' },
  { file: "select/select.tsx", text: 'placeholder = "Select an option"' },
  { file: "sortable-data-table/sortable-data-table.tsx", text: 'caption = "Data table"' },
  { file: "sortable-data-table/sortable-data-table.tsx", text: 'emptyMessage = "No rows to show"' },
  // E0: was '{ one: "row", other: "rows" }'.
  { file: "sortable-data-table/sortable-data-table.tsx", text: 'itemName = { one: "row", other: "rows" }' },
  { file: "sortable-data-table/sortable-data-table.tsx", text: 'selectedCount ? "selected"' },
  // E0: was "`Sorted by ${".
  { file: "sortable-data-table/sortable-data-table.tsx", text: "setAnnouncement(`Sorted by ${" },
  // E0: was "} selected`".
  { file: "sortable-data-table/sortable-data-table.tsx", text: "setAnnouncement(list.length ? `${list.length} of ${keys.length} selected`" },
  // E0: was '"Selection cleared"'.
  { file: "sortable-data-table/sortable-data-table.tsx", text: ': "Selection cleared")' },
  { file: "sortable-data-table/sortable-data-table.tsx", text: 'label="Select all rows"' },
  // E0: was "`Sort by ${".
  { file: "sortable-data-table/sortable-data-table.tsx", text: "aria-label={`Sort by ${" },
  // E0: was ", currently ${".
  {
    file: "sortable-data-table/sortable-data-table.tsx",
    text: ', currently ${sort.direction === "asc" ? "ascending" : "descending"}` : ""}`}>',
  },
  // E0: was "`Select ${".
  { file: "sortable-data-table/sortable-data-table.tsx", text: "label={`Select ${" },
  { file: "sortable-data-table/sortable-data-table.tsx", text: ">Clear selection<" },
  // E0: was 'Intl.Collator("en"'.
  { file: "sortable-data-table/sortable-data-table.tsx", text: 'const collator = new Intl.Collator("en"' },
  { file: "tabs/tabs.tsx", text: 'aria-label="Scroll tabs left"' },
  { file: "tabs/tabs.tsx", text: 'aria-label="Scroll tabs right"' },
  { file: "toast-stack/toast-stack.tsx", text: 'success: "Success"' },
  { file: "toast-stack/toast-stack.tsx", text: 'info: "Info"' },
  { file: "toast-stack/toast-stack.tsx", text: 'warning: "Warning"' },
  { file: "toast-stack/toast-stack.tsx", text: 'error: "Error"' },
  { file: "toast-stack/toast-stack.tsx", text: 'loading: "In progress"' },
  { file: "toast-stack/toast-stack.tsx", text: 'aria-label="Dismiss notification"' },
  { file: "toast-stack/toast-stack.tsx", text: 'label = "Notifications"' },
  // Slice 1 (30/09/2026): breadcrumb, stepper, combobox. Empty state has none.
  { file: "breadcrumb/breadcrumb.tsx", text: 'ariaLabel = "Breadcrumb"' },
  { file: "stepper/stepper.tsx", text: 'complete: "Completed"' },
  { file: "stepper/stepper.tsx", text: 'upcoming: "Not started"' },
  { file: "stepper/stepper.tsx", text: 'error: "Error"' },
  { file: "stepper/stepper.tsx", text: 'label = "Progress"' },
  { file: "stepper/stepper.tsx", text: 'completeLabel = "All steps complete"' },
  // E0: was "`Step ${".
  { file: "stepper/stepper.tsx", text: "{now ? `Step ${" },
  { file: "combobox/combobox.tsx", text: 'placeholder = "Search or select…"' },
  { file: "combobox/combobox.tsx", text: 'emptyMessage = "No matches found"' },
  { file: "combobox/combobox.tsx", text: 'aria-label="Clear selection"' },
  // E0: was "} options`".
  { file: "combobox/combobox.tsx", text: "aria-label={`${label} options`}" },
  // Slice 2 (30/09/2026): bar-chart.
  // E0: was 'Intl.NumberFormat("en-US"'.
  { file: "bar-chart/bar-chart.tsx", text: 'const grouped = new Intl.NumberFormat("en-US"' },
  { file: "bar-chart/bar-chart.tsx", text: 'averageLabel = "Daily average"' },
  { file: "bar-chart/bar-chart.tsx", text: 'valueLabel = "Total"' },
  { file: "bar-chart/bar-chart.tsx", text: 'categoryLabel = "Day"' },
  // E0: was "`Avg ${".
  { file: "bar-chart/bar-chart.tsx", text: "useTransform(() => `Avg ${" },
  // E0: was '"No data"'.
  { file: "bar-chart/bar-chart.tsx", text: '${suffix}` : "No data"' },
  // E0: was "` Highest ${".
  { file: "bar-chart/bar-chart.tsx", text: "${highest ? ` Highest ${" },
  // E0: was "` Lowest ${".
  { file: "bar-chart/bar-chart.tsx", text: "${lowest && lowest !== highest ? ` Lowest ${" },
  // E0: was ", explore by ${".
  { file: "bar-chart/bar-chart.tsx", text: "aria-label={`${label}, explore by ${" },
  // Slice 3 (01/10/2026): drawer.
  { file: "drawer/drawer.tsx", text: 'aria-label="Close drawer"' },
  // Slice 5b (01/10/2026): textarea, copied by hand (registry/PATCHES.md), has none: its label, hint and error are props.
];

/**
 * The English side of every pair the slice E0 patches wrote (round v6,
 * QĐ-40): Arc's own words, exactly as the original source had them, now the
 * `en` of a `{ vi, en }` pair. `arc-registry.test.ts` checks each is in its
 * file, so the English screen keeps saying what Arc says.
 */
export const ARC_ENGLISH_SIDE: ReadonlyArray<{ file: string; text: string }> = [
  { file: "avatar/avatar.tsx", text: 'en: "online"' },
  { file: "avatar/avatar.tsx", text: 'en: "offline"' },
  { file: "checkbox/checkbox.tsx", text: 'en: "Checkbox"' },
  { file: "dialog/dialog.tsx", text: 'en: "Close dialog"' },
  { file: "drawer/drawer.tsx", text: 'en: "Close drawer"' },
  { file: "filter-toolbar/filter-toolbar.tsx", text: 'en: "All filters cleared"' },
  { file: "filter-toolbar/filter-toolbar.tsx", text: "en: `Added ${text(filter)}`" },
  { file: "filter-toolbar/filter-toolbar.tsx", text: 'en: `${filter.label} changed to ${filter.value ?? "any"}`' },
  { file: "filter-toolbar/filter-toolbar.tsx", text: "en: `Removed ${text(filter)}`" },
  { file: "filter-toolbar/filter-toolbar.tsx", text: 'en: "Add filter"' },
  { file: "filter-toolbar/filter-toolbar.tsx", text: 'en: "Back to fields"' },
  { file: "filter-toolbar/filter-toolbar.tsx", text: 'en: "Active filters"' },
  { file: "filter-toolbar/filter-toolbar.tsx", text: "en: `Remove ${filter.label}${value}`" },
  { file: "filter-toolbar/filter-toolbar.tsx", text: 'en: "No filters applied"' },
  { file: "filter-toolbar/filter-toolbar.tsx", text: 'en: "Clear all"' },
  { file: "pagination/pagination.tsx", text: 'en: "Pagination"' },
  { file: "pagination/pagination.tsx", text: 'en: "Previous page"' },
  { file: "pagination/pagination.tsx", text: "en: `Page ${number}`" },
  { file: "pagination/pagination.tsx", text: 'en: "Next page"' },
  { file: "search-field/search-field.tsx", text: 'en: "Clear search"' },
  { file: "select/select.tsx", text: 'en: "Select an option"' },
  { file: "sortable-data-table/sortable-data-table.tsx", text: 'en: "Data table"' },
  { file: "sortable-data-table/sortable-data-table.tsx", text: 'en: "No rows to show"' },
  { file: "sortable-data-table/sortable-data-table.tsx", text: 'en: { one: "row", other: "rows" }' },
  { file: "sortable-data-table/sortable-data-table.tsx", text: 'en: "selected"' },
  {
    file: "sortable-data-table/sortable-data-table.tsx",
    text: 'en: `Sorted by ${column.label}, ${next.direction === "asc" ? "ascending" : "descending"}`',
  },
  { file: "sortable-data-table/sortable-data-table.tsx", text: "en: `${list.length} of ${keys.length} selected`" },
  { file: "sortable-data-table/sortable-data-table.tsx", text: 'en: "Selection cleared"' },
  { file: "sortable-data-table/sortable-data-table.tsx", text: 'en: "Select all rows"' },
  {
    file: "sortable-data-table/sortable-data-table.tsx",
    text: 'en: `Sort by ${column.label}${active ? `, currently ${sort.direction === "asc" ? "ascending" : "descending"}` : ""}`',
  },
  { file: "sortable-data-table/sortable-data-table.tsx", text: "en: `Select ${String(row[columns[0]?.key] ?? key)}`" },
  { file: "sortable-data-table/sortable-data-table.tsx", text: 'en: "Clear selection"' },
  { file: "sortable-data-table/sortable-data-table.tsx", text: 'en: new Intl.Collator("en"' },
  { file: "tabs/tabs.tsx", text: 'en: "Scroll tabs left"' },
  { file: "tabs/tabs.tsx", text: 'en: "Scroll tabs right"' },
  { file: "toast-stack/toast-stack.tsx", text: 'en: "Success"' },
  { file: "toast-stack/toast-stack.tsx", text: 'en: "Info"' },
  { file: "toast-stack/toast-stack.tsx", text: 'en: "Warning"' },
  { file: "toast-stack/toast-stack.tsx", text: 'en: "Error"' },
  { file: "toast-stack/toast-stack.tsx", text: 'en: "In progress"' },
  { file: "toast-stack/toast-stack.tsx", text: 'en: "Dismiss notification"' },
  { file: "toast-stack/toast-stack.tsx", text: 'en: "Notifications"' },
  { file: "breadcrumb/breadcrumb.tsx", text: 'en: "Breadcrumb"' },
  { file: "stepper/stepper.tsx", text: 'en: "Completed"' },
  { file: "stepper/stepper.tsx", text: 'en: "Not started"' },
  { file: "stepper/stepper.tsx", text: 'en: "Error"' },
  { file: "stepper/stepper.tsx", text: 'en: "Progress"' },
  { file: "stepper/stepper.tsx", text: 'en: "All steps complete"' },
  { file: "stepper/stepper.tsx", text: "en: `Step ${active + 1} of ${count}: ${now.label}`" },
  { file: "combobox/combobox.tsx", text: 'en: "Search or select…"' },
  { file: "combobox/combobox.tsx", text: 'en: "No matches found"' },
  { file: "combobox/combobox.tsx", text: 'en: "Clear selection"' },
  { file: "combobox/combobox.tsx", text: "en: `${label} options`" },
  { file: "bar-chart/bar-chart.tsx", text: 'en: new Intl.NumberFormat("en-US"' },
  { file: "bar-chart/bar-chart.tsx", text: 'en: "Daily average"' },
  { file: "bar-chart/bar-chart.tsx", text: 'en: "Total"' },
  { file: "bar-chart/bar-chart.tsx", text: 'en: "Day"' },
  { file: "bar-chart/bar-chart.tsx", text: "en: `Avg ${formatTick(" },
  { file: "bar-chart/bar-chart.tsx", text: 'en: "No data"' },
  { file: "bar-chart/bar-chart.tsx", text: "en: ` Highest ${highest.label}, ${formatValue(highest.value)}${suffix}.`" },
  { file: "bar-chart/bar-chart.tsx", text: "en: ` Lowest ${lowest.label}, ${formatValue(lowest.value)}${suffix}.`" },
  { file: "bar-chart/bar-chart.tsx", text: "en: `${label}, explore by ${categoryLabel.toLowerCase()}`" },
];
