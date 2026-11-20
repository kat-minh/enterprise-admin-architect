---
name: admin-module-builder
description: Phases 5-7 of building an admin system - specify and implement admin modules one at a time as real, working features - module functional spec, API contract and missing-backend work, list/detail/form/workflow UI following the approved design system, server-enforced RBAC, audit logging, security baseline, data safety, edge cases, and implementation-status tracking. Use after the module inventory, IA and design system are approved, or when asked to implement/add/fix a specific admin module (orders, bookings, users, roles, audit log, media, settings...) so it works end-to-end instead of being a mock CRUD page.
---

# Admin Module Builder (Phases 5-7)

Goal: ship each module as a **working business capability** - real API, server-side authorization, audit trail, honest states - not a screen that merely renders.

Preconditions (verify, do not assume): `module-inventory.md`, `information-architecture.md`, `permission-matrix.md`, `design-system.md` exist and Gates 1-2 are approved. Check with `node <skills-dir>/admin-qa-gate/scripts/validate-admin-docs.mjs --root <project> --stage design` (`<skills-dir>` = the folder that contains the `admin-*` skill directories). If missing, go back to the earlier skill instead of improvising.

Templates: `templates/module-spec.md`, `templates/implementation-status.md`.
References (read when relevant): `references/module-archetypes.md`, `references/rbac-implementation.md`, `references/backend-contract.md`, `references/audit-logging.md`, `references/security-baseline.md`.

## Build order

1. **Foundation (once)** - auth guard, session handling, permission infrastructure (`can`, server guard, `PermissionGate`, nav filter), API client + error model, audit service, role/Super Admin seed, shell (if not done at Gate 2). Reuse what exists.
2. **Core modules** - `auth`, `rbac`, `admin-users`, `audit-log`, `settings`, `my-account`; scaffold `dashboard`.
3. **Domain modules** by priority: core business entity → main operational workflow → supporting entities → analytics/reporting.
4. **Foundation modules** per inventory (media, notifications, import/export, trash, site-content, leads-inbox…).
5. **Dashboard final pass** once domain data and queues exist.
6. **Integration pass** - uploads, notifications, jobs, third-party status.

Do not build the whole admin in one uncontrolled pass. After each module: self-verify, update status, then continue.

## Per-module loop

**A. Specify.** Copy `templates/module-spec.md` to `docs/admin/module-specifications/<id>.md` and fill it: definition, entities, permissions, API dependencies, list page (search/filters/sort/columns/row & bulk actions/export), create/edit (fields, validation, relationships, uploads, defaults), detail page, business rules (lifecycle, transitions, constraints, approvals, deletion restrictions), audit events, edge cases (no data, invalid, duplicates, missing relations, unauthorized, API failure, concurrent edit, large data), test scenarios. Choose the archetype from `references/module-archetypes.md` - **do not assume every module is CRUD**.

**B. Backend.** Compare required endpoints with what exists (`product-discovery.md` §5-6). If the repo owns the backend, implement missing endpoints per `references/backend-contract.md` (validation, server-side authz, pagination/filter/sort, constraints, soft delete, consistent errors, transactions). If the backend is external, write the contract into `docs/admin/api-contract.md`, mark the module `blocked`/`partial`, and ship only what is truly connected. **Never fabricate successful operations or ship fake data in production paths.**

**C. Permissions.** Add keys to the permission constants, seed/role definitions and `permission-matrix.md`; guard every endpoint/action on the server; mirror in route guards, nav and `PermissionGate` (`references/rbac-implementation.md`). Scope filters (`own`/`team`) apply in queries.

**D. Audit.** Emit audit events for create/update/delete/transitions/export/sensitive reads with before/after and reason (`references/audit-logging.md`). Same transaction as the change where possible.

**E. UI.** Build with shared components exactly like the reference module: DataTable (server-side), preview drawer, detail page, form patterns, status badges, confirmations, loading/empty/error/forbidden states, responsive. No one-off styles, no new component kit, no duplicated business rules between modules.

**F. Security & data safety.** Apply `references/security-baseline.md`: input validation, IDOR checks, mass-assignment protection, upload validation, CSV-injection-safe exports, PII masking, rate limits for sensitive actions, destructive-action safeguards (soft delete, confirmation, bulk limits).

**G. Verify and record.** Run typecheck, lint, build and existing tests; exercise the workflow in the running app (browser tools if available); call the API without the permission and expect 403; test empty/error/large states. Update `docs/admin/implementation-status.md` with evidence, then set the module `Status` in `module-inventory.md`. Hand off the module checklist to `admin-qa-gate`. Mark `done` only when the business workflow works.

## Parallelising large builds
For many modules, delegate independent modules to subagents. Brief each with: the module spec, the reference module path, the shared components, the permission keys, the rules above, and the requirement to run checks and report evidence. Review their output against the spec before marking done. Do not parallelise modules that share new schema/migrations or permission infrastructure.

## Hard rules
- Server-side authorization on every sensitive operation; UI gating is cosmetic.
- No fake data, fake success, or silently swallowed errors.
- No hard delete of business records by default; archive/soft-delete with restore.
- Do not break the public site, existing auth, API contracts or design system; prefer additive changes and migrations that are reversible.
- Any new dependency needs a one-line justification in `design-system.md` or `implementation-status.md`.
- Documentation must match reality: never claim a capability that is not implemented and verified.
- Development seed data only in dev/staging, clearly marked; never rendered as real in production.
