/**
 * Every English string Arc's free components (installed 30/09 and 01/10/2026,
 * round v5 slices 0 to 3) show a person or read to a screen reader, as it stood in
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
 */
export const ARC_ENGLISH: ReadonlyArray<{ file: string; text: string }> = [
  { file: "avatar/avatar.tsx", text: "`, ${status}`" },
  { file: "checkbox/checkbox.tsx", text: '(label ? undefined : "Checkbox")' },
  { file: "dialog/dialog.tsx", text: 'aria-label="Close dialog"' },
  { file: "filter-toolbar/filter-toolbar.tsx", text: '"All filters cleared"' },
  { file: "filter-toolbar/filter-toolbar.tsx", text: "`Added ${" },
  { file: "filter-toolbar/filter-toolbar.tsx", text: " changed to ${" },
  { file: "filter-toolbar/filter-toolbar.tsx", text: '?? "any"' },
  { file: "filter-toolbar/filter-toolbar.tsx", text: "`Removed ${" },
  { file: "filter-toolbar/filter-toolbar.tsx", text: 'label = "Add filter"' },
  { file: "filter-toolbar/filter-toolbar.tsx", text: 'aria-label="Back to fields"' },
  { file: "filter-toolbar/filter-toolbar.tsx", text: 'label = "Active filters"' },
  { file: "filter-toolbar/filter-toolbar.tsx", text: "`Remove ${" },
  { file: "filter-toolbar/filter-toolbar.tsx", text: ">No filters applied<" },
  { file: "filter-toolbar/filter-toolbar.tsx", text: ">Clear all<" },
  { file: "pagination/pagination.tsx", text: 'label = "Pagination"' },
  { file: "pagination/pagination.tsx", text: 'aria-label="Previous page"' },
  { file: "pagination/pagination.tsx", text: "`Page ${number}`" },
  { file: "pagination/pagination.tsx", text: 'aria-label="Next page"' },
  { file: "search-field/search-field.tsx", text: 'aria-label="Clear search"' },
  { file: "select/select.tsx", text: 'placeholder = "Select an option"' },
  { file: "sortable-data-table/sortable-data-table.tsx", text: 'caption = "Data table"' },
  { file: "sortable-data-table/sortable-data-table.tsx", text: 'emptyMessage = "No rows to show"' },
  { file: "sortable-data-table/sortable-data-table.tsx", text: '{ one: "row", other: "rows" }' },
  { file: "sortable-data-table/sortable-data-table.tsx", text: 'selectedCount ? "selected"' },
  { file: "sortable-data-table/sortable-data-table.tsx", text: "`Sorted by ${" },
  { file: "sortable-data-table/sortable-data-table.tsx", text: "} selected`" },
  { file: "sortable-data-table/sortable-data-table.tsx", text: '"Selection cleared"' },
  { file: "sortable-data-table/sortable-data-table.tsx", text: 'label="Select all rows"' },
  { file: "sortable-data-table/sortable-data-table.tsx", text: "`Sort by ${" },
  { file: "sortable-data-table/sortable-data-table.tsx", text: ", currently ${" },
  { file: "sortable-data-table/sortable-data-table.tsx", text: "`Select ${" },
  { file: "sortable-data-table/sortable-data-table.tsx", text: ">Clear selection<" },
  { file: "sortable-data-table/sortable-data-table.tsx", text: 'Intl.Collator("en"' },
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
  { file: "stepper/stepper.tsx", text: "`Step ${" },
  { file: "combobox/combobox.tsx", text: 'placeholder = "Search or select…"' },
  { file: "combobox/combobox.tsx", text: 'emptyMessage = "No matches found"' },
  { file: "combobox/combobox.tsx", text: 'aria-label="Clear selection"' },
  { file: "combobox/combobox.tsx", text: "} options`" },
  // Slice 2 (30/09/2026): bar-chart.
  { file: "bar-chart/bar-chart.tsx", text: 'Intl.NumberFormat("en-US"' },
  { file: "bar-chart/bar-chart.tsx", text: 'averageLabel = "Daily average"' },
  { file: "bar-chart/bar-chart.tsx", text: 'valueLabel = "Total"' },
  { file: "bar-chart/bar-chart.tsx", text: 'categoryLabel = "Day"' },
  { file: "bar-chart/bar-chart.tsx", text: "`Avg ${" },
  { file: "bar-chart/bar-chart.tsx", text: '"No data"' },
  { file: "bar-chart/bar-chart.tsx", text: "` Highest ${" },
  { file: "bar-chart/bar-chart.tsx", text: "` Lowest ${" },
  { file: "bar-chart/bar-chart.tsx", text: ", explore by ${" },
  // Slice 3 (01/10/2026): drawer.
  { file: "drawer/drawer.tsx", text: 'aria-label="Close drawer"' },
];
