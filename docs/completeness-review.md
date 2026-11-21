# Completeness review (2026-11-21)

Why this exists: the owner kept discovering missing capabilities only after asking for them (a CMS, editable roles, a useful dashboard, a UI without bugs, a design system that is more than two accent colours). Fixing each one when pointed at proves nothing about the next. This review benchmarks the suite and its proving project against real products and standards, area by area, with evidence, and records what changed.

**Method.** Five independent reviewers (read-only) each took one area, studied named references (cited below) and checked every capability against the skill files and the proving project's docs and code, quoting `file:line`. Their reports are claims: the ones that changed the suite were spot-checked against the files first (the runbook's undecided cells, the static health route and the rating of "production readiness" in the coverage map were each confirmed by reading the file; the Vietnamese law change was confirmed against law-firm briefs). Items a reviewer could not verify are listed as such.

**Applied to the proving project (2026-11-21, later the same day).** After the review the items below were built in the proving project and verified on a stack the builder did not use: a first version of the design layer (its backend checks passed; **the owner then judged the editor itself poor on screen, see "Owner review of the built design editor" below**, so it is not counted as L2), per-route request ids, `/healthz` and `/readyz`, a migration ledger with a lock, a sign-in limiter that cannot lock out a real admin, the 12-character password policy, a masked audit timeline for roles without audit access, and the admin host headers. Rows marked **Built** below say so; each carries its measured evidence in the project's `qa-report.md` (Sessions 6 and 7). What is still **Not built** stays a finding.

**Reading the status columns.** *Skill* = what the suite now requires (Gate = a checkable item in `quality-gates.md`, Ref = a reference file says how, Option = named as a depth level in `capability-ladders.md`, none = not covered). *Project* = the proving project (the admin built with the suite): Built, Spec only, Not built. A gate that the proving project does not meet is a **finding**, not a pass: the coverage map no longer rates such rows Proven.

## What changed in the suite (v1.7.0)

| Change | Where |
|---|---|
| Depth ladders: every foundation family is shown to the owner at three levels and the choice is recorded | `admin-discovery/references/capability-ladders.md`, orchestrator and discovery `SKILL.md` |
| Expert benchmark pass before Gate 1 | `admin-discovery/SKILL.md` |
| Design system and brand control as a CMS layer | `admin-module-builder/references/design-system-cms.md` (catalogue, workbench editor, brand in one place), gates `DS-1..13`, `UX-19`, `UX-20` |
| Identity, sessions and hardening of the admin | `admin-module-builder/references/identity-and-sessions.md`, gates `SEC-13..20` |
| Privacy and data rights | `admin-module-builder/references/privacy-and-data-rights.md`, gates `PRIV-1..8` |
| Operations readiness | `admin-qa-gate/references/operations-readiness.md`, gates `OPS-1..10`, runbook template sections 5, 9, 10, 11, validator warnings at the final stage |
| Bulk actions, import and export jobs | `admin-module-builder/references/import-export-and-bulk.md`, gates `FN-15..17` (FN-7 corrected) |
| WCAG 2.2 items the suite had skipped | gate `A11Y-7` |
| "Promise equals delivery" and "level recorded" | gates `DOC-6`, `DOC-7` |
| Stale and contradictory text corrected | Vietnam's law (Law 91/2025/QH15 with Decree 356/2025/ND-CP replaced Decree 13/2023 on 2026-01-01); MFA "where planned" vs "required"; "images out of v1"; `ENG-8` "reversible" vs the runbook |

## Findings by area

### Owner review of the built design editor (2026-11-21, evening)

The first design layer passed every backend check and the UI audit (205 page states, 0 `must`), and the owner opened the page and rated it low. Every finding below was visible in one screenshot; none was visible to the checks, and the skill had no rule that would have prevented any of them. This is the same failure as the rest of this review (the gates tested the machinery, not what an operator sees), found by the person who uses it.

