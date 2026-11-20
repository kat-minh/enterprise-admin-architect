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

### 2. Read deeply where it matters
Follow `references/discovery-checklist.md`: auth & roles, data model, API conventions, existing UI kit/components/forms/tables, existing admin code, integrations, i18n, seed data, config. On big repos, delegate independent reads to parallel Explore subagents (one per concern) and ask for conclusions, not file dumps.

### 3. Walk the public product
Enumerate pages, user journeys, forms, transactions, user-generated content, third-party integrations. If the site can run locally and browser tools are available, click through the main journeys; otherwise derive journeys from routes/components. For each major feature fill the **Feature Ledger** (in `templates/product-discovery.md`): data it uses · who creates/changes it today · what happens on change · approval needed · lifecycle/status · history needed · side effects on other entities · evidence (file/route).

### 4. Build the domain map
Group entities into 3-8 business domains and draw relationships (Mermaid `erDiagram`). Identify lifecycles (status enums are strong hints), ownership, and cross-domain side effects. Write `business-domain-map.md`.

### 5. Match domain patterns
Open `references/domains/_index.md`, match signals to domain files and read **only the matching ones**. If the business is unusual (lab testing, logistics, church donations…), follow `references/domains/_custom-domain-playbook.md` instead of forcing it into e-commerce. Domain files are examples to adapt, not templates to install.

### 6. Build the module inventory
Use `references/universal-modules.md` for the three layers:
- **core** - mandatory for every web admin (auth, RBAC, dashboard, admin accounts, audit log, settings, own account/security).
- **foundation** - universal but conditional; each has an applicability test (media, notifications, import/export, trash, content-site control, leads inbox, templates, jobs…). Include when the test passes; otherwise record **why excluded**.
- **domain** - derived from Feature Ledger + domain files.

For each module give: ID (kebab-case), business purpose, layer, evidence tag with source, priority, dependencies, status. Priorities: P0 = admin cannot operate without it · P1 = needed in first weeks · P2 = scale/nice-to-have. Apply "smallest complete system": drop or defer anything with no operational justification.

### 7. Identify operators and workflows
List who will operate (super admin, content editor, support, finance, ops…) and write 3-6 "day in the life" workflows ("process a refund", "approve a booking change"). These drive roles, dashboard queues and module specs.

### 8. Backend gap analysis
For each P0/P1 module list the endpoints/tables/jobs it needs and mark `exists` / `partial` / `missing` with the file evidence. Note authz, pagination/filter/sort support, audit hooks, soft-delete, file storage. Decide per gap: implement (repo owns backend) or document (external backend).

### 9. Open questions
Max 7. Each: question · why it matters · recommended default. Always ask **delivery mode** (`full-stack` vs `fe-first` - build and approve the UI on a mock layer before any backend; recommend `fe-first` when most P0 endpoints are missing or the user wants to review the UI first). Examples: where does data live; which roles exist; is X workflow really needed; multi-language admin; payment reconciliation owner.

### 10. Write the docs, then hand off
Fill the three templates. Run `node <skills-dir>/admin-qa-gate/scripts/validate-admin-docs.mjs --root <project> --stage discovery` (`<skills-dir>` = the folder that contains the `admin-*` skill directories). Then invoke `admin-information-architecture`. Gate 1 is presented after IA unless the user asks to review discovery separately.

## Guardrails
- Do not read `.env` files or print secrets; only `.env.example` names.
- Do not start coding the admin in this phase.
- Do not treat the public site's marketing copy as a requirement list; verify against code/data.
- Every inventory row needs a non-empty source/justification.
