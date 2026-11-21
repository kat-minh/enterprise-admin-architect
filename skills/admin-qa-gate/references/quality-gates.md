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
- I. Operations
- J. Privacy and data rights
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
- [ ] PC-8 Every row of the "Content & configuration inventory" classified **CMS** has a module, and an edit made in the admin shows up in the public product (and the PWA) within the documented time; the rollback works; with the read path down the product still renders from defaults.
- [ ] PC-9 Every foundation module is included or excluded with a reason the owner confirmed at Gate 1 (the validator lists the undecided ones); every owner-intake answer maps to a module, a ledger row or an exclusion.

### Site content / UI configuration (only when `site-content` or `localization` is in scope)

- [ ] CMS-1 Drafts are invisible to users; publish, discard and rollback are atomic with their audit rows (force an audit failure: nothing changes) and each needs a reason.
- [ ] CMS-2 Rollback creates a new version; versions are immutable (a direct UPDATE or DELETE is rejected); version 0 means the code defaults.
- [ ] CMS-3 Preview shows the draft in the real public product through a short-lived token, never cached, with a visible "preview" marker.
- [ ] CMS-4 Input is plain text and validated server-side: HTML, placeholder or plural mismatch, over-long text, unknown keys and low-contrast colours are rejected with a precise message; an XSS payload renders inert.
- [ ] CMS-5 Concurrent edits give `409`; edit, publish and read permissions are separate and enforced by the API.
- [ ] CMS-6 The public read endpoint serves only published content, with `ETag`/`304` and a short cache; strings built at module load are covered; orphaned overrides are listed, never dropped.
- [ ] CMS-7 The time between "published" and "visible" is stated in the UI and was measured.
- [ ] DS-1 (design control in scope) The level of design control (L1/L2/L3 of `capability-ladders.md`) is recorded; the token catalogue is closed and kept on the server; every token is editable, derived or locked, and each lock has a stated reason.
- [ ] DS-2 Contrast is computed on the server per theme for every colour **and every derived colour** (hover, soft background, status colour on its tint, the text on the accent): normal text ≥ 4.5:1, only large text 3:1, components 3:1. No threshold was lowered to fit a default.
- [ ] DS-3 Font, type scale, radius, shadow, density and motion are enumerations. Fonts are a curated, self-hosted, lazily loaded list (≤ 4 weights); there is no arbitrary font URL, no custom CSS and no client-computed CSS.
- [ ] DS-4 Image upload is safe: magic bytes match the declared type, dimensions and aspect ratio per slot, size limit, re-encoded, no SVG, animated files refused, alt text per language, immutable storage, drafts not publicly reachable, a usage view and a takedown. Forged files are tested.
- [ ] DS-5 The public product applies the design through an allow-list of variable names and a safe value pattern, keeps the last good copy, never breaks when the endpoint is down or the payload is hostile (both tested).
- [ ] DS-6 Surfaces publish and roll back independently when permissions are split by surface; a draft touching design needs the design publish permission in addition (403 names the missing one); a publish or revert can be scheduled and is audited.
- [ ] DS-7 Preview runs in the real product at phone, tablet and desktop widths, light and dark, each language. A publish check (accessibility in both themes, no overflow at 390 px, logo and font load) runs on the product with the draft applied and is shown before publishing.
- [ ] DS-8 Export uses a pinned, named token format and a round trip was tested with a real consumer; import is a dry run first, writes only to the draft and lists unknown tokens.
- [ ] DS-9 Calm motion exists; the visitor's reduced-motion preference is honoured in every mode; the focus ring and the minimum touch height cannot be edited.
- [ ] DS-10 Deliberate exclusions (custom CSS, SVG upload, breakpoints, component variants, multi-brand) are written in the module spec with their reasons.
- [ ] DS-11 **The editor is a workbench** (`design-system-cms.md` §13): at desktop width the controls and a sticky preview are visible together; an **unsaved** edit shows in the preview within about a second through a resolve endpoint (no write, no audit, same validation as save, `ok: false` for a bad value) and an origin-checked, allow-listed message to the frame; the frame has a representative screen of the product's real components besides the home page; the save bar exists only when something is unsaved, sits inside the controls column and does not cover content. Proven with screenshots of every tab and a test that changes a value and reads the computed style in the frame without saving.
- [ ] DS-12 **Every choice shows its effect**: the samples of an enumeration differ from option to option (no identical samples across options), colour fields show swatch, hex and a one-line contrast verdict with the numbers in a tooltip, and a failing value says what to change. Reviewed on screenshots, with the evidence line per tab in `qa-report.md`.
- [ ] DS-13 **The catalogue matches the level claimed**: every family of `design-system-cms.md` §12 is recorded as editable, derived, locked or excluded with a reason; at L2 theme presets exist; the brand identity (name, description, logo, favicon, share image, brand colour) is edited in **one place** (§14: the first tab of the appearance screen) and the brand colour's derived family is computed on the server, not mixed by the client.

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
- [ ] UX-10 Responsive at 1440/1024/768/390; only tables scroll horizontally; exactly one vertical scroll region per page (the document never scrolls when the shell has its own scroll area).
- [ ] UX-11 Toasts consistent; messages actionable; no native alert/confirm.
- [ ] UX-12 None of the "AI admin tells" from `enterprise-admin-architect/references/principles-and-antipatterns.md` or the visual and content tells of `admin-design-system/references/anti-slop-design.md` §2.
- [ ] UX-13 The automated UI audit (`templates/ui-audit.mjs`) is clean for every role, page, width and theme (no `must` finding), and the screenshots of all pages were reviewed by a person (or by you, looking) with the notes in `qa-report.md`. Every overlay that opens (command menu, bell or filter popovers, dialogs, drawers) was opened in the audit too, in both themes and at phone width, and looked at: a popover whose CSS class collided with older rules was squeezed into three columns while every page-level check passed.
- [ ] UX-14 The dashboard meets the enterprise bar (`admin-design-system/references/dashboard-design.md`): a metric catalogue exists and the widgets are its rows; tasks and state counters are separate; a range selector with previous-period comparison, time zone and freshness; a definition and a way in for every number; a different landing view per role, each reviewed as that role; CSV export of what is on screen.
- [ ] UX-15 A command menu / global search, when present, is a modal combobox over a listbox with the keyboard model of `admin-information-architecture/references/navigation-patterns.md`: offers only what the role may open (the sidebar is the oracle), matches without accents, ignores an Enter that confirms an IME composition, never opens over another dialog; single-key shortcuts never fire while typing or with a dialog open. A header bell shows the same tasks as the dashboard (one function), requests only data the role may read, and no role gets a 403 from any page.
- [ ] UX-16 Loading does not move the page: skeletons reserve about the height of the loaded content, a header sentence that changes when data arrives already has its final length, and cumulative layout shift is at most 0.1 at phone width on the dashboard and on the biggest list (measured, with the elements that moved named if it is not).
- [ ] UX-17 **A recorded design direction exists and was approved at Gate 2**: `design-system.md` section 0 (brief, three reference products with "borrow / do not copy", two anti-references, signature move, voice, the font, case, stripe, motion and dark-mode decisions) and the specificity and baseline tests. Colours, fonts and radii in the CSS are the recorded ones, not framework defaults left unchanged.
- [ ] UX-18 The design-consistency metrics of `ui-audit.mjs` (M1-M12, `anti-slop-design.md` §4) have no unexplained `must`; every `should` is fixed or recorded with a reason; the eight-question rubric was scored on the screenshots **before** the metrics were read, by a reviewer other than the builder, with an evidence line per score; the report says a clean metrics run proves consistency, not good design.
- [ ] UX-19 **One home per concept.** A table of every noun the owner can edit (brand, logo, colour, banner, notification settings...) shows the one screen that edits it. No noun has two screens, no tab label repeats in two modules of the same sidebar group (a "Brand" tab in the content module and another in the design module was a defect), and a section may differ in permission, never in location. Old addresses of a merged or moved screen redirect, tab parameters included. A workflow that spans several editors (publish, approve, schedule, history, rollback) has its own screen, with what is waiting for release shown as a count on its sidebar item and as a chip on every screen that writes to the draft; a group is named by what it is, not by listing its items; the cluster reads as the operator's jobs (write, style, ship).
- [ ] UX-20 **No stray native scrollbar.** Tab rows, toolbars and navigation strips show no native scrollbar at any width (hidden bar with an edge fade, the active tab scrolled into view, underlines inside their box); the only visible scrollbars are the main scroller, data tables marked as scroll regions, dialogs and code. The UI audit ran in a browser **with scrollbars visible** (`ui-audit.mjs` rules SCROLL-1 and SCROLL-2): a headless browser hides them by default, so an audit that never changes that flag cannot see this class of defect.

