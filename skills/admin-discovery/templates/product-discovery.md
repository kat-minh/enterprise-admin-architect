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
| Feature | Data / entities | Who manages it today | Lifecycle / status | Approval? | Side effects | History needed? | Evidence |
|---|---|---|---|---|---|---|---|

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
