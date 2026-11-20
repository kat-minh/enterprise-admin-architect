# Workflow & Gates

Read when: starting a project, preparing a gate, or the user wants to compress/skip steps.

## Contents
- Session 1 - Discovery & Architecture → Gate 1
- Session 2 - UI/UX & Design System → Gate 2
- Session 3 - Implement & QA → Gate 3
- Scaling the process
- Fast path ("just build it")
- Status vocabulary
- Resume protocol

---

## Session 1 - Discovery & Architecture → Gate 1

Skills: `admin-discovery`, then `admin-information-architecture`.

**Present at Gate 1** (one screen of text, then the files):
1. Product in 5 lines + detected stack (and what will be reused).
2. Domain map (3-8 domains) and the key entity relationships.
3. Module inventory table: `core` / `foundation` / `domain`, evidence tag, priority P0/P1/P2. Call out **what was deliberately excluded and why**: list every excluded or deferred foundation module as a plain-language yes/no question with its one-line consequence (for example "if you want to edit texts, banners and branding yourself we need `site-content`; excluding it means every change stays a code release"), and record the owner's answer. Present the owner-intake answers and the content & configuration inventory beside the module table.
4. Admin personas/roles and the permission matrix headline.
5. Sidebar tree (≤ 9 top-level groups).
6. Backend gap list (endpoints/tables missing for P0/P1 modules) and who builds them.
7. Open questions - max 7, each with a recommended default. Always include **delivery mode** (`full-stack` vs `fe-first`; recommend `fe-first` when most P0 endpoints are missing or the user wants to review the UI first).

**Approval unlocks:** Session 2. If the user changes scope, update `module-inventory.md` first, then re-derive IA/permissions.

## Session 2 - UI/UX & Design System → Gate 2

Skill: `admin-design-system`.

Produce tokens, app shell (sidebar/header/breadcrumb/command menu), shared components (DataTable, FilterBar, Form patterns, Drawer, ConfirmDialog, StatusBadge, EmptyState, PermissionGate, Timeline), then build **one reference module end-to-end as a vertical slice** (list → preview drawer → detail → form) using real data (`full-stack`) or the typed mock adapter (`fe-first`, see below). This slice is the template every other module copies.

**Present at Gate 2:** screenshots (use browser automation if available) of dashboard, list, detail, form; the token table; deviations from the existing design system and why.

**Approval unlocks:** bulk module work. If the project already has a good design system, Gate 2 is mostly "confirm we reuse it" and can be merged into Gate 1.

## Session 3 - Implement & QA → Gate 3

Skills: `admin-module-builder` (loop per module) and `admin-qa-gate`.

Order: foundation (shell/auth guard/permission infra/audit service) → `core` modules → domain modules by priority (core business entity first, then operational workflow, then supporting entities, then analytics) → `foundation` modules → integration polish.

After **each module**: run `admin-qa-gate` module checks, update `implementation-status.md`. Do not batch QA to the end. When a module changes what the public product renders or enforces, change the public code in the same module (listed in its "Public-site integration") and run the public site's own tests.

Before Gate 3, write `docs/admin/runbook.md` from `admin-qa-gate/templates/runbook.md` (hosting, env names, production Super Admin bootstrap, backup and restore, content rollback, operator quick-start per role) and run a large-dataset check (`admin-qa-gate/references/e2e-test-playbook.md`).

**Present at Gate 3:** the final report (see SKILL.md) + `qa-report.md`.

## FE-first delivery mode (UI approved before any backend)

Choose at Gate 1 when the user wants to *see the admin first*, or most P0 endpoints/tables don't exist yet. Full mechanics: `admin-module-builder/references/fe-first-mock-layer.md`.

| Stage | What happens |
|---|---|
| Session 1 | Unchanged. Gate 1 also records `delivery mode = fe-first` and lists the backend work that is *deferred* (gap list becomes the backend backlog). |
| Session 2 | Tokens, shell, shared components, reference module on the **mock adapter** (service interface + zod schemas + fixtures). Gate 2 as usual. |
| Session 3a - FE build | Per module: spec → write endpoints into `api-contract.md` → mock adapter + fixtures → UI. Inventory status `prototype`. No backend code yet. |
| **Gate 2b - FE Preview** | Present a clickable prototype (local or protected preview URL) with role switcher and state toggles, a 5-8 flow review script, and the API contract summary. Iterate on feedback. **Approval freezes the contract (v1).** |
| Session 3b - BE build | Implement DB/endpoints/authz/audit to the frozen contract; swap mock → real per module; run `admin-qa-gate` per module; status `prototype` → `done`. |
| Gate 3 | Final report; permission tests against the real API. |

Rules: mock data only inside the adapter; always labelled "Prototype data"; emulates pagination/validation/403/409/latency; blocked in production by an environment guard; `prototype` modules can never be reported as done or as "working" - say "UI prototype, backend pending" in every handoff.

## Scaling the process

| Site size | Adjustment |
|---|---|
| Landing/brochure + contact form (≤ 5 entities, little UI copy to manage) | Merge Gates 1 and 2. Modules: auth, roles (2), dashboard (leads), leads inbox, content/settings, audit. Skip multi-level IA. |
| Few entities but many content, configuration or messaging surfaces (a consumer app or PWA with 4-6 tables, a lot of UI copy, push or e-mail, a fragile third-party dependency) | Do **not** use the brochure row. Size by operators, workflows, content surfaces, messaging channels and external dependencies, not by entity count: run the content, localization, user-messaging, app-controls and privacy triage in full (`admin-discovery/references/domains/consumer-app.md`). |
| Typical business site (6-20 entities) | Full pipeline as written. |
| Large platform (20+ entities, multi-role, workflows) | Split Session 3 into waves (per domain), one gate per wave; write module specs in parallel (sub-agents, if your tool has them); keep one reference module authoritative. |

## Fast path ("just build it")

- Run `admin-discovery/scripts/scan-project.mjs`, read key files, write a compact `product-discovery.md` + `module-inventory.md` (assumptions explicit).
- Ask only blocking questions (backend location, roles, any `proposed` module with major cost).
- Continue into build, still honouring: server-side authz, audit logging, real data, verification.
- Put every assumption in the docs under "Assumptions" so the user can correct them later.

## Status vocabulary (use exactly)

- Module `Status`: `proposed` → `planned` → `in-progress` → `done` | `blocked` | `dropped` | `exists` (pre-existing admin module kept as is). `fe-first` adds `prototype` (UI complete on the mock adapter, backend pending): `planned` → `prototype` → `done`.
- `Evidence`: `confirmed` | `implied` | `proposed`.
- `Priority`: `P0` (admin cannot operate without it), `P1` (needed within first weeks of operation), `P2` (nice-to-have/scale).
- Verified (implementation-status): `yes` only with evidence (command output, test name, screenshot, manual walkthrough note); otherwise `no`/`partial`.

## Resume protocol

1. Read `docs/admin/implementation-status.md` (fallback: `module-inventory.md`).
2. Print: current session, completed modules, next module, blockers.
3. Re-run `node <skills-dir>/admin-qa-gate/scripts/validate-admin-docs.mjs --root <project> --stage <current>` to detect doc drift before continuing.
4. Continue; do not redo approved work unless the user asks.