## C. Functionality

- [ ] FN-1 Real API/database integration; no mock data or fake success in production paths. (`fe-first` prototypes: mock only inside the guarded adapter - see §P.)
- [ ] FN-2 Create/read/update/archive/restore behave correctly (where applicable); data persists after refresh.
- [ ] FN-3 State transitions follow the lifecycle; invalid transitions rejected server-side (409/422).
- [ ] FN-4 Validation enforced on server; errors surface on the right fields.
- [ ] FN-5 Search/filter/sort/pagination return correct results, including empty and boundary pages.
- [ ] FN-6 Bulk actions: confirmation, limits, per-item results, audit entry.
- [ ] FN-7 Export honours the current filters and the role's permissions and is injection-safe (formula characters neutralised, masked columns stay masked). Import is a separate contract: `FN-16`.
- [ ] FN-8 Concurrent edit protection (409) and idempotency for money/creation.
- [ ] FN-9 Audit log entries exist for sensitive/destructive actions with actor, before/after, reason.
- [ ] FN-10 Notifications/emails/side effects triggered by transitions actually fire (or are documented gaps).
- [ ] FN-11 Dashboard numbers match the underlying data (spot-check against lists/DB).
- [ ] FN-12 Errors are handled: API down, 401 (re-login with return URL), 403, 404, 409, 500.
- [ ] FN-13 Every dashboard figure was compared with an independent recomputation from the raw rows (not the same SQL) for every range, including boundary rows (the last and first minute of a day in the business time zone, exactly N days ago, archived rows) and an empty database; mutually exclusive buckets add up to the total (`admin-module-builder/references/analytics-endpoints.md`).
- [ ] FN-14 Preferences stored on the device (hidden columns, saved views, recent pages) are keyed by admin, validated on read with a safe fallback, never widen what a role may see, and are tested: survive a reload, do not leak to another admin on the same browser, a damaged value does not break the page. Undo is offered only where the inverse is exact (archive/restore), is itself an audited action that points back at the original reason, and is never the only way to reach the inverse.
- [ ] FN-15 Bulk actions (`import-export-and-bulk.md`): a preview with a frozen count; per-item results (changed, skipped with reason, failed with reason); permission checked per item; a record changed since the preview is skipped and listed, never overwritten; the selection reduces to the failed rows; the batch is audited. Tested with an item changed in between.
- [ ] FN-16 Import: template, staged validation with a downloadable row-level error report, dry run by default, a named upsert key, transactional commit, rollback by batch id, limits, audit of the batch. Tested with every kind of invalid row. An inventory line that only says "import" is not a spec.
- [ ] FN-17 Large exports are async jobs with status, an expiring link, a history and an audit row; visible versus all columns; masked columns stay masked.

