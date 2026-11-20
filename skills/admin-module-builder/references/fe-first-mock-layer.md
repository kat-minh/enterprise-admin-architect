# FE-first Mode: Mock Data Layer & Preview Gate

Read when: the user wants to **see and approve the admin UI before any backend is built** (`delivery mode = fe-first`), or the backend for P0 modules is mostly missing/external.

## Contents
- Principle
- Flow and gates
- Architecture (one UI, two data sources)
- Contract-first
- What the mock must emulate
- Fixtures
- Prototype affordances
- Permissions in a prototype
- Environment guard (never in production)
- Gate 2b - FE Preview protocol
- Backend phase: swapping mock → real
- Pitfalls

---

## Principle

FE-first is **not** "throw-away mockups". It is the *real* admin UI, built once, talking to a **typed service layer** whose first implementation is an in-memory mock and whose second implementation is the real API. Swapping is a one-line change per module, so no UI work is lost. The price of this speed is discipline: mock data is allowed **only** inside the mock adapter, it is always labelled, it follows the contract, and it can never reach production.

The "never fake" rule is not relaxed: a module backed by mock is `prototype`, **not** `done`.

## Flow and gates

| Step | What happens | Output |
|---|---|---|
| Gate 1 | Modules, roles, IA approved (as usual). Delivery mode = `fe-first` recorded in `product-discovery.md` §9 | |
| Session 2 | Tokens, shell, shared components, reference module (on mock) | `design-system.md` |
| Session 3a - FE build | Per module: spec → **contract** → mock adapter + fixtures → UI | modules `prototype`, `api-contract.md` v0 |
| **Gate 2b - FE Preview** | User clicks through the whole admin (role switcher, state toggles), requests changes; iterate | **Contract frozen v1** |
| Session 3b - BE build | Implement endpoints, DB, authz, audit **to the frozen contract**; swap mock → api per module | modules `done` after QA |
| Gate 3 | QA report (permission tests against the real API, etc.) | `qa-report.md` |

Changing the contract after Gate 2b is allowed but versioned: update `api-contract.md`, the zod schemas, the mock, and tell the user what moved.

## Architecture (one UI, two data sources)

```
src/features/admin/orders/
  schemas/order.schema.ts        # zod schemas = the contract in code (shared by mock, real client, server)
  services/orders.service.ts     # interface OrdersService + getOrdersService() factory
  services/orders.api.ts         # real implementation (fetch/axios/server action)
  services/orders.mock.ts        # mock implementation (in-memory store + fixtures)
  components/ hooks/ types/
src/lib/api/data-source.ts       # the single switch + production guard
src/lib/api/mock/{store,latency,errors,scenarios}.ts
```

```ts
// services/orders.service.ts - the contract surface the UI depends on
export interface OrdersService {
  list(p: ListParams): Promise<Paginated<Order>>;
  get(id: string): Promise<Order>;
  transition(id: string, input: TransitionInput): Promise<Order>; // explicit transitions, not free PATCH
  refund(id: string, input: RefundInput): Promise<Order>;
}

// lib/api/data-source.ts
const source = process.env.NEXT_PUBLIC_ADMIN_DATA_SOURCE ?? 'api';        // 'mock' | 'api'
const appEnv = process.env.NEXT_PUBLIC_APP_ENV ?? 'development';          // development | preview | production
if (source === 'mock' && appEnv === 'production') {
  throw new Error('Admin mock data source is not allowed in production');
}
export const isMock = source === 'mock';

// services/index.ts
export async function getOrdersService(): Promise<OrdersService> {
  return isMock ? (await import('./orders.mock')).ordersMock : (await import('./orders.api')).ordersApi;
}
```
UI code (components/hooks) imports only the interface/factory. Do not branch on `isMock` inside components except for the prototype banner/affordances. Use the project's data-fetching layer (TanStack Query etc.) on top of the service, exactly as it will be with the real API.

## Contract-first

For every module, before the UI: write the endpoint contract into `docs/admin/api-contract.md` (template: `templates/api-contract.md`) and the zod schemas. The mock and the future backend both implement it. Include: route, method, auth/permission, query params, request/response bodies, error codes, side effects, idempotency/concurrency notes. The contract is what the backend work will be built from, so be complete: the UI needs reveal fields, filters and transitions that the backend must support.

## What the mock must emulate

A forgiving mock hides the problems that appear later. The mock adapter **must** behave like a server:

- **Server-side list semantics**: pagination (`page/pageSize/total`), sorting (whitelisted fields), filtering, search (case + diacritic-insensitive), stable order. Never return the whole dataset and let the client filter.
- **Latency**: 150-600ms random delay (configurable) so loading skeletons are exercised.
- **Validation**: same zod schemas; invalid input → `422` with `fields[]` in the standard error shape.
- **State machine**: invalid transitions → `409`; concurrency → bump `version`, reject stale writes with `409 STALE_VERSION`.
- **Permissions**: return `403` when the active prototype role lacks the permission (from `permission-matrix.md`), `401` when "logged out".
- **Errors**: same `ApiError` class/shape as the real client (`code`, `message`, `fields`, `requestId`).
- **Side effects**: update related entities consistently (cancel order → stock restored in the mock store; audit entries appended so the audit log and timelines show something coherent).
- **Persistence**: in-memory store, optionally persisted to `localStorage` so a reload keeps edits; a "Reset prototype data" action restores fixtures.

