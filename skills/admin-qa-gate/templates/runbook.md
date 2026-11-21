# Admin Runbook

> Project: <name> · Date: <YYYY-MM-DD> · Owner: <person or team> · Gate: DOC-5 (`admin-qa-gate/references/quality-gates.md`)
> For the person who has to run the admin in production and the operators who use it. Names and steps only: **never write secret values here**.

## 1. Hosting and domains
| Part | Where it runs | Address | Notes |
|---|---|---|---|
| Admin app | <host / CDN> | <https://admin.example.com> | separate origin from the public product (why: bundle, cache, cookies) |
| API | <host> | <https://api.example.com> | admin namespace `/api/admin`, own CORS allow-list |
| Database | <provider / version> | - | migration tool, who may run migrations |
| Health probes | <platform setting> | `/healthz` (process), `/readyz` (database + migration level) | the platform restarts on the first and routes traffic on the second |

## 2. Environment variables
| Name | Secret? | Where it is set | Purpose and default |
|---|---|---|---|
| <ADMIN_ORIGINS> | no | <host settings> | browser origins allowed to call the admin API; empty in production means no browser origin is allowed |
| <JWT_SECRET> | **yes** | <secret store> | session signing; rotation: <how and what it invalidates> |

## 3. First Super Admin in production
The one-time bootstrap (command or script), where the initial password is delivered, that it is single-use and must be changed at first sign-in, how MFA is enabled, and how a lost Super Admin account is recovered (and who may do it).

## 4. Deploy and migrate
Order (database migration as a **separate command**, then API, then admin app). Migrations follow expand/contract, are recorded in a ledger and applied by one migrator at a time; a failed migration leaves `/readyz` red and the old instances serving. Rollback means rolling the code back and forward-fixing the schema (never dropping a column in the same release). A smoke check after each deploy: sign in, one list, one audit row, `/readyz`.

## 5. Backup and restore
What is backed up (database, uploads and stored assets), schedule, retention, **where the restore procedure is**. Fill the table; a row left empty is an open condition (gate OPS-1, OPS-2).

| Item | Value |
|---|---|
| RPO (data we can lose) | <e.g. 24 h> |
| RTO (time to be back) | <e.g. 4 h> |
| Backup retention vs the erasure window | <days; deleted people are removed again after a restore by replaying the deletion log> |
| Encrypted / who may restore | <yes / roles> |
| **Last restore drill** | <date, duration, tables compared, result, who> |

The database role the application uses must not be able to UPDATE or DELETE audit rows.

## 6. Roll back a content publish
How to restore the previous version of site content (module, tab, button), who may do it, how long until users see it, and what to do if the admin itself is unreachable (fallback: the public product runs on its bundled defaults).

## 7. Runtime controls and incident quick actions
| Situation | Action | Where | Who | Effect and delay |
|---|---|---|---|---|
| Third-party dependency failing | pause it | <module / switch> | <role> | <what users see; seconds until all instances agree> |
| Abusive account | suspend, revoke sessions | <module> | <role> | next request |
| Bad content published | roll back | <module> | <role> | <delay> |

## 8. Operator quick-start per role
| Role | Landing page | Daily tasks | Must not |
|---|---|---|---|
| <super_admin> | <dashboard> | <…> | <share the account; publish without a reason> |
| <support> | <users> | <…> | <reveal personal data without a ticket> |

## 9. Monitoring and known limits
Fill the tables; undecided cells are open conditions (gate OPS-1).

| Alert (symptom users feel) | Threshold | Who is told, how |
|---|---|---|
| <error rate> | <> 2 % for 5 min> | <owner, chat> |
| <p95 latency of the slowest key endpoint> | <> 1.5 s> | <> |
| <failed sign-ins spike> | <> |  <> |
| <backup age> | <older than 26 h> | <> |

Where logs go and for how long: <aggregator, retention>. Error tracker: <name, or "none; X reads logs weekly">. Request id: on every route and in every log line. Security headers (CSP, HSTS, ...) are set in: <file or platform setting>. What is per process (caches, rate limiters, pause flags) and therefore wrong with several instances: <list>. Run <1 / n> instances; tested on two: <yes / no>. The limitations listed in `qa-report.md`.

## 10. Incident response
| Severity | Meaning | Who is told, how fast |
|---|---|---|
| S1 | users cannot use the product, or data is at risk | <owner immediately> |
| S2 | a major feature is broken | <within 1 h> |
| S3 | degraded, workaround exists | <next working day> |
| S4 | cosmetic | <backlog> |

Incident commander: <role>. Writes to users: <role>, through <banner / status page / in-app message>. Contacts: <names and channels, no secrets>. A written **post-incident review** (timeline, cause, what worked, what changes, owners) is mandatory for data loss or exposure, S1, and a rolled-back publish; template: <link>.

## 11. Personal-data breach checklist
1. Record the time of detection and who found it. 2. Contain (revoke sessions, rotate keys, pause the feature). 3. Assess what data and whose. 4. Start the notification clock for each jurisdiction in `product-discovery.md` and notify the authority and the people as the law requires. 5. Collect evidence (audit rows, logs, request ids). 6. Name an owner. 7. Add the incident to the **breach register** (also the ones not notified). 8. Review afterwards and fix the cause.
