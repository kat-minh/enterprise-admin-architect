# Implementation Status

> Project: Fixture Shop (example) · Last updated: 2026-11-20 · Current session: 3 Build & QA
> `Status` of each module lives in `module-inventory.md`. This file records verification evidence.
> **Illustrative example:** the tests, commands and results below are invented to show the format; nothing was actually run.

## Module verification
`Verified`: `yes` · `partial` · `no`

| Module ID | Verified | Evidence | Backend | Known gaps |
|-----------|----------|----------|---------|------------|
| auth | yes | Playwright `admin-auth.spec.ts` (login, logout, expired session); API 401 check; brute-force rate limit manual test | implemented | MFA planned P1 |
| orders | no | spec approved; list endpoint in progress | partial | transitions, refund endpoints missing |

## Backend status
`Data source`: `api` (real backend) · `mock` (fe-first prototype adapter; module must be `prototype`, never `done`)

| Module ID | Data source | Endpoints implemented | Endpoints missing | Owner (repo/external) |
|---|---|---|---|---|
| auth | api | login, logout, session | MFA | repo |
| orders | api | detail (partial) | list, transitions, refund | repo |

## Dependencies added
| Package | Version | Reason | Module |
|---|---|---|---|
| otplib | 12.x | TOTP for MFA (planned) | auth |

## Checks last run
| Check | Command | Result | Date |
|---|---|---|---|
| Typecheck | `npx tsc --noEmit` | pass | 2026-11-20 |
| Lint | `npm run lint` | pass | 2026-11-20 |
| Build | `npm run build` | pass | 2026-11-20 |
| E2E | `npx playwright test admin-auth` | pass | 2026-11-20 |
| Docs validator | `node validate-admin-docs.mjs --stage build` | pass | 2026-11-20 |

## Session log
- 2026-11-20 - Foundation shell + auth done; started orders list endpoint.

## Next steps
1. Finish orders list endpoint and page; then transitions.

## Remaining work & limitations
- Role editor UI, MFA, notifications, reviews.
