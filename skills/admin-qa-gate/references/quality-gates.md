# Quality Gates

Read when: running QA for a module or the final gate. IDs (PC-1, UX-3…) are for referencing in `qa-report.md`.

## Contents
- Severity and pass criteria
- A. Product completeness
- B. UI/UX
- C. Functionality
- D. Security
- E. Engineering
- F. Performance
- G. Accessibility
- H. Documentation
- P. FE-first prototype checks
- Per-module quick checklist

---

## Severity and pass criteria

| Severity | Meaning | Examples |
|---|---|---|
| **Blocker** | Security hole, data loss/corruption, authz bypass, core workflow impossible | API lacks permission check; refund double-charges; list loads all rows and crashes |
| **Major** | Feature wrong/unusable in common cases, misleading UI | Filter ignored; status transition allowed from invalid state; fake success toast |
| **Minor** | Polish, rare edge, cosmetic | Misaligned icon, wording |

**Gate passes when:** 0 Blockers; 0 Majors in P0 modules; every Major elsewhere has owner + plan; all "Must" items below pass for in-scope modules; unverified areas are disclosed.

## A. Product completeness

- [ ] PC-1 Every major public-site feature has an owner module or a recorded decision (excluded/deferred).
- [ ] PC-2 Every core business entity has exactly one owner module.
- [ ] PC-3 Entity relationships are respected (can't delete referenced items; links between modules work).
- [ ] PC-4 Operational workflows from `product-discovery.md` §7 can be performed end-to-end.
- [ ] PC-5 No module without evidence/justification; `proposed` modules only built when approved.
- [ ] PC-6 Hard-coded business content/forms discovered in discovery have a management path.
- [ ] PC-7 Core modules present (auth, rbac, dashboard, admin-users, audit-log, settings, my-account) or exceptions documented.

## B. UI/UX

- [ ] UX-1 Tokens used everywhere; no ad-hoc colours/spacing; one component kit.
- [ ] UX-2 Sidebar logically grouped, active states correct, ≤ 2 levels, permission-filtered.
- [ ] UX-3 Page scaffold consistent: title, description, primary action, toolbar, content.
- [ ] UX-4 Tables: search, sort, filters, pagination, status badges, row/bulk actions per spec; URL-synced.
- [ ] UX-5 Forms: labels, required markers, validation, server-error mapping, dirty guard, sticky actions.
- [ ] UX-6 Detail pages: header with status/primary action, related records, timeline.
- [ ] UX-7 Loading / empty (initial + filtered) / error / forbidden / not-found states everywhere.
- [ ] UX-8 Destructive actions confirmed proportionally; undo/soft delete where possible.
- [ ] UX-9 Dashboard leads with actionable queues; no placeholder stats; every tile drills down.
- [ ] UX-10 Responsive at 1440/1024/768/390; only tables scroll horizontally.
- [ ] UX-11 Toasts consistent; messages actionable; no native alert/confirm.
- [ ] UX-12 None of the "AI admin tells" from `enterprise-admin-architect/references/principles-and-antipatterns.md`.

## C. Functionality

- [ ] FN-1 Real API/database integration; no mock data or fake success in production paths. (`fe-first` prototypes: mock only inside the guarded adapter - see §P.)
- [ ] FN-2 Create/read/update/archive/restore behave correctly (where applicable); data persists after refresh.
- [ ] FN-3 State transitions follow the lifecycle; invalid transitions rejected server-side (409/422).
- [ ] FN-4 Validation enforced on server; errors surface on the right fields.
- [ ] FN-5 Search/filter/sort/pagination return correct results, including empty and boundary pages.
- [ ] FN-6 Bulk actions: confirmation, limits, per-item results, audit entry.
- [ ] FN-7 Import/export honour filters and permissions; exports are injection-safe.
- [ ] FN-8 Concurrent edit protection (409) and idempotency for money/creation.
- [ ] FN-9 Audit log entries exist for sensitive/destructive actions with actor, before/after, reason.
- [ ] FN-10 Notifications/emails/side effects triggered by transitions actually fire (or are documented gaps).
- [ ] FN-11 Dashboard numbers match the underlying data (spot-check against lists/DB).
- [ ] FN-12 Errors are handled: API down, 401 (re-login with return URL), 403, 404, 409, 500.

## D. Security

- [ ] SEC-1 Every admin endpoint/action enforces authn + permission **server-side** (tested without UI).
- [ ] SEC-2 UI gating mirrors server permissions (nav, routes, buttons).
- [ ] SEC-3 IDOR: records outside the user's scope are inaccessible (403/404).
- [ ] SEC-4 Mass assignment blocked (cannot set `role`, `status`, `price` etc. via crafted payload).
- [ ] SEC-5 Admin login rate-limited; sessions hardened; revoked on deactivation; MFA for privileged roles where planned.
- [ ] SEC-6 CSRF protection verified for state-changing requests.
- [ ] SEC-7 Uploads validated (type/size/magic bytes); user content isolated; SVG/HTML handled.
- [ ] SEC-8 Rich text sanitised; outputs escaped; CSP/headers present; admin `noindex`.
- [ ] SEC-9 PII masked by default; reveal audited; secrets never in client, logs, or audit diffs.
- [ ] SEC-10 Dangerous features (impersonation, bulk delete, export, role edit) have extra controls.
- [ ] SEC-11 Last Super Admin protected; no privilege self-escalation.

## E. Engineering

- [ ] ENG-1 Typecheck, lint, build pass; no new warnings of note.
- [ ] ENG-2 No critical console errors on any admin page; no failed network calls in happy paths.
- [ ] ENG-3 Feature-based structure; shared components reused; no copy-paste duplication of business rules.
- [ ] ENG-4 Centralised API client, schema validation, consistent error model.
- [ ] ENG-5 Strict typing; no `any` leaks at boundaries.
- [ ] ENG-6 No broken routes/links; 404/403 pages work.
- [ ] ENG-7 Existing public site, auth, API contracts and design system unaffected (regression run).
- [ ] ENG-8 Migrations reversible and applied cleanly on a fresh DB; seed script works.
- [ ] ENG-9 No unnecessary new dependencies; additions justified in docs.
- [ ] ENG-10 Admin bundle isolated from public bundle (route group/dynamic imports).

## F. Performance

- [ ] PERF-1 List endpoints paginated server-side; tested with a large dataset (≥ 100k rows in the largest entity, ≥ 1M in event tables; recipe in `e2e-test-playbook.md`): first page, every sortable column in both directions, a deep page and search each < ~500ms locally (search < ~1 s), dashboards/reports < ~2 s.
- [ ] PERF-2 No N+1 queries on list/detail (check query logs).
- [ ] PERF-3 Indexes exist for filtered/sorted columns.
- [ ] PERF-4 Heavy exports/reports are async/cached.
- [ ] PERF-5 UI responsive with 100-row pages; no layout shift; large lists virtualised if needed.
- [ ] PERF-6 Per-row counts and aggregates on a list are computed for the returned page only (keys paged first); sorting by an aggregate uses a pre-aggregated join, not one lookup per row. Before/after timings are in the QA report.

## G. Accessibility

- [ ] A11Y-1 Keyboard-only operation for primary flows; Esc closes overlays; focus returns.
- [ ] A11Y-2 Visible focus indicators; skip link.
- [ ] A11Y-3 Inputs labelled; errors announced; icon buttons named.
- [ ] A11Y-4 Contrast AA; status not colour-only.
- [ ] A11Y-5 Table semantics (`th scope`, `aria-sort`), dialog semantics, live regions for toasts/counts.
- [ ] A11Y-6 Reduced motion respected.

## H. Documentation

- [ ] DOC-1 `docs/admin/*` match the implementation (validator clean at `final` stage).
- [ ] DOC-2 `permission-matrix.md` equals the permission constants/seed in code.
- [ ] DOC-3 Backend gaps and limitations are listed honestly.
- [ ] DOC-4 Run/seed/login instructions per role exist.

## P. FE-first prototype checks (only for `prototype` modules)

A prototype passes its review when the UI is right and the contract is trustworthy. It is **not** a pass for functionality or security.

- [ ] PROTO-1 UI reaches the data only through the service interface; no component imports fixtures or branches on mock except the prototype toolbar/banner.
- [ ] PROTO-2 Mock emulates server semantics: server-side pagination/sort/filter/search, latency, `422` with field errors, `403` per active role, `409` for invalid transitions/stale versions, same `ApiError` shape.
- [ ] PROTO-3 Fixtures are synthetic, derived from the real schema, cover every lifecycle state, edge cases, an empty set and a large set (≥ 2k rows).
- [ ] PROTO-4 "Prototype data" banner visible on every admin page; role switcher and scenario toggles (empty/error/slow/forbidden/conflict) work.
- [ ] PROTO-5 `api-contract.md` lists every endpoint the UI calls, matches the zod schemas, and is versioned (v0 draft → v1 frozen at Gate 2b).
- [ ] PROTO-6 Environment guard throws when `source=mock` in `production`; CI/build check proves the mock marker is absent from the production bundle; preview deployments are access-protected and `noindex`.
- [ ] PROTO-7 Inventory status is `prototype`; implementation-status Data source = `mock`; Verified ≠ `yes`; every handoff says "UI prototype, backend pending".
- [ ] PROTO-8 No real customer data or secrets in fixtures or the preview environment.
- [ ] PROTO-9 (after backend) Swap checklist done: contract tests pass against real responses, Data source = `api`, mock affordances removed from production paths, then §A-H apply in full.

## Per-module quick checklist

Use after each module (copy into the QA report row):

1. Workflow golden path ✔ · negative path ✔
2. API forbidden for roles without permission ✔ (list roles tested)
3. UI gating ✔
4. States (loading/empty/filtered-empty/error/forbidden) ✔
5. URL state + server-side pagination ✔ (network evidence)
6. Audit events ✔
7. Responsive ✔ · keyboard ✔
8. Typecheck/lint/build ✔
9. Docs updated ✔
