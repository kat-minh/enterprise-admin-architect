# Frontend Architecture for an Admin

Read when: scaffolding the admin app, reviewing its structure, or deciding where a piece of state or logic lives. Stack-neutral: the examples use TypeScript and a query-cache library, the rules hold for any framework (see `admin-design-system/references/stack-adapters.md` for the stack choice).

## Contents
- Structure
- One home per kind of state
- The API client
- Hooks and components
- Containing failures
- Real-time updates
- Configuration and environments
- Performance budget
- Observability
- Tests and where they live
- Anti-patterns

---

## Structure

- **Feature folders.** `features/<module>/{api,components,pages,types}` or the framework's equivalent; a shared kit (`components/`, `lib/`) for what two modules use. A feature never imports another feature's internals; it imports the shared kit or the other module's public hook.
- **One navigation table** (`nav`) with label, route, icon, required permission: the sidebar, the landing page, the route guards and the "no access" screen all read it. A module appears once, in one file.
- **Route-level code splitting**; the admin bundle is separate from the public one; heavy libraries (charts, rich-text editor, date pickers) load with the page that needs them.
- **Design tokens as CSS variables**, one component kit, no ad-hoc colours; overlays (dialog, drawer, menu, tabs, toast) written once with focus management and used everywhere.
- **The admin imports the host product's tokens; it never copies them.** A copied token file drifts: the proving project's admin first shipped with another brand colour, another typeface and another logo than the product it manages, and nobody noticed until the two were side by side. Import (or generate from) the product's token file and add only the admin's own aliases on top; a test compares the computed accent, text font and radius of an admin page with the public product's.
- **Layers are a contract, written once** (a z-index table in `design-system.md`): content < sticky headers < save bar < drawer and sheet < dialog < toast < command menu, with every overlay rendered into one portal root. On a phone the save bar and the toast sit above the tab bar; a toast stays visible over an open dialog.

## One home per kind of state

| Kind | Home | Rules |
|---|---|---|
| Server data | the query cache | key = resource + parameters; stale time per resource; after a write, invalidate the precise keys (or set the returned row); never copy it into component state |
| What the user is looking at (filters, sort, page, tab, open drawer) | the URL | shareable, refresh-safe, Back works; a change resets the page number |
| A form being edited | the form component | dirty guard on navigation; the server's revision/`updated_at` travels with the edit; field errors mapped from the response |
| Session and permissions | one auth context | the permission list comes from the server; `can(permission)` mirrors the server check, it is not the check |
| Preferences (theme, density, column choice) | local storage | every read and write in `try/catch`; the page works without it |
| Transient UI (menu open, hover) | the component | |

## The API client

One module, used by every hook:

- base URL from the environment; the response envelope parsed in one place; a typed error with `status`, `message`, `details`, `retryAfter`;
- an `AbortSignal` on every read, so navigating away cancels it;
- personal data is never cached by the browser (`cache: 'no-store'`); an empty body where data was promised is an error, not `undefined`;
- retries only for idempotent reads, with a limit (on `503 db_busy`, after `Retry-After`, at most twice, with a neutral "busy, retrying" hint only after a second and a half); writes never retry on their own, and a 503 never signs the user out;
- a request id per call in `X-Request-Id` (a retry of the same call adds `.1`, `.2`), kept in the bug report's step for that call, also when no answer came, so the operator can open the server's side of that very call (`admin-qa-gate/references/operations-readiness.md` §5);
- status handling is central: `401` → sign out and return to the page after sign-in; `403` → the forbidden state; `404` → not found; `409` → reload the record and say someone else changed it; `422/400` → field errors; `429` → honour `Retry-After`; `5xx` → a retryable error state.
- **Types are claims.** Written from the spec, they drift from the real server. Keep a probe script that calls each endpoint as a real role and prints the response shape; compare it with the types whenever a backend module lands, and keep a thin compatibility layer at the boundary while an API is changing.

## Hooks and components

