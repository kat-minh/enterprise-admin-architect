# Operations Readiness

Read when: closing Gate 3, writing `runbook.md`, or judging whether an admin and its backend can be run in production by someone who did not build them. It turns the runbook from a document that exists into a set of capabilities that were exercised. Gates: `OPS-1` to `OPS-10` in `quality-gates.md` (section I).

## Contents
1. The verdict
2. Backup and restore
3. Migrations
4. Health and the System panel
5. Observability
6. Incident kit
7. Maintenance, read-only and minimum version
8. Retention of operational data
9. Abuse and limits
10. Jobs
11. Configuration
12. Multi-instance behaviour

## 1. The verdict

A project is **Ready**, **Ready with named conditions** or **Not ready**. It is Ready only when no part of the runbook that decides recovery is left undecided: hosting and domains (§1), backup and restore (§5), monitoring and known limits (§9). A cell that still says "undecided", "TBD" or an unfilled `<placeholder>` at the final stage is a condition, not a pass. Each condition has an owner and a date, and the owner of the product signs a one-line risk acceptance in `qa-report.md`. The validator warns on those markers at the final stage (`--strict` makes them errors).

## 2. Backup and restore

- State **RPO** and **RTO** in numbers (for example "lose at most 24 h; back within 4 h") and say who decided them.
- A backup that was never restored is a hope. Evidence: a **dated, timed restore** into a scratch database, then a row-count and checksum comparison on the tables that matter, recorded in the runbook (date, duration, result, who). Repeat on a schedule.
- Back up everything that is not in code: the database, uploaded files and stored assets (images in the database are covered by the database backup, say so), secrets are recovered from the secret store, not from the backup.
- Backups of personal data obey the erasure window (see `privacy-and-data-rights.md`): keep them no longer than that window, or replay the deletion log after a restore. Encrypt them; name who may restore.
- The application's runtime database role must not be able to drop or alter the audit table (see `identity-and-sessions.md`, separate migrator and runtime roles).

## 3. Migrations

> **Test traps once a ledger exists:** an "idempotency" test that runs the migrations twice passes vacuously, because the second run skips every recorded file. Give the runner a replay-all mode and call it in those tests. Also test the two things a ledger exists for: two processes starting together run each file exactly once, and a failing migration stops the process before it listens.

- **Expand, then contract.** First deploy a change that the old and the new code both work with (add a nullable column, write both, backfill); remove the old shape only in a later release. "Reversible" means the expand step is harmless to roll back, not that every migration has a down script.
- A **ledger table** records each applied migration with a checksum; a changed or missing file is an error. Never re-run every file at every boot.
- One migrator at a time (advisory lock). Run migrations as a **separate command** in the deploy, not as a side effect of starting the web process.
- If a migration fails the process must **not serve** (readiness fails, the old instances keep serving); swallowing the error and continuing is a defect.
- **A database that has the tables but no ledger needs a baseline.** After comparing the real schema with what the files would build, record the existing files as applied (with their checksums) instead of running them against live data: "create if not exists" files stop being safe to run twice once an `ALTER` or a data fix is in the history. Offer the baseline as an explicit command, never as a silent boot step.
- **Set `lock_timeout` for DDL** (about 3-5 s) and retry a few times. A migration that waits for a lock on a busy table makes every later query queue behind it, and that looks like an outage. Prefer expand/contract steps that need no long lock.
- **Retry the database at boot** with a backoff for a minute or two before giving up. A hosted database that sleeps or restarts is slow to answer, and a process that exits on the first refused connection turns a short delay into a crash loop. Readiness stays red while it retries (`OPS-12`).
- Test: two instances starting at once; a failed migration leaves readiness red. The runbook rollback section must agree with this rule (a runbook that forbids rollback and a gate that demands reversibility contradict each other: pick expand/contract and say so).

## 4. Health and the System panel

- `/healthz` answers "is the process alive" and touches nothing. `/readyz` answers "can it serve": database reachable (with a short timeout), migration level current, critical dependencies. A route that returns a static "ok" is not a health check.
- Configure the platform's health probe to `/readyz` (and the restart probe to `/healthz`).
- The admin gets a **System** page even when there are no background jobs: version and build, migration level, uptime, dependency checks, last backup age, per-process limits (so the multi-instance caveat is visible), and the state of every runtime control. Excluding the jobs module must not drop this panel.
- **Show the versions side by side: the admin's own, the public app's and the API's.** "Is this user on the current version?" is the first support question, and the API build id alone (a commit hash) cannot be compared with what a user reads on their account screen. Give every deployable a plain version number that goes up with each release (a `version:bump` script, one number per deployable, shown with the build day and no time of day). The public app publishes `/version.json` (version, build id, day) with `Access-Control-Allow-Origin` and `Cache-Control: no-cache`, outside its service-worker precache, and the admin reads it (add that origin to the admin's `connect-src`, and say so in the security-headers note). If the file is missing, say "could not read it" instead of guessing. Note what the number means: it is what a **fresh load** gets; an installed app on an old version is exactly what the operator is comparing against.

