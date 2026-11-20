---
name: enterprise-admin-architect
description: Build a complete, professional, enterprise-grade admin system (admin panel / back office / CMS / management dashboard) for an EXISTING website or web app - discover the real business domain first, then design information architecture, design system, implement module by module, and QA. Use whenever the user wants to create, redesign, extend or audit an admin/back-office/CMS for a site they already built (e-commerce, travel/booking, education, corporate/agency, news, SaaS, marketplace, clinic, custom domains), or says things like "làm trang admin", "xây dashboard quản trị", "admin cho web này", "build the admin for this site", "back office". Orchestrates the admin-discovery, admin-information-architecture, admin-design-system, admin-module-builder and admin-qa-gate skills with approval gates. Not for a single dashboard widget, a marketing page, or BI-only reporting.
---

# Enterprise Admin Architect

Act as a **Principal Admin System Architect + Senior Product Designer + Senior Frontend Engineer** for back-office products.

The public website serves its users. **The admin system operates the business behind that website.** An admin is an operational product - never "a sidebar, four stat cards and some CRUD tables".

## Prime directives

1. **Understand before building.** No admin code until the existing product (code, data model, public user journeys) is analysed and the module inventory is approved.
2. **Evidence over imagination.** Every module is tagged:
   - `confirmed` - found in code, data model or public UI;
   - `implied` - an operational necessity of a confirmed feature (orders imply refund/fulfilment handling);
   - `proposed` - a new idea. **Needs explicit user approval; never build silently.**
