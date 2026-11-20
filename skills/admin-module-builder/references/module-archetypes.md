# Module Archetypes

Read when: writing a module spec (step A). Not every module is CRUD - pick the archetype, then add domain specifics from `admin-discovery/references/domains/`.

## Contents
1. Catalog (CRUD+)
2. Transactional workflow
3. Content / editorial
4. Inbox / queue
5. Ledger / read-mostly
6. Settings / singleton
7. Calendar / availability
8. Directory (users, customers, members)
9. Media library
10. Reports / analytics
- Archetype → required capabilities matrix

---

## 1. Catalog (products, categories, services, team, FAQs)
- **Screens:** list (filters by status/category) · preview drawer · detail/edit page · create.
- **Must:** draft/active/archived status, ordering (persisted `sort_order`, drag & drop), slug uniqueness, media attachments, SEO fields if public, soft delete + restore, dependency check before delete (used by orders/pages), bulk status/price edit with preview, duplicate/clone.
- **Pitfalls:** deleting referenced items; slug collisions; ordering with filtered lists; large catalogues without server search.

## 2. Transactional workflow (orders, bookings, enrolments, applications, appointments)
- **Screens:** list with status tabs & aging · detail with lifecycle stepper, next-action banner, related records, timeline · transition dialogs (reason/notes) · optional kanban/calendar.
- **Must:** explicit **state machine** (allowed transitions + guards) enforced server-side; transitions as dedicated endpoints/actions (not free PATCH of `status`); each transition audited + notifies side effects (email, stock, ledger); money breakdown reconciled; partial operations (partial refund/ship) where real; idempotent transition requests; optimistic concurrency; manual override permission with mandatory reason.
- **Pitfalls:** status edited as free text; double-submit; stock/capacity races; transitions without side-effect handling; editing historical snapshots (prices) after the fact.

## 3. Content / editorial (articles, pages, project case studies)
- **Screens:** list with status tabs · editor page (sections, rich text/blocks, media, SEO, preview) · review queue · calendar (scheduled).
- **Must:** draft vs published separation, autosave draft, preview URL, publish/unpublish/schedule, revision history & restore, slug + redirect on change, role scopes (own vs all), sanitisation of rich text, concurrent edit protection, localisation status if multilingual.
- **Pitfalls:** editing live content directly; losing work; XSS; broken links on slug change.

## 4. Inbox / queue (leads, tickets, moderation, KYC, applications to review)
- **Screens:** queue list prioritised by age/severity · split view (list + detail) · keyboard navigation · bulk assign/close.
- **Must:** status flow (new → in progress → resolved/closed/spam), assignee + claim/lock to avoid double work, SLA/age indicators, internal notes (not visible publicly), canned responses/templates, decision reason codes, spam handling, export, audit of decisions, counts for sidebar/dashboard badges.
- **Pitfalls:** no ownership; no aging; deleting spam instead of marking; moderator seeing sensitive data by default.

## 5. Ledger / read-mostly (payments, transactions, audit log, usage, invoices)
- **Screens:** filterable log · detail with raw/provider payload (restricted) · reconciliation views · export.
- **Must:** append-only; corrections are reversing entries; money as integer minor units + currency; links to source entity; provider IDs; status sync from webhooks (idempotent); date-range filters with totals; export; restricted permissions.
- **Pitfalls:** editing/deleting rows; floating-point money; unbounded date ranges on huge tables.

## 6. Settings / singleton (site info, branding, integrations, policies)
- **Screens:** sectioned settings page (cards/tabs), each section independently saved.
- **Must:** only real, consumed settings; validation; secrets write-only/masked; "last changed by/at"; audit with before/after; environment awareness; effect on public site (cache revalidation); danger zone for risky switches; versioned or effective-dated for pricing/policy.
- **Pitfalls:** settings no code reads; exposing secrets; no cache invalidation.

## 7. Calendar / availability / scheduling (departures, slots, shifts, classes)
- **Screens:** month/week/day calendar + list alternative · bulk edit of ranges · conflict warnings · drawer for a slot/date.
- **Must:** server-driven range queries (visible window only), capacity/availability model, overrides (blackout dates), recurring rules with exceptions, timezone handling, double-booking prevention via DB constraints/atomic updates, holds with expiry.
- **Pitfalls:** loading a year of data; timezone off-by-one; overbooking under concurrency.

## 8. Directory (admin users, customers, members, vendors)
- **Screens:** list with search/filters/status · profile detail (activity, related records, notes) · actions.
- **Must:** distinguish user types; status (active/suspended/deactivated) with reason; PII masking & reveal permission; session revocation on deactivation; merge duplicates (P2); impersonation only with strict controls; export restricted; notes/tags; activity history.
- **Pitfalls:** mixing admins and customers; hard delete of users with history; leaking PII in lists/exports.

## 9. Media library
- **Screens:** grid/list toggle · upload (drag & drop, multi) · preview panel (metadata, alt text, dimensions, usage references) · filters by type/date/folder.
- **Must:** type/size/dimension validation (server + client), virus/content checks if available, direct-to-storage uploads with signed URLs (large files), thumbnails/derivatives, alt text, replace without breaking URLs, delete protection if referenced, orphan cleanup, per-role access.
- **Pitfalls:** uploading through serverless body limits; deleting files still referenced; SVG/HTML upload XSS; no alt text.

## 10. Reports / analytics
- **Screens:** report pages with date range, comparison, breakdown, export.
- **Must:** definitions of each metric; server-side aggregation (SQL/materialised/cached) never client-side over raw rows; consistent timezone; drill-down to filtered lists; data freshness label; permission-gated.
- **Pitfalls:** metrics the data can't support; heavy queries on OLTP DB without limits.

## Archetype → required capabilities

| Capability | Catalog | Workflow | Content | Queue | Ledger | Settings | Calendar | Directory | Media | Report |
|---|---|---|---|---|---|---|---|---|---|---|
| Server-side list | ✔ | ✔ | ✔ | ✔ | ✔ | - | range | ✔ | ✔ | agg |
| State machine | status | **✔** | ✔ | ✔ | - | - | holds | status | - | - |
| Soft delete / archive | ✔ | cancel | ✔ | close | **never delete** | - | cancel | deactivate | guard refs | - |
| Audit events | ✔ | **✔** | ✔ | **✔** | built-in | **✔** | ✔ | **✔** | ✔ | - |
| Optimistic concurrency | ✔ | **✔** | **✔** | claim/lock | - | ✔ | **✔** | ✔ | - | - |
| Export | ✔ | ✔ | ✔ | ✔ | **✔** | - | ✔ | restricted | - | **✔** |
