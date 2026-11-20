# QA Report

> Project: <name> · Date: <YYYY-MM-DD> · Environment: <dev/staging, commit SHA> · Tester: Claude (+ user review)

## Summary
**Verdict:** pass | pass with conditions | fail
- Modules in scope: <n> · verified: <n> · partial: <n> · not verified: <n>
- Blockers: <n> · Majors: <n> · Minors: <n>
- <2-4 line plain-language summary, including the most important risks>

## Checks run
| Check | Command / method | Result | Notes |
|---|---|---|---|
| Docs validator | `node validate-admin-docs.mjs --stage final` | | |
| Typecheck | | | |
| Lint | | | |
| Build | | | |
| Unit / API tests | | | |
| E2E | | | |
| Permission matrix (API) | | | roles × probes |
| Public-site regression | | | |
| Responsive / a11y | | | widths, tools |
| Large dataset | | | rows, timings |

## Module results
| Module ID | Workflow | Permissions (API+UI) | States | URL/server-side table | Audit | Responsive/A11y | Verdict |
|---|---|---|---|---|---|---|---|

## Defects
| ID | Severity | Module | Description | Status (open/fixed/accepted) | Fix / owner |
|---|---|---|---|---|---|

## Permission test results
| Role | Probes run | Unexpected allows | Unexpected denies | Notes |
|---|---|---|---|---|

## Not verified (be explicit)
- <what could not be run or checked, and why>

## Known limitations
- <…>

## Missing backend requirements
- <…>

## Remaining work
1. <…>

## How to run & log in (dev)
- Start: `<command>` · Seed: `<command>` · Accounts: `<role>@test.local` (password from `E2E_PASSWORD`)

## Sign-off
- [ ] User reviewed Gate 3
