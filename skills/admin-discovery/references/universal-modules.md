# Universal Modules (core + foundation)

Read when: step 6 of `admin-discovery`. Decide which universal modules apply, record exclusions with a reason.

## Contents
- Layer model
- CORE - mandatory for every web admin
- FOUNDATION - default-on and conditional (with applicability tests)
- ADVANCED - evaluate, rarely default
- Module description format

---

## Layer model

| Layer | Rule | Example |
|---|---|---|
| `core` | Always build. Non-negotiable for any web that has an admin. | Auth, RBAC, Dashboard, Admin accounts, Audit log, Settings, My account |
| `foundation` | Universal pattern, but include only if its **applicability test** passes. Exclusion must be recorded with a reason. | Media, Notifications, Import/Export, Trash, Site content, Leads inbox |
| `domain` | Derived from this site's business. See `domains/`. | Orders, Tours, Courses, Articles |
| *advanced* | Conditional; default exclude unless evidence demands. Mark `proposed`. | Multi-tenant, approval workflows, webhooks UI |

## CORE - mandatory for every web admin

### auth - Authentication & Sessions (P0)
Admin login/logout, session management, password policy & reset, protected routes, unauthorized (401) / forbidden (403) states, session expiry handling, brute-force protection. Add MFA and active-session list when the admin controls money, PII or many users. **Separate admin identity from public users** (separate role claim or table).

### rbac - Roles & Permissions (P0)
Even with two roles. Role list, permission catalog (`resource.action`), role→permission matrix, role assignment, module/action-level access, special permissions (`orders.refund`, `articles.publish`). **Server-enforced.** Seed system roles (Super Admin cannot be locked out).

### dashboard - Operational Dashboard (P0)
Domain-aware: attention queues (pending/overdue/failed), KPIs with comparison and definition, recent activity, quick actions, alerts. No placeholder stats. Differs per role. See `admin-design-system/references/dashboard-design.md`.

### admin-users - Admin Accounts (P0)
Internal staff directory: invite/create, role assign, activate/deactivate, last login, forced password reset. Distinct from `public-users`.

### audit-log - Audit Log (P0)
Who · what · which entity · when · before/after · IP/user-agent. Filter/search/timeline/detail. Written server-side for sensitive & destructive actions. Append-only; visible to authorised roles only.

### settings - System Settings (P1)
Operational and integration configuration: integration keys (masked, write-only), locale, time zone, currency, contact details used by the system, and toggles the system reads. Expose only settings the system reads **or that this build will make it read** (record the reader in the module spec); never a setting nothing will ever use. Boundaries: public-facing copy, branding and banners belong to `site-content`; kill switches, maintenance mode, flags and tunable limits belong to `app-controls` (`admin-module-builder/references/runtime-controls.md`). One owner per entity: if the public sees it, it is `site-content`.

### my-account - My Account & Security (P1)
Profile, change password, MFA, active sessions, personal notification prefs, API tokens if any.

## FOUNDATION - applicability tests

