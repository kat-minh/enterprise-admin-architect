# E2E & Verification Playbook

Read when: step 3 of `admin-qa-gate`. Patterns use Playwright/TypeScript; adapt to the project's test runner. If no runner exists, do the same checks through browser automation or manual walkthrough and record evidence.

## Contents
- Test data and personas
- Authenticating per role
- Permission matrix test (API is the oracle)
- Workflow tests
- Table, form and state tests
- Responsive, accessibility, visual
- Large-dataset test
- Public-site regression
- Browser-automation walkthrough protocol
- Recording evidence

---

## Test data and personas

- Seed **dev/test only** (never prod): one user per role in `permission-matrix.md` (`super_admin@test`, `support@test`, …) with known passwords from env, plus realistic domain data covering each lifecycle state (an order in every status, an unpaid booking, an expired hold…).
- Include edge records: very long names (Vietnamese diacritics), zero-quantity items, archived records, records owned by another user (for `own` scope).
- Seed script is idempotent, refuses non-local databases, requires an explicit `DATABASE_URL`, and is documented in `implementation-status.md` (dev credentials live in the seed file, not in chat or docs).
- Generate bulk data separately for the scale test (10k-100k rows).

## Authenticating per role

Log in once per role via the API/UI and save storage state; reuse in tests.

```ts
// e2e/admin/auth.setup.ts
import { test as setup } from '@playwright/test';
const roles = ['super_admin', 'admin', 'support', 'finance'];
for (const role of roles) {
  setup(`login ${role}`, async ({ request }) => {
    const res = await request.post('/api/admin/auth/login', { data: { email: `${role}@test.local`, password: process.env.E2E_PASSWORD } });
    if (!res.ok()) throw new Error(`login failed for ${role}: ${res.status()}`);
    await request.storageState({ path: `e2e/.auth/${role}.json` });
  });
}
```

## Permission matrix test (API is the oracle)

Map each permission to a concrete request, then iterate role × permission from `permission-matrix.md` (parse the markdown table or export it to JSON in a test helper). Expected: `yes` → not 401/403; `no` → **403**; unauthenticated → **401**.

```ts
// e2e/admin/permission-endpoints.ts
export const PROBES: Record<string, { method: 'GET'|'POST'|'PATCH'|'DELETE'; url: string; data?: unknown }> = {
  'orders.read':   { method: 'GET',  url: '/api/admin/orders' },
  'orders.refund': { method: 'POST', url: '/api/admin/orders/TEST_ORDER_ID/refund', data: { amount: 1, reason: 'qa' } },
  // one probe per catalog permission; a missing probe is itself a QA finding
};

// e2e/admin/permissions.spec.ts
for (const role of ROLES) {
  test.describe(role, () => {
    test.use({ storageState: `e2e/.auth/${role}.json` });
    for (const [perm, probe] of Object.entries(PROBES)) {
      test(`${perm}`, async ({ request }) => {
        const res = await request.fetch(probe.url, { method: probe.method, data: probe.data });
        const allowed = MATRIX[role][perm] !== 'no';
        if (allowed) expect([401, 403]).not.toContain(res.status());
        else expect(res.status()).toBe(403);
      });
    }
  });
}
```
Also verify: unauthenticated → 401; a deactivated user's session fails; role change applies on next request; `own` scope can't read another user's record; self role-edit and last-super-admin removal are rejected. Probes for destructive endpoints must use test data (they may succeed for allowed roles).

UI check (per role): the nav shows only readable modules; forbidden routes redirect to `/admin/403`; buttons for missing permissions are hidden/disabled with explanation.

## Workflow tests

For each workflow archetype module:
1. **Golden path** through real UI → assert persisted state after reload, timeline entry, audit entry, side effect (email stub/outbox row/stock change).
2. **Invalid transition** (e.g. ship unpaid order) → API 409/422 and UI shows a clear message.
3. **Concurrency**: open the record in two sessions, change in A, submit in B → 409 and conflict UI.
4. **Idempotency**: double-click/double-submit sensitive action → one effect.
5. **Money/limits**: refund more than paid → rejected; boundary values.
6. **Cross-entity effects**: cancel order → stock restored; delete category with products → blocked or archived with message.

## Table, form and state tests

