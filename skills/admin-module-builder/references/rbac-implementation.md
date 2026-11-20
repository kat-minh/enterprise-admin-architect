# RBAC Implementation Patterns

Read when: building permission infrastructure (foundation step) or guarding a new module. Adapt to the project's stack - TypeScript shown; the pattern is language-agnostic.

## Contents
- Data model
- Permission constants
- Core `can` function
- Server enforcement (route handlers, server actions, GraphQL/tRPC)
- Route guard and navigation
- UI gating
- Scope filters
- Sessions, caching, MFA step-up
- Seeding and bootstrapping
- Tests that prove enforcement
- Editable roles (only when asked for)

---

## Data model

```
admin_users(id, email, name, status, password_hash?/idp_subject, mfa_enabled, last_login_at, created_at, ...)
roles(id, key unique, name, description, is_system, created_at)
permissions(key primary)                       -- optional table; may live only in code
role_permissions(role_id, permission_key, scope)   -- scope: all | own | team
admin_user_roles(admin_user_id, role_id)
sessions(id, admin_user_id, ip, user_agent, created_at, expires_at, revoked_at)
```
Smaller sites: roles defined in code (`ROLE_PERMISSIONS` map) + `admin_users.role`. Choose DB-driven roles only if the business must edit roles at runtime. Keep **admin identities separate from public customers** (separate table or explicit `kind`/role claim).

## Permission constants (single source of truth)

```ts
// lib/permissions/catalog.ts
export const PERMISSIONS = {
  'orders.read': { module: 'orders', sensitive: false },
  'orders.update': { module: 'orders', sensitive: false },
  'orders.refund': { module: 'orders', sensitive: true },
  'rbac.manage': { module: 'rbac', sensitive: true },
} as const;
export type Permission = keyof typeof PERMISSIONS;

export const ROLE_PERMISSIONS: Record<string, readonly (Permission | '*')[]> = {
  super_admin: ['*'],
  support: ['orders.read', 'orders.update'],
};
```
Keep this file aligned with `docs/admin/permission-matrix.md` (matrix is the spec; code must match; QA validates).

## Core `can` function

```ts
export type Grant = { permission: string; scope: 'all' | 'own' | 'team' };
export function can(grants: Grant[], permission: Permission, ctx?: { ownerId?: string; userId?: string }) {
  const g = grants.find((x) => x.permission === permission || x.permission === '*');
  if (!g) return false;
  if (g.scope === 'all' || !ctx) return true;
  if (g.scope === 'own') return ctx.ownerId === ctx.userId;
  return true; // 'team': enforce in the query filter too
}
```
Check **permissions, never role names**.

## Server enforcement

Central guard used by every handler/action:

```ts
// lib/auth/guard.ts
export async function requirePermission(permission: Permission) {
  const session = await getAdminSession();            // verifies cookie/JWT, loads admin user + grants
  if (!session) throw new HttpError(401, 'unauthenticated');
  if (!can(session.grants, permission)) {
    await audit.denied(session, permission);          // log denied attempts for sensitive permissions
    throw new HttpError(403, 'forbidden');
  }
  return session;
}

// app/api/admin/orders/[id]/refund/route.ts
export async function POST(req: Request, { params }: Ctx) {
  const session = await requirePermission('orders.refund');
  const body = refundSchema.parse(await req.json());   // validate input (zod)
  return json(await refundOrder(session, (await params).id, body));
}
```
- Server actions: call `requirePermission` first line; return typed errors.
- tRPC/GraphQL: middleware/directive wrapping procedures/resolvers (`adminProcedure.use(requirePermissionMw('orders.read'))`).
- External backend: the API itself must enforce; the admin frontend/BFF must forward identity and never use a shared super-token for all operators.
- Also check **resource-level** conditions inside services (is this record in the user's scope/branch/tenant?).

## Route guard and navigation

- Middleware/proxy: coarse check - is there an admin session? else redirect to `/admin/login?next=…`.
- Page/data layer: `requirePermission('<module>.read')` → on failure render/redirect `/admin/403`. (Layout-only checks are insufficient in frameworks that don't re-run layouts on navigation.)
- Navigation config carries `permission`; the sidebar filters items by the user's grants; hide empty groups.

## UI gating

```tsx
<PermissionGate permission="orders.refund" fallback={<DisabledWithTooltip reason="Requires refund permission" />}>
  <Button onClick={openRefund}>Refund</Button>
</PermissionGate>
```
Expose a `usePermissions()` hook fed from the session (server-provided). UI gating improves UX only.

## Scope filters

Apply in the query layer: `where: scope === 'own' ? { ownerId: userId } : {}`. Put scope resolution in one helper (`scopedWhere(session, 'articles.update')`) so list, detail, update and export all use it. Test cross-user access (IDOR).

## Sessions, caching, MFA step-up

- Session cookie: `HttpOnly`, `Secure`, `SameSite=Lax/Strict`, short idle timeout, absolute lifetime; rotate on login/privilege change; revoke on deactivation/password change.
- Grants are read per request (or cached with a short TTL ≤ 60s + explicit invalidation on role change). A permission change takes effect on the next request.
- Step-up (re-auth/MFA) before sensitive actions (`sensitive: true`) when MFA is enabled.

## Seeding and bootstrapping

- Seed system roles and the first Super Admin via a script/CLI using an env-provided one-time password (never hard-coded credentials; force change at first login).
- Invariant checks in the service: cannot remove/deactivate the last Super Admin; cannot edit own role; cannot grant permissions you don't hold.
- Migrations add permission keys idempotently; Super Admin automatically has `*`.

## Tests that prove enforcement

For each module (see `admin-qa-gate/references/e2e-test-playbook.md`):
1. Unauthenticated request → 401.
2. Authenticated without permission → **403 from the API** (not just hidden UI).
3. With permission → success; with `own` scope → only own records, another user's record → 403/404.
4. Role change takes effect immediately; deactivated user's session fails.
5. Matrix test: iterate the role × permission matrix doc against live endpoints.

## Editable roles (when the business must change permissions at runtime)

Only build this when the owner asked for it ("why can't the admin change permissions?"); otherwise roles in code are simpler and safer. The design that held up in a real build:

- **The catalog of permissions stays in code** (keys, descriptions, sensitive flag, allowed scopes, grantable flag). **Roles and their grants are data** (`roles`, `role_permissions`). A migration adds new catalog keys; the UI cannot invent one.
- **One locked system role** (Super Admin): always the whole catalog, no rows in the grants table, cannot be edited, reset or deleted. Built-in roles are editable and **resettable** to their shipped matrix, never deletable. Custom roles are created, renamed, edited and deleted (not while any admin, active or not, holds the role).
- **Non-grantable permissions**: the ones that manage roles and admin accounts are reserved to the system role. Without this rule a custom role could grant itself `roles.manage` or create a Super Admin. Enforce it on create, on update and when copying a role (copying silently skips them); drop such grants when the permission map is built, so editing the table by hand cannot escalate either.
- **Nobody edits the role they hold, and nobody grants what they do not hold** (same scope or wider). State which rule fires first; some are unreachable over HTTP today and still need a test through the service.
- **Every change is audited with a reason and the whole before/after map** (and the number of admins affected), in the same transaction. A no-op save writes nothing. Creating a role is capped (e.g. 20) and serialised, so parallel creates cannot overshoot.
- **Optimistic concurrency**: the edit carries the role's `updated_at` from the read; a stale value is `409` with the current role, and the UI reloads it. Without it, edits are serialised by a row lock and the audit rows still form an unbroken chain.
- **Propagation**: the permission snapshot is cached per process for a few seconds (≤ 5 s); say the number in the UI ("takes effect within a few seconds"), the runbook and the tests, and measure it. Fail safe: if the tables cannot be read, fall back to the shipped matrix for built-in roles, deny for custom ones.
- **The UI**: a matrix with a column per role; "Edit permissions" turns one column into checkboxes (locks for reserved rows, a scope select only where a permission has scopes); a bar shows the count of changes; saving opens a review dialog listing every addition, removal and scope change, the sensitive ones marked, the number of affected admins, and a required reason. The role's own card says why it cannot be edited when it is the viewer's role.
- **Role names are data too**: show the stored name everywhere a role is shown (badges, filters, audit rows). Keep localised labels for built-in roles only while the stored name is still the shipped one.
- **Tests**: a fresh database equals the documented matrix; a custom role gets exactly its permissions and a revoked one is refused within the propagation window; reserved permissions are refused through the API; a role held by an admin cannot be deleted; two editors on one role give a `409`; the system role refuses every write; the audit rows carry reasons.