| ID | Module | Include when (test) | Typical priority |
|---|---|---|---|
| `public-users` | Users / Customers directory | The public site has login/registration or customer records. Show profile, status, activity, actions (suspend, reset, impersonate*). Add a **support 360 tab**: sign-in methods, recent errors, internal notes, a timeline fed by the audit and event log, and permissioned actions. Separate **staff**, **customers**, **partners/vendors** types. | P0-P1 |
| `notifications` | Notifications | Operators must react to events (new order, failed payment, new lead). In-app list, read/unread, deep links, preferences. These are alerts **for operators**; messages to end users are `user-messaging`. Skip if email-only alerts suffice. | P1 |
| `media` | Media & Files | The product stores uploads (images, docs). Library, upload, preview, filter by type, metadata, replace, delete, usage references, validation limits. | P1 |
| `import-export` | Import / Export | Bulk data is operated (catalogue upload, reports, accounting). CSV/XLSX, validation, error report, export history, async job status. Beware CSV formula injection. | P1-P2 |
| `trash` | Trash / Archive | Entities support soft delete or archiving. Restore, purge policy, who can purge. | P1 |
| `site-content` | Site Content & UI Control | **Any** business-owned content must change without a release: UI strings and translations, brand name / tagline / theme accent, banners and announcements, menus, static and legal pages, FAQs, homepage sections, SEO meta, redirects. **Websites and apps alike**: an app whose text, colours and messages live in source files has the same need. Test: "is it edited in code today and would the owner rather edit it?", never "is this a content website?". Draft, preview, publish, schedule, rollback. Decision guide: `site-content-and-config.md`; build: `admin-module-builder/references/site-content-cms.md`. **Very common - most missing on first-pass admins.** | P0 for content/marketing sites, else P1 |
| `leads-inbox` | Inbox: forms, feedback and reports | Public forms **or in-app feedback, bug reports and abuse reports** write data (contact, quote, newsletter, booking enquiry, "report a problem"). Status (new/contacted/closed), assignee, notes, export, spam handling; a button that posts with `fetch` counts as a form. | P0-P1 |
| `templates` | Message Templates | Code sends emails/SMS/Zalo/push with business-owned copy. Template list, variables, preview, test send, per-locale. Folded into `user-messaging` when that module exists. | P2 |
| `user-messaging` | End-user Messaging | The product reaches end users by e-mail, SMS, push or in-app messages beyond one-off transactional mail (the scan finds nodemailer, resend, web-push, FCM, twilio; or the owner wants announcements or a newsletter). Channels; per-locale templates with variables, preview and test send; broadcast composer with segment, schedule and a recipient-count dry run; delivery log with bounce and complaint status; opt-out and suppression; push-token pruning (404/410); rate limits; audit. | P1-P2 |
| `jobs-monitor` | Background Jobs, Integrations & System Health | Cron, queues, webhooks, third-party sync, a costly dependency, or several instances exist (the scan's `operations` block lists schedulers, webhook routes, mail call sites). Last run and duration, failures, retry or dead-letter, manual trigger (permissioned, audited), integration quota and key health, e-mail delivery, environment / version / migration status, links to logs and error tracking; for a search SDK: reindex trigger, status, synonyms, pinned results. Archetype 12. | P1 when the scan finds schedulers, queues or outbound mail; else P2 |
| `app-controls` | Runtime Controls | Boolean env gates or flag SDKs exist, a dependency is costly or fragile, or the owner needs maintenance mode, sign-up open/closed, minimum app version / force update, or tunable limits without a deploy. Typed registry, reason + audit, consequence preview, cached delivery with a stated failure mode. `admin-module-builder/references/runtime-controls.md`. | P1-P2 |
| `privacy-requests` | Privacy & Data Requests | End users have accounts or personal data (GDPR, Vietnam's Law 91/2025/QH15 and Decree 356/2025/ND-CP in force since 2026-01-01, CCPA and similar; `admin-module-builder/references/privacy-and-data-rights.md`). Request queue (export, erasure, correction) with deadline; account-deletion state machine `active → suspended → deletion_requested → deleted` including store-listing requirements; consent and terms-version acceptance log; retention jobs for sessions, audit and soft-deleted data; legal holds; backup and restore-drill note in the runbook. | P1-P2 |
| `search-command` | Global Search / Command Menu | Many modules (≥ 8) or ID-driven operations. Search across key entities + navigation actions. | P2 |
| `saved-views` | Saved Views / Filters | High-volume list pages with repeated filters. | P2 |
| `localization` | Localization | Two or more locales, with content in the database **or UI strings in code bundles**, and non-developers own the wording. Translation grid (key × locale), missing and outdated key report, placeholder and plural validation, glossary, CSV/XLIFF/JSON import and export, per-locale publish with a fallback chain, per-key history. Storage: code bundle as the default, database rows as overrides. Build on `site-content` (tier A). | P1 if applicable |
| `help` | Help / Changelog | Large team or complex workflows; links to runbooks, release notes. | P2 |

\* Impersonation ("login as user") is high risk: separate permission, banner while active, mandatory audit, no access to payment/credentials. Prefer a read-only "view as user" page inside the admin; see `admin-module-builder/references/security-baseline.md` for the pattern when a real login is unavoidable.

**Default-on** (include unless the owner says no, and record that answer): `public-users` when the product has accounts · `media` when it stores uploads · `site-content` when any UI copy, brand or banner is business-owned · `localization` when there are 2+ locales · `privacy-requests` when end users have personal data · `leads-inbox` when forms or feedback exist · `jobs-monitor` when schedulers, queues or outbound mail exist. Every other foundation module needs a positive reason to be included. The validator warns about any foundation ID that is neither in the inventory nor in `Excluded / deferred`.

## ADVANCED - evaluate, default exclude

Multi-tenant administration · approval workflows (maker/checker) · advanced analytics/BI · webhook & API key management (default-on for SaaS) · automation rules · support centre/tickets (default-on when public support exists) · financial reconciliation.

Draft/publish, preview, scheduling and version history are **not advanced** for content modules: they are required (archetype 11 and archetype 3 in `admin-module-builder/references/module-archetypes.md`). Feature flags and data retention are foundation modules (`app-controls`, `privacy-requests`).

For each, record purpose, dependency, and the evidence that would justify it. Mark `proposed` unless the code already implies it.

## Module description format (use in `module-inventory.md`)

```
ID: orders
Purpose: Let operators review, verify, fulfil, cancel and refund customer orders.
Layer/Evidence/Priority: domain / confirmed (prisma Order, checkout flow) / P0
Primary entities: Order, OrderItem, Payment, Shipment
Depends on: customers, products, payments
Why not generic CRUD: lifecycle with payment verification and refunds
```