| Finding on the screen | Why the skill allowed it | Fix in the suite | Project |
|---|---|---|---|
| **"Brand" appeared twice**: a tab in the content module (name, description, accent colour) and another in the design module (logos). No way to guess which holds the colour | `site-content-cms.md` §5 and `design-system-cms.md` §5 each described part of brand; the IA skill said "one home per module", not per concept | `UX-19` one home per concept (concept ledger in the IA skill), `design-system-cms.md` §14 "brand is one place", `DS-13` | Merged: brand is the first tab of the Giao diện screen |
| **The cluster was grouped by module, not by task**: Content (with Publishing as a tab, though it publishes brand and design too), Brand and Design as sibling items, under a group named by listing them | the IA skill said \"one home per module\" and had no rule that a workflow spanning several editors is a screen of its own | IA skill: group by what the operator does (write, style, ship), a release screen of its own, a pending count on its nav item and a draft chip on each editor; `UX-19` extended; `design-system-cms.md` §14 is now \"one place\" | Rebuilt as the group Public app: Nội dung, Giao diện (brand and design as tabs, one preview), Xuất bản |
| **The catalogue was thin**: three status colours, a font, a scale, radius, shadow, density, motion, logos. No brand colour in the design module, no neutrals, no heading font, line height, borders, content width, component styles, theme presets | `capability-ladders.md` defined L2 as exactly that list | Catalogue checklist `design-system-cms.md` §12, ladder row rewritten, `DS-13` | Extended in slices; each slice states what the product's CSS can consume |
| **Edit and preview were apart**: the preview sat at the bottom of the page and showed only the saved draft, so a colour change needed Save and a scroll to be seen | `DS-7` required a preview in the real product and the build met it; nothing required it to be live or in view | `design-system-cms.md` §13 (workbench, resolve endpoint, representative screen), `DS-11` | Rebuilt as controls plus a sticky live preview |
| **Blind choices**: three text scales showed one identical sample, shadow had none, motion was two words | no rule that a sample must differ per option | `DS-12` | Rebuilt |
| **A permanent floating save bar** with disabled buttons and a heavy blue border over the content | `form-spec.md` asks for sticky actions, not for when they appear | §13 rule 5 | Rebuilt |
| **A native scrollbar on every tab row** (a 1 px underline outside a box with `overflow-x: auto`) | The audit browser hides scrollbars by default, so 205 states reported nothing | `UX-20`, `ui-audit.mjs` rules SCROLL-1/SCROLL-2 (browser launched with scrollbars visible), playbook pitfall | Fixed in the shared `Tabs`; verified on five pages at 1440 and 768 px |
| Test debris (a banner typed as `&amp;` by an e2e test) in the preview read as a product bug | no rule on test data hygiene | playbook pitfall, §13 rule 8 | To be cleaned and the test fixed |

### 1. Site content, design system and brand control
Sources: WordPress Site Editor and theme.json, Shopify theme settings, Webflow variables, Contentful, Sanity, Strapi, Directus, Payload, the W3C Design Tokens Community Group format, WCAG 2.2.

| Gap | Skill | Project |
|---|---|---|
| The design layer was "accent colours only; logos out of v1" | Ref + Gate (`design-system-cms.md`, DS-1..13) | A first version was built (status colours, font, scale, radius, shadow, density, motion, logos) and **rated thin by the owner**; being rebuilt, see the next section. Do not read "Built" here as L2 |
| One shared draft blocks a banner behind unfinished design work | Ref + Gate (per-surface publish and restore, DS-6) | Spec; implementation follows the module |
| Dark accent accepted at 3:1 for ordinary text (fails 1.4.3); status colour rule said 3 in one place and 4.5 in another | Ref + Gate (DS-2: choose the on-colour on the server, no lowered threshold) | Finding; fixed in the design module |
| No scheduled go-live or auto-end of a design or version | Ref + Gate (DS-6) | Not built |
| Assets can never be removed; no usage view; no re-encode | Ref + Gate (DS-4) | Spec; partly built |
| Token export had no named format version or round-trip test | Ref + Gate (DS-8) | Spec |
| Redirects, per-page SEO, sitemap, structured data, hreflang (website class) | Option (one paragraph in `site-content-cms.md` §7) | n/a for the SPA |
| Review link for non-admins, approvals, per-locale permission, dark derivation, version comparison | Option | Not built |
| A/B or staged rollout of a design | none (use feature flags) | Not built |

### 2. Identity, sessions and security of the admin
Sources: OWASP ASVS 4.0.3 and 5.0, OWASP cheat sheets (authentication, session, MFA, authorization), NIST SP 800-63B-4, Okta, Microsoft Entra (emergency access, access reviews), RFC 7644.

| Gap | Skill | Project |
|---|---|---|
| MFA optional in the skill, absent in the project, with `reveal_pii` and role editing behind one password | Gate SEC-13 (required, signed risk acceptance to defer) | Not built |
| Step-up only "when MFA is enabled" | Gate SEC-14 (password re-entry even without MFA) | Not built |
| Password policy: skill gave no numbers; project 8 characters and a 55-word list | Gate SEC-15 | **Built, partly**: 12-128, no composition rules, contextual and sequence checks, a 3,062-entry hand-written blocklist (counts, quality unverified, no breach check) |
| Lockout lets anyone lock the only Super Admin; limiter per IP only | Gate SEC-16 | **Built**: progressive delay per (account, address), per-address budget, audited unlock; per process, not tested on two instances; end-user lockout untouched |
| No own-session list or force sign-out although stored | Gate SEC-17 | Not built |
| Admin-issued temporary password lets the creator sign in first | Gate SEC-18 (invitation) | Not built |
| No CSP or headers delivered; runbook reference circular | Gate SEC-19 (check the deployed host) | **Built for the production build** (13/13 with the template); the real host is undecided, so not yet for the environment that matters |
| Runtime DB role can drop the audit trigger | Gate SEC-20 | Single role |
| Break-glass, access reviews, dormant accounts, offboarding | Ref + Gate SEC-18 | Not built |
| SSO/SCIM, two-person approval for privilege grants, IP signals, scoped API tokens | Option (L3) | Not built |

