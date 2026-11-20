# Coverage map

How the suite maps to the capabilities people expect from an "admin dashboard toolkit" (a common wish-list has twelve groups: UI/UX, layout, data visualisation, tables, CRUD, forms, auth, responsive, front-end architecture, performance, interaction, production readiness). Use it to see what is covered, how strongly, and what is deliberately not.

**Levels** (the strongest one that applies):

| Level | Meaning |
|---|---|
| **Proven** | exercised end to end in the full-stack build used to prove the suite, with evidence (tests, audit output, screenshots) |
| **Gate** | a checkable item in `quality-gates.md` or an error/warning of the validator |
| **Tool** | a script or template ships and runs |
| **Guidance** | written rules and decision tables only; not exercised by the proving build |

Nothing here is claimed beyond its level. "Guidance" means the suite tells the assistant what good looks like, not that it has been demonstrated.

## The twelve groups

| # | Capability group | Where in the suite | Level | Notes and gaps |
|---|---|---|---|---|
| 1 | UI/UX design and visual quality: tokens, type, colour, spacing, hierarchy, consistency, accessibility | `admin-design-system` (`visual-standard`, `accessibility-responsive`, `admin-design-system/templates/design-system.md`); gates UX-1…14, A11Y | **Proven**, **Tool** (UI audit: contrast, names, overflow, clipping, touch targets, console) | "Premium", "polish" and micro-interactions are judgement: they are a review rubric in `admin-ui-audit`, not an automated claim |
| 2 | Layout and navigation: sidebar, collapse, breadcrumbs, nested menus, responsive navigation, command menu, notifications | `admin-information-architecture` (`navigation-patterns`), `admin-design-system` app shell, `admin-discovery/references/universal-modules.md` (`search-command`, `notifications`) | Sidebar, breadcrumbs, responsive drawer, per-role landing: **Proven**. Command menu, notification centre: **Guidance** | Workspace switcher only for multi-tenant products (discovery templates ask the question; no pattern is shipped) |
| 3 | Data visualisation and analytics | `admin-design-system/references/dashboard-design.md` (chart choice, metric catalogue, tasks vs counters, period comparison, role views); `admin-module-builder/references/analytics-endpoints.md`; gates UX-9, UX-14, FN-13, PERF-7 | **Proven**: KPI tiles with definitions, previous-period comparison, funnel, trends, top lists, range selector, CSV export, independent oracle test, scale timing | Heat maps, real-time metrics, drill-down beyond a filtered list: **Guidance** |
| 4 | Data tables | `admin-design-system/references/data-table-spec.md` (capability tiers, server contract), `e2e-test-playbook.md` (large-dataset recipe); gates UX-4, PERF-1/2/3/6 | **Proven**: server-side search/sort/filter/pagination, URL state, phone card layout, 200k-user timing. Column visibility, resize, saved views, inline edit, row expansion: **Guidance** | Export is CSV (BOM, injection-safe); native Excel files are a project choice |
| 5 | CRUD and resource management | `admin-module-builder` (`module-archetypes`, `admin-module-builder/templates/module-spec.md`, `backend-contract`), archive/restore rules, `admin-discovery` (module inventory) | **Proven** on people, records, admin accounts, roles, content | Media/file management: **Guidance** |
| 6 | Forms and inputs | `admin-design-system/references/form-spec.md` (layout, validation, dirty guard, concurrency, special fields, wizards, conditional fields) | Dialog and drawer forms with server-error mapping, reasons, optimistic concurrency, contrast and placeholder validation: **Proven**. Wizards, rich text, uploads, form builders: **Guidance** | A form builder is a product feature, not a UI kit part; only discuss it when the owner needs it |
| 7 | Authentication and authorisation | `admin-information-architecture/references/permission-model.md`, `admin-module-builder/references/rbac-implementation.md` (incl. editable roles), `security-baseline.md`; gates SEC-1…12 | Matrix tests against the API, scopes, sessions, last-admin protection, editable roles with reserved permissions and propagation timing: **Proven**. MFA step-up, SSO: **Guidance** | Forgot-password by e-mail is not shipped; the proven flow is an admin-issued temporary password with forced change |
| 8 | Responsive and adaptive | `accessibility-responsive.md`; gate UX-10; UI audit at 1440 / 1024 / 390, light and dark | **Proven**, **Tool** | |
| 9 | Front-end architecture and code quality | `admin-module-builder/references/frontend-architecture.md` (structure, one home per kind of state, API client, hooks, failure containment), `admin-design-system/references/stack-adapters.md`; gates ENG-3…5, 10…12 | **Proven** on one stack (React, TypeScript, a query cache, a hand-written kit) | Atomic Design, SOLID and similar are not prescribed: concrete rules replace them. Other stacks: **Guidance** (adapters for Next.js, Ant Design, shadcn/ui + Tailwind + TanStack Table, MUI, Mantine, Refine/react-admin, Vue/Angular/Svelte) |
| 10 | Performance | gates PERF-1…8; large-dataset recipe; `analytics-endpoints.md` (cache, set-based SQL); `frontend-architecture.md` (budget) | Server side at 200k users / 400k trips: **Proven**. Front-end budget (bundle per route, LCP, interaction latency): **Gate**, new, not yet exercised | |
| 11 | Interaction | `dashboard-design.md` (states), `form-spec.md`, design-system overlays (dialog, drawer, toast, menu, confirmation proportional to risk) | Loading / empty / error / forbidden states, toasts, reason dialogs, drawers: **Proven**. Optimistic updates, undo, keyboard shortcuts, onboarding: **Guidance** | Context menus are intentionally not prescribed |
| 12 | Production readiness and integration | `frontend-architecture.md` (API client, error boundaries, real-time decision, environments, observability), `e2e-test-playbook.md`, `admin-qa-gate/templates/runbook.md`; validator; gates ENG, DOC | Contract probing, E2E per role on the real stack, public-product regression, audit trail, request ids, runbook: **Proven**. WebSocket/SSE, GraphQL: **Guidance** | |

