# Changelog

## 1.1.0 - 2026-11-20

- **FE-first delivery mode**: build and approve the admin UI on a typed mock data layer before any backend, then build the backend to a frozen API contract.
  - New: `admin-module-builder/references/fe-first-mock-layer.md`, `templates/api-contract.md`, **Gate 2b (FE Preview)**.
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
