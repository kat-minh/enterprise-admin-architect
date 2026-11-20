# Permission Matrix

> Project: <name> · Date: <YYYY-MM-DD>
> Permission keys are `resource.action` (lowercase). **Enforced on the server**; the UI only mirrors them.
> Tables are machine-checked: keep headers; `Module ID` must exist in module-inventory.md.

## 1. Roles
| Role key | Name | Who | Notes |
|---|---|---|---|
| super_admin | Super Admin | Owner/CTO | Full access; cannot be removed if last; bypasses nothing in audit |
| admin | Admin | Operations lead | All operational modules; no role management |

## 2. Permission catalog
| Permission | Module ID | Description | Sensitive |
|---|---|---|---|
| dashboard.read | dashboard | View dashboard | no |
| admin-users.read | admin-users | View admin accounts | no |
| admin-users.create | admin-users | Invite admin accounts | yes |
| rbac.manage | rbac | Manage roles & permissions | yes |
| audit-log.read | audit-log | View audit log | yes |
| settings.manage | settings | Change system settings | yes |

## 3. Role × Permission matrix
Cell values: `yes` · `no` · `own` (only records the user owns) · `team`.

| Permission | super_admin | admin |
|---|---|---|
| dashboard.read | yes | yes |
| admin-users.read | yes | yes |
| admin-users.create | yes | no |
| rbac.manage | yes | no |
| audit-log.read | yes | yes |
| settings.manage | yes | no |

## 4. Rules
- Super Admin is seeded; the last Super Admin cannot be deactivated, demoted or deleted.
- A user cannot grant permissions they do not hold.
- Permission changes take effect on next request (no long-lived cached grants) and are audit-logged.
- Sensitive permissions require MFA when MFA is enabled.
- Separation of duties: <e.g. `adjustments.create` ≠ `adjustments.approve`>.

## 5. Navigation visibility
A nav item/route is visible iff the role has `<module>.read` (or the module's listed entry permission).
