# Implementation Status

> Project: <name> · Last updated: <YYYY-MM-DD> · Current session: 1 Discovery | 2 Design | 3 Build & QA
> `Status` of each module lives in `module-inventory.md` (single source). This file records **verification evidence**.
> Rule: a module may be `done` in the inventory only with `Verified = yes` and non-empty Evidence here. Machine-checked.

## Module verification
`Verified`: `yes` (workflow exercised, evidence recorded) · `partial` · `no`

| Module ID | Verified | Evidence | Backend | Known gaps |
|-----------|----------|----------|---------|------------|
| auth | no | - | partial | not started |

## Backend status
`Data source`: `api` (real backend) · `mock` (fe-first prototype adapter; module must be `prototype`, never `done`)

| Module ID | Data source | Endpoints implemented | Endpoints missing | Owner (repo/external) |
|---|---|---|---|---|

## Dependencies added
| Package | Version | Reason | Module |
|---|---|---|---|

## Checks last run
| Check | Command | Result | Date |
|---|---|---|---|
| Typecheck | | | |
| Lint | | | |
| Build | | | |
| Unit/API tests | | | |
| E2E | | | |
| Docs validator | `node <skills-dir>/admin-qa-gate/scripts/validate-admin-docs.mjs --stage build` | | |

## FE-first tracking (only if delivery mode = fe-first)
- Gate 2b (FE Preview): pending | approved on <YYYY-MM-DD> · API contract: v0 | v1 frozen
- Modules still on mock: <ids> · Environment guard verified: yes/no · Mock excluded from production bundle: yes/no

## Session log
- <date> - <what was done, decisions, blockers>

## Next steps
1. <next module / task>

## Remaining work & limitations
- <honest list>
