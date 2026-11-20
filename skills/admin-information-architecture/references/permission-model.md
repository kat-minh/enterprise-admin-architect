# Permission Model

Read when: defining roles, permission keys, the matrix, and enforcement points.

## Contents
- Principles
- Permission key grammar
- Standard verbs and domain verbs
- Role design
- Default role templates by domain
- Scope (own / team / all)
- Enforcement points (all four required)
- Sensitive operations
- Edge cases

---

## Principles

1. **Server is the authority.** UI visibility mirrors the server. Every API route / server action checks permission.
2. **Deny by default.** No permission ⇒ no access. New modules start with no grants except Super Admin.
3. **Permissions describe capabilities, roles bundle them.** Code checks permissions, never role names (`can('orders.refund')`, not `role === 'finance'`).
4. **Least privilege & separation of duties** for money, PII, security settings.
5. **Auditable.** Role/permission changes and denied sensitive attempts are logged.

## Permission key grammar

`<resource>.<action>` - lowercase, kebab or snake resource that matches the module ID (`audit-log.read`, `orders.refund`). Optional scope suffix in the matrix cell (`own`), not in the key.
Wildcards (`orders.*`) are allowed only in role definitions for convenience, expanded at check time; never in `can()` calls.

## Standard verbs

| Verb | Meaning |
|---|---|
| `read` | List and view details (hide from nav/route if absent) |
| `create` | Create new records |
| `update` | Edit records |
| `delete` | Soft delete / archive (hard delete is separate and rare: `purge`) |
| `export` | Download data (sensitive: bulk PII) |
| `import` | Bulk import |
| `manage` | Settings-like modules where CRUD is meaningless (`settings.manage`, `rbac.manage`) |

Domain verbs (examples): `publish`, `unpublish`, `approve`, `reject`, `refund`, `cancel`, `confirm`, `assign`, `impersonate`, `adjust` (stock/balance), `moderate`, `ban`, `verify`, `release`, `reveal_pii`, `purge`, `restore`.

Guideline: if two actions would plausibly be granted to different people, they are different permissions.

## Role design

- Derive from personas in `product-discovery.md` §8; typically 3-6 roles.
- **Super Admin**: all permissions incl. role management; seeded; ≥ 1 always exists.
- **Admin**: all operational modules, no role/system security management unless justified.
- Domain roles: capability bundles aligned to jobs (Content Editor, Support Agent, Finance, Operations/Fulfilment, Moderator, Analyst - read-only).
- **Viewer/Analyst**: read-only; `export` only if justified.
- Custom roles: only if the business needs it (editable role builder = P1+). Otherwise ship fixed roles defined in code/seed and keep the matrix document as the source.
- Avoid role explosion (> 8 usually signals missing permission granularity or per-person exceptions).

## Default role templates by domain

| Domain | Typical roles |
|---|---|
| E-commerce | Super Admin, Admin, Catalog Manager, Order/Fulfilment Staff, Support Agent, Finance, Marketing, Viewer |
| Travel/Booking | Super Admin, Admin, Product Manager (tours/pricing), Booking Agent, Finance, Content Editor |
| Education | Super Admin, Admin, Academic Manager, Instructor (own classes), Registrar/Admissions, Finance |
| Corporate/Agency | Super Admin, Content Editor, Sales/BD (leads), Viewer |
| News | Super Admin, Editor-in-Chief, Editor, Writer (own), Moderator, Analyst |
| SaaS | Super Admin, Support, Billing/Finance, Engineering/SRE, Customer Success (read + limited), Analyst |
| Healthcare | Super Admin, Practice Manager, Front Desk, Practitioner (own patients), Billing |

## Scope

Matrix cell values: `yes`, `no`, `own` (records created by / assigned to the user), `team` (same team/branch/tenant). Implement scope as a **query filter on the server** (`WHERE owner_id = :user`), not as a client filter. Support branch/location scoping if the business is multi-branch.

Field-level restrictions only when required (PII, salary, clinical): implement as dedicated permissions (`customers.reveal_pii`) with masking by default.

## Enforcement points (all four)

1. **Server API/actions**: central guard/middleware `requirePermission('orders.refund')` before business logic; returns 401 (unauthenticated) / 403 (forbidden).
2. **Route guard**: layout/middleware checks `module.read` and redirects to `/admin/403`.
3. **Navigation**: filter menu by permission set.
4. **Action controls**: `<Can permission="orders.refund">` hides/disables buttons; tooltips explain disabled actions where useful.

Tests must prove server enforcement: call the API as a user lacking the permission and expect 403 (see `admin-qa-gate`).

## Sensitive operations

Flag in the catalog (`Sensitive = yes`): money movement, refunds, price changes, PII reveal/export, role/permission changes, impersonation, secrets/integration keys, data deletion/purge, publishing to the public site, security settings. Requirements: confirmation step, audit entry (with reason where applicable), optional step-up auth (re-enter password/MFA), rate limits.

## Edge cases

- User holds multiple roles → union of permissions (document if any "deny" semantics exist; prefer none).
- Permission removed while session active → effective next request.
- Deactivating a user revokes sessions immediately.
- A user cannot escalate their own privileges or edit their own role.
- Seeded roles are protected from deletion; renaming allowed, permission removal from Super Admin forbidden.
- External SSO/IdP: map IdP groups to roles explicitly.
