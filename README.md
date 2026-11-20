# Enterprise Admin Architect

**English** · [Tiếng Việt](README.vi.md)

A suite of **Claude Code skills** that builds a **professional, enterprise-grade admin system (back office / CMS)** for a website you have *already built* - instead of the usual generic dashboard (sidebar + four stat cards + a few CRUD tables).

> The public website serves its users. **The admin system operates the business behind it.**

The skills force Claude to work in the right order: **analyse the website → design the admin architecture → build the design system → implement module by module → verify for real**, with approval gates where you decide.

## What makes it different

| Common problem | How the skills handle it |
|---|---|
| AI jumps straight into a CRUD dashboard | 3 approval gates; no admin code until the module inventory is approved |
| Invented modules unrelated to the business | Every module carries an evidence tag: `confirmed` / `implied` / `proposed` (needs your approval) |
| Mandatory vs. domain-specific modules mixed up | 3 layers: **core** (every web needs it) → **foundation** (conditional) → **domain** (derived from the real business) |
| Dashboards full of fake numbers | "Real or documented": no mock data, no fake success; missing backend goes into a gap list |
| Permissions = hiding buttons | RBAC enforced on the server; tests prove the API returns 403 per role |
| "Done" when the page merely renders | `done` only with a working workflow and evidence; a validator cross-checks docs against reality |
| Every page styled differently | Tokens first, shared components, specs for table/form/detail/dashboard, reuse of your UI kit (Ant Design, shadcn…) |
| Want to see the UI before the backend exists | **FE-first mode**: approve the UI on a guarded mock layer, then build the backend to a frozen API contract |

## What's in the suite

| Skill | Role | Output |
|---|---|---|
| `enterprise-admin-architect` | **Orchestrator** (call this one): principles, gates, resume | - |
| `admin-discovery` | Phase 1: scan code, domain map, module inventory, backend gaps | `product-discovery.md`, `business-domain-map.md`, `module-inventory.md` |
| `admin-information-architecture` | Phase 2-3: sidebar, routes, drawer/page/modal, roles & permission matrix | `information-architecture.md`, `permission-matrix.md` |
| `admin-design-system` | Phase 4: tokens, app shell, table/form/detail/dashboard, a11y, locale | `design-system.md` + shell + a reference module |
| `admin-module-builder` | Phase 5-7: spec → backend → UI → RBAC → audit → security | `module-specifications/*.md`, code, `implementation-status.md` |
| `admin-qa-gate` | Phase 8: validator, permission/workflow/state tests, honest report | `qa-report.md` |

Also included:
- `admin-discovery/scripts/scan-project.mjs` - scans a project (stack, routes, API, models, enums/status, existing admin, roles, public forms, env var **names only**). No dependencies.
- `admin-qa-gate/scripts/validate-admin-docs.mjs` - checks docs consistency (module ↔ permission ↔ route ↔ spec ↔ verification evidence).
- `admin-discovery/references/domains/` - 14 domain playbooks (e-commerce, travel/booking, education, corporate, news, SaaS, marketplace, clinic/appointments, real estate, job board, F&B, events/ticketing, community/UGC, fintech/KYC) plus a playbook for unusual domains (e.g. DNA testing).
- `examples/e-commerce/` - a complete sample `docs/admin` that passes the validator.

## Install

**Option 1 - Plugin (recommended):**
```
/plugin marketplace add kat-minh/enterprise-admin-architect
/plugin install enterprise-admin-architect@enterprise-admin-architect
```
(Works for a private repo if your git/GitHub credentials have access.)