## Fixtures

- Derive entities, fields and enums from the scan (`.scan.json` models/enums) and `business-domain-map.md`; do not invent a different shape from the real schema.
- Cover **every lifecycle state** and key edge cases: long Vietnamese names with diacritics, zero/huge amounts (VND integers), archived records, records for each role's scope, an empty collection, a very large collection (generate 2-5k rows to prove pagination).
- Deterministic generation (seeded faker, fixed seed) so screenshots and reviews are reproducible; realistic domain data (product names, plausible prices), no lorem ipsum, no real customer data.
- Keep fixtures in `mock/fixtures/*.ts`, separate from the adapters.

## Prototype affordances (dev/preview only)

- **Banner/badge** on every admin page: "Prototype data - not connected to a backend" (also in the page title). Not removable by the user without changing the env.
- **Role switcher** (user menu): preview the admin as each role from the matrix; nav and actions update; shows what each role can/can't do.
- **Scenario toggles**: force empty / error / slow / forbidden / conflict states for the current module so the user can review states without hunting for them.
- **Reset data** and **seed size** (small/large).
- Optional guided "tour" list of key flows to click (see Gate 2b).

These affordances live in one `PrototypeToolbar` component, loaded only when `isMock`.

## Permissions in a prototype

Client/mock-simulated from the matrix, so the user can judge *experience*. This is **not security** and must be stated in the banner/docs. Real enforcement (server guards, 401/403 tests, IDOR) arrives in the backend phase and is verified by `admin-qa-gate`.

## Environment guard (never in production)

- Gate on a deployment variable (`NEXT_PUBLIC_APP_ENV`, or the platform's, e.g. `VERCEL_ENV`) - **not** `NODE_ENV`. Preview builds on many platforms (e.g. Vercel preview deployments) also run with `NODE_ENV=production`, and previews are the natural way to share a prototype.
- Allowed: `development`, `preview`/`staging`. Forbidden: `production` → throw at startup/build.
- Add a CI/build check that fails if the production build contains the mock module (e.g. search the output for a unique marker string like `__ADMIN_MOCK_LAYER__`, or inspect the bundle analyser).
- Preview deployments of a prototype must be **access-protected** (deployment protection/basic auth/IP), `noindex`, and contain **no real data or secrets** (the mock needs none).

## Gate 2b - FE Preview protocol

Present to the user:
1. How to open it (local command or preview URL, login = any prototype role).
2. A short **review script**: 5-8 key flows ("process a new order", "refund", "create a product", "reply to a lead", "change a role's permissions") with where to click.
3. Screens + states to check: dashboard, each list (filters/sort/pagination), detail pages, forms with validation, empty/error/forbidden states (via scenario toggles), responsive widths.
4. The **API contract summary** (endpoints per module) - this is what the backend will implement; ask the user to confirm fields/workflows, not only visuals.
5. Open questions and assumptions found while building.

Collect feedback in rounds; apply UI + contract changes; re-present only the deltas. On approval: freeze the contract as v1, record approval date in `module-inventory.md` Assumptions, and move to the backend phase.

## Backend phase: swapping mock → real

Per module, in priority order:
1. Implement DB schema/migrations, endpoints, validation, **server-side authz**, audit events, soft delete, constraints per `backend-contract.md` - exactly to the frozen contract.
2. Contract tests: run the same schemas against the real responses (zod `parse` in tests); compare error shapes.
3. Flip the module's data source to `api` (per-module flag or by removing the mock factory branch); keep the mock for Storybook/tests behind the guard.
4. Run `admin-qa-gate` module checks (workflow + **API 403 per role**), fix differences between mock and real behaviour.
5. Update `implementation-status.md` (Data source = `api`, Verified evidence) and set inventory status `prototype` → `done`.
6. Remove mock-only affordances for that module from production paths.

## Pitfalls

| Pitfall | Prevention |
|---|---|
| User (or stakeholder) mistakes the prototype for a working product | Persistent banner; status `prototype`; say it in every handoff |
| Mock too forgiving → UI breaks when real API paginates/validates/errs | Emulate server semantics (see above); contract tests |
| UI coupled to mock-only fields | UI depends on zod types from the contract, never on fixtures |
| Contract drift between mock and backend | Single zod schema source; update `api-contract.md` with every change |
| Mock leaks into production bundle/env | Env guard + CI marker check |
| "Fake success" kept after backend exists | Swap checklist; inventory/validator forbid `done` with data source `mock` |
| Over-building UI for features the backend cannot support | Contract review at Gate 2b; flag expensive endpoints |
| Real customer data used as fixtures | Generate synthetic data only |
