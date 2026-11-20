# Changelog

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
