# Navigation & Interaction Patterns

Read when: designing the sidebar, routes, and choosing drawer/page/modal.

## Contents
- Sidebar grouping examples by domain
- Route conventions
- Interaction pattern decision table
- URL state
- Breadcrumbs, search, command menu
- Sidebar behaviour

---

## Sidebar grouping examples

Operators think in jobs. Examples (adapt; do not copy blindly):

**E-commerce**: Overview · *Sales* (Orders, Returns & Refunds, Payments) · *Catalog* (Products, Categories, Inventory) · *Customers* · *Marketing* (Promotions, Reviews) · *Content* (Pages, Banners) · *Insights* · *Settings & Access*.
**Travel/Booking**: Overview · *Bookings* (Bookings, Enquiries, Cancellations) · *Inventory* (Tours, Departures & Availability, Pricing) · *Customers* · *Partners* (Suppliers) · *Content* · *Insights* · *Settings & Access*.
**Education**: Overview · *Teaching* (Courses, Classes, Instructors) · *Learners* (Students, Enrollments, Attendance, Assessments) · *Finance* (Tuition, Payments) · *Content* · *Settings & Access*.
**Corporate/Agency**: Overview · *Inbox* (Leads) · *Content* (Pages, Services, Projects, Team, Testimonials, Blog) · *SEO* · *Settings & Access*. (Often only 4-5 groups.)
**News**: Overview · *Editorial* (Articles, Review queue, Calendar) · *Taxonomy* (Categories, Tags, Authors) · *Audience* (Comments, Newsletter) · *Media* · *Settings & Access*.
**SaaS**: Overview · *Customers* (Organizations, Users) · *Billing* (Plans, Subscriptions, Invoices) · *Product* (Usage, Feature flags, API keys) · *Support* · *System* · *Settings & Access*.

Principles: operational first, config last · ≤ 9 groups · ≤ 2 levels · one home per module · pin Settings & Access at the bottom · show counts/badges only for actionable queues (pending orders), not totals.

## Route conventions

| Purpose | Pattern |
|---|---|
| Dashboard | `/admin` |
| List | `/admin/<module>` |
| Create | `/admin/<module>/new` |
| Detail | `/admin/<module>/[id]` |
| Edit | `/admin/<module>/[id]/edit` (or inline tabs) |
| Nested resource | `/admin/<module>/[id]/<child>` (e.g. `/admin/courses/[id]/lessons`) |
| Singleton settings | `/admin/settings/<section>` |
| Reports | `/admin/reports/<name>` |
| Auth | `/admin/login`, `/admin/forgot-password`, `/admin/403` |

Use stable IDs or slugs consistently; kebab-case module segments; the same noun in route, breadcrumb, page title and permission key. Admin must be `noindex`, excluded from sitemap/robots-allow, and not bundled in public pages.

## Interaction pattern decision table

| Situation | Pattern |
|---|---|
| Glance at a record from a list, light edit (status, assignee, note) | **Preview drawer** (right, 480-640px) |
| Complex detail, long forms, nested resources, needs shareable URL | **Full page** |
| Short focused decision that needs attention (confirm delete, reason for refund, change status with note) | **Modal** (small) |
| Tiny contextual control (quick filter, column toggle, inline help) | **Popover** |
| Multi-step with dependencies (import, onboarding, refund wizard) | **Wizard page/stepper** |
| Many-record time-based work (bookings, shifts, schedule) | **Calendar view** + drawer |
| Pipeline work (applications, orders by stage) | **Kanban** with table alternative |
| Work inbox (moderation, KYC, leads) | **Queue view** with keyboard navigation and side detail |

Escalation: drawer → "Open full page" always available. Never stack modals; never open a modal from a drawer for something that deserves a page. Destructive/irreversible → confirmation scaled to risk (simple confirm → typed confirmation of the record name).

Default flow: **Table → Preview Drawer → Full Detail Page**.

## URL state

