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

### UI audit: run it before the owner has to point things out

Copy `admin-qa-gate/templates/ui-audit.mjs` into the project and run it **after every module and again before each gate**: every page × every role × phone / tablet / desktop × light / dark, no exceptions for "pages that look the same". It catches what permission and data tests never see: a second scrollbar, text broken one character per line, content leaving its card, touch targets too small, contrast, unnamed buttons, unreachable scroll regions, console errors. In a real run it found 110 of 110 page states with a problem after the owner had already pointed out three by hand.
1. **Fix every `must` finding**, then re-run until clean. Fix the cause (a design token, a shared component), not each page: most findings repeat across pages.
2. **Then look.** Open the screenshots of every page at phone and desktop width in both themes and write down what a picky owner would say: hierarchy, density, empty areas, a number that means nothing, wording. Tools do not judge design. Put the review notes in `qa-report.md`.
3. **Re-run the audit for each role you add**, including roles created later in the build (an editor, a custom role): they see different menus and different pages.
4. Keep the script: it is part of the evidence (`quality-gates.md` UX-13).

## Large-dataset test

Seed **≥ 100k rows in the largest entity** (and ≥ 1M in any event or log table) in the throw-away database. At 10k rows the problems below are invisible: a real run found four lists taking 1.5-8 s at 200k users / 400k trips that were instant on the 64-row seed. A list that fetches everything is a Blocker.

Recipe:
1. Load the rows with set-based SQL (`generate_series`), tagged by a prefix so one command removes them again (delete children before parents: a cascade from the parent can scan every referencing column once per deleted row). **Run `ANALYZE` after the load**: fresh tables have no statistics and the planner picks nested loops that never finish.
2. Time through the API, as a real role, cold and the median of three warm calls: first page; **every sortable column in both directions** (aggregate columns such as "trips owned" or "members" are the usual offenders); a deep page (e.g. page 4,000 of 25); a search with and without a result; each filter; the dashboard and report endpoints; payload sizes.
3. Budgets, locally: list endpoints ≤ ~500 ms (search ≤ ~1 s), dashboards and reports ≤ ~2 s. Check `EXPLAIN` for anything over budget.
4. Fix, then re-measure on **the same data** and compare before/after in `qa-report.md`. After any query change also compare every sort field × direction × two page sizes against an independent SQL ordering, and assert no id repeats or goes missing across pages.
5. Remove the rows and confirm the database is back to the seed.

Typical findings: per-row counts (`LEFT JOIN LATERAL (SELECT count(*) …)`) evaluated for every row the database walks, so a deep page pays for all the skipped rows and "sort by count" pays for the whole table → page the keys first and attach counts to that page only (see `admin-module-builder/references/backend-contract.md`); search that is a sequential scan; a dashboard that issues one query per tile.

## Admin-managed public content (CMS, flags, banners)

For every module whose data the public product renders: (1) edit in the admin and **look at the public product in a real browser** (and the installed PWA, if there is one): the change appears within the documented time, in each language; (2) a draft is invisible until published, and preview shows it without touching the cache; (3) rollback restores the previous state; (4) take the read endpoint down, make it slow, make it return garbage: the product still renders from defaults, with no console errors; (5) text that is built at module load time (constants, lazily imported screens) is covered, not only the text rendered inside components; (6) an XSS payload typed into a text, banner or brand field is displayed as text; (7) a service worker does not keep serving the old content past the documented time. Record the measured delay in `qa-report.md`.

