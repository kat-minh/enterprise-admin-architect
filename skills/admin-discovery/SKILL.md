---
name: admin-discovery
description: Phase 1 of building an admin system - investigate an existing website/app (codebase, data model, APIs, auth, public user journeys), build the business domain map and entity relationships, and produce an evidence-based admin module inventory (core / foundation / domain modules, P0-P2, confirmed / implied / proposed) plus backend gap analysis and open questions. Use before designing or coding any admin/back-office/CMS, when asked "what modules does this admin need", "phân tích web để làm admin", "xác định module quản trị", or when auditing what an existing admin is missing.
---

# Admin Discovery (Phase 1)

Goal: know the business well enough to decide **which modules the admin needs, and which it does not**. Output is documents, not code.

Inputs: the repository (and optionally the running public site). Outputs in `docs/admin/`: `product-discovery.md`, `business-domain-map.md`, `module-inventory.md`. Templates are in `templates/`.

Never invent business functionality that the product or confirmed requirements cannot support. Use evidence tags (`confirmed` / `implied` / `proposed`) instead.

## Procedure

### 1. Scan the project (deterministic first pass)
Run the scanner from this skill's `scripts/` folder (Node ≥ 18, no dependencies):

```bash
node <this-skill-dir>/scripts/scan-project.mjs <project-root> --out docs/admin/.scan.json
```

It reports stack (framework, UI kit, forms/tables/state libs, auth, ORM/DB, payments/integrations), routes, API endpoints, data models with fields/enums/relations, any existing admin footprint, and env var **names** (never values). Treat it as a map, not as truth - confirm by reading the files it points to. If it misses something (unusual framework), fall back to `references/discovery-checklist.md`.

Act on every block of the report, not only on routes and models:
- `uiSurfaces` (translation calls and dictionaries, theme token files, brand head and manifest, banner components, static pages, config files) and `contentFiles` feed the **Content & configuration inventory** (step 3c).
- `operations` (schedulers and queues, webhook routes, outbound mail/SMS/push call sites, upload handlers, rate limiters, env switches read in code) are candidates for `jobs-monitor`, `user-messaging`, `media`, `app-controls`; each one is a Feature Ledger row.
- `stack.cms`, `stack.flags`, `stack.pwa`: an existing CMS or flag service means "integrate, do not build a second one" (`references/site-content-and-config.md`).
- The scanner prints its own blind spots under *Operations*; read the router and components before concluding that something is absent.

### 2. Read deeply where it matters
Follow `references/discovery-checklist.md`: auth & roles, data model, API conventions, existing UI kit/components/forms/tables, existing admin code, integrations, i18n, seed data, config. On big repos, delegate independent reads to parallel sub-agents or background tasks if your tool supports them (one per concern), and ask for conclusions, not file dumps; otherwise read sequentially.

### 3. Walk the public product
Enumerate pages, user journeys, forms, transactions, user-generated content, third-party integrations. If the site can run locally and browser tools are available, click through the main journeys; otherwise derive journeys from routes/components. For each major feature fill the **Feature Ledger** (in `templates/product-discovery.md`): data it uses · who creates/changes it today · what happens on change · approval needed · lifecycle/status · history needed · side effects on other entities · evidence (file/route).

**Mine manual operations.** Read `scripts/`, npm scripts (seed, promote, backfill, send, export), migrations that INSERT or UPDATE business data, and runbook text in the README. A script someone runs by hand is the best evidence of a missing admin action: give each one a Feature Ledger row.
**Walk the authenticated journeys.** For apps whose real product sits behind login, create a seeded test user (rules in `admin-qa-gate/references/e2e-test-playbook.md`), list every screen behind login and mark each field a user can edit. Feed the result into the Feature Ledger and into the support view of `public-users`.

### 3b. Owner intake (closed questions, before the inventory)
The inventory is only as good as what the owner tells you about daily work. Ask these **once, in one message, in plain words** (they are intake, not gate questions, and do not count against the 7-question cap):
1. What do you ask a developer to change today, or change in the database or code (texts, banners, prices, translations, emails, switches, data fixes)?
2. What do you wish you could see or do every day without a developer?
3. What support requests arrive from users, and how are they handled now?
4. What must be undoable, approved or auditable?
5. Who will operate the admin, and who must not see personal data?

Map **every answer** to a module ID, a Feature Ledger row, or an `Excluded` row with the owner's reason. When the owner says "settings" or "CMS", ask which one they mean: (a) operational switches and limits → `admin-module-builder/references/runtime-controls.md`; (b) editing words, brand, banners, pages → `references/site-content-and-config.md`; (c) integrations and secrets → the `settings` module. Do not analyse before that is clear.

