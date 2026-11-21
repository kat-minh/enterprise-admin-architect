# Changelog

## 1.6.2 - 2026-11-21

The two templates added in 1.5.0 and 1.6.0 were run **as templates** for the first time: copied into the proving project and their CONFIG filled in, the way the skill tells a user to, instead of run from the scripts they were ported from.

- **`admin-qa-gate/templates/ui-audit.mjs` fixed:** `page.evaluate` was given two arguments, which Playwright refuses ("Too many arguments"), so the template shipped since 1.5.0 failed on its first page for anyone who used it; the two values now travel as one object. Also, when an overlay's `open` step threw, the animations were not awaited before the checks and axe reported contrast failures on a half-faded overlay; they are now always awaited.
- **Verified by running them:** the audit template over 30 states (2 roles, 3 pages and 3 overlays each, 3 widths and themes): 0 `must`, 30 clean. The performance template reproduced the project script's figures (same JavaScript sizes, LCP within a few percent).
- **A figure corrected:** the phone dashboard's layout shift varies between 0.09 and 0.11 from run to run (0.109 in a single run of the template). The "CLS up to 0.09" of 1.6.0 was the median of three runs, not a ceiling; the budget is 0.1 and this page sits on it.
- **New rule in `AGENTS.md`:** a template is not released until it has been run as a template (copied into a project, CONFIG filled), because a port of a script that ran proves nothing about the template.

## 1.6.1 - 2026-11-21

A check of whether the skills wake up for the way people really ask, with `claude plugin eval`.

- **New `evals/`:** 29 trigger cases (13 positive with keywords in English and Vietnamese, 6 positive paraphrased without the word "admin", 10 negative including near misses such as a single chart widget, a landing page, a BI report, Google sign-in, unit tests, an SQL injection review), with a README on how to run them and what they cost (about 0.09 USD a run, 8-9 USD for the suite). They measure triggering in an empty workspace, not the quality of the work that follows.
- **Two descriptions widened** after the paraphrased cases showed gaps (2 of 6 did not fire at first): `enterprise-admin-architect` now also covers owners or staff who must manage orders, users, texts, banners or content without a developer or by editing the database by hand; `admin-ui-audit` covers a stats page that is only a few cards and a table. Both are under 1,024 characters.
- **A grader lesson:** a negative case must count only this suite's own skills; the environment ships other skills and a charting skill fired, correctly, on a chart request, which a "no skill at all" grader wrongly counted as a miss.
- **Result:** positive 54 / 57 runs invoke a right skill (and the most specific one), negative 30 / 30 stay silent. One known miss, left as it is: "How do I let my non-technical team change the texts and banners of my app without calling a developer?" (an advice question with no code to look at). 29 prompts written by the maintainer, one model, one day: a smoke test of the descriptions, not a benchmark.

## 1.6.0 - 2026-11-21

Lessons from applying the "Guidance" rows of `docs/coverage-map.md` to the proving build (the owner asked to apply every row that could be applied), then measuring and auditing the result. Four rows were applied for real, the rest were left out on purpose and the map now says why.

