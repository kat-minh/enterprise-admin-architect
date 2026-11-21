---
name: admin-ui-audit
description: Standalone audit and fix of the UI quality of an existing admin dashboard or back office, with no rebuild. Runs an automated browser audit of every page for every role at phone, tablet and desktop widths in light and dark themes (double scrollbars, clipped text, overflow, contrast, touch targets, missing names, console errors), then a structured visual review (hierarchy, consistency, density, wording, states, dashboard usefulness) and a front-end performance pass, fixes causes in tokens and shared components, and reports with screenshots as evidence. Use when asked to review, audit, polish or fix an admin UI that looks off, feels inconsistent, has scroll or layout bugs, a weak dashboard or stats page (a few cards and a table, not useful to the owner), accessibility or responsive problems, or when a person keeps pointing out UI defects one at a time.
---

# Admin UI Audit

Principle: **the owner should never be the first one to see a UI defect.** A tool finds the mechanical ones; you find the judgement ones by looking at every page, then you fix the cause, not the instance.

Use this skill on its own for an existing admin. Inside a full build, the same procedure is the QA-gate step for gate `UX-13` (see `admin-qa-gate`). Reuse, do not duplicate: the script is `admin-qa-gate/templates/ui-audit.mjs`; the rubrics are in `admin-design-system/references/` (`visual-standard.md`, `accessibility-responsive.md`, `dashboard-design.md`, `data-table-spec.md`, `form-spec.md`) and `admin-module-builder/references/frontend-architecture.md`.

## Procedure

### 1. Learn what exists (read-only)
Stack, component kit, tokens (colours, spacing, type), the route list, the roles and what each may see, how to sign in per role in a dev or staging environment (never production data). If the project has no design tokens, say so: that is the first finding.

### 2. Run the automated audit
Copy `admin-qa-gate/templates/ui-audit.mjs` into the project's tooling folder, fill its CONFIG block (app URL, roles with accounts and pages, the sign-in function), and run it: every page × every role × 1440 / 1024 / 390 px × light and dark. It records, per state, a full-height screenshot and these findings: the document scrolling when the shell has its own scroll area (a second scrollbar), horizontal overflow, clipped text, content spilling out of its card, touch targets under 28 px on phones, accessibility violations (contrast, names, labels, landmarks, headings, ARIA), console errors and failed API calls.

Pages are not the whole interface: **also open every overlay** (command menu, bell and filter popovers, dialogs, drawers, toasts) in the audit, in both themes and at phone width, wait for its animation to finish, and run the checks on it. Overlays are where a collided class name or a clipped popover hides.

No browser automation in your tool? Walk the same matrix by hand with the checklist in `quality-gates.md` §B and §G and say that the run was manual.

### 3. Fix at the cause, then re-run
Most findings repeat across pages: one token (a grey that fails contrast), one shared component (a table that cannot scroll, a menu without a name). Fix that, re-run, and repeat until no `must` finding is left. Do not silence a rule or hide an element to make the tool pass.

### 4. Look
Open the screenshots of every page, at phone and at desktop width, in both themes, and write what a picky owner would say. Judge:
- **Hierarchy**: is the most important thing on the page the most prominent? What is the page *for*, and can a stranger tell in ten seconds?
- **Consistency**: the same pattern for the same job (toolbar, filters, badges, dialogs, empty states); one icon style, one spacing scale, one wording for one action.
- **Density and balance**: dead space next to cramped tables; tiles of unequal height; text in tiny grey that carries real information.
- **Numbers**: every number has a definition, a period and a comparison; none is there only to fill a card (`dashboard-design.md`, "enterprise bar").
- **States**: loading, empty, error, forbidden, no-permission variants all exist and say something useful.
- **Words**: Vietnamese/English mixing, jargon, truncated labels, raw keys shown to a person.
- **Interaction**: keyboard-only walk of one create flow and one destructive flow (focus visible, Esc closes, focus returns, no trap); respect `prefers-reduced-motion`.

Put the notes and the decisions in the report; fix what is cheap and cross-cutting now, list the rest with severity.

### 5. Performance pass
Copy `admin-qa-gate/templates/perf-frontend.mjs`, fill its CONFIG block and run it on the production build. Per route and for a phone and a desktop profile it reports JavaScript size (gzip), requests before content, largest contentful paint, layout shift (with the elements that moved), blocking time and the longest interaction. Large data: the recipe in `admin-qa-gate/references/e2e-test-playbook.md`. Compare with the budget in `frontend-architecture.md`.

### 6. Re-run the audit for every role you touch
Including roles added later (an editor, a custom role): they see different menus and pages.

### 7. Report
A table of findings (id, severity, page and role, screenshot path, cause, fix or owner) · what was fixed · what remains and why · **what was not verified** (no real device, no screen reader, no production data). Keep the script: it is part of the evidence.

## Rules
- Findings come from running the audit and looking at screenshots, not from reading code.
- Fix tokens and shared components before pages; never add a page-level override for a global problem.
- Do not change behaviour, copy or data without asking; this skill changes presentation and accessibility.
- Do not claim a page is accessible because a tool found no violations: automated checks cover a minority of accessibility problems; say what a person checked.
