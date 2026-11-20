---
name: admin-information-architecture
description: Phase 2-3 of building an admin system - turn the approved module inventory into the admin information architecture - sidebar tree, route structure, page relationships, interaction patterns (drawer vs page vs modal), operator roles and the RBAC permission matrix (resource.action). Use after admin-discovery, or when asked to design/redo the admin navigation, sitemap, "cấu trúc menu admin", "phân quyền", roles and permissions for a back office.
---

# Admin Information Architecture & Permissions

Goal: a navigation, route map and permission model that matches **how operators work**, derived from `docs/admin/module-inventory.md`. No UI code in this phase.

Inputs: `module-inventory.md`, `business-domain-map.md`, `product-discovery.md` (§ operators/workflows).
Outputs: `docs/admin/information-architecture.md`, `docs/admin/permission-matrix.md` (templates in `templates/`).
Read as needed: `references/navigation-patterns.md`, `references/permission-model.md`.

## Procedure

### 1. Group modules into navigation domains
- Group by **operator job-to-be-done / business domain**, not by database table. Name groups with the operator's vocabulary.
- Target 4-9 top-level groups; max 2 levels. Avoid duplicates; each module has exactly one home (cross-links are fine).
- Order by frequency of use and business importance: operational work first, configuration last. Typical skeleton: *Overview* · domain groups (e.g. Sales, Catalog, Customers) · *Content* · *Insights* · *Settings & Access* (users, roles, audit, system).
- Collapse tiny modules into tabs of a parent page instead of top-level items.
- Show module names as nouns matching entity names used on the public site where possible.

### 2. Define routes
Follow `references/navigation-patterns.md` § Route conventions: `/admin/<module>`, `/admin/<module>/new`, `/admin/<module>/[id]`, `/admin/<module>/[id]/edit`; tabs as `?tab=`; list state (search/filter/sort/page/pageSize/view) in the URL query. Adapt to the existing router and prefix.

### 3. Choose interaction pattern per page
Table → **Preview Drawer** → **Full detail page** by default. Use the decision table in `references/navigation-patterns.md`. Record per module: list page, quick view, detail, create/edit surface (page vs drawer), special screens (calendar, kanban, queue, wizard).

### 4. Model operators, roles and permissions
Using `references/permission-model.md`:
- Define roles from real personas (Super Admin, Admin, plus domain roles such as Content Editor, Support, Finance, Operations). Prefer 3-6 roles; avoid role explosion.
- Permissions are `resource.action` with a fixed verb set (`read`, `create`, `update`, `delete`, plus domain verbs like `publish`, `refund`, `approve`, `export`, `impersonate`). Mark **sensitive** permissions (money, PII, destructive, security).
- Add scope where needed (`own` vs `all`), never field-level unless required by regulation.
- Build the catalog and the role × permission matrix. Ensure Super Admin cannot be locked out and the last Super Admin cannot be removed.
- Define role-based navigation: what each role sees (hide what they cannot `read`), and the default landing page/dashboard per role.

### 5. Global interaction layer
Decide: global search (what entities), command menu (navigation + quick actions), notifications entry, help link, user menu, breadcrumbs, toast/confirm conventions, keyboard shortcuts (a short list).

### 6. Write docs and validate
Fill `information-architecture.md` and `permission-matrix.md` (keep table headers intact - they are machine-checked). Run:
```bash
node <skills-dir>/admin-qa-gate/scripts/validate-admin-docs.mjs --root <project> --stage architecture
```
(`<skills-dir>` = the folder that contains the `admin-*` skill directories).

### 7. Present Gate 1
Summarise together with discovery: modules, exclusions, sidebar tree, roles, backend gaps, ≤ 7 open questions with recommended defaults. Wait for approval. Then hand off to `admin-design-system`.

## Rules
- Navigation reflects workflows; a module with no route or no permission is a defect.
- Never rely on hiding nav items for security - the matrix will be enforced server-side by `admin-module-builder`.
- Keep naming consistent across sidebar, breadcrumbs, page titles and permission keys (`orders` everywhere).
- Don't add a top-level item for a module with a single list page that belongs inside a domain group.
