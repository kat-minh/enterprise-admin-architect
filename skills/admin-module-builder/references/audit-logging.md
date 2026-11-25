# Audit Logging

Read when: implementing the `audit-log` module or adding audit events to any module.

## Contents
- What to log
- Schema
- Action naming
- How to record
- Redaction and sensitivity
- Integrity and retention
- The Audit Log module (UI)
- End-user activity (a second trail)
- Acceptance checklist

---

## What to log

**Always:** admin login/logout/failed login/MFA events · role & permission changes · admin user create/deactivate · settings & integration key changes · create/update/delete/restore of business records · **workflow transitions** (with reason) · bulk operations · exports/imports · refunds, price/stock/balance adjustments · publish/unpublish · impersonation start/stop · **denied attempts** on sensitive permissions · sensitive data reveal (PII/clinical/KYC).
**Not:** high-volume reads of non-sensitive lists, heartbeat calls, UI state.

## Schema

```
audit_logs(
  id            uuid pk,
  at            timestamptz not null default now(),
  actor_id      uuid null,           -- null for system/job
  actor_type    text not null,       -- admin | system | api_key | customer(impersonated)
  actor_label   text,                -- snapshot: name/email at time
  actor_role    text,
  action        text not null,       -- 'orders.refund'
  entity_type   text,                -- 'order'
  entity_id     text,
  entity_label  text,                -- 'Order #1042' (snapshot)
  changes       jsonb,               -- [{ field, before, after }] (redacted)
  reason        text,
  metadata      jsonb,               -- request-specific: bulk filter, job id, provider ref
  ip            inet, user_agent text, request_id text,
  outcome       text not null default 'success'   -- success | denied | failed
)
indexes: (at desc), (entity_type, entity_id, at desc), (actor_id, at desc), (action, at desc)
```
For large volumes partition by month; keep indexes lean.

## Action naming

`<module>.<verb>` matching permission keys (`orders.refund`, `articles.publish`, `rbac.update`), plus auth events `auth.login`, `auth.login_failed`, `auth.logout`. Consistent keys make filtering and alerting easy.

## How to record

1. **Service wrapper**: `audit.record({ actor, action, entity, before, after, reason, metadata })`. Call inside the **same DB transaction** as the change so the log and data cannot diverge (or use an outbox if cross-system).
2. **Generic CRUD**: a thin helper `withAudit(entityType, handler)` that loads `before`, runs the change, computes `after` and diff.
3. **ORM hooks/extensions** (Prisma client extension, TypeORM subscribers, DB triggers) can capture generic changes, but they lack actor and reason context - pass actor via request-scoped context (AsyncLocalStorage) and still add explicit calls for workflow transitions and reasons.
4. **Diff**: store only changed fields; for large text store hashes/lengths or truncated excerpts; for relations store IDs + labels.
5. **Denied attempts**: log in the permission guard for sensitive permissions (rate-limit duplicates).

## Redaction and sensitivity

Never store: passwords/hashes, tokens, API keys/secrets (store `***rotated***` or last 4), full card/bank numbers, raw documents. Mask PII per policy (email partially) when full value isn't needed for the investigation; where legally required keep full values with restricted read permission. The audit log itself is sensitive: reading it needs `audit-log.read`; exporting `audit-log.export`.

## Integrity and retention