## D. Security

- [ ] SEC-1 Every admin endpoint/action enforces authn + permission **server-side** (tested without UI).
- [ ] SEC-2 UI gating mirrors server permissions (nav, routes, buttons).
- [ ] SEC-3 IDOR: records outside the user's scope are inaccessible (403/404).
- [ ] SEC-4 Mass assignment blocked (cannot set `role`, `status`, `price` etc. via crafted payload).
- [ ] SEC-5 Admin login rate-limited; sessions hardened; revoked on deactivation. Second factor and step-up are required, not "where planned": `SEC-13`, `SEC-14`.
- [ ] SEC-6 CSRF protection verified for state-changing requests.
- [ ] SEC-7 Uploads validated (type/size/magic bytes); user content isolated; SVG/HTML handled.
- [ ] SEC-8 Rich text sanitised; outputs escaped; admin `noindex`; the security headers of `identity-and-sessions.md` §8 are set on the admin host **and checked by fetching it** (`SEC-19`).
- [ ] SEC-9 PII masked by default; reveal audited; secrets never in client, logs, or audit diffs.
- [ ] SEC-10 Dangerous features (impersonation, bulk delete, export, role edit) have extra controls.
- [ ] SEC-11 Last Super Admin protected; no privilege self-escalation.
- [ ] SEC-12 (only when roles are editable at runtime, `rbac-implementation.md`) The system role is locked; permissions that manage roles and admin accounts cannot be granted to any other role, by API, by copying or by editing the table; nobody edits the role they hold; every change is audited with a reason and the before/after map in one transaction; a stale edit is `409`; a revoked permission is refused within the stated propagation window (measured); a role held by an admin cannot be deleted.
- [ ] SEC-13 Every role holding a sensitive permission signs in with a second factor (or an identity provider that enforces one). Deferring it has a signed risk acceptance in `qa-report.md`. (`identity-and-sessions.md` §2)
- [ ] SEC-14 Step-up: a sensitive action requires a recent authentication (password re-entry without MFA, a fresh code with it); `reauth_required` is returned and tested. A reason field is not authentication.
- [ ] SEC-15 Password policy: ≥ 12 characters (15 as the only factor), ≥ 64 allowed, a blocklist of at least 3,000 common or breached passwords (or a k-anonymity check), no composition or rotation rules; a password change ends other sessions.
- [ ] SEC-16 A lockout cannot lock out the only Super Admin: progressive delay per account and address, an unlock path, ≥ 2 Super Admins, alerting on repeated failures; the per-IP limiter does not take a whole office offline.
- [ ] SEC-17 Each admin sees and revokes their own sessions; a Super Admin can force sign-out; idle 30 min (15 for sensitive roles) and absolute limits are tested.
- [ ] SEC-18 Accounts are created by invitation (single-use expiring link); the creating admin never learns a password. Offboarding disables, revokes sessions and reassigns; dormant admins are reported; an access review is produced on a schedule.
- [ ] SEC-19 The security headers of `identity-and-sessions.md` §8 are present on the **deployed or production-preview admin host and on the API**, verified by `admin-qa-gate/templates/security-headers.mjs` (headers plus a page walk with no CSP violation); the runbook says where each is set.
- [ ] SEC-20 The application's runtime database role cannot alter or delete audit rows (tested by connecting as that role); the audit table's tamper-evidence level is stated.