Represent in the query string: search `q`, filters (`status=paid,shipped`), `sort=-createdAt`, `page`, `pageSize`, `view` (saved view), `tab`, `drawer=<id>` (so a drawer is linkable). Benefits: shareable, refresh-safe, Back button works. Table density and column visibility are **user preferences** (local/server-persisted), not URL; a saved view is a named URL query (`admin-design-system/references/data-table-spec.md`, "Column visibility and saved views").

After create/edit/delete, return to the list URL the user came from (store `returnTo`).

## Breadcrumbs, search, command menu

- Breadcrumbs: `Group › Module › Record name` (use the record's human label, never raw ID alone). Last crumb is not a link.
- Global search and command menu (`Ctrl/Cmd+K`): one dialog, specified below. Skip it when there are fewer than about 8 destinations.
- Header bell: the attention bell below. A notification centre with read/unread is a different thing and needs an event store.

## Command menu and keyboard shortcuts

Proven in a build (tests per role, axe in light and dark, phone width).

- **Trigger:** `Ctrl/⌘+K` anywhere, also inside a text field, plus a visible header button that shows the key (an icon on narrow screens, with an accessible name that names the key and `aria-keyshortcuts`). It never opens on top of another modal dialog; pressing the key again closes it.
- **Contents, in order:** recent pages (per admin, kept on the device, the current page left out) · pages · actions (theme, shortcut help, account, sign out) · once two characters are typed, one "Search for 'x' in <list>" entry per list the role may read (people, records, audit log). Nothing the role may not open appears; the server still refuses. In the test, the role's sidebar is the oracle for the pages and for which search entries exist.
- **Matching:** accent-insensitive and every word must match, in any order ("nguoi dung" finds "Người dùng"). No fuzzy ranking is needed for a dozen destinations.
- **Semantics:** a modal dialog holding a combobox input over a listbox. `aria-activedescendant` points at the active option; Arrow Up/Down wrap, Home/End jump, Enter runs, Escape closes and focus returns to where it was; a polite live region announces the number of results; group labels are not options.
- **IME:** an Enter that confirms a composition (Vietnamese Telex/VNI, Chinese, Japanese) must not run a command: ignore key events with `isComposing` (Safari reports `keyCode` 229 for the Enter that ends a composition, with `isComposing` already false: ignore that too).
- **Single-key shortcuts** ("g" then a letter to go to a page; "?" for the list): never while typing in a field, never with a modifier, never while a dialog is open, only to pages the role may open. One unique letter per page; the "?" list shows only the role's pages. Avoid keys that the browser or a screen reader uses.
- **No destructive actions in the menu** (no "delete", "suspend", "publish"): those need their reason dialog, which a one-line menu cannot give.

## Attention bell

A bell in the header on every page that shows what needs doing now. It must call the **same function** as the dashboard's task list (one place decides what counts, or two lists drift apart), ask only for data the role may read (no 403 on any page, ever), and refresh when opened and when the tab regains focus (it is not a push channel, so do not word it as one). Its badge counts tasks, never "unread". The popover is a dialog with a title, the tasks with a way in each, an empty state ("Nothing pending") and an error state. A real notification centre (events with read/unread, mark all read) needs a server-side event store: build it only when the owner asks for events the dashboard cannot express.

## Sidebar behaviour

- Expanded 240-264px; collapsible to icon rail (56-64px) with tooltips; remembers state.
- In the **collapsed rail every icon is centred**, with and without its tooltip. A tooltip wrapper that shrinks to its content moves the icon a few pixels off the centre, which is easy to see on screen and impossible to see in a review. Make the wrapper fill the item and assert each icon's offset from the rail's centre (≤ 0.5 px, `UX-23`).
- Active item highlighted along with its group; groups collapsible; keyboard accessible (arrow keys, Enter).
- Mobile/tablet: off-canvas drawer navigation.
- Footer: environment badge (prod vs staging), user menu, help.
- Never render items the role cannot read.
