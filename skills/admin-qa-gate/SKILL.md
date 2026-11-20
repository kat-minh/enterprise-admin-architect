---
name: admin-qa-gate
description: Phase 8 of building an admin system - verify and report honestly. Runs the docs consistency validator, typecheck/lint/build/tests, click-through of real workflows in the running app, permission matrix tests against the API (UI hidden AND server 403), states (loading/empty/error/forbidden), responsive/accessibility/security/performance spot checks, public-site regression, then writes qa-report.md and the final report. Use after implementing any admin module or before handing off the admin, or when asked to "QA the admin", "kiểm tra admin", verify permissions, audit an existing admin against enterprise standards, or check what is really done vs only specified.
---

# Admin QA Gate (Phase 8)

Principle: **a module is complete only when its intended business workflow works.** "It renders" and "it compiles" are not completion. Report outcomes faithfully - failures, skipped checks and unverified areas included.

Inputs: `docs/admin/*`, the codebase, a runnable app. Outputs: `docs/admin/qa-report.md` (template in `templates/`), updated `implementation-status.md` + inventory statuses.
References: `references/quality-gates.md` (checklists, severities, pass criteria), `references/e2e-test-playbook.md` (how to test, with code patterns).

## Procedure

### 1. Docs consistency (cheap, always first)
```bash
node <this-skill-dir>/scripts/validate-admin-docs.mjs --root <project> --stage <discovery|architecture|design|build|final>
```
Fix errors (broken cross-references, modules marked done without verification, routes without permissions, missing specs). Warnings need a decision, not silence.

### 2. Static checks
Detect and run the project's scripts: typecheck (`tsc --noEmit`), lint, build, unit/API tests, existing e2e. Record command, result, date in `implementation-status.md`. A failing check is a finding, not something to hide.

### 3. Run the app and exercise it
Start the dev server using the project's own script (the `run` skill can help). Prefer real interaction: browser automation (Claude in Chrome / Playwright) to click through; read console messages (filter errors) and network requests (`/api/admin`). Use dev/staging data only - never production. Avoid native `alert/confirm` dialogs; they block automation.

For each module under test, follow `references/e2e-test-playbook.md`:
- **Workflow**: golden path + the main negative paths (invalid transition → rejected, validation errors, conflicts).
- **Permissions**: for every role × protected action, the **API** returns 401/403 when forbidden, and the UI hides/disables it. Use the matrix in `permission-matrix.md` as the oracle.
- **States**: loading skeleton, empty (initial and filtered), error + retry, forbidden, not-found.
- **Tables/forms**: server-side pagination/filter/sort visible in the network calls; URL state survives refresh; dirty guard; conflict handling.
- **Audit**: sensitive actions appear in the audit log with actor, before/after, reason.
- **Responsive & a11y**: screenshots at 1440 / 1024 / 768 / 390; keyboard-only pass; focus visible; labels; contrast spot-check.
- **Security spot-check**: `references/quality-gates.md` §D (IDOR, mass assignment, upload/export safety, secrets, headers).
- **Scale**: list endpoints with a large seeded dataset stay fast and paginated (no full-table loads).

### 4. Regression on the public site
Smoke the public routes and run existing public tests. The admin must not break public pages, auth, API contracts or the design system.

### 5. Classify defects
Blocker (data loss/security/authz bypass/broken core workflow) · Major (feature wrong or unusable in common cases) · Minor (polish). Fix Blockers and Majors in P0 modules, re-verify, then continue. Majors in P1 need an owner and plan; Minors are listed.

### 6. Record and report
- Update `implementation-status.md`: `Verified` = `yes` only with evidence (test name, command output, screenshot path, walkthrough note); otherwise `partial`/`no`.
- Set module `Status` in `module-inventory.md` (`done` only when Verified = yes).
- Fill `docs/admin/qa-report.md`.
- Re-run the validator with `--stage final`.

### 7. Present Gate 3
Final report: completed modules (with evidence) · functional capabilities · API integrations · missing backend requirements · known limitations · remaining work · how to log in per role (dev seed) · what was **not** verified. Keep it factual; no hedging on what is verified, no claims about what is not.

## Rules
- Never mark `done` or `Verified: yes` without evidence.
- Never weaken a test, skip a role, or loosen the matrix to make results pass.
- If you cannot run something (no browser, no DB), say so explicitly in the report and list it under "Not verified".
- Don't fix by hiding: UI-only gating is not a fix for a missing server check.
