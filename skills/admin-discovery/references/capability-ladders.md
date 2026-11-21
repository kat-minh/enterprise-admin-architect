# Capability Ladders: choose the depth, do not guess it

Read when: building the module inventory (Gate 1), writing a module specification, or when an owner says "I thought it would also do X". The recurring failure of AI-built admins is not a bug: it is a **silently chosen shallow level**. A "site design" module that edits two accent colours, a "security" module with a password and no second factor, a "privacy" module that is one line. Each looks finished and each fails the first time the owner asks for the obvious next thing. This file makes the level an explicit decision.

## Contents
1. The rule
2. The ladders
3. What to write down
4. Defaults

## 1. The rule

For **every foundation capability family** in scope, `module-inventory.md` records the **chosen level** (L1, L2 or L3) and, in one line, **what the next level up would add and why it is not built**. At Gate 1 the owner sees the ladder as a short table (family, the three levels in plain words, the recommended level, the cost of each) and chooses. If the owner does not choose, the recommendation is L2 and it is written as a **recommended default awaiting confirmation**, never as the owner's decision. A module may be marked `done` only at the level it claims; the QA report states the level next to the evidence.

Levels: **L1 Basic** (works, low risk, owner-operated), **L2 Standard** (what a professional small-to-mid team expects, usually the right default), **L3 Enterprise** (multi-team, regulated or large; build when the owner names the need).

## 2. The ladders

| Family | L1 Basic | L2 Standard (default) | L3 Enterprise |
|---|---|---|---|
| **Site content** | Texts and banners; draft, preview, publish, history, rollback | + pages, menus, SEO fields, redirects, a media library with usage view, scheduled go-live and auto-end, publish or roll back by surface | + approvals (four-eyes), per-locale permissions, translation workflow, review links for outsiders, outbound webhooks |
| **Site design** (`design-system-cms.md`) | Brand name, logo and brand colour (in one place) | + every family of the catalogue the product can consume (`design-system-cms.md` §12): theme presets, brand colour with a server-derived family, neutral ramps, status colours, heading and body fonts, text scale and line height, radius, borders, elevation, density, content width, component variants the CSS supports, motion; favicon and share image; guardrails (contrast, locks); an editor that is a workbench with a live preview of unsaved edits (§13); export and import | + scoped themes per section, multi-brand, semantic aliasing with dark derivation, design approvals, staged rollout |
| **Identity and access** (`identity-and-sessions.md`) | Password policy, session limits, roles | + MFA for sensitive roles, step-up, session list and revoke, invitation flow, lockout without self-DoS, security headers, two Super Admins | + SSO and SCIM, access reviews, break-glass drills, two-person approval for privileges, IP signals, scoped API tokens |
| **Audit, privacy and compliance** (`privacy-and-data-rights.md`) | Audit log, masking, reveal with a reason | + data map and retention jobs, data-subject requests and account deletion, consent and legal pages, audit export, breach checklist, jurisdiction table | + tamper evidence and off-box copy, SIEM streaming, legal hold, processing register and impact assessments |
| **Operations** (`operations-readiness.md`) | Runbook, health route | + restore-drilled backups with RPO and RTO, migration safety, readiness and a System panel, observability and alerts, incident kit, maintenance mode, retention of event tables | + job dashboards, abuse tooling, status page, SLOs and error budgets |
| **Operator productivity** (`import-export-and-bulk.md`) | Server-side tables, filters, sort, CSV export | + bulk actions with per-item results, import with dry run, export jobs, notes on records, saved views, command menu | + assignment and queues, maker-checker approvals, merge, custom fields, scheduled actions, notification digests |
| **UI quality** (`admin-design-system/references/anti-slop-design.md`) | Tokens, shared components, accessibility audit | + design brief approved at Gate 2, consistency metrics in the audit, overlay audit, WCAG 2.2 criteria, performance budget | + vision review of screenshots against a rubric, usability test with real operators |
| **Dashboard and analytics** | Totals and a list | + metric catalogue, comparison, definitions, role views, independent oracle test | + saved reports, scheduled digests, anomaly alerts |

The ladders are starting points: adapt the words to the product, add a family the product needs (billing, messaging, integrations), and drop one it does not.

## 3. What to write down

In `module-inventory.md`, one extra line under each foundation module (or a `Level` column):
`site-design: L2. L3 adds scoped themes and approvals; not built: one brand, no separate designer role.`
In the module spec's Definition, the same sentence. In `qa-report.md`, the level the evidence supports. A capability that the ladder shows and the owner did not pick must appear in "Next steps" with the reason, so a later request is a known step up, not a surprise.

## 4. Defaults

- **L2** for foundation families the owner touches daily (content, design, identity, privacy, operations, productivity).
- **L1** only when the owner says the area is out of scope for now; record who said so and when.
- **L3** items that carry a hard dependency (SSO needs an identity provider, SIEM streaming needs a SIEM) are asked as questions, not assumed.
- Never lower a level to finish faster. If time is short, finish L2 for fewer modules rather than L1 for all.
