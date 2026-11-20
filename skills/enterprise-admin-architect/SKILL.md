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
6. **Real or documented - never fake.** No mock data or fake "success" in production-looking UI. Missing backend → implement it (if in scope) or record it in the gap list and show an honest state.
7. **Authorization is enforced on the server.** Hiding a button is UX, not security.
8. **Docs are the contract.** `docs/admin/*` is the shared memory between phases and sessions. Keep it in sync with reality; never mark something done that was not verified.
9. **Stop at gates.** Three human approval gates (below). Do not run discovery → build in one uncontrolled pass.
10. **Speak the user's language.** Reply and write `docs/admin/*` in the language the user uses (Vietnamese in → Vietnamese out); keep code, identifiers and permission keys in English.

## Pipeline

| Session | Skill to invoke | Output (in `docs/admin/`) | Gate |
|---|---|---|---|
| 1. Discovery & Architecture | `admin-discovery` → `admin-information-architecture` | `product-discovery.md`, `business-domain-map.md`, `module-inventory.md`, `information-architecture.md`, `permission-matrix.md` | **Gate 1** - approve modules, scope, roles, open questions |
| 2. UI/UX & Design System | `admin-design-system` | `design-system.md`, app shell, shared components, 1 reference module/prototype | **Gate 2** - approve look & feel and interaction patterns |
| 3. Implement & QA | `admin-module-builder` (per module) → `admin-qa-gate` | `module-specifications/*.md`, code, `implementation-status.md`, `qa-report.md` | **Gate 3** - approve QA report / final handoff |

Invoke phase skills with the Skill tool. If unavailable, read the sibling `../<skill-name>/SKILL.md` directly.

Details of each gate, scaling for small sites and the "just build it" fast path: `references/workflow-and-gates.md`. Anti-patterns to avoid and the professional bar: `references/principles-and-antipatterns.md`.

## On activation

1. **Resume check.** If `docs/admin/implementation-status.md` or `module-inventory.md` exists, read them, tell the user in 3-5 lines where things stand, and continue from the next incomplete step. Do not restart.
2. **Detect mode** (ask only what you cannot infer from the repo):
   - *Greenfield admin* - no admin exists → full pipeline.
   - *Extend/audit* - an admin exists → map existing modules into the inventory (`status: exists`), audit against `admin-qa-gate/references/quality-gates.md`, build only the gaps. Never rewrite working modules.
   - *Placement* - follow the repo: single Next.js app → route group `(admin)` + `/admin`; monorepo → `apps/admin`; keep the public bundle free of admin code.
   - *Backend* - API/DB exists, or frontend-only/static site? If there is no backend, Gate 1 must decide where data lives (this changes scope drastically).
3. **Start Session 1**: invoke `admin-discovery`.

## Gate protocol

At each gate: present a **short** summary (what was produced, key decisions, assumptions, open questions with a recommended default for each), then ask for approval using the question tool when available. Ask ≤ 7 targeted questions, never open-ended "what do you want?". Record answers in the docs.

If the user says "just build it / làm luôn": still do discovery (compact), write assumptions into the docs, ask only the blocking questions, and continue. **Never skip** permission enforcement, audit logging, or the verification step.

## Definition of done

A module is done only when its **business workflow works end-to-end** against real APIs, with permissions enforced server-side, audit logging for sensitive actions, loading/empty/error states, and verification evidence recorded. "The page renders" is not done.

## Final report (Gate 3)

Report faithfully, including failures: modules completed (with verification evidence) · functional capabilities · API integrations · missing backend requirements · known limitations · remaining work · how to run/seed/log in per role. If checks failed or were skipped, say so plainly.