How to run it: start **the real public app as a second dev server** against the test API, one fresh browser context per "visitor" (nothing stored), and assert on what a visitor sees, not on the endpoint alone. The sequence that proved the whole chain: edit text, banner and brand as the editor role; assert the public ETag did not change and the visitor still sees the original; open the preview from the admin (a popup opened inside the click, then pointed at the signed address) and assert the draft, the ribbon and that the token is gone from the address bar; publish with a reason; assert the new ETag, `Cache-Control`, `304` on `If-None-Match`, no staff data in the body, and the visitor's text, banner (typed `&amp;` appears literally), link attributes, title and accent colour; dismiss the banner and reload; abort the config request in a context that holds a stored copy (the published text stays) and in a fresh one (the shipped text renders within seconds); roll back to the shipped version and assert the visitor is back to the original; two editors on one draft give `409` and a retry succeeds; a read-only role sees no write buttons and gets `403`; a role without the permission has no menu entry.

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
- **Count the scrollbars, not only the overflow.** An app shell with its own scroll region (a fixed-height layout whose content area has `overflow: auto`) must leave the document itself unscrollable: assert `document.scrollingElement.scrollHeight <= clientHeight` on every page at desktop and phone widths. A real run showed two vertical scrollbars on some pages while every horizontal-overflow check passed: visually-hidden helpers (`position: absolute` screen-reader text) inside a scroll container that is not `position: relative` escape it and stretch the document. Give the scroll region `position: relative`.
- **Let overlays settle before screenshots.** Drawers, dialogs and off-canvas navigation animate for ~150 ms; a screenshot taken immediately shows a half-transparent drawer that looks like a bug. Wait ~400 ms, or emulate `prefers-reduced-motion`.
- **A good login limiter blocks your own reruns.** Per-IP and per-account limits (and lockouts) are correct behaviour; a suite that logs in per test will hit them on the second run. Reuse authenticated sessions (storage state), restart the dev server between runs, or use a test-only setting. Never weaken the production limiter to make tests pass.
- **State-changing tests need a reseed.** Suspensions, password changes and role edits leave the database different from the seed. Make the seed idempotent (it replaces its own rows) and run it before each suite.
- **Scope locators.** The same label can appear twice (toolbar "Clear filters" and the empty-state button). Strict locators fail loudly; scope them to the region instead of taking `.first()`.
- **Never test against a database you did not name.** The seed must require an explicit `DATABASE_URL`, refuse any non-local host, and use its own port; developers often already run a local database on the default port.
- **Check what the browser's locale does.** Native date inputs render in the browser's language (`mm/dd/yyyy` in an English headless browser); decide whether that is acceptable for the operators.
- **A lazily loaded route keeps the old screen until its chunk arrives.** The URL has already changed, but the previous page's table and pager are still on screen; reading them gives another page's numbers. After a client-side navigation wait for the destination's heading (and then its loaded rows), not only the URL.
- **Ground truth must use the product's own window and fold definitions.** "Last 24 hours" shown as 24 hourly buckets is not `now() - interval '24 hours'`: 116 vs 117 is a definition mismatch, not a rounding error. Write the definition in the module spec and compute the expectation with it. Likewise `lower(unaccent(x))` and `unaccent(lower(x))` differ in a C-locale database (typical of embedded or minimal images), where `lower('Đ')` is a no-op: fold with `unaccent` first.
- **Refused attempts are in the audit log, and they are the newest rows.** A test looking for "the latest entry of action X" must skip `denied` rows (or it will read the refusal your permission probe just created).
- **Earlier suites go stale when a later module changes a default.** A new dashboard moved the landing page and removed every "coming soon" label; the Session 2 suite failed for good reasons. Re-run all earlier suites after each build session and update their expectations deliberately, never by loosening an assertion.
- **A delegated agent's report is a claim.** If part of the build was delegated, re-run the type check and every test suite yourself **on a separate stack** (its own database and ports, so you do not disturb the delegate's or the owner's), read the diff of anything touching shared or public code (the mount order of a public route relative to authentication, CORS, rate limits), and compare its counts with yours: a difference is a question (a suite that was run with an optional log scan, say), not noise.
- **Similar controls collide.** A header button "Publish…" and a card button "Publish" both match a name locator; the first one only switches tab. Use exact names, and remove the redundant control from the UI (one place per action) instead of working around it in the test.
- **A locator can match something hidden.** `getByText('Edit role')` found a hidden `<option>` of a filter before the visible table cell and waited for ever. Scope to the region (table, dialog, drawer).
- **Make the precondition part of the test.** "Tick a permission" proved nothing when the role already had it: `check()` on a ticked box is a no-op and the later assertions failed far away. Pick a value the subject lacks, and assert the starting state.
- **A drawer has two close buttons** (the header cross and the footer button) that share a name; pick `.last()` or give them different names.
- **Count the logins.** Every attempt counts against the sign-in limiter (10 per 10 minutes per address is typical): budget one UI sign-in per role per run plus the few API sign-ins a scenario needs, restart the API between suites (it resets the in-memory counter) and **never** relax the limiter for tests.
- **Denied rows have no reason.** When asserting that every sensitive audit row carries a reason, filter `outcome = 'success'`; the refusals your permission probe created have none, correctly.
- **Probe the real response shapes** of every endpoint a screen binds to as a real role before you build the screen. Types written from the spec drift from the server, and a compile-time pass proves nothing about the wire.
- **Automated checks do not replace looking at the screenshot.** A bell popover reused a class name that older CSS already defined (a horizontal flex row): its title wrapped word by word and its parts sat side by side while twenty assertions passed. Open the screenshot of every new overlay, and add a geometry assertion (the popover is at least as wide as designed, its title is one line, its parts are stacked).
- **A new class name can collide with an old rule.** Before naming a class, search the stylesheet for it (`grep`), and prefix new components. Dead styles from an earlier design are the usual source.
- **Press keys only after the app has mounted.** A shortcut pressed right after `goto` hit a page whose header did not exist yet and the test failed by timing luck; wait for a landmark (the header button that shows the shortcut) first.
- **Let animations finish before running axe.** An overlay that is still fading in is blended with what is behind it and axe reports contrast failures that are not real (an overlay opened at 140 ms looked "failing" in light and dark). Wait for `document.getAnimations()` to settle, and check the ratio numerically before touching a colour.
- **Take the oracle from the product, not from memory.** Which pages a role may open is what its sidebar shows (and `/auth/me` says); asserting a list written from memory failed three times for the wrong reasons. Compare the command menu, the shortcut list and the bell with the sidebar.
- **Prefix-sharing names collide in strict locators.** The "apply" button and the "delete" button of one saved view both start with its name; use exact names.
- **Test preferences kept on the device the way a user breaks them:** another admin on the same browser, a reload, a damaged stored value, a private window.
- **Check the stack before blaming the code.** After the machine ran out of memory the test database answered nothing while its port stayed open: only the main process was left, its workers (checkpointer, writer) were gone and an orphan held the shared memory, so a restart failed with "pre-existing shared memory block is still in use". Look at which processes are alive, stop only the orphan that belongs to your own stack (never a developer's database), restart without wiping, and re-check the data.
- **A consumer written before its producer exists is written against a guess.** The public app read the design payload in a shape that was specified but not yet built; the real server nested it differently, so the draft logo and font never appeared in the preview while every colour looked fine. Write the consumer after the producer's contract exists, then probe the REAL response (a script that prints the keys) and assert the visible effect in the real app, not only the unit test of the parser.
- **A preview that shows the draft must reload when the draft changes.** The frame kept the first load and showed an older draft than the form beside it. Key the frame on the draft revision, and test it: change something, save, and read the effect inside the frame.
- **A strict Content-Security-Policy silently blocks what it does not know.** An inline theme initialiser in `index.html` stopped running under `script-src 'self'`, so dark mode would have flashed white; no test failed. Move bootstrap code to a file, and walk the real pages of the production build with `admin-qa-gate/templates/security-headers.mjs` (fails on any violation).
- **Measure uses, not specimens.** A colour swatch, a shadow or radius preview and an embedded preview frame are showing a token, not using one; mark them (`data-design-sample`) or the design-consistency metrics report the editor's own previews as drift.
- **A headless browser hides scrollbars by default** (Playwright and Puppeteer launch Chromium with `--hide-scrollbars`). Every audit and screenshot then shows a world without native scrollbars, while the owner's Chrome on Windows shows them. A tab bar with a 1 px overflow (an underline at `bottom: -1px` inside a box with `overflow-x: auto`) carried a vertical scrollbar on every page with tabs through 205 audited states with 0 findings. Launch with scrollbars visible (`ignoreDefaultArgs: ['--hide-scrollbars']`), measure `offsetWidth - clientWidth` and `offsetHeight - clientHeight` of every scroll container (`ui-audit.mjs` rules SCROLL-1 and SCROLL-2), and read screenshots taken that way. Phone widths are the exception: phones use overlay scrollbars.
- **Test debris in the dev data is read as a product bug.** An e2e test that proves "text is not interpreted as HTML" by saving a banner `22:00 &amp; 23:00` left it published; later it showed in the design preview and looked like a double-escaping defect. Tests that create visible content delete it (or run on a throwaway database), and review screenshots are taken on seeded realistic data.
- **Re-run what an agent reports on a stack it did not use.** A delegated backend build reported 291 checks; the lead re-ran every suite on a fresh database and a different port and got the same numbers. Reading its summary would have proved nothing.

## Recording evidence

In `implementation-status.md` Evidence column cite: test file/name + command output summary, screenshot file paths, or dated walkthrough notes ("2026-11-20 manual: ship flow with `order_staff` - ok; API 403 for `support`"). `Verified = yes` requires workflow + permission evidence. If only the UI was exercised and not the API, mark `partial`.