- **Command menu and keyboard shortcuts** (`navigation-patterns.md`, new gate UX-15): trigger and header button, contents in order (recent pages, pages, actions, "search for x in <list>"), accent-insensitive matching, modal combobox/listbox semantics, IME-safe Enter (also Safari's keyCode 229), single-key shortcuts that never fire while typing or over a dialog, role-limited, no destructive actions in the menu. The role's sidebar is the test oracle.
- **Attention bell** (`navigation-patterns.md`, UX-15): the same function as the dashboard's task list, only data the role may read, honest about how fresh it is; a notification centre with read/unread is named as a different thing that needs an event store.
- **Column visibility, saved views and a phone sort control** (`data-table-spec.md`, new gate FN-14): per-admin storage on the device, validation on read, a saved view is the list's own URL query, limits and duplicate rules, and the explicit list of what is deliberately not offered (inline editing, column resize, row expansion) with the reason. Undo only where the inverse is exact, as its own audited action.
- **Front-end budget measured, not only declared** (new `admin-qa-gate/templates/perf-frontend.mjs`, PERF-8 rewritten, `frontend-architecture.md`): the production build, per route, phone profile (CPU 4x, 1.6 Mbps) and desktop; JavaScript, LCP, CLS with the elements that moved, blocking time, interaction latency; defaults from the Web Vitals "good" thresholds; a figure over budget is recorded with its number and a plan. New gate UX-16: loading must not move the page (skeletons reserve the loaded size, a sentence that changes when data arrives already has its final length).
- **The UI audit opens overlays** (`admin-qa-gate/templates/ui-audit.mjs` `CONFIG.overlays`, UX-13, `admin-ui-audit`): command menu, popovers and dialogs are audited like pages plus their geometry (inside the viewport, not squeezed), after their animation has finished. A page-only audit had let a visibly broken popover through.
- **Playbook:** eight pitfalls from this run (a passing suite does not replace looking at the screenshot; a new class name can collide with an old rule; press keys only after the app has mounted; axe during a fade-in reports false contrast failures; take the oracle from the product, not from memory; prefix-sharing names in strict locators; test device-side preferences the way users break them; check the test stack before blaming the code, with the recovery of a database whose workers were killed).
- **Coverage map:** command menu, shortcuts, bell, column visibility, saved views, phone sort, undo and the measured front-end budget moved from Guidance to Proven; MFA/SSO, wizards, rich text, uploads, real-time stay Guidance with the reason.
- **Bundle:** the `ui-audit` phase inlines the new performance template (test updated). README: a command-menu screenshot and a Vietnamese "proven" section.

Evidence from the proving build (details in its QA report): the new UI suite 21 / 21 and the earlier four suites unchanged (42 / 50 / 19 / 26, so 158 checks, 0 failed; one earlier run of one suite stopped at its first step for an unknown reason and passed on rerun, and the runner now prints such lines); the UI audit over **350 states (205 pages + 145 open overlays)**: the first run found 218 states with `must` (an accessible name that did not contain the visible label of a button on every page, a popover 98 px off screen at 390 px) and after fixing causes 0 `must` and 0 `should`; the front-end budget on the production build: 107-122 KB JavaScript per route (gzip), phone LCP up to 2.2 s, CLS up to 0.09 (it was 0.115 until skeletons reserved their height), longest interaction 80 ms, and **two lists over the blocking-time budget on the phone profile (219 and 217 ms against 200)**, recorded with a plan instead of a raised threshold. Not verified: screen readers, real devices, Safari, non-US keyboard layouts, a large dataset for the front-end figures; the two new templates were ported from the proving project's scripts and syntax-checked but not run as templates.

## 1.5.0 - 2026-11-21

Lessons from the fourth build session of the same project (editable roles, a CMS for the public app, an enterprise dashboard with real statistics) and from an external "admin dashboard toolkit" wish-list that was compared with the suite. The owner's feedback in that session was the test: "the dashboard is poor", "why can't the admin edit permissions", "I keep having to point out UI problems".

- **New standalone skill `admin-ui-audit`:** audit and fix the UI of an *existing* admin without a rebuild: the automated browser audit across every page × role × width × theme, a structured visual review, a dashboard pass, a front-end performance pass, a findings report. It reuses `admin-qa-gate/templates/ui-audit.mjs` and the design-system rubrics; `scripts/bundle.mjs` gets an `ui-audit` phase that inlines everything it points to (with a test).
- **Dashboard design method** (`admin-design-system/references/dashboard-design.md`): a *metric catalogue* written before any widget (definition, source, comparison, drill-down, limitation; derived from the product's value moments, not from table names), tasks vs state counters, period selector with previous-period comparison, per-role landing views, a chart-choice table (trend, parts, share, funnel, heat map), an "enterprise bar" design review. New gate UX-14.
- **New reference `admin-module-builder/references/analytics-endpoints.md`:** one endpoint per permission boundary, whitelisted query, filled series, ratios that are `null` (never 0 %) without a denominator, business-time-zone day buckets, cohort rules, set-based SQL (aggregate children first; group raw values before normalising them), stale-while-revalidate cache with `generated_at`, privacy, an independent oracle test with boundary fixtures, a role probe, scale timing, test-data hygiene (unindexed foreign keys make cleanup scan per row). New gates FN-13 and PERF-7.
- **New reference `admin-module-builder/references/frontend-architecture.md`:** feature folders, one home per kind of state (query cache, URL, form, auth context, preferences), the API client rules (abort, no-store, typed errors, central status handling), hooks guarded by permission, error boundaries, real-time decision, environments, a front-end performance budget, observability, test layers, anti-patterns. New gates ENG-11 (types compared with the real responses), ENG-12 (error boundaries) and PERF-8 (front-end budget).
- **RBAC:** an "Editable roles" section in `rbac-implementation.md` (catalogue in code, roles as data, one locked system role, reserved permissions that can never be granted, no self-editing, audit with reasons and before/after, optimistic concurrency, propagation window, UI pattern, tests). New gate SEC-12.
- **QA playbook:** eight more pitfalls (similar controls collide, a locator matching a hidden option, make the precondition part of the test, two close buttons, count the sign-ins against the limiter, denied audit rows have no reason, probe real response shapes, a delegated agent's report re-run on a separate stack and compared) and the full sequence that proved admin-edited public content in the real public app.
- **UI audit template:** content of a closed `<details>` is no longer measured (a popover inside one was reported as spilling out of its card); a link inside a sentence is exempt from the touch-target rule. The audit found a defect in the code under test that no unit test would: a dashboard widget requested data its role may not see (a `403` on every page load).
- **Table and form specs:** row expansion, export rules (UTF-8 BOM, filters and permissions respected, formula-injection safe), conditional fields, date ranges.
- **Docs:** `docs/coverage-map.md` maps the suite to the usual twelve-group wish-list at four honest levels (proven, gate, tool, guidance) and says what is left out and why; issue and pull-request templates.

Evidence from the proving build (details in its QA report): six backend suites re-run on an independent stack (131 / 164 / 200 / 103 / 75 / 19 checks, 0 failed) and an independent oracle of the dashboard figures (100 checks); UI end-to-end suites 42 + 50 + 19 + 26 checks passing (two failures along the way were stale expectations of the old dashboard and permission catalog, updated deliberately, not loosened); the automated UI audit over 205 page states went from 84 `must` and 25 `should` findings (52 states) to 0 `must` after fixing causes; the analytics endpoints timed at 200,064 users / 400,095 trips: the 90-day overview takes 3.1 s cold (was 4.3 s, the content block alone went from 3.5 s to 0.7 s) and the 30-day one 1.5 s, still over the 1.5 s budget, so the number and the plan (stale-while-revalidate cache, warm-up after deploy, rollups if it grows) are recorded rather than hidden; governance figures answer in under 30 ms.

## 1.4.0 - 2026-11-21

A product owner noticed after delivery that the suite had no CMS-style content control, although the scan had listed the content files. An independent review of the whole suite (read-only, not anchored on that complaint) then found the same kind of blind spot in several places. This release fixes them.

**Why it was missed:** discovery never asked the owner what they change by hand today (and the gate rule discouraged asking), the `site-content` applicability test was written for brochure websites ("is this a content website?"), the scanner could not see UI strings, theme tokens, brand metadata or operations, and foundation modules could be excluded silently.

- **Discovery:** an **owner intake** (five closed questions, outside the 7-question gate cap), a **content & configuration inventory** with mandatory rows (UI strings, branding, legal pages, SEO, e-mail/SMS/push copy, pricing constants, banners, switches, sample content, metric sources), mining of manual operations (scripts, runbooks, data-fixing migrations), walking the authenticated journeys, and the rule that "settings" or "CMS" is disambiguated before analysis. Every excluded foundation module becomes a yes/no question at Gate 1. New `admin-discovery/references/site-content-and-config.md` (three tiers, applicability test for apps and websites, keep-in-code / override-layer / external-CMS, one owner per entity, permission split by risk).
- **Scanner:** new `uiSurfaces` (custom translate calls and distinct strings, nested dictionaries such as `i18n/en/*.ts` and `public/locales/<lang>/<ns>.json`, theme token files, brand head and manifest, banner components, static pages, config files) and `operations` (schedulers and queues, webhook routes, mail/SMS/push call sites, upload handlers, rate limiters, env switches read in code); CMS, flag, PWA and more i18n libraries; a consumer-app domain hint for PWA and push signals. 6 new tests.
- **Validator:** warns when `product-discovery.md` has no Owner intake or Content & configuration inventory, when the Feature Ledger has no `Owner module` column, a blank or unknown owner; lists foundation modules that are neither included nor excluded with a reason (a template placeholder row decides nothing); warns when a module spec lacks "Public-site integration". Example and 7 tests updated.
- **New modules in the catalogue:** `site-content` rewritten (UI strings, brand, banners, pages; websites and apps), `localization` extended to UI strings in code, `user-messaging`, `app-controls`, `privacy-requests`, `jobs-monitor` widened to integrations and system health, `leads-inbox` widened to feedback and reports; default-on rules; draft/publish no longer listed as "advanced".
- **New guidance:** `admin-module-builder/references/site-content-cms.md` (delivery contract to the public product, draft/preview/publish/rollback, UI text overrides, theme and brand, banners, pages) and `runtime-controls.md` (runtime or deploy time, registry, failure modes); archetypes 11 (site content) and 12 (ops monitor); `domains/consumer-app.md`; "Admin-managed public content" in the backend contract; a **Public-site integration** section in the module-spec template; QA gates `PC-8`, `PC-9`, `CMS-1..7`, `DOC-5`; an e2e playbook section for admin-managed public content; `admin-qa-gate/templates/runbook.md`; process scaling no longer treats a small consumer app as a brochure site.
- **Fixes in existing guidance:** the fe-first production guard failed open (unset variable allowed the mock, and `process.env.NEXT_PUBLIC_*` never trips on Vite); the cookie baseline contradicted the recommended separate-origin admin (now an explicit decision with options and compensating controls); impersonation pattern for a separate origin; the `settings` module boundary against `site-content`; the "do not expose settings nothing reads" rule no longer blocks a CMS.
- Bundle sizes in `docs/using-with-other-ai-tools.md` updated (discovery 14-15k tokens, build 22k, QA 11k).

## 1.3.0 - 2026-11-21

Lessons from building the remaining modules of the same project (dashboard, trips with archive and content inspection, admin accounts, roles page, scraper operations) and running the full quality gate, including a large-dataset check.

- QA gate: the large-dataset test is now a recipe (≥ 100k rows in the largest entity, ≥ 1M in event tables, `ANALYZE` after loading, every sortable column in both directions, deep page, before/after on the same data, ordering comparison after any query change, cleanup). It found four lists taking 1.5-8 s that were instant on the small seed. New gate `PERF-6`; `PERF-1` raised from 10k to 100k rows.
- QA playbook: four more pitfalls (lazily loaded routes keep the old screen until the chunk arrives; ground truth must use the product's own window and `unaccent`/`lower` fold definitions; refused attempts are the newest audit rows; earlier suites go stale when a later module changes defaults).
- Backend contract: page the keys first and attach per-row counts to the page only (pre-aggregated join when sorting by a count); fold `lower(unaccent(x))` rather than `unaccent(lower(x))`; index foreign keys used in cascades.
- Security baseline: credentials an admin hands to someone else (generated server-side, returned once, dialog that cannot be dismissed until acknowledged, never in audit or logs); self-protection and the last-Super-Admin rule under concurrency.
- Dashboard design: state the window ("24 hours" as 24 buckets vs rolling), round axis labels (maximum must be even when the axis shows 0 / half / max), work-queue card layout.

## 1.2.2 - 2026-11-21

Lessons from building and verifying a full-stack admin (real backend, separate admin app, UI end-to-end run).

- QA playbook: pitfalls when automating admin UIs (skeleton rows count as rows, wait for overlay animations, login limiters block reruns, reseed after state-changing tests, explicit local-only seed database, scoped locators, browser-locale date inputs, treat a delegated agent's report as a claim).
- Module builder: re-run checks and review the diff of shared/public code after delegating work to sub-agents.
- Design system: revealed sensitive data gets its own block (not the header actions); clickable table rows must be keyboard-operable.

## 1.2.1 - 2026-11-20

Fixes and guidance from a first run on a real two-repo project (Express + PostgreSQL backend, Vite PWA frontend, no existing admin).

- Fix (scanner): Express/Fastify mount prefixes are now applied to router files (`app.use("/api/x", xRoutes)`), including routers mounted twice; `src/pages/*` is no longer treated as a Next.js pages router in Vite/React Router apps; `modules/auth/*`-style auth files are detected; the form list heading no longer implies every form is a public lead form.
- Guidance: PWA frontends get a separate admin app; per-resource roles are not platform roles; suspension needs session revocation with stateless tokens; support access to private user content needs an `inspect` permission, reason and audit; single-operator products still define a restricted role.
- Playbook: worked example for consumer collaborative planners.
- Tests: 3 new scanner tests.

## 1.2.0 - 2026-11-20

- **Works with any AI assistant**, not only Claude Code: tool-neutral wording across the skills; `scripts/bundle.mjs` builds a self-contained Markdown prompt per phase for chat-only assistants; `docs/using-with-other-ai-tools.md` and a root `AGENTS.md`.
- **Quality tooling**: automated tests (`node --test`) for the scanner, the docs validator and the bundler; `scripts/check-repo.mjs` (frontmatter, references, manifests, public-data hygiene); GitHub Actions CI.
- **Project docs**: `CONTRIBUTING.md`, `SECURITY.md`; READMEs restructured for public release.

## 1.1.1 - 2026-11-20

- Docs: bilingual README (`README.md` English, `README.vi.md` Vietnamese) with a status/known-limitations section.
- Fix (scanner): TypeORM entities with same-line decorators read as 0 fields; Django models at end of file were skipped (the `\Z` anchor does not exist in JS regex); added Remix / React Router v7 file routes; de-duplicated role-model list.
- Fix (design): the language rule now keeps section headings, table headers and enum values in English so the validator still passes when docs are written in Vietnamese.
- Add: namespaced skill names note for plugin installs; "Existing admin audit" step and template section (extend/audit mode).
- Example: marked illustrative evidence as invented.

## 1.1.0 - 2026-11-20

- **FE-first delivery mode**: build and approve the admin UI on a typed mock data layer before any backend, then build the backend to a frozen API contract.
  - New: `admin-module-builder/references/fe-first-mock-layer.md`, `admin-module-builder/templates/api-contract.md`, **Gate 2b (FE Preview)**.
  - New module status `prototype` (never counts as done); QA checklist §P.
  - Validator: `prototype` requires a spec and `api-contract.md`; `done` is rejected while Data source is `mock`; unfinished prototypes fail at final stage.
  - Orchestrator rule 6 now allows mock data only inside the labelled, production-blocked mock adapter.

## 1.0.0 - 2026-11-20

Initial release of the Enterprise Admin Architect skill suite.

- `enterprise-admin-architect` - orchestrator: principles, evidence tags, 3 approval gates, resume protocol.
- `admin-discovery` - project scanner (`scan-project.mjs`), domain map, module inventory (core / foundation / domain), 14 domain playbooks + custom-domain playbook, backend gap analysis.
- `admin-information-architecture` - sidebar/route/interaction design, RBAC permission model and matrix.
- `admin-design-system` - tokens, app shell, data table / form / detail / dashboard specs, stack adapters (Ant Design, shadcn/Tailwind, MUI, Mantine…), accessibility, responsive, Vietnamese locale rules.
- `admin-module-builder` - module spec, archetypes, RBAC implementation, backend contract, audit logging, security baseline.
- `admin-qa-gate` - docs validator (`validate-admin-docs.mjs`), quality gates, E2E/permission test playbook, QA report.
- `examples/e-commerce` - sample `docs/admin` output that passes the validator.
