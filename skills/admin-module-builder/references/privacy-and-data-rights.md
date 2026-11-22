# Privacy and Data Rights

Read when: the product stores personal data (accounts, e-mails, locations, expenses, messages, photos), when the module inventory contains `users`, `privacy-requests`, `consent` or an audit log, before a store release (an app store requires in-app account deletion), and when the owner says "a customer asked to delete their data". Gates: `PRIV-1` to `PRIV-8` in `quality-gates.md` (section J). Everything here is engineering guidance, **not legal advice**: say so in `product-discovery.md` and ask the owner to confirm the legal duties with counsel.

## Contents
1. The data map
2. Which law applies (and when it was last checked)
3. Data subject requests: access, export, correction, erasure
4. Account deletion
5. Consent, notices and legal pages
6. Personal data inside the audit log
7. Retention
8. Breach response
9. Reading personal data from the admin
10. Processors, impact assessments and backups

## 1. The data map

Before any module that touches personal data, write one table in `business-domain-map.md` (it is also the retention table, the erasure matrix and the export bundle): **entity | personal data in it | purpose | legal basis | who in the admin may see it | retention | on account deletion: delete / anonymise / keep (why)**. A foreign key with `ON DELETE CASCADE` is a deletion decision made by accident: list every one and decide it on purpose. Include places people forget: sessions, login attempts, uploads, exports, error-tracker events, backups, analytics.

## 2. Which law applies (and when it was last checked)

Write a small jurisdiction table in `product-discovery.md` with a **last reviewed** date and "confirm with counsel". Do not hard-code deadlines in code or in the skill's text; keep them in configuration the owner can change. As of 2026-11-21 (re-check before relying on it):

| Where users are | Instrument | Note |
|---|---|---|
| Vietnam | Law on Personal Data Protection No. 91/2025/QH15 and Decree 356/2025/ND-CP, both in force from 1 January 2026; they replaced Decree 13/2023/ND-CP | Law firms' summaries report short response and deletion deadlines (days, not weeks), consent that can be proven, impact-assessment dossiers and breach notification clocks. Read the statute, do not rely on a summary |
| EU / EEA / UK | GDPR / UK GDPR | Access, erasure, portability and restriction within one month (extendable); breach notification to the authority within 72 hours where required |
| Elsewhere | the local law | Ask |

Sources checked on that date: PwC Vietnam legal news brief (2026-01-28), EY Vietnam legal alert (2026-03) and the Future of Privacy Forum issue brief on Vietnam's new regime; for GDPR the articles themselves.

## 3. Data subject requests: access, export, correction, erasure

A request has a **state machine and a clock**: received (clock starts) → identity verified → in progress → completed, or rejected with a stated reason. Store who received it, the due date (from configuration), and every step in the audit log. The admin module (`privacy-requests`) shows the queue sorted by due date with an overdue flag, a checklist per request type and a button per step; nothing is done by hand in the database.
- **Export bundle:** machine-readable (JSON, plus CSV for tables), every entity of the data map that belongs to the person, attachments included or linked, delivered through a link that expires and is audited. Test that the bundle contains data from **every** entity of the map.
- **Correction:** the admin may correct only through the same validated paths the user has, with an audit row.
- **Erasure:** follows the matrix of §1. Check holds first (legal claim, dispute, investigation) and refuse or defer with a reason. After erasure the person must not reappear from a cache, a search index, a backup restore (see §10) or the next import.

## 4. Account deletion

Apple and Google Play require that an app that lets people create an account also lets them **delete it inside the app**. So the public product needs a delete-account flow (re-authenticate, say what will be deleted and what is kept and why, a grace period if you want one) and the admin needs the matching tools: see the request, run or cancel it, prove it finished. "Handled manually in the database" is not acceptable at a store release; deferring this at Gate 1 needs the owner's written acknowledgement of the risk.

## 5. Consent, notices and legal pages

- A `consent_events` table: user, purpose, version of the text shown, channel, given_at, withdrawn_at. Consent is never pre-ticked, can be withdrawn as easily as it was given, and can be proven later.
- Terms of use and privacy notice are **site-content rows with versions** (`site-content-cms.md`), so a change is published, dated and rolled back like any other; the signup flow links to them and records which version was shown.
- The admin shows consent per user (read) and exports it with the data bundle.

## 6. Personal data inside the audit log

The audit log is append-only, so personal data written into it cannot be erased later. Decide this when writing the first row:
- Actor and entity **labels are pseudonymous** (user id plus username), never "Name <email>". Keep the e-mail in the user record, not in the log.
- Free-text **reasons** can contain personal data: the dialog warns "do not write personal data here", and the log viewer is restricted like other personal data.
- Erasure leaves audit rows in place (legal-claims and accountability basis) but they carry no direct identifier; if a row must be redacted, use a redaction table joined at read time, never an UPDATE of the audit table.
- **Every route that returns audit rows** (an entity timeline on a user or a trip page counts) needs `audit-log.read` or a projected, masked DTO. A role without audit access must not get actor e-mails, IP addresses, user agents or diffs through a timeline.
- Reading the log is itself sensitive: export of the log is a permission, an async job and an audit row.

## 7. Retention

Every table in the data map has a retention rule, and a **purge job** that enforces it under its own database role, in batches, writing one "purged N rows of X" audit row. Append-only tables are purged by dropping whole partitions or by a role that owns the exception, not by disabling the trigger. A **legal-hold** flag on a subject or case blocks purge and erasure until released (reason, owner, audit). Backups obey the same window.

## 8. Breach response

A checklist in the runbook (`operations-readiness.md` §6): detect and record the time; contain; assess what and whose data; **start the notification clock** for each jurisdiction in §2; notify the authority and the people as the law requires; collect evidence; assign an owner; keep a **breach register** with every incident, even ones not notified; review afterwards.

## 9. Reading personal data from the admin

Masked by default; a **reveal** needs a permission and a reason, is audited with what was seen, and hides again. Add: a per-admin cap and an alert when a person reveals more than N records in an hour; an optional ticket or case id field; step-up re-authentication (`identity-and-sessions.md`); a read-only role gets no reveal. Exports of personal data are a separate permission, async, audited and expiring.

Two ways masking is defeated. (1) A field that works as a **credential** (a legacy login name, an API identifier, a handle used to sign in) is masked for every role, even the ones that see e-mail addresses, and is never shown in a list. (2) **Search**: a free-text search over a masked field tells the searcher whether a guess is right, one prefix at a time. Leave masked fields out of free-text search (and say so in the placeholder), or accept only an exact match from a role that holds the reveal permission and audit it as a reveal. Test both as a role without the permission: search for a known full value and assert that no row comes back (`SEC-23`).

## 10. Processors, impact assessments and backups

Keep a table of **processors** (hosting, e-mail, maps, analytics, error tracking): what data, where, contract in place. Ask the **impact-assessment question** at discovery: does the product handle precise location, children's data, biometrics, health or financial data, or profile at scale? If yes, record that an assessment is needed and who owns it. Backups hold personal data: encrypt, limit who restores, keep within the retention window, and after a restore **replay the deletion log** so erased people do not come back.
