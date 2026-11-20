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
