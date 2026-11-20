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
Only genuinely configurable values: site info, branding, locale/timezone/currency, contact info, operational toggles, integration keys (masked). Do not expose settings that nothing reads.

### my-account - My Account & Security (P1)
Profile, change password, MFA, active sessions, personal notification prefs, API tokens if any.

## FOUNDATION - applicability tests

| ID | Module | Include when (test) | Typical priority |
|---|---|---|---|
| `public-users` | Users / Customers directory | The public site has login/registration or customer records. Show profile, status, activity, actions (suspend, reset, impersonate*). Separate **staff**, **customers**, **partners/vendors** types. | P0-P1 |
| `notifications` | Notifications | Operators must react to events (new order, failed payment, new lead). In-app list, read/unread, deep links, preferences. Skip if email-only alerts suffice. | P1 |
| `media` | Media & Files | The product stores uploads (images, docs). Library, upload, preview, filter by type, metadata, replace, delete, usage references, validation limits. | P1 |
| `import-export` | Import / Export | Bulk data is operated (catalogue upload, reports, accounting). CSV/XLSX, validation, error report, export history, async job status. Beware CSV formula injection. | P1-P2 |
| `trash` | Trash / Archive | Entities support soft delete or archiving. Restore, purge policy, who can purge. | P1 |
| `site-content` | Site Content Control | Public pages have business-editable content: menus, banners, static pages (about/terms/privacy), FAQs, homepage sections, SEO meta, redirects, sitemap/robots. **Very common - most missing on first-pass admins.** | P0-P1 |
| `leads-inbox` | Leads & Submissions Inbox | Public forms write data (contact, quote, newsletter, booking enquiry). Status (new/contacted/closed), assignee, notes, export, spam handling. | P0-P1 |
| `templates` | Message Templates | Code sends emails/SMS/Zalo with business-owned copy. Template list, variables, preview, test send, per-locale. | P2 |
| `jobs-monitor` | Background Jobs & Integrations Health | Cron, queues, webhooks, third-party sync exist. Run history, failures, retry, integration status. | P2 |
| `search-command` | Global Search / Command Menu | Many modules (≥ 8) or ID-driven operations. Search across key entities + navigation actions. | P2 |
| `saved-views` | Saved Views / Filters | High-volume list pages with repeated filters. | P2 |
| `localization` | Content Localization | Public site is multilingual and content is DB-driven. Translation status per locale. | P1 if applicable |
| `help` | Help / Changelog | Large team or complex workflows; links to runbooks, release notes. | P2 |

\* Impersonation ("login as user") is high risk: separate permission, banner while active, mandatory audit, no access to payment/credentials.

## ADVANCED - evaluate, default exclude

Multi-tenant administration · approval workflows (maker/checker) · content version history & scheduled publishing (default-on for news/CMS domains) · advanced analytics/BI · webhook & API key management (default-on for SaaS) · automation rules · support centre/tickets (default-on when public support exists) · financial reconciliation · data-retention policies · feature flags UI.

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
