---
name: admin-design-system
description: Phase 4 of building an admin system - establish the enterprise-grade UI/UX foundation before building modules - detect and reuse the project's existing UI kit (Ant Design, shadcn/Tailwind, MUI...), define design tokens, app shell (sidebar, header, breadcrumbs, command menu), shared components (data table, filters, forms, drawer, confirm dialogs, status badges, empty/error states, timeline), dashboard design, accessibility/responsive/i18n rules, and ship one reference module as a vertical slice. Use when asked for "UI chuẩn admin professional", admin look and feel, admin design system, data table / form / detail page standards, or when admin screens look generic or inconsistent.
---

# Admin Design System & UI/UX Standard (Phase 4)

Goal: the admin must look and behave like a mature enterprise product (Linear / Stripe / Shopify Admin / GitHub-level clarity) - **consistent, dense but readable, fast to operate** - while staying inside the project's existing stack.

Inputs: `product-discovery.md` (stack, existing UI kit), `module-inventory.md`, `information-architecture.md`.
Outputs: `docs/admin/design-system.md` (template in `templates/`), implemented tokens + app shell + shared components + **one reference module**.

## Procedure

### 1. Decide the UI foundation (reuse first)
- Read the scan result `stack.ui / table / forms / data` and the project's `components/ui`, theme/tailwind config.
- **Existing good kit → keep it.** Raise professionalism through tokens (density, radius, colour), layout and patterns - not by adding another kit. Record "Reuse decision" in `design-system.md`.
- No kit → pick one from `references/stack-adapters.md` that fits the stack (Tailwind → shadcn/ui + TanStack Table + react-hook-form + zod; Ant Design projects → Ant Design theme tokens, etc.). Never mix two component kits in one admin.
- Only deviate from the public site's design system where admin needs differ (higher density, neutral palette) and say why.
- If `ui-ux-pro-max`, `web-design-guidelines` or `dataviz` skills are installed, consult them for review and charts; they refine, they do not replace this standard.

### 2. Define design tokens first
Colour (neutral scale + one accent + semantic status), type scale, spacing (4px grid), radius, borders, surfaces, shadows, control heights, table density, focus ring, z-index, breakpoints, motion. Defaults and rationale: `references/visual-standard.md`. Implement as CSS variables / theme config so every module inherits them. **No module-specific styling without a token.**

### 3. Build the app shell
Sidebar (grouped, collapsible, active state, permission-filtered) · top bar (breadcrumbs, global search/command menu, notifications, help, user menu, environment badge) · single main scroll region · page scaffold (`PageHeader` + toolbar + content) · auth guard layout · 401/403/404/500 pages · login page · global toast/confirm layer. Details in `references/stack-adapters.md` and `references/accessibility-responsive.md`.

### 4. Build the shared component set
Implement only what the inventory needs, to the specs in:
- `references/data-table-spec.md` (DataTable, FilterBar, BulkActionBar, SavedViews)
- `references/form-spec.md` (FormSection, StickyFormFooter, field components, dirty guard)
- `references/detail-page-spec.md` (EntityHeader, KeyValueList, Timeline, tabs rules)
- `references/dashboard-design.md` (metric catalogue, tasks vs state counters, period comparison, role views, chart choice, AttentionQueue, StatTile, trend widgets)
Plus: StatusBadge, ConfirmDialog (3 risk levels), PermissionGate, EmptyState, ErrorState, Skeletons, Drawer, FileUploader, Money/DateTime/ID display helpers.

### 5. Build the reference module (vertical slice)
Pick the most representative P0 domain module. Implement with **real data** (`full-stack`) or, in `fe-first` mode, through the typed mock adapter described in `admin-module-builder/references/fe-first-mock-layer.md` (service interface + zod schemas + server-like mock + "Prototype data" banner): list (server-side pagination/filter/sort, URL state) → preview drawer → detail page → create/edit form → permissions → loading/empty/error states → responsive. This is the pattern every module copies, so get it right now. Verify with the browser (screenshots) when browser tools are available; otherwise give the user run instructions.

### 6. Document and present Gate 2
Fill `design-system.md` (tokens table, component catalogue with usage rules, patterns, deviations). Show screenshots of dashboard, list, drawer, detail, form. Validate: `node <skills-dir>/admin-qa-gate/scripts/validate-admin-docs.mjs --root <project> --stage design` (`<skills-dir>` = the folder that contains the `admin-*` skill directories). Wait for approval before mass-producing modules.

## Rules
- Tokens before pages. Shared component before copy-paste.
- Prefer information density over whitespace; keep one scroll region per page; avoid modal-on-modal.
- Colour is never the only status signal (pair with label/icon).
- No decorative gradients, random charts or giant KPI cards. Every widget answers an operational question.
- Accessibility is part of done: keyboard, focus, labels, contrast (see `references/accessibility-responsive.md`).
- Locale-aware: currency, dates, timezone, and (for Vietnamese) diacritic-insensitive search and fonts with full Vietnamese support.