- One hook per resource operation (`useTrips(query)`, `useSaveText()`); components never call the client directly.
- **A query for data guarded by a permission runs only when the role holds it** (`enabled: can(permission)`). A hook that fires anyway for a role without the permission shows up as a `403` in every audit run and in the audit log. The same holds for the **scope**: the shell's probe of two whole-log features (the server's request log, the app's bug reports), sent for a role that reads only its own rows, got a 403 on every page load, printed a console error, and, once the server kept a request log, stored a warning each time that ate the per-minute budget of the very log the probe asked about. Decide from the scope the shell already knows; let the probe's 403 be the final word only when the scope is unknown.
- Presentational components take data and callbacks; page components wire hooks to them. A component that needs more than about eight props is two components.
- Every data widget has its own loading, empty and error state; the page composes widgets, so one failure does not blank the page.
- Accessibility lives in the primitives (names, roles, focus, keyboard); pages use them instead of re-implementing.

## Containing failures

- An **error boundary** per route and around each independent widget, with a "try again" and the request id; an unexpected exception shows a recoverable screen, never a white page.
- Unhandled rejections and render errors are reported (console in development, an error endpoint or the audit/log pipeline in production) with the request id and the route.
- Tests fail on any `console.error` or uncaught exception on a happy path.

## Real-time updates

Default to **polling with a manual refresh and "updated N min ago"**; pause when the tab is hidden. Use server-sent events for one-way streams (job progress) and WebSockets only for collaboration or sub-second needs, and only when a module spec asks for it. Whatever is used, the page must still be correct after a reload.

## Configuration and environments

- Environment variables hold the API URL, the public-site URL (for previews and links), and feature toggles. **No secrets in the client bundle.** List them in the runbook with a safe example.
- Development, test and production use different hosts and different admin origins in the CORS allow-list. A test stack uses its own database and ports; never the one a developer already runs.

## Performance budget

Decide it per project, **measure it on the production build** with `admin-qa-gate/templates/perf-frontend.mjs`, and record the figures and the data they were taken with in the QA report (gate `PERF-8`). Defaults, the Web Vitals "good" thresholds plus the usual critical-path budget: JavaScript loaded by a route ≤ 170 KB gzip · largest contentful paint ≤ 2.5 s on a phone profile (CPU 4x slower, 1.6 Mbps, 150 ms latency) · cumulative layout shift ≤ 0.1 · blocking time ≤ 200 ms · longest interaction ≤ 200 ms. Also report the requests made before the first content and the largest chunk (reported, not judged: only what a route loads in total has a standard budget). Typical levers: route splitting, lazy heavy libraries, debounced search (about 300 ms), virtualised lists beyond a couple of hundred rows, no waterfall of dependent requests (fetch in parallel, or compose on the server), cached reads.

**Layout stability is part of the budget.** Skeletons reserve about the height of the loaded content (measure the loaded sizes; tiles of different content have different heights), and a sentence that changes when data arrives (a date range, "updated 1 minute ago") already has its final length while loading: when a line wraps late, controls beside it jump to a new line and everything below moves. The measurement names the elements that moved, which is how both causes were found.

## Observability

- A request id on every response header and in every error message shown to the operator; the same id in the server log and in the audit row.
- Structured server logs (request id, actor, route, status, duration); a health endpoint that checks the database; slow-query and error-rate visibility named in the runbook.
- The audit trail is a product feature (who did what, with a reason), separate from technical logs.

## Tests and where they live

| Layer | What | Where |
|---|---|---|
| Pure functions | formatters, validators (contrast, placeholders), diffing, permission checks | unit tests beside the code |
| Contract | response-shape probe, envelope, error model | script run after each backend module |
| API oracle | permission matrix × every endpoint, role × scope, independent recomputation of aggregates | backend suites |
| End-to-end | real browser on the real stack, per role, state-changing flows, audit rows | `admin-qa-gate/references/e2e-test-playbook.md` |
| UI audit | every page × role × width × theme: overflow, clipping, contrast, names, console | `admin-qa-gate/templates/ui-audit.mjs` |

## Anti-patterns

- Fetching in components; copying query data into `useState`; filters held only in memory.
- Permission checks only in the UI; a `role === 'admin'` string compared in a component.
- One global "loading" spinner for a page of independent widgets.
- Types that nobody compared with a real response.
- A second scroll region or a fixed width that breaks at 390 px, discovered by the owner instead of by the audit.
- A new dependency for something the kit already does.