## Technologies

The suite is tool-neutral by rule (`AGENTS.md`): it names options and decision tables, and requires a fallback where a tool capability is optional. If the project has no stack yet, a sensible default is React or Next.js with TypeScript and Tailwind CSS, a query-cache library for server state, a headless component library for overlays, and a typed schema library for validation; that is advice, not a requirement. The proving build used React, TypeScript, a query cache, plain CSS tokens, Node, Express and PostgreSQL.

## Advanced capabilities

| Capability | Where | Level |
|---|---|---|
| Existing project analysis | `admin-discovery/scripts/scan-project.mjs` (stack, routes, API, models, roles, UI surfaces, env names only), discovery checklist | **Tool**, **Proven** |
| Design system and UI kit detection | the scanner reports UI libraries and config files; the design phase reuses the public site's tokens and components | **Tool** (detection), **Guidance** (reuse) |
| UI consistency enforcement | tokens, one component kit, gate UX-1/12/13, `admin-ui-audit` | **Gate**, **Tool**, **Proven** |
| Multi-theme | light and dark tokens; brand accent edited from the admin with contrast rules | **Proven** |
| UI quality, accessibility and responsive audits of an existing admin | `admin-ui-audit` (standalone), `admin-qa-gate/templates/ui-audit.mjs` | **Tool**, **Proven**. Automated accessibility checks cover a minority of problems: a person must still walk the keyboard and screen-reader paths |
| Performance audit | gates PERF-1…8, recipes | **Gate**; front-end part new |
| Automatic documentation | `docs/admin/*` templates and the validator (cross-references, evidence) | **Tool**, **Proven** |
| Existing UI refactoring | `admin-ui-audit` fixes causes in tokens and shared components | **Guidance** |
| Design-to-code from Figma | not covered; depends on the assistant having a design connector. If designs or exported tokens exist, read them first; otherwise extract tokens from the code | not covered |

## Why one suite of phases and not twelve small skills

A wish-list of twelve component skills (data table, forms, charts, auth, …) produces good parts and an incomplete product. What decides whether an admin is enterprise-grade is what the list does not contain: discovering what the business actually needs (owner intake, module inventory), who may do what (RBAC designed before screens), an audit trail and PII rules, control of the public content and settings, a security baseline, a documentation validator, quality gates with evidence, a large-data test, and a runbook. Those are phases with gates, not components.

So the suite stays **phases + an orchestrator**, with the topics of the wish-list as references loaded on demand (progressive disclosure keeps each `SKILL.md` small). One standalone entry exists for people who only want to audit an existing admin: `admin-ui-audit`. Add another standalone skill only when a user job does not need the phases and the existing references cannot serve it.

## What the wish-list lacks, and the suite has

Product discovery and owner intake · information architecture driven by roles · audit logging with reasons and before/after · PII masking and reveal rules · CMS and runtime controls for the public product · FE-first mode on a guarded mock layer · documentation validator · quality gates with severities · permission-matrix tests against the API · large-dataset recipe · runbook · honest reporting of what was not verified.