### 3c. Content & configuration inventory
Fill § "Content & configuration inventory" of `templates/product-discovery.md` from the scanner's `uiSurfaces` and `operations` blocks plus targeted reads. One row per surface, with **where it lives**, **who changes it today**, how often, and a class: **CMS** (the business should change it from the admin), **code** (behaviour, layout, schema), **build-time** (needs a build, e.g. installed-app name and icons). The mandatory rows are listed in the template; apps are covered as much as websites. Every CMS row maps to a module ID.

### 4. Build the domain map
Group entities into 3-8 business domains and draw relationships (Mermaid `erDiagram`). Identify lifecycles (status enums are strong hints), ownership, and cross-domain side effects. Write `business-domain-map.md`.

### 5. Match domain patterns
Open `references/domains/_index.md`, match signals to domain files and read **only the matching ones**. If the business is unusual (lab testing, logistics, church donations…), follow `references/domains/_custom-domain-playbook.md` instead of forcing it into e-commerce. Domain files are examples to adapt, not templates to install.

### 6. Build the module inventory
Use `references/universal-modules.md` for the three layers:
- **core** - mandatory for every web admin (auth, RBAC, dashboard, admin accounts, audit log, settings, own account/security).
- **foundation** - universal but conditional; each has an applicability test (media, notifications, import/export, trash, site content, localization, user messaging, leads inbox, templates, jobs and health, app controls, privacy requests…). Include when the test passes; otherwise record **why excluded** in `Excluded / deferred`. **Never exclude a foundation module silently or on a technicality** ("it is not a content website" is how an app's whole CMS need gets dropped): every excluded foundation candidate becomes a plain-language yes/no question at Gate 1 with its one-line consequence ("if you want to edit texts and banners yourself, we need `site-content`").
- **domain** - derived from Feature Ledger + domain files.

For each module give: ID (kebab-case), business purpose, layer, evidence tag with source, priority, dependencies, status. Priorities: P0 = admin cannot operate without it · P1 = needed in first weeks · P2 = scale/nice-to-have. Apply "smallest complete system": drop or defer anything with no operational justification.

**Existing admin?** If the scan reports `existingAdmin.exists`, inventory it before planning anything: list each existing admin route/module, map it to an inventory ID (status `exists`), and record in `product-discovery.md` § "Existing admin audit" what is weak or missing (no server-side authz, client-side filtering of large lists, no audit log, hard deletes, fake data, inconsistent UI). Plan only the gaps. Never rewrite working modules; propose a replacement only with evidence.

### 7. Identify operators and workflows
List who will operate (super admin, content editor, support, finance, ops…) and write 3-6 "day in the life" workflows ("process a refund", "approve a booking change"). These drive roles, dashboard queues and module specs.

### 8. Backend gap analysis
For each P0/P1 module list the endpoints/tables/jobs it needs and mark `exists` / `partial` / `missing` with the file evidence. Note authz, pagination/filter/sort support, audit hooks, soft-delete, file storage. Decide per gap: implement (repo owns backend) or document (external backend).

### 9. Open questions
Max 7 (the owner intake of step 3b is separate; excluded foundation modules can be grouped into one multi-choice question). Each: question · why it matters · recommended default. Always ask **delivery mode** (`full-stack` vs `fe-first` - build and approve the UI on a mock layer before any backend; recommend `fe-first` when most P0 endpoints are missing or the user wants to review the UI first). Examples: where does data live; which roles exist; is X workflow really needed; multi-language admin; payment reconciliation owner.

### 10. Write the docs, then hand off
Fill the three templates. Run `node <skills-dir>/admin-qa-gate/scripts/validate-admin-docs.mjs --root <project> --stage discovery` (`<skills-dir>` = the folder that contains the `admin-*` skill directories). Then invoke `admin-information-architecture`. Gate 1 is presented after IA unless the user asks to review discovery separately.

## Guardrails
- Do not read `.env` files or print secrets; only `.env.example` names.
- Do not start coding the admin in this phase.
- Do not treat the public site's marketing copy as a requirement list; verify against code/data. But copy, branding or settings that **operators must change** are evidence of content ownership: they justify `site-content` even when no code reads an admin-managed value yet (the build then adds that reader, recorded in the module spec's "Public-site integration").
- Every inventory row needs a non-empty source/justification.
