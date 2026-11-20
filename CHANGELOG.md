# Changelog

## 1.3.0 - 2026-11-21

Lessons from building the remaining modules of the same project (dashboard, trips with archive and content inspection, admin accounts, roles page, scraper operations) and running the full quality gate, including a large-dataset check.

- QA gate: the large-dataset test is now a recipe (≥ 100k rows in the largest entity, ≥ 1M in event tables, `ANALYZE` after loading, every sortable column in both directions, deep page, before/after on the same data, ordering comparison after any query change, cleanup). It found four lists taking 1.5-8 s that were instant on the small seed. New gate `PERF-6`; `PERF-1` raised from 10k to 100k rows.
- QA playbook: four more pitfalls (lazily loaded routes keep the old screen until the chunk arrives; ground truth must use the product's own window and `unaccent`/`lower` fold definitions; refused attempts are the newest audit rows; earlier suites go stale when a later module changes defaults).
- Backend contract: page the keys first and attach per-row counts to the page only (pre-aggregated join when sorting by a count); fold `lower(unaccent(x))` rather than `unaccent(lower(x))`; index foreign keys used in cascades.
- Security baseline: credentials an admin hands to someone else (generated server-side, returned once, dialog that cannot be dismissed until acknowledged, never in audit or logs); self-protection and the last-Super-Admin rule under concurrency.
- Dashboard design: state the window ("24 hours" as 24 buckets vs rolling), round axis labels (maximum must be even when the axis shows 0 / half / max), work-queue card layout.

## 1.2.2 - 2026-11-21

Lessons from building and verifying a full-stack admin (real backend, separate admin app, UI end-to-end run).

- QA playbook: pitfalls when automating admin UIs (skeleton rows count as rows, wait for overlay animations, login limiters block reruns, reseed after state-changing tests, explicit local-only seed database, scoped locators, browser-locale date inputs, treat a delegated agent's report as a claim).
- Module builder: re-run checks and review the diff of shared/public code after delegating work to sub-agents.
- Design system: revealed sensitive data gets its own block (not the header actions); clickable table rows must be keyboard-operable.

## 1.2.1 - 2026-11-20

Fixes and guidance from a first run on a real two-repo project (Express + PostgreSQL backend, Vite PWA frontend, no existing admin).

- Fix (scanner): Express/Fastify mount prefixes are now applied to router files (`app.use("/api/x", xRoutes)`), including routers mounted twice; `src/pages/*` is no longer treated as a Next.js pages router in Vite/React Router apps; `modules/auth/*`-style auth files are detected; the form list heading no longer implies every form is a public lead form.
- Guidance: PWA frontends get a separate admin app; per-resource roles are not platform roles; suspension needs session revocation with stateless tokens; support access to private user content needs an `inspect` permission, reason and audit; single-operator products still define a restricted role.
- Playbook: worked example for consumer collaborative planners.
- Tests: 3 new scanner tests.

## 1.2.0 - 2026-11-20

- **Works with any AI assistant**, not only Claude Code: tool-neutral wording across the skills; `scripts/bundle.mjs` builds a self-contained Markdown prompt per phase for chat-only assistants; `docs/using-with-other-ai-tools.md` and a root `AGENTS.md`.
- **Quality tooling**: automated tests (`node --test`) for the scanner, the docs validator and the bundler; `scripts/check-repo.mjs` (frontmatter, references, manifests, public-data hygiene); GitHub Actions CI.
- **Project docs**: `CONTRIBUTING.md`, `SECURITY.md`; READMEs restructured for public release.

## 1.1.1 - 2026-11-20

- Docs: bilingual README (`README.md` English, `README.vi.md` Vietnamese) with a status/known-limitations section.
- Fix (scanner): TypeORM entities with same-line decorators read as 0 fields; Django models at end of file were skipped (the `\Z` anchor does not exist in JS regex); added Remix / React Router v7 file routes; de-duplicated role-model list.
- Fix (design): the language rule now keeps section headings, table headers and enum values in English so the validator still passes when docs are written in Vietnamese.
- Add: namespaced skill names note for plugin installs; "Existing admin audit" step and template section (extend/audit mode).
- Example: marked illustrative evidence as invented.

## 1.1.0 - 2026-11-20

- **FE-first delivery mode**: build and approve the admin UI on a typed mock data layer before any backend, then build the backend to a frozen API contract.
  - New: `admin-module-builder/references/fe-first-mock-layer.md`, `admin-module-builder/templates/api-contract.md`, **Gate 2b (FE Preview)**.
  - New module status `prototype` (never counts as done); QA checklist §P.
  - Validator: `prototype` requires a spec and `api-contract.md`; `done` is rejected while Data source is `mock`; unfinished prototypes fail at final stage.
  - Orchestrator rule 6 now allows mock data only inside the labelled, production-blocked mock adapter.

## 1.0.0 - 2026-11-20

Initial release of the Enterprise Admin Architect skill suite.

- `enterprise-admin-architect` - orchestrator: principles, evidence tags, 3 approval gates, resume protocol.
- `admin-discovery` - project scanner (`scan-project.mjs`), domain map, module inventory (core / foundation / domain), 14 domain playbooks + custom-domain playbook, backend gap analysis.
- `admin-information-architecture` - sidebar/route/interaction design, RBAC permission model and matrix.
- `admin-design-system` - tokens, app shell, data table / form / detail / dashboard specs, stack adapters (Ant Design, shadcn/Tailwind, MUI, Mantine…), accessibility, responsive, Vietnamese locale rules.
- `admin-module-builder` - module spec, archetypes, RBAC implementation, backend contract, audit logging, security baseline.
- `admin-qa-gate` - docs validator (`validate-admin-docs.mjs`), quality gates, E2E/permission test playbook, QA report.
- `examples/e-commerce` - sample `docs/admin` output that passes the validator.