- **Append-only**: no update/delete endpoints; application DB role lacks `UPDATE/DELETE` on the table; admin UI offers no edit.
- High-assurance (fintech/health): hash-chain each row (`hash = H(prev_hash || row)`), periodic anchor/export to WORM storage, tamper checks.
- **A hash chain, built and verified** (whenever "was the log edited?" must have an answer; `SEC-24`). A `BEFORE INSERT` trigger named to fire after the append-only triggers takes a **transaction-level** advisory lock, reads the newest chained row and stores `seq`, `prev_hash` and `row_hash` (the database's own `sha256` over a documented, versioned canonical text of the row). Do not backfill: older rows are reported as "not covered". A **verify** endpoint walks the chain in batches within a time budget (it answers `partial` with where to continue), names the first broken row and why (`hash_mismatch`, `prev_hash_mismatch`, `seq_gap`, `bad_chain_data`, `unchained_row`), never returns row content, is itself audited, rate-limited and one run at a time; the admin shows it as an "integrity check" on the audit page. Test that 20 concurrent writers give one linear chain, that a rolled-back insert leaves no gap, that the canonical text equals an independent implementation, and that each tamper case (an edit, an edit with its own hash recomputed, a middle delete, a first-row delete, a fork, bad chain data, an unchained row) is found at its row. **State the limits:** someone with owner rights who disables the trigger and recomputes every later row passes verification (only the head's hash changes), a cut tail is not seen, and the canonical text depends on how the database renders JSON. Keeping the last verified `seq` and `row_hash` **outside** the database (a note, a commit, a mail to oneself) makes the first limit detectable; a periodic export to write-once storage is the next level.
- Retention policy (e.g. 1-7 years by regulation); archive old partitions; document in `product-discovery.md`.
- Clock: server time only.

## The Audit Log module (UI)

