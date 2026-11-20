# Module: Authentication & Sessions (`auth`)

> Archetype: settings (security flow)
> Layer/Evidence/Priority: core / confirmed / P0
> Status: implemented · Last updated: 2026-11-20
> Example of a compact spec: sections that do not apply say `N/A - reason`.

## Definition
- **Business purpose:** Let staff sign in to the admin securely with sessions separate from customer accounts.
- **Navigation location:** `/admin/login`, `/admin/forgot-password`, user menu › Sign out
- **Primary entities:** AdminUser, Session
- **Related entities:** Role (see `rbac`)
- **Depends on modules:** none
- **Operators / roles:** all staff

## Permissions
N/A - public entry module. Authenticated access is enforced by the session guard; authorization lives in `rbac` (`dashboard.read` etc.).

## API dependencies
| Capability | Endpoint | Exists? | Notes |
|---|---|---|---|
| Login | `POST /api/admin/auth/login` | yes | rate-limited per account + IP |
| Logout | `POST /api/admin/auth/logout` | yes | revokes session |
| Session | `GET /api/admin/auth/session` | yes | returns user + grants |
| Reset password | `POST /api/admin/auth/reset` | yes | single-use hashed token |

Backend work required: none (MFA planned P1).

## List page
N/A - no list.

## Create / Edit
Login form: email, password. Validation: required, email format. Generic error message for bad credentials; success redirects to `next` (relative URLs only).

## Detail page
N/A - no entity detail.

## Business rules
- **Lifecycle & transitions:** session created → active → expired/revoked.
- **Constraints:** idle timeout 30 minutes, absolute 12 hours; session rotated on login; cookie `HttpOnly`, `Secure`, `SameSite=Lax`.
- **Dependencies & deletion restrictions:** deactivating an admin revokes sessions immediately.
- **Approval requirements:** none.
- **Data integrity rules:** password hashed with Argon2id; failed attempts counted per account and IP.

## Audit events
| Action key | When | Logged data | Sensitive? |
|---|---|---|---|
| `auth.login` | successful login | IP, user agent | no |
| `auth.login_failed` | failed login | account (if exists), IP | yes |
| `auth.logout` | logout | - | no |

## Edge cases
| Case | Expected behaviour |
|---|---|
| No data | N/A |
| Invalid data | Generic "Invalid email or password" |
| Duplicate records | N/A |
| Missing relationships | Admin without role sees 403 page after login |
| Unauthorized (UI + API) | Unauthenticated API calls return 401 |
| API failure / timeout | Inline error, form input preserved |
| Concurrent modification | N/A |
| Large dataset | N/A |

## Test scenarios
| # | Scenario | Type | Expected |
|---|---|---|---|
| 1 | Wrong password 6 times | api | 429 after limit |
| 2 | Expired session on API call | api | 401, UI redirects to login with return URL |
| 3 | Customer account used on admin login | api | rejected |
