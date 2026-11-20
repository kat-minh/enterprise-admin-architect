# Admin Runbook

> Project: <name> · Date: <YYYY-MM-DD> · Owner: <person or team> · Gate: DOC-5 (`admin-qa-gate/references/quality-gates.md`)
> For the person who has to run the admin in production and the operators who use it. Names and steps only: **never write secret values here**.

## 1. Hosting and domains
| Part | Where it runs | Address | Notes |
|---|---|---|---|
| Admin app | <host / CDN> | <https://admin.example.com> | separate origin from the public product (why: bundle, cache, cookies) |
| API | <host> | <https://api.example.com> | admin namespace `/api/admin`, own CORS allow-list |
| Database | <provider / version> | - | migration tool, who may run migrations |

## 2. Environment variables
| Name | Secret? | Where it is set | Purpose and default |
|---|---|---|---|
| <ADMIN_ORIGINS> | no | <host settings> | browser origins allowed to call the admin API; empty in production means no browser origin is allowed |
| <JWT_SECRET> | **yes** | <secret store> | session signing; rotation: <how and what it invalidates> |

## 3. First Super Admin in production
The one-time bootstrap (command or script), where the initial password is delivered, that it is single-use and must be changed at first sign-in, how MFA is enabled, and how a lost Super Admin account is recovered (and who may do it).

## 4. Deploy and migrate
Order (database migration, API, admin app), how migrations are made idempotent, what a rollback looks like, and a smoke check after each deploy (sign in, one list, one audit row).

## 5. Backup and restore
What is backed up (database, uploads), schedule, retention, **where the restore procedure is**, and the date and result of the last restore drill. The database role the application uses must not be able to UPDATE or DELETE audit rows.

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
Which alerts exist, where logs and errors go, what is per process (caches, rate limiters) and therefore wrong with several instances, and the limitations listed in `qa-report.md`.
