# Analytics and Dashboard Endpoints

Read when: building the data behind a dashboard, a report or an analytics tab (the metric catalogue itself comes from `admin-design-system/references/dashboard-design.md`).

## Contents
- Shape of the API
- Periods and time zones
- SQL patterns
- Caching
- Privacy and scope
- Verification (oracle, roles, scale)
- Test-data hygiene

---

## Shape of the API

- **One endpoint per permission boundary.** Growth, usage and content figures share one permission; governance figures (audit-derived) need the audit permission; a role limited to its own actions gets numbers about its own actions only. Access to a block is then a route-level decision the server makes, not a field the UI hides.
- Whitelist the query: `range` is an enum (`7d|30d|90d`, default `30d`); anything else, an unknown parameter or a repeated one is `400`.
- The response carries its own frame: `range`, `days`, `timezone`, `since`, `previous_since`, `generated_at`. Every series is filled for every bucket (a day with nothing is `0`), so the chart and the CSV never have holes.
- Ratios are fractions in `[0,1]` rounded to 4 decimals, **`null` when the denominator is 0**. `null` means "not computable", never "0 %". Send numerator and denominator next to the ratio so the UI can say "6 of 15".
- Mutually exclusive buckets (login methods, status splits) must add up to the total; a test asserts it.

## Periods and time zones

- Bucket days in the **business time zone**, computed in SQL from the zone (`AT TIME ZONE`), never from the server's local zone or UTC. Write the window in the spec: "N whole days including today".
- The previous period is the same length immediately before the current one. Compute both bounds from the same expression so they cannot drift.
- **Cohort metrics** (activation, retention) only count cohorts that have had the whole window; the newest cohort is excluded and the response says how many were counted.
- Keep metric definitions in one place (the catalogue); the SQL, the UI tooltip and the test oracle are three copies of one sentence.

## SQL patterns

- Set-based, one pass per question: `count(*) FILTER (WHERE …)`, `generate_series` to fill days, `GROUP BY` over the period. No per-row sub-select.
- **Aggregate children first, then join** (one row per parent) so a one-to-many join cannot multiply the parent count.
- **Group the raw values, then normalise the groups.** Folding case, accents and spaces for every row of a 400,000-row table cost about a second; grouping the raw value first and folding the few thousand distinct strings gave the same answer in a fraction of that.
- Exclude archived or soft-deleted rows the same way in every query; say so in the catalogue's "Limitation" column.
- Put the period bounds in a CTE used by every statement of the request, so one request sees one clock.

## Caching

Aggregates over millions of rows are measured in seconds; the page must not wait for them twice.

- Per-process cache with a short TTL (about 60 s) **and stale-while-revalidate**: an older answer (up to about an hour) is returned at once while one background refresh recomputes it; concurrent identical requests share one in-flight computation; a failed refresh keeps the old answer until it is too old.
- The cache key carries everything that changes the answer: range, scope, and any permission-dependent field.
- `generated_at` is in the payload and the page shows "updated N min ago". TTL `0` switches the cache off for tests.
- Admin responses are `Cache-Control: no-store`: the browser must not hold personal or aggregate data either.
- Multiple instances: each has its own cache; say so in the runbook (staleness up to one TTL per instance is acceptable, a shared cache is only needed when it is not).

## Privacy and scope

- Aggregates only: no e-mails, names, ids or free text in any response. Staff names appear only where the viewer may see them (activity feeds, "who did it" lists), as display names without the e-mail.
- A scope that is narrower than "all" is applied in the query (`actor_id = me`), and blocks that make no sense for that scope come back `null`.
- Grep every response of the test run for e-mail addresses, UUIDs and usernames.

## Verification

1. **Oracle test.** Recompute every metric from the raw rows in plain code (a different implementation from the SQL: dates in JS, grouping in maps) and compare for each range. Add a fixture of boundary rows that you insert and remove in `finally`: 23:59 and 00:01 in the business time zone, exactly 7 days after sign-up, an archived row, a row on the first and last day of the window. A mismatch of 2 in 120,000 users is a window-edge bug (a lower bound taken at two different instants), not noise.
2. **Role probe over HTTP.** Every role × every endpoint: expected `200` or `403`; the narrower scope returns a subset; bad parameters are `400`; the response is `no-store`; no personal data pattern appears.
3. **Empty database.** Zeros and `null`, never an error or `NaN`.
4. **Scale.** Load the large-dataset recipe (`admin-qa-gate/references/e2e-test-playbook.md`), time each section and the whole endpoint, cold and warm, for the widest range. Budget: warm and cached responses within the dashboard budget; the cold computation is recorded with the number and the plan (cache warm-up, precomputed rollups) if it is over. Fix, re-measure on the same data, keep the script.

## Test-data hygiene

- Tag generated rows with a prefix so one command removes them; delete children before parents.
- A foreign key without an index makes every delete of the parent scan the child table; after bulk-deleting children, `VACUUM` them (dead rows make that scan slower still) or index the column. A cleanup that takes ten minutes is a finding.
- Run `ANALYZE` after a bulk load, or the planner measures the wrong table.
- The script refuses a database that is not local.