## E. Engineering

- [ ] ENG-1 Typecheck, lint, build pass; no new warnings of note.
- [ ] ENG-2 No critical console errors on any admin page; no failed network calls in happy paths.
- [ ] ENG-3 Feature-based structure; shared components reused; no copy-paste duplication of business rules.
- [ ] ENG-4 Centralised API client, schema validation, consistent error model.
- [ ] ENG-5 Strict typing; no `any` leaks at boundaries.
- [ ] ENG-6 No broken routes/links; 404/403 pages work.
- [ ] ENG-7 Existing public site, auth, API contracts and design system unaffected (regression run).
- [ ] ENG-8 Migrations follow expand/contract, are recorded in a ledger with checksums and applied by one migrator at a time; a fresh database builds cleanly; the seed script works. Operations side: `OPS-3`.
- [ ] ENG-9 No unnecessary new dependencies; additions justified in docs.
- [ ] ENG-10 Admin bundle isolated from public bundle (route group/dynamic imports).
- [ ] ENG-11 Every front-end type that mirrors an API response was compared with the real response (a probe script prints each endpoint's shape as a real role); no `any` or loose compatibility shim is left without a reason.
- [ ] ENG-12 An error boundary per route and per independent widget; a render error shows a recoverable screen with the request id, never a blank page; unhandled rejections and render errors are reported; no `console.error` on any happy path.

## F. Performance

- [ ] PERF-1 List endpoints paginated server-side; tested with a large dataset (≥ 100k rows in the largest entity, ≥ 1M in event tables; recipe in `e2e-test-playbook.md`): first page, every sortable column in both directions, a deep page and search each < ~500ms locally (search < ~1 s), dashboards/reports < ~2 s.
- [ ] PERF-2 No N+1 queries on list/detail (check query logs).
- [ ] PERF-3 Indexes exist for filtered/sorted columns.
- [ ] PERF-4 Heavy exports/reports are async/cached.
- [ ] PERF-5 UI responsive with 100-row pages; no layout shift; large lists virtualised if needed.
- [ ] PERF-6 Per-row counts and aggregates on a list are computed for the returned page only (keys paged first); sorting by an aggregate uses a pre-aggregated join, not one lookup per row. Before/after timings are in the QA report.
- [ ] PERF-7 Aggregate endpoints (dashboard, reports) were timed on the large dataset, cold and warm, for the widest range, section by section; the cache strategy (TTL, stale-while-revalidate, `generated_at`) is documented; a cold computation over budget is recorded with its number and plan, not hidden by the cache.
- [ ] PERF-8 A front-end budget is set and **measured** on the production build (`templates/perf-frontend.mjs`: JavaScript per route in gzip, largest contentful paint, layout shift, blocking time and interaction latency, phone profile with a slowed CPU and network, desktop profile), with the figures and the seed they were taken with recorded in `qa-report.md`. Defaults: JavaScript ≤ 170 KB gzip per route, LCP ≤ 2.5 s on the phone profile, CLS ≤ 0.1, blocking time ≤ 200 ms, longest interaction ≤ 200 ms. A figure over budget is recorded with its number and a plan, not hidden by raising the threshold; route-level splitting and lazy heavy libraries are verified in the build output.

## G. Accessibility

- [ ] A11Y-1 Keyboard-only operation for primary flows; Esc closes overlays; focus returns.
- [ ] A11Y-2 Visible focus indicators; skip link.
- [ ] A11Y-3 Inputs labelled; errors announced; icon buttons named.
- [ ] A11Y-4 Contrast AA; status not colour-only.
- [ ] A11Y-5 Table semantics (`th scope`, `aria-sort`), dialog semantics, live regions for toasts/counts.
- [ ] A11Y-6 Reduced motion respected.
- [ ] A11Y-7 WCAG 2.2: anything done by dragging has a keyboard or pointer alternative (2.5.7, for example arrows for ordering); a focused control is never hidden behind a sticky header, footer or bulk bar (2.4.11; use `scroll-padding`); information already entered is not asked again (3.3.7); help sits in the same place on every page (3.2.6); targets are at least 24 px (2.5.8, 28 px in this suite's audit).

## H. Documentation

- [ ] DOC-1 `docs/admin/*` match the implementation (validator clean at `final` stage).
- [ ] DOC-2 `permission-matrix.md` equals the permission constants/seed in code.
- [ ] DOC-3 Backend gaps and limitations are listed honestly.
- [ ] DOC-4 Run/seed/login instructions per role exist.
- [ ] DOC-5 `docs/admin/runbook.md` exists (template `admin-qa-gate/templates/runbook.md`): hosting and domains, env var names, production Super Admin bootstrap, backup and restore, how to roll back a content publish, and an operator quick-start per role.
- [ ] DOC-6 **Promise equals delivery.** Nothing in a module's inventory text, spec or `qa-report.md` promises a capability that was not built or tested (a "my account" module that mentions MFA and session revocation must have both, or the text is corrected). `done` means exactly what its text says, at the level recorded.
- [ ] DOC-7 Each foundation capability family records its chosen level and what the next level would add (`capability-ladders.md`); the QA report states the level the evidence supports and the coverage map is not more generous than the evidence.

## I. Operations
Read `references/operations-readiness.md`. The verdict is Ready, Ready with named conditions, or Not ready.
- [ ] OPS-1 No part of the runbook that decides recovery is left undecided at the final stage (hosting and domains, backup and restore, monitoring and limits), or each is a named condition with an owner, a date and the product owner's signed risk acceptance.
- [ ] OPS-2 Backups have a stated RPO and RTO and a **dated, timed restore drill** into a scratch database with a row-count and checksum comparison, recorded in the runbook.
- [ ] OPS-3 Migrations: expand/contract, a ledger with checksums, one migrator (lock), run as a separate command, and a failed migration leaves readiness red instead of serving. Two instances starting together were tested.
- [ ] OPS-4 `/healthz` (process) and `/readyz` (database, migration level, critical dependencies) exist and the platform probe uses them; the admin has a System panel (version, migration level, dependency checks, backup age, per-process limits, runtime controls) even with no jobs module.
- [ ] OPS-5 One request id on every route, in logs, error envelopes and audit rows; structured logs; a named error tracker; 3-5 symptom alerts with thresholds and recipients are listed in the runbook.
- [ ] OPS-6 The runbook has an incident kit: severity levels, roles, contacts, how users are told, when a post-incident review is mandatory and its template.
- [ ] OPS-7 Maintenance mode is enforced on the server (503 with `Retry-After` for writes), read-only mode is a runtime control, and installed clients are told to update when too old. A banner alone does not pass.
- [ ] OPS-8 Every event or log table has a retention rule and a purge job under its own role, with one audit row per purge.
- [ ] OPS-9 Limiter hits are visible; an operator can block an address or account for a stated time (reason, expiry, audit); limits are not hard-coded constants; per-process state is stated, and with several instances a shared store is used.
- [ ] OPS-10 The environment is validated at boot (fail fast); the runbook's variable table matches what the code reads; behaviour on **two instances** was tested, or the QA report says "not verified on two instances" and the runbook says "run one instance".

## J. Privacy and data rights
Read `admin-module-builder/references/privacy-and-data-rights.md`. Engineering checks, not legal advice.
- [ ] PRIV-1 The data map exists (entity, personal data, purpose, basis, who sees it, retention, behaviour on deletion); every cascading foreign key was decided on purpose.
- [ ] PRIV-2 Data-subject requests are a module with a state machine, a due date and an overdue flag; the export bundle was tested to contain data from every entity of the map; erasure follows the map and checks holds.
- [ ] PRIV-3 If users can create an account, they can delete it in the app (store requirement), and the admin can see and complete the request. Deferral has the owner's written acknowledgement.
- [ ] PRIV-4 Consent is recorded (purpose, text version, channel, given, withdrawn), never pre-ticked; terms and privacy notice are versioned site-content rows linked from signup.
- [ ] PRIV-5 The jurisdiction table in `product-discovery.md` cites current instruments with a "last reviewed" date and "confirm with counsel"; no deadline is hard-coded.
- [ ] PRIV-6 Audit labels are pseudonymous; reason dialogs warn against personal data; erasure never UPDATEs the audit table; **every route returning audit rows** (including entity timelines) needs `audit-log.read` or returns a masked projection. Tested with a role that lacks audit access.
- [ ] PRIV-7 Revealing personal data has a per-admin cap and an alert, an optional ticket id and step-up; exports of personal data are a separate, audited, expiring permission.
- [ ] PRIV-8 A breach checklist and register exist in the runbook; backups obey the retention window and a restore replays the deletion log.

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