- List: time, actor, action, entity (link to the record), outcome, IP; filters: date range, actor, action (multi), entity type/id, outcome; search by entity label/request ID; server-side pagination.
- Detail drawer: full metadata, **before/after diff view**, reason, request ID, user agent.
- Entity-level **Timeline** component reused on detail pages (filter by `entity_type/entity_id`).
- Export (restricted): an async job (`FN-17`) or, when a hard cap keeps it to seconds, a **streamed** file read by keyset in batches with backpressure (UTF-8 BOM, every cell quoted, CRLF, the formula guard for `= + - @`, tab and carriage return), refused with 413 **before the first byte** above the cap (the proving project: 50,000 rows, streamed in about 4 s with the server's memory flat), and audited **before** it is sent, with the filters and the row count. No IP or user agent in the file. The export is the whole log or nothing: a role that reads only its own rows gets 403 even when it holds the export permission. No delete/edit actions.
- Optional alerts: bursts of denied attempts, mass deletions, role changes, off-hours super-admin activity.

## End-user activity (a second trail)

The trail above records what **admins** do. The owner of a consumer product also asks "which user did what, when, on which device?" (a support case, a complaint, a suspicious account), and a log that stops at the admins cannot answer it. Provide it as a **separate table**, because its volume, retention, privacy and write path differ from the admin trail; do not widen `audit_logs`.

- **What:** the successful mutations a signed-in user makes (create / update / delete of the records they own, sharing and membership changes, joining requests, notification opt-in) and the authentication events (sign-up, sign-in, third-party sign-in, password change, a failed sign-in **only when the account exists**). Not reads, not heartbeats, not content.
- **Row:** time · user id (no foreign key: the row outlives the account) · action key (`<module>.<verb>`, one table that also holds the human label and a `group`) · entity type + id · outcome · **device**.
- **Device** is parsed from the User-Agent by a small table-driven function (no dependency): type (mobile, tablet, desktop, bot, unknown), operating system and version, browser and version (including the in-app browsers people open links in), the model when the UA carries one, and a ready `label` ("iPhone · iOS 17 · Safari", "Android · SM-S918B · Chrome 130"). Keep the raw UA cut to a few hundred characters so a parser mistake can be checked. A User-Agent cannot tell two phones of the same model apart: if that matters, add a random per-install id sent as a header, and say that it is a fingerprint-like identifier.
- **Do not store by default:** the IP address, names, e-mail, the text of a trip, note, place, expense or search, or the identifier typed in a failed sign-in (it is often someone else's address or a password typed in the wrong field). Ids are enough to open the record; the admin page links to it.
- **How:** ONE middleware on the response `finish` event maps route pattern + method to an action key through one table, so no controller is touched and a new route that is missing from the table is visible as a gap in one place; the auth events are recorded where the outcome is known. Recording is **fire and forget**: it never delays or fails the request, swallows its errors (one warning a minute), and drops events beyond a small cap of inserts in flight (the same design as the scraper telemetry in `runtime-controls.md`).
- **Record a change, not a call.** An action key belongs to a request that changed something. The proving project's app re-sent its unchanged push subscription (an idempotent `PUT`) on every visit, the trail filled with "enabled notifications" and the owner asked why; the fix was on the client (send it only when its fingerprint changes, or once a week), and the server can also record only a new subscription. Check every mapped route against what the client sends on a plain page load.
- **Retention:** finite (for example 90 days) with a batched purge job; this table is deliberately not append-only. Put the figure in the data map (`privacy-and-data-rights.md`) and tell the users in the privacy notice that device information is kept.
- **Read access:** the same permission as the admin audit log (it is the same sensitivity), no new permission; the user's label is masked exactly like the users list masks it for an admin who may not see e-mails.
- **UI:** a second view on the Audit Log page ("Admins | Users") with summary cards (events, active users, by device type), filters (range, group, device type, outcome, one user), keyset pagination, and a "recent activity" section on the user's own page with a link to the full list. Hide the view when the endpoint answers 404 or 403.
- **Tests:** each action lands with the right user, entity and device (send different User-Agent headers); a table of real UA strings for the parser; nothing sensitive is in any row; the user's request still succeeds, at the same speed, when the insert fails (rename the table under the running server); the permission matrix, validation, masking, pagination and the retention purge.

### App bugs with the steps before them

A stack trace alone does not tell the owner what the user did. Give every bug report **two trails** and show them in one timeline.

- **On the device:** the app keeps the last 40 steps in memory only (screen changes as patterns, API calls as method + path pattern + status + duration, online / offline / hidden / visible) and, when an uncaught error, an unhandled rejection or a failed render happens, sends ONE report with them. Ids become `:id`; no query string, form value, typed text, name, e-mail or token is ever a step. The report carries the screen pattern, the app version and build, the cleaned message and stack. Each API step carries the request id the app sent for that call, so the operator can open the server's side of that very call (`OPS-16`, `admin-qa-gate/references/operations-readiness.md` §5).
- **On the server:** the activity trail above, with the **failed** requests recorded too (every 5xx, every refused write except 401 and 429; the status, the error's machine code, never its message; the request id). The admin's detail view merges the device's steps and the server's rows of the same user (or device) from a quarter of an hour before to a couple of minutes after the report, each row tagged with who saw it.
- **Noise rules, decided up front:** an API error is not an app bug (the server already has it, with a status), nor is an aborted request, a `ResizeObserver loop` warning, a bare `Script error.` (a foreign script or an extension; the browser hides the details), an error thrown by the bridge scripts that chat apps inject into their in-app browsers or by another origin's script, or a lost connection. The same error is reported once per ten minutes and at most five a minute per page load; a server that answers 404 (an older version) is not asked again. The server sanitises again (never trust the client), computes the fingerprint that groups reports, rate-limits per install, per user and per address (an install id can be invented per call), and answers 202 even when its own insert fails.
- **Tests:** throw the error from the page's own script, not through the debugging protocol (a muted error arrives as "Script error." and is ignored on purpose); keep the in-memory trail in mind (a full page load starts a new one: move inside the app); name the headers in the stub's CORS answer (`*` does not cover `Authorization`).

## Acceptance checklist

- [ ] Every sensitive/destructive action in the module's spec emits an event
- [ ] Event written transactionally with the change (or via outbox)
- [ ] Before/after + reason captured; secrets redacted
- [ ] Denied sensitive attempts logged
- [ ] Log is append-only and permission-gated
- [ ] Entity timeline shows events on detail pages
- [ ] Filters/search/detail inspection work with server-side pagination
- [ ] End-user activity: a separate trail answers "which user did what, when, on which device", stores no IP and no content, never slows or fails the user's request, has a retention rule, and reuses the audit read permission
- [ ] If the table is hash-chained: the verify check finds each tamper case at its row, returns no row content, and its limits are stated in the runbook (`SEC-24`)
