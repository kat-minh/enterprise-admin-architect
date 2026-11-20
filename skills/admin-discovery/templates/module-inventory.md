# Module Inventory

> Project: <name> · Date: <YYYY-MM-DD>
> This table is machine-checked by `admin-qa-gate/scripts/validate-admin-docs.mjs`. Keep the header and allowed values exactly.

**Layer:** `core` | `foundation` | `domain`
**Evidence:** `confirmed` | `implied` | `proposed`
**Priority:** `P0` | `P1` | `P2`
**Status:** `proposed` | `planned` | `in-progress` | `prototype` | `done` | `blocked` | `dropped` | `exists`
(`prototype` = UI finished on the mock data layer in `fe-first` mode, backend pending; never counts as done)

| ID | Module | Layer | Evidence | Priority | Source / Justification | Depends on | Status |
|----|--------|-------|----------|----------|------------------------|------------|--------|
| auth | Authentication & Sessions | core | confirmed | P0 | `src/auth.ts` - login already exists for customers; admin login needed | - | planned |
| rbac | Roles & Permissions | core | implied | P0 | Multiple operator personas (see product-discovery §8) | auth | planned |
| dashboard | Dashboard | core | implied | P0 | Operators need pending-work queues | auth, rbac | planned |
| admin-users | Admin Accounts | core | implied | P0 | Internal staff must be managed separately from customers | auth, rbac | planned |
| audit-log | Audit Log | core | implied | P0 | Sensitive operations need traceability | auth | planned |
| settings | System Settings | core | confirmed | P1 | `SiteConfig` table | rbac | planned |
| my-account | My Account & Security | core | implied | P1 | Password/MFA/sessions for admins | auth | planned |

## Business purpose per module
| ID | Business purpose | Primary entities | Key workflows |
|----|------------------|------------------|---------------|

## Excluded / deferred (and why)
| Candidate module | Decision | Reason |
|---|---|---|
| Multi-tenant admin | excluded | Single-tenant product; no tenant column in schema |

## Assumptions & approvals
- <date> - <module> approved by user at Gate 1