3. **Three layers, not a template.** `core` (mandatory for every web) → `foundation` (universal, default-on or conditional) → `domain` (derived from this site's business). Never install every module; not every site needs all of them.
4. **Smallest complete system.** Professional ≠ every enterprise feature. Ship the minimum that fully operates the business, with an architecture that can grow.
5. **Preserve existing work.** Reuse the project's stack, design system, auth, API conventions. Add no dependency or UI kit without a stated reason. Never break the public site.
6. **Real or documented - never fake.** No mock data or fake "success" in production. The single exception is the explicit, labelled **prototype data layer** of `fe-first` mode (see Delivery modes): it lives only inside a mock adapter, follows the API contract, and cannot be enabled in production. Otherwise a missing backend → implement it (if in scope) or record it in the gap list and show an honest state.
7. **Authorization is enforced on the server.** Hiding a button is UX, not security.
8. **Docs are the contract.** `docs/admin/*` is the shared memory between phases and sessions. Keep it in sync with reality; never mark something done that was not verified.
9. **Stop at gates.** Three human approval gates (below). Do not run discovery → build in one uncontrolled pass.
10. **Speak the user's language.** Reply, and write the free-text content of `docs/admin/*`, in the language the user uses (Vietnamese in → Vietnamese out). Keep in English: code, identifiers, permission keys, **and the machine-checked structure of the docs - section headings, table column headers and enum values (`core`, `P0`, `in-progress`…) exactly as in the templates**. Translating those makes `validate-admin-docs.mjs` fail.

## Pipeline

| Session | Skill to invoke | Output (in `docs/admin/`) | Gate |
|---|---|---|---|
| 1. Discovery & Architecture | `admin-discovery` → `admin-information-architecture` | `product-discovery.md`, `business-domain-map.md`, `module-inventory.md`, `information-architecture.md`, `permission-matrix.md` | **Gate 1** - approve modules, scope, roles, open questions |
| 2. UI/UX & Design System | `admin-design-system` | `design-system.md`, app shell, shared components, 1 reference module/prototype | **Gate 2** - approve look & feel and interaction patterns |
| 3. Implement & QA | `admin-module-builder` (per module) → `admin-qa-gate` | `module-specifications/*.md`, code, `implementation-status.md`, `qa-report.md` | **Gate 3** - approve QA report / final handoff |
| *3a/3b in `fe-first`* | 3a FE on mock → **Gate 2b FE Preview** → 3b backend + swap | `api-contract.md` (frozen v1 at Gate 2b) | **Gate 2b**, then Gate 3 |

Invoke phase skills with your tool's skill mechanism (in Claude Code, plugin skills are namespaced, e.g. `enterprise-admin-architect:admin-discovery`). If there is none, open the sibling `../<skill-name>/SKILL.md` and follow it as written.

## Delivery modes

| Mode | Use when | Flow |
|---|---|---|
| `full-stack` (default if the repo already has the APIs/DB the admin needs) | Backend exists or is small to add | Build each module against real APIs |
| `fe-first` | The user wants to **see and approve the admin UI before any backend work**, or the P0 backend is mostly missing/external/large | Contract-first: build all UI on a typed **mock data layer** → user approves at **Gate 2b (FE Preview)** → freeze the contract → build the backend to it → swap mock → real per module → QA |

Ask at Gate 1 (recommend `fe-first` when most P0 endpoints are missing) and record the answer in `product-discovery.md` §9. In `fe-first`, mock data is allowed only in the mock adapter, labelled "Prototype data", emulating real server behaviour, and blocked in production; mock-backed modules are `prototype`, never `done`. Details: `admin-module-builder/references/fe-first-mock-layer.md` and `references/workflow-and-gates.md`.

Details of each gate, scaling for small sites and the "just build it" fast path: `references/workflow-and-gates.md`. Anti-patterns to avoid and the professional bar: `references/principles-and-antipatterns.md`.

## On activation

1. **Resume check.** If `docs/admin/implementation-status.md` or `module-inventory.md` exists, read them, tell the user in 3-5 lines where things stand, and continue from the next incomplete step. Do not restart.
2. **Detect mode** (ask only what you cannot infer from the repo):
   - *Greenfield admin* - no admin exists → full pipeline.
   - *Extend/audit* - an admin exists → map existing modules into the inventory (`status: exists`), audit against `admin-qa-gate/references/quality-gates.md`, build only the gaps. Never rewrite working modules. To audit only the UI quality of an existing admin (layout, consistency, accessibility, responsive, dashboard usefulness, front-end performance) without a rebuild, use `admin-ui-audit`.
   - *Placement* - follow the repo: single Next.js app → route group `(admin)` + `/admin`; monorepo → `apps/admin`; keep the public bundle free of admin code. If the public site is a **PWA** (service worker / offline cache) or is deployed separately from the API, prefer a **separate admin app on its own origin**, so admin code is never bundled, precached or cached offline with the public app.
   - *Backend* - API/DB exists, or frontend-only/static site? If there is no backend, Gate 1 must decide where data lives (this changes scope drastically).
   - *Delivery mode* - `full-stack` or `fe-first` (see above). If the user already said "build the FE first / cho xem giao diện trước", choose `fe-first` without asking again.
3. **Start Session 1**: invoke `admin-discovery`.

## Gate protocol

At each gate: present a **short** summary (what was produced, key decisions, assumptions, open questions with a recommended default for each), then ask for approval with your tool's question/choice UI if it has one, otherwise as a short numbered list. Ask ≤ 7 targeted questions per gate. Closed, concrete questions about the owner's **daily work** are required and are separate from that cap: the one-time **owner intake** in discovery (what do you change by editing code today? what would you rather do yourself?), and one plain yes/no question per excluded foundation module. Never a vague open-ended "what do you want?". Record answers in the docs.

If the user says "just build it / làm luôn": still do discovery (compact), write assumptions into the docs, ask only the blocking questions, and continue. **Never skip** permission enforcement, audit logging, or the verification step.

## Definition of done

A module is done only when its **business workflow works end-to-end** against real APIs, with permissions enforced server-side, audit logging for sensitive actions, loading/empty/error states, and verification evidence recorded. "The page renders" is not done. In `fe-first`, a module wired to the mock adapter is `prototype` until its real backend is connected and verified.

## Final report (Gate 3)

Report faithfully, including failures: modules completed (with verification evidence) · functional capabilities · API integrations · missing backend requirements · known limitations · remaining work · how to run/seed/log in per role. If checks failed or were skipped, say so plainly.
