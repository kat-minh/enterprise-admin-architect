# Product Discovery

> Project: <name> · Date: <YYYY-MM-DD> · Phase: Discovery · Author: <agent or person>
> Evidence rule: every claim cites a file, route, table or observed behaviour.

## 1. Product overview
<What the product is, who uses it, business model, 5-8 lines.>

## 2. Existing technical architecture
| Area | Finding | Evidence |
|---|---|---|
| Framework / runtime | | |
| Language / strictness | | |
| UI kit / styling | | |
| Forms / tables / data fetching / state | | |
| Auth & sessions | | |
| Authorization model (roles?) | | |
| Database / ORM | | |
| API style (REST/RPC/server actions/GraphQL) | | |
| File storage / uploads | | |
| Payments / email / SMS / other integrations | | |
| i18n / locales / timezone / currency | | |
| Existing admin code | | |
| Tests / CI | | |

**Reuse decision:** <what the admin will reuse as-is; what is new and why>

## 3. Public site map & user journeys
| Journey | Pages / routes | Data touched | Evidence |
|---|---|---|---|

## 4. Feature Ledger
| Feature | Data / entities | Who manages it today | Lifecycle / status | Approval? | Side effects | History needed? | Owner module | Evidence |
|---|---|---|---|---|---|---|---|---|

`Owner module` is a module ID from `module-inventory.md`, or `excluded: <reason>`. A blank cell means the feature has no owner yet (the validator warns).

## 5. Existing API capabilities
| Resource | Endpoints | List params (page/filter/sort) | Authz | Notes |
|---|---|---|---|---|

## 6. Backend gaps
| # | Needed by module | Missing capability | Status (exists/partial/missing) | Resolution (implement/document) | Effort |
|---|---|---|---|---|---|

## 7. Potential administrative workflows
1. <Workflow name> - actor · trigger · steps · systems touched · exceptions
2. 

## 8. Operators
| Persona | Responsibilities | Frequency | Sensitive powers |
|---|---|---|---|

## 9. Assumptions
- **Delivery mode:** full-stack | fe-first (UI approved on mock layer before backend) - decided at Gate 1 on <YYYY-MM-DD>
- <explicit assumptions made while information was missing>

## 10. Open questions
| # | Question | Why it matters | Recommended default |
|---|---|---|---|

## 11. Existing admin audit
Fill only if an admin already exists (otherwise write `N/A - no existing admin`).

| Existing route / module | Maps to module ID | Verdict (keep / extend / replace) | Gaps (authz, pagination, audit, UX, data) | Evidence |
|---|---|---|---|---|

## 12. Owner intake
The answers to the five closed questions of SKILL step 3b. Every answer maps to a module ID, a Feature Ledger row, or an `Excluded` row with the owner's reason.

| # | Question | Owner's answer | Maps to (module ID / ledger row / excluded: reason) |
|---|---|---|---|
| 1 | What do you ask a developer to change today (texts, banners, prices, translations, emails, switches, data fixes)? | | |
| 2 | What do you wish you could see or do every day without a developer? | | |
| 3 | What support requests arrive from users, and how are they handled? | | |
| 4 | What must be undoable, approved or auditable? | | |
| 5 | Who operates the admin, and who must not see personal data? | | |

## 13. Content & configuration inventory
Everything the end user sees or the business relies on that is edited in code, config or the database console today. Class: **CMS** (the business should change it from the admin) · **code** (behaviour, layout, schema) · **build-time** (needs a build, e.g. installed-app name and icons). Guidance: `admin-discovery/references/site-content-and-config.md`. Write `N/A - <reason>` in rows that do not apply; do not delete them.

| Surface | Where it lives (file / DB / env) | Who changes it today | How often | Class | Admin control (yes / later / no + reason) | Module ID | Evidence |
|---|---|---|---|---|---|---|---|
| UI strings and translations | | | | | | | |
| Branding: name, logo, theme, manifest | | | | | | | |
| Legal pages (terms, privacy) | | | | | | | |
| SEO defaults and redirects | | | | | | | |
| Email / SMS / push copy | | | | | | | |
| Pricing and plan constants | | | | | | | |
| Banners and announcements | | | | | | | |
| Feature toggles and env switches | | | | | | | |
| Seed or sample content in the product | | | | | | | |
| Metrics the owner watches: where the data lives (DB / analytics SDK / missing) | | | | | | | |