## 5. Observability

- One **request id** on every route, public and admin: created at the edge, echoed in the response, written to every log line, to the error envelope and to the audit row.
- Logs are structured (JSON) on stdout; a log aggregator keeps them for the stated period. Name the **error tracker** (or say there is none and who reads logs).
- List 3-5 **symptom alerts**, each with a threshold and a recipient: error rate, p95 latency of the slowest key endpoint, failed-sign-in spike, queue age (if any), backup age. Alert on symptoms users feel, not on every cause.
- **Telemetry must explain, not only measure.** A page that says "p95 is 38 s" and nothing else sends the operator to read code. For every job that has a cheap path and an expensive fallback (a plain request, then a headless browser; a cache, then a recomputation), record on each event **which path answered and why the expensive one was needed** (a fixed reason code, never user text), and show: each kind split by path with count, failures, p50 and p95; the reasons, most frequent first; the latency distribution in a few fixed buckets; and the handful of slowest events. A health warning must **name where the figure comes from** ("slowest in Search: p95 40 s, while Details is 1 s; 34 runs needed the browser") and not just repeat it. A p95 over a few dozen runs can be a single outlier: show the count next to it.
- **List the inputs that skip the cheap path.** Every fast path has inputs it cannot serve (an optional field that is missing, a count above a limit, a new account with no data yet), and those inputs often arrive exactly when a user is new and impatient. Make the fallback reason observable, then test those inputs on purpose. Also check that the client timeout is longer than the server's worst case, or that identical requests in flight are coalesced; otherwise every client retry starts the expensive path again (not measured on the proving project: found by reading the code).

## 6. Incident kit

A short section in the runbook: severity levels (S1 users cannot use the product / data at risk, down to S4 cosmetic) with who is told and how fast; roles (who commands, who writes to users); contacts; how users are told (banner, status page, in-app message); when a **post-incident review** is mandatory (data loss or exposure, S1, a rollback of a publish) and its template (timeline, cause, what worked, what changes, owners). A personal-data incident also follows the breach checklist in `privacy-and-data-rights.md`.

## 7. Maintenance, read-only and minimum version

- **Maintenance mode** is enforced on the server: writes answer 503 with `Retry-After`, reads continue where safe, the admin shows why and until when, and a banner tells users in advance. A banner alone is not maintenance mode.
- **Read-only mode** (a bad migration, a failing dependency) is a runtime control with a reason and an audit row (`runtime-controls.md`).
- **Minimum client version** for installed apps: the API tells old clients to update (a header or a 426) and the client shows an update screen instead of failing in strange ways.
- **A tab left open across a deploy** (an admin with no service worker, where nothing tells it to update): it still runs the OLD index and asks for lazy files, named by a hash, that the new deploy no longer has. A host that rewrites every path to the HTML page answers those requests with HTML, so the user sees "MIME type text/html" and the router's default error screen, typically right after signing in again with an expired session. Exclude the asset folder from the rewrite so a missing file is a real 404; reload the page ONCE when the bundler reports a preload failure (limit it to once per 30 seconds so it can never loop); and give the router its own plain-words error screen with a button instead of the library's default. Test it on a production build by answering the lazy files with HTML.

## 8. Retention of operational data

Every event or log table has a retention rule and a purge that runs under its own role and writes one "purged N rows" audit row: scrape or API telemetry, admin sessions, login attempts, uploads, exports. Without it the database grows until it is a capacity incident. The audit table has its own policy (`audit-logging.md`).

## 9. Abuse and limits

Show limiter hits and let an operator block an IP or an account for a stated time (reason, expiry, audit). Limits are read through a function so they can change at runtime within bounds. A limiter kept in one process is wrong with several instances: use a shared store or say so. Key sign-in limits per account **and** address so one office NAT does not lock out all staff. Throttle admin writes too.

## 10. Jobs

When a queue or scheduler exists: a state machine (queued, running, succeeded, failed, dead), retries with backoff, a dead set with retry and delete in the UI, idempotent handlers (a job returned to the queue must be safe to run again), progress and cancel for long ones, a clean stop on SIGTERM with a forced-exit timer, and an alert on queue age. Import and export jobs follow the same rules (`import-export-and-bulk.md`). If there is none, record the exclusion with its reason.

## 11. Configuration

Validate the environment at boot and refuse to start on a missing or weak required value (fail fast). Show a read-only configuration view (names and non-secret values) and an environment badge. Compare the runbook's variable table with what the code reads (the scanner lists the names) so the two cannot drift.

## 12. Multi-instance behaviour

State what is per process (caches, limiters, pause flags) and test it on **two instances**, not by simulating the second one. If that is not done, `qa-report.md` says "not verified on two instances" and the runbook says "run one instance".
