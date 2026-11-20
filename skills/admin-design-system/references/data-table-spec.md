# Data Table Specification

Read when: building or reviewing any list page.

## Contents
- Capability tiers
- Server contract
- Selection & bulk actions
- Rows, columns, actions
- States
- Search & filters
- Performance
- Responsive & accessibility
- Acceptance checklist

---

## Capability tiers

| Capability | Must | Should | Could (when justified) |
|---|---|---|---|
| Search (debounced 300ms) | ✔ | | |
| Column sorting | ✔ | | |
| Filters (status, date range, owner, category…) | ✔ | | |
| Pagination + page size (10/25/50/100) | ✔ | | |
| Row actions (primary click + overflow menu) | ✔ | | |
| Status badges | ✔ | | |
| Loading / empty / error states | ✔ | | |
| URL-synced state | ✔ | | |
| Row selection + bulk actions | | ✔ | |
| Column visibility | | ✔ | |
| Density toggle | | ✔ | |
| Sticky header | | ✔ | |
| Export (respects current filters, async for big sets) | | ✔ | |
| Persist preferences (columns, density, page size) | | ✔ | |
| Saved views | | | ✔ |
| Column resize / reorder, pinned columns | | | ✔ |
| Virtualisation (> ~500 rows rendered) | | | ✔ |
| Inline editing | | | ✔ (only for simple, safe fields) |
| Cursor pagination (very large/append-only) | | | ✔ |

**Never** load thousands of records into the browser to filter client-side. Lists > ~200 potential rows use **server-side** pagination, filtering and sorting.

## Server contract

Request (query): `q`, `page` (1-based) or `cursor`, `pageSize`, `sort` (`-createdAt,name`), filters as named params (`status=paid,shipped`, `createdFrom`, `createdTo`, `ownerId`). Whitelist sortable/filterable fields server-side.
Response: `{ data: T[], meta: { total, page, pageSize, totalPages } }` (or `nextCursor`). Total can be omitted/approximate for huge tables (`hasMore`). Return stable ordering (tie-break by id). Include only list-needed fields (no heavy blobs). Index sorted/filtered columns.

## Selection & bulk actions

- Header checkbox selects the current page; show banner "25 selected - Select all 1,240 matching" for cross-page selection (sends the filter, not IDs, with a server-side count).
- `BulkActionBar` replaces the toolbar while selected: count, actions, clear.
- Bulk actions need: permission check, preview of impact, confirmation for destructive, per-item result report (success/failed + reasons), limit (e.g. ≤ 500 per request or async job), audit log entry with the filter/ID set.
- Selection clears after success; preserved on failure (to retry).

## Rows, columns, actions

- First meaningful column is the identifier/name and acts as the primary link (opens drawer or detail). Row click = preview drawer; modifier-click opens detail in a new tab.
- Column order: identifier · status · key business fields · owner/assignee · dates (relative with absolute tooltip) · actions.
- Numeric/money right-aligned with tabular numerals and currency; dates in locale; booleans as badges/icons with text for a11y; long text truncated with tooltip.
- Overflow menu (⋯): secondary actions; destructive last, red, separated; disabled-with-tooltip when lacking permission or invalid state.
- Inline status change only when the transition is safe and reversible; otherwise route through a dialog capturing reason.

## States

| State | Behaviour |
|---|---|
| Initial loading | Skeleton rows matching column layout (not a lone spinner) |
| Refetching | Keep previous data visible (`keepPreviousData`), subtle top progress |
| Empty (no records yet) | Explain what the module is, primary CTA ("Create product"), link to docs/import |
| Empty (filters yield nothing) | "No results for …" + **Clear filters** button; keep toolbar |
| Error | Inline `ErrorState` with message, request ID if available, **Retry**; never wipe the toolbar |
| Forbidden | 403 state explaining missing permission |
| Stale/conflict after action | Refetch and toast |

## Search & filters

- One search box with scope hint ("Search orders by number, customer, email"). Debounce, cancel stale requests, preserve caret.
- `FilterBar`: quick filters as chips (status), advanced filters in a popover/drawer; applied filters are visible as removable chips; "Reset" is always one click; counts only if cheap.
- Date-range with presets (Today, 7 days, 30 days, custom) in the user's timezone.
- Vietnamese/diacritic-insensitive search handled server-side (normalised column, `unaccent`, or accent-insensitive collation).
- Sorting indicator + `aria-sort`; only whitelisted columns are sortable.

## Performance

- Request budget: list < 500ms p95 for 25 rows; avoid N+1 (join/include needed relations).
- Debounce, cancel in-flight, cache per query key, prefetch next page on hover/scroll if cheap.
- Rendering: memoised row components; virtualise beyond ~500 rendered rows; avoid re-render of entire table on selection.

## Responsive & accessibility

- ≥ 1280: full table. 768-1279: hide low-priority columns (column visibility defaults per breakpoint), horizontal scroll inside table container only. < 768: convert to card/list rows with key fields and actions.
- A row that opens a preview must be keyboard-operable (`tabindex="0"`, Enter/Space opens it, links inside keep their own behaviour) and focus returns to that row when the drawer closes. Skeleton rows must not be clickable.
- Semantic `<table>`/ARIA grid roles, `th scope`, `aria-sort`, selection checkboxes labelled ("Select order #1042"), live region announcing result count ("42 results"), full keyboard support (Tab, Space to select, Enter to open, optional `j/k`).

## Acceptance checklist

- [ ] URL reflects search/filter/sort/page; refresh and Back work
- [ ] Server-side pagination/filter/sort verified in the network tab
- [ ] All six states implemented (loading, refetch, empty-initial, empty-filtered, error, forbidden)
- [ ] Bulk actions: confirm, per-item results, audit entry, limits
- [ ] Row actions permission-aware; destructive confirmed
- [ ] Export honours filters and permissions
- [ ] Keyboard and screen-reader basics pass
- [ ] Looks right at 1440, 1024, 768, 390 widths
