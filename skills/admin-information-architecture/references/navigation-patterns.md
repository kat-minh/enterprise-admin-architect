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

Represent in the query string: search `q`, filters (`status=paid,shipped`), `sort=-createdAt`, `page`, `pageSize`, `view` (saved view), `tab`, `drawer=<id>` (so a drawer is linkable). Benefits: shareable, refresh-safe, Back button works. Table density and column visibility are **user preferences** (local/server-persisted), not URL.

After create/edit/delete, return to the list URL the user came from (store `returnTo`).

## Breadcrumbs, search, command menu

- Breadcrumbs: `Group › Module › Record name` (use the record's human label, never raw ID alone). Last crumb is not a link.
- Global search (`/` or `Ctrl/Cmd+K`): searches 3-6 key entities (orders by number, customers by email/phone, products by SKU/name). Results grouped, permission-filtered, keyboard-navigable.
- Command menu: navigation shortcuts + "Create …" actions + recent items. Skip when < 8 modules.
- Notifications bell: actionable events with deep links; unread count; "mark all read".

## Sidebar behaviour

- Expanded 240-264px; collapsible to icon rail (56-64px) with tooltips; remembers state.
- Active item highlighted along with its group; groups collapsible; keyboard accessible (arrow keys, Enter).
- Mobile/tablet: off-canvas drawer navigation.
- Footer: environment badge (prod vs staging), user menu, help.
- Never render items the role cannot read.
