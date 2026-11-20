# Detail Page Specification

Read when: building entity detail pages and preview drawers.

## Contents
- Anatomy
- Tabs vs sections
- Workflow entities
- Preview drawer
- Danger zone & actions
- Acceptance checklist

---

## Anatomy

1. **Breadcrumb** (`Orders › #1042`).
2. **EntityHeader**: human title (name/number, not raw UUID), `StatusBadge`, copyable identifiers, key meta (created, owner), **primary action** (the next logical step), overflow menu for secondary actions.
3. **Summary strip** (optional): 3-5 key facts (total, customer, due date, balance) - never a decorative KPI banner.
4. **Main column**: sections/tabs with the entity's information, editable where sensible.
5. **Right rail** (≥ 1280px): metadata, assignee, tags, related links, quick notes; collapses below main on small screens.
6. **Related records**: embedded mini-tables (order items, payments, enrolments) with links to their own detail pages and counts.
7. **Activity timeline**: chronological events (system + human + audit entries) with actor, time, before/after summaries, filter by type; notes/comments composer where collaboration matters.
8. **Danger zone** (bottom): archive/delete/purge with explanations and confirmation.

## Tabs vs sections

Use tabs only for **meaningful information groups** (Overview · Items · Payments · Shipping · Timeline). Rules: ≤ 6 tabs, tab state in `?tab=`, counts on tabs when useful, lazy-load heavy tabs, the default tab answers "what do I need to do now?". If content is short, prefer stacked sections with anchor links - not tabs.

## Workflow entities (orders, bookings, applications, KYC…)

- Show a **status stepper or timeline** of the lifecycle with the current state emphasised.
- A **"next action" banner** states what is waiting ("Awaiting payment verification") with the primary action button.
- Transitions are explicit buttons (Confirm, Ship, Refund…) that open a small dialog capturing reason/notes when needed; invalid transitions are hidden or disabled with a tooltip explaining why.
- Every transition appears in the timeline and the audit log; irreversible transitions get a confirmation.
- Show money breakdowns (subtotal, discounts, tax, shipping, total, paid, refunded, balance) and reconcile visibly.
- Surface conflicts (stock insufficient, payment mismatch) as inline alerts with resolution links.

## Preview drawer (from lists)

Width 480-640px, header with title + status + "Open full page", compact key facts, 1-3 quick actions (status, assignee, note), recent timeline items. URL-addressable (`?drawer=<id>`), closes with Esc, focus returns to the originating row, keyboard prev/next record where useful.

## Danger zone & actions

- Prefer **archive/soft delete** with restore; hard delete only for specific permissions and after dependency checks ("12 orders reference this product - archive instead").
- Confirmation levels: (1) simple confirm; (2) confirm with consequences listed; (3) typed confirmation of record name/number; (4) step-up auth for security-critical.
- Disabled actions explain why (permission or state) on hover/focus.

## Acceptance checklist

- [ ] Header shows human title, status, primary action; IDs copyable
- [ ] Related records and timeline present where relevant
- [ ] Workflow transitions explicit, validated, logged
- [ ] Tabs justified, URL-addressable
- [ ] Loading, 404 (record not found), 403, and error states
- [ ] Deleted/archived records render with a clear banner and restore action
- [ ] Responsive: right rail collapses; actions remain reachable
