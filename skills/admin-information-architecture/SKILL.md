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
- **Concept ledger: one home per noun, not only per module.** After the sidebar is drafted, list every noun the operator edits (brand, logo, accent colour, banner, theme, notification settings...) with the single screen that edits it. A noun with two screens is a defect: merge them, and split by the operator's task, never by where the data happens to be stored. The classic miss is "Brand" as a tab in the content module and again in the design module (the name and the colour in one, the logo in the other). Sections of one screen may differ in permission; they do not differ in location. Tab labels do not repeat across modules of a group.
- **Group by what the operator does, not by which module was built first, and give a workflow that spans several editors its own home.** For a public-app editing cluster the three jobs are *write* (content), *style* (appearance: brand identity and the design system, with the live preview) and *ship* (publishing). Publish, approve, schedule, history and rollback apply to everything that was edited, so they are one release screen, never a tab of one editor: an author who had changed a colour had to look for "Publish" under the module for words. Show the one number an author must not forget (what is waiting for release) as a count on the release item and as a chip on every screen that writes to the draft. Name a group by what it is ("Public app"), not by listing its items ("Content and design"). Every address that moved keeps working, tab parameters included.
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
- Before Gate 1, read the sidebar aloud as the operator would ("where do I change the logo? the brand colour?"). If the answer is "it depends", the architecture is not finished (gate `UX-19`).
