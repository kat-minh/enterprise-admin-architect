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
| Row expansion (a detail strip under the row) | | | ✔ (when the extra fields are few and read-only; otherwise a drawer) |
| Cursor pagination (very large/append-only) | | | ✔ |

**Never** load thousands of records into the browser to filter client-side. Lists > ~200 potential rows use **server-side** pagination, filtering and sorting.

## Column visibility and saved views

Proven in a build. Both are per-admin conveniences kept on the device; neither changes what a role may see.

- **Storage:** one key per admin and table (`<app>.table.<adminId>.<table>` in `localStorage`) holding `{ hidden: [columnKey], views: [{ id, name, search }] }`. Keyed by the admin's id so two people on one computer never see each other's. **Validate on read** (types, lengths, counts) and fall back to the defaults on anything unexpected (an older shape, a hand edit); wrap every access in try/catch (private mode, quota). Nothing is sent to the server. Say it in the UI ("Saved on this browser, for you only"); when operators use several devices, store it on the server instead and say so in the module spec.
- **Hiding columns:** the identifier column and the open/actions column are `required` and never offered. Hidden columns are hidden in the card layout too. A "Restore defaults" button. The toolbar button shows how many columns are visible.
- **Saved view = the list's own URL query** (filters, search, sort, page size) without the page number or an open drawer, keys sorted, empty values dropped. List state already lives in the URL, so applying a view is navigating to it, and the applied view is marked (`aria-current`). Name 1-40 characters, unique ignoring case and accents, at most 10 per table. Before saving, show in plain words what will be saved ("Status: active · Sort: -created_at"). Deleting needs no confirmation: it is local and quick to recreate.
- **Phone:** when the table becomes cards its header, and the sort buttons with it, are gone. Provide a sort control (a select) in the toolbar; otherwise sorting is impossible on a phone.
- **Deliberately not offered, and written down as such in the module spec:** *inline editing* of admin data (every change needs a reason and an audit entry, which a cell edit cannot collect) · *column resize and reorder* (more behaviour to test and make accessible, little gain when low-priority columns already hide) · *row expansion* when a preview drawer exists.

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
- **Export** respects the current search and filters and the viewer's permissions (masked fields stay masked); big sets run as a background job. A CSV is UTF-8 with a BOM (spreadsheets read accents), values quoted, and a cell that starts with `=`, `+`, `-` or `@` is neutralised (formula injection). An export is an audited action when it contains personal data.

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
- [ ] Preferences kept on the device (hidden columns, saved views) are keyed by admin, validated on read, survive a reload, and a damaged stored value falls back to the defaults
- [ ] On a phone, sorting is still possible (a sort control replaces the header buttons)
- [ ] Server-side pagination/filter/sort verified in the network tab
- [ ] All six states implemented (loading, refetch, empty-initial, empty-filtered, error, forbidden)
- [ ] Bulk actions: confirm, per-item results, audit entry, limits
- [ ] Row actions permission-aware; destructive confirmed
- [ ] Export honours filters and permissions
- [ ] Keyboard and screen-reader basics pass
- [ ] Looks right at 1440, 1024, 768, 390 widths