- **Server-side proof**: intercept network; on page 2 / filter / sort assert the request carries `page`, `q`, `sort`, filters, and the response size ≤ pageSize.
- **URL state**: apply filters, reload → same results; Back/Forward work; open detail then return → list state restored.
- **States**: force empty (fresh filter), error (route interception returning 500) → error state with Retry, forbidden (role without permission) → 403 view, not-found id → 404 view, slow network → skeleton.
- **Forms**: submit empty → field errors and focus; server 422 → mapped to fields; edit then navigate away → dirty guard; stale version → 409 UI; double submit prevented.
- **Bulk**: select page → "select all matching" banner → confirm dialog shows count → per-item result report.
- **Export**: respects filters; opens in Excel with Vietnamese text intact (UTF-8 BOM); formula-injection neutralised (`=1+1` cell exported as text).

## Responsive, accessibility, visual

- Screenshots at 1440, 1024, 768, 390 for dashboard, list, detail, form; check no horizontal page scroll, readable tables/cards, reachable actions.
- Keyboard-only run of the golden path: Tab order, focus ring, Esc on overlays, focus return.
- Automated a11y (e.g. `@axe-core/playwright`) on each page type; fix serious/critical issues; add manual checks for labels and contrast on status badges.
- Long-text and RTL/accent stress: very long Vietnamese strings, large numbers.

## Large-dataset test

Seed ≥ 10k (ideally 100k) rows for the main list entities. Check: first page and filtered/sorted queries stay fast (< ~500ms locally), query plans use indexes (`EXPLAIN`), payload sizes small, UI stays responsive, export is async. A list that fetches everything is a Blocker.

## Public-site regression

Run the project's existing test suite. Smoke the public routes (list from the scan output) for 200 status and absence of console errors. Verify login/checkout/forms still work and that public bundles do not include admin code (check build output or bundle analyser).

## Browser-automation walkthrough protocol

When using a browser-automation tool (Playwright, a browser MCP server, or an agent's built-in browser) instead of a test runner:
1. Open a new tab (don't reuse the user's tabs); log in as each role in turn (dev credentials).
2. For each module: perform golden path, one negative path, filters/sort/page, open drawer + detail, edit form with validation error, empty and error states (use filters/dev toggles).
3. After each page: read console messages filtered for errors/warnings; read network requests filtered by `/api/admin`; note any 4xx/5xx that are not expected.
4. Capture screenshots at the four widths for representative pages.
5. Avoid triggering native `alert/confirm/prompt` (they block the session); use the app's own dialogs.
6. Write down each step and result; these notes are the evidence.

## Pitfalls when automating admin UIs

Learned from running the suite against a real app; each of these produced a false failure or a misleading screenshot.

- **Skeleton rows are rows.** A table that shows 8 skeleton rows while loading satisfies "rows > 0". Wait for the loaded state (no skeleton cells, real links present) before counting, clicking or asserting; otherwise the test passes or fails by timing luck.
- **Let overlays settle before screenshots.** Drawers, dialogs and off-canvas navigation animate for ~150 ms; a screenshot taken immediately shows a half-transparent drawer that looks like a bug. Wait ~400 ms, or emulate `prefers-reduced-motion`.
- **A good login limiter blocks your own reruns.** Per-IP and per-account limits (and lockouts) are correct behaviour; a suite that logs in per test will hit them on the second run. Reuse authenticated sessions (storage state), restart the dev server between runs, or use a test-only setting. Never weaken the production limiter to make tests pass.
- **State-changing tests need a reseed.** Suspensions, password changes and role edits leave the database different from the seed. Make the seed idempotent (it replaces its own rows) and run it before each suite.
- **Scope locators.** The same label can appear twice (toolbar "Clear filters" and the empty-state button). Strict locators fail loudly; scope them to the region instead of taking `.first()`.
- **Never test against a database you did not name.** The seed must require an explicit `DATABASE_URL`, refuse any non-local host, and use its own port; developers often already run a local database on the default port.
- **Check what the browser's locale does.** Native date inputs render in the browser's language (`mm/dd/yyyy` in an English headless browser); decide whether that is acceptable for the operators.
- **A delegated agent's report is a claim.** If part of the build was delegated, re-run the type check and every test suite yourself and read the diff of anything touching shared or public code before recording evidence.

## Recording evidence

In `implementation-status.md` Evidence column cite: test file/name + command output summary, screenshot file paths, or dated walkthrough notes ("2026-11-20 manual: ship flow with `order_staff` - ok; API 403 for `support`"). `Verified = yes` requires workflow + permission evidence. If only the UI was exercised and not the API, mark `partial`.