### 3. Audit, privacy and compliance
Sources: SOC 2 criteria (as summarised), ISO/IEC 27001:2022 Annex A (as summarised), NIST SP 800-92 (metadata only), GDPR articles, Vietnam's PDPL and Decree 356/2025, OWASP Logging cheat sheet, Apple and Google account-deletion requirements.

| Gap | Skill | Project |
|---|---|---|
| Privacy was one line with no gate; user deletion was a hard CASCADE; no delete-account route although the public app has accounts | Ref + Gates PRIV-1..3 | Not built |
| No consent record, no terms or privacy pages | Ref + Gate PRIV-4 | Not built |
| The skill cited Decree 13/2023, which was replaced on 2026-01-01 | Corrected, Gate PRIV-5 (last-reviewed date, no hard-coded deadlines) | n/a |
| Entity timelines return full audit rows (actor e-mail, IP, diff) to roles without audit access | Gate PRIV-6 | **Built**: allow-list projection on all three routes that return audit rows; the actor label is still stored with the e-mail |
| Append-only trigger overstated as protecting "every role"; no purge path, no legal hold | Ref + Gates SEC-20, PRIV-1/8, OPS-8 | Finding |
| Audit export and SIEM stream: permissions exist, no route | Ref (export), Option (stream) | Not built |
| Free-text PII in immutable audit rows; actor label includes the e-mail | Gate PRIV-6 | Finding |
| Reveal has no per-admin cap or alert | Gate PRIV-7 | Not built |
| Breach checklist, processing register, impact-assessment question | Ref + Gate PRIV-8, runbook §11 | Not built |

### 4. Operations, reliability and control of the running product
Sources: Google SRE book (production readiness, data integrity, incidents, postmortems), AWS Well-Architected reliability, Twelve-Factor, OpenTelemetry, OWASP API security, Unleash and LaunchDarkly practice, Sidekiq and Hangfire.

| Gap | Skill | Project |
|---|---|---|
| A runbook with undecided hosting, backup and monitoring still passed Gate 3 | Gate OPS-1 + validator warnings at the final stage | **Finding** (the validator now flags the real runbook) |
| Backup has no RPO/RTO and no restore drill | Gate OPS-2, runbook §5 | Undecided |
| Migrations re-run at every boot; no ledger or lock; a failure is swallowed and the process serves | Gate OPS-3, `ENG-8` corrected | **Built**: ledger, checksums, advisory lock, no serving on failure, adoption of an existing database; two-instance start tested on scratch databases |
| Health route returns a static "ok"; no System panel | Gate OPS-4 | **Built** (`/healthz`, `/readyz`); the System panel is not |
| Request id only on the admin API | Gate OPS-5 | **Built** on every route (header, error envelope, JSON request log, admin audit); other log lines untagged |
| No incident kit, no server-enforced maintenance or minimum-version mode | Gates OPS-6, OPS-7, runbook §10 | Not built |
| No retention for event tables; limits hard-coded; abuse tooling absent | Gates OPS-8, OPS-9 | Not built |
| Job state machine, scheduled tasks | Ref (§10) | Not built (no queue) |

### 5. Operator productivity, workflow and data tooling
Sources: Retool, Django admin and django-import-export, React-admin, Frappe/ERPNext, Zendesk, Carbon, Salesforce, Linear, WCAG 2.2, Nielsen's heuristics. A second, differently built admin (a restaurant site, front end only) was used as a data point.

| Gap | Skill | Project |
|---|---|---|
| Import was one table row and a mis-worded gate | Ref + Gate FN-16 (FN-7 corrected) | Not built |
| Bulk semantics under-specified and never exercised (marked N/A in every list) | Ref + Gate FN-15 | Not built |
| Export job UX; list export never built | Ref + Gate FN-17 | Not built |
| WCAG 2.2 AA claimed but drag-only ordering and sticky chrome prescribed | Gate A11Y-7 | Not audited |
| Notes on records and @mentions promised, not built | Option (L2 productivity) | Not built |
| Assignment, queues, act-and-advance keys, notification digests, maker-checker, merge, custom fields, scheduled actions, canned replies, print views, offline mid-form | Option (L3) | Not built |
| Admin localisation and time zone: the skill contradicted itself | Open: to be resolved in `accessibility-responsive.md` | Vietnamese only |

## Corrections to ratings

`docs/coverage-map.md` row 12 rated "request ids, runbook" as Proven. It is now Guidance with the gates above and a pointer here: the proving project has an admin-only request id, a static health route and an undecided runbook. The brand-accent contrast rating carries the 3:1 caveat. See that file for the current levels.

## Not verified by the reviewers

SOC 2 and ISO 27001 clause text (practitioner summaries only); NIST SP 800-92 content; statutory deadlines under the Vietnamese regime (law-firm summaries disagree on details such as when a breach clock starts); several vendor pages that could not be fetched (Directus, LaunchDarkly, Webflow help, Refine, Zendesk macros); whether a deployed database role owns the audit table (inferred from boot-time migrations); Wix and Framer were not studied.