**Option 2 - Manual copy** (copy **all 6 folders** in `skills/`; the skills share each other's files):
```powershell
# Windows - for one project
Copy-Item -Recurse .\skills\* <your-project>\.claude\skills\
# or for every project
Copy-Item -Recurse .\skills\* $HOME\.claude\skills\
```
```bash
# macOS / Linux
cp -r skills/* <your-project>/.claude/skills/     # or ~/.claude/skills/
```

Requires Node ≥ 18 for the two scripts (no `npm install`).

## Usage (3 working sessions)

Once your main website is built, open Claude Code in the project and run:

```
/enterprise-admin-architect
```

| Session | What happens | Gate you approve |
|---|---|---|
| **1. Discovery & Architecture** | Reads code + routes + DB, builds the domain map, module list (core/foundation/domain, P0-P2), sidebar, roles, permission matrix, backend gaps, ≤ 7 questions with recommended defaults | **Gate 1**: which modules, which roles, what backend is missing, delivery mode |
| **2. UI/UX & Design System** | Tokens, app shell, shared components, **one complete reference module** | **Gate 2**: look & feel, interaction patterns |
| **3. Implement & QA** | Builds each module (spec → API → UI → permissions → audit), verifies after each, final report | **Gate 3**: QA report + remaining work |

### FE-first mode (see the UI first, build the backend after approval)

At Gate 1 you choose the **delivery mode**:

| Mode | When | Flow |
|---|---|---|
| `full-stack` | The repo already has the APIs/DB the admin needs, or the backend is small | Build each module against real APIs |
| `fe-first` | You want to **see and approve the UI first**, or most P0 backend is missing | Write the **API contract** → build the whole UI on a **guarded mock layer** → **Gate 2b (FE Preview)**: you click through it and give feedback → freeze the contract → build the backend to it → swap mock → real per module → QA |

How the mock layer stays honest (details: `skills/admin-module-builder/references/fe-first-mock-layer.md`):
- The UI calls only a **service interface**; the mock and the real API implement the same interface, so swapping is one line and no UI is thrown away.
- The mock **behaves like a real server**: server-side pagination/filter/sort, latency, 422/403/409 errors, state machines.
- Every page shows a **"Prototype data"** banner; a role switcher previews the admin as each role; toggles force empty/error/slow/forbidden states.
- **Blocked in production** by a deployment-environment variable (not `NODE_ENV`, because Vercel preview builds also run with `NODE_ENV=production`) plus a bundle check; previews must be access-protected and `noindex`.
- Mock-backed modules have status `prototype` and can **never** be `done`. The validator fails if a `done` module still uses mock data, or a `prototype` module has no `api-contract.md`.

### Natural-language triggers
- "Analyse this site and list the admin modules it needs" → `admin-discovery`
- "Redesign the admin menu and permissions" → `admin-information-architecture`
- "Implement the Orders module in the admin" → `admin-module-builder`
- "QA the admin, check permissions" → `admin-qa-gate`
- "Just build it, don't ask much" → still a compact analysis with written assumptions; server-side permissions, audit logging and verification are **never skipped**.

Run the scripts manually:
```bash
node skills/admin-discovery/scripts/scan-project.mjs <project> --md
node skills/admin-qa-gate/scripts/validate-admin-docs.mjs --root <project> --stage build
```

## Documents generated in your project

```
docs/admin/
  product-discovery.md   business-domain-map.md   module-inventory.md
  information-architecture.md   permission-matrix.md   design-system.md
  module-specifications/<module-id>.md
  api-contract.md            (required in fe-first mode)
  implementation-status.md   qa-report.md
```
`module-inventory.md` is the **single source of truth** for module status; `implementation-status.md` holds the verification evidence.

**Language:** Claude replies and writes the free-text content in your language, but keeps section headings, table column headers and enum values (`core`, `P0`, `in-progress`…) in English exactly as in the templates - the validator checks them.

## Three module layers

- **core** (mandatory for every web): auth & sessions, RBAC, domain-aware dashboard, admin accounts, audit log, settings, my account/security.
- **foundation** (conditional, exclusion needs a stated reason): users/customers, notifications, media, import/export, trash, **site content** (menus/banners/static pages/SEO/redirects), **leads inbox** (contact forms), templates, jobs monitor, search/command menu, localization…
- **domain** (derived from your website): Orders, Bookings, Courses, Articles, Organizations… or modules for an unusual business.

## Status & known limitations

- **Not yet field-tested end-to-end on a real project.** Tested so far: the scanner on synthetic fixtures (Next.js/Prisma/Drizzle/SQL/Express/Mongoose/TypeORM/NestJS/Django/Laravel/Remix), the docs validator on a sample and on deliberately broken docs, and `claude plugin validate`.
- The scanner is regex-based: a **map, not truth**. Unusual frameworks/monorepos may be missed; the skill is told to verify by reading files.
- Approval gates are instructions to Claude, not hard locks.
- Stack adapters (Ant Design, shadcn, MUI…) name typical APIs; verify against your installed versions.
- Script paths between skills assume the `admin-*` folders are siblings (true for both install options).

Feedback from real runs is the most valuable input - especially domain detection and the sidebar grouping.

## Extending

- New domain: add `skills/admin-discovery/references/domains/<name>.md` following the existing files, and one line in `_index.md`.
- New UI stack: add a section to `skills/admin-design-system/references/stack-adapters.md`.
- Keep each `SKILL.md` short; put detail in `references/` (loaded only when needed).

## Versus the original draft (ChatGPT chat)

The original ideas are kept (discovery first, universal vs. domain modules, enterprise UX, 3 working sessions). Changes:
1. One ~600-line prompt split into 6 skills + references (loaded on demand, less context).
2. The "discover missing capabilities" vs. "don't invent features" conflict resolved with `confirmed/implied/proposed` tags.
3. Clear layering core / foundation / domain (the draft listed everything as "where appropriate").
4. Added commonly missed modules: site content, leads inbox, message templates, jobs/integration health, my account/security.
5. Approval gates, resume protocol, fast path, scaling by site size, FE-first mode.
6. Real tooling: project scanner + docs validator (a `done` module without evidence fails).
7. Concrete security and data-safety rules: IDOR, mass assignment, CSV injection, uploads, impersonation, optimistic concurrency, idempotency, append-only audit.
8. Runnable QA: role × permission matrix against the API, scale test, public-site regression.
9. Vietnam-aware: VND, timezone, accent-insensitive search, Vietnamese-capable fonts.

## License

MIT
