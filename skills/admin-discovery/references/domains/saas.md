# SaaS platform

**Signals:** Organization/Workspace/Tenant, Membership/Seat, Subscription/Plan, Usage/Metering, Invoice, API key, Webhook, Feature flags, Onboarding.
Two admin audiences: **platform operators** (your staff - this admin) vs **tenant admins** (customer-facing settings; usually part of the product, not this admin).

## Modules
| ID | Module | Pri | Notes |
|---|---|---|---|
| `organizations` | Organizations / Tenants | P0 | Status, plan, owner, members, usage, health score, notes |
| `users` | Users (cross-tenant) | P0 | Search by email; memberships; suspend; impersonate (restricted) |
| `plans` | Plans & Entitlements | P0 | Limits, features, price points; versioned |
| `subscriptions` | Subscriptions & Billing | P0 | Status, trials, renewals, proration, dunning, manual adjustments |
| `invoices` | Invoices & Payments | P1 | Ledger; links to billing provider (Stripe) |
| `usage` | Usage & Metering | P1 | Per-tenant consumption, limits, overage |
| `api-keys` | API Keys / OAuth apps | P1 | Per-tenant keys, scopes, revoke, last used |
| `webhooks` | Webhooks & Integrations | P2 | Delivery log, retries, endpoint health |
| `feature-flags` | Feature Flags / Entitlements | P2 | Per-tenant overrides |
| `support` | Support tools | P1 | Tenant lookup, notes, impersonation log, data export |
| `system-health` | System Health & Jobs | P2 | Queue depth, errors, incidents |
| `announcements` | Announcements / Changelog | P2 | In-app messaging |
| `plat-analytics` | Platform Analytics | P2 | MRR, churn, activation, usage trends |

## Lifecycles
- **Tenant:** `trial → active → past_due → suspended → cancelled → deleted(purged)`.
- **Subscription:** `trialing → active → past_due → canceled`; paused; upgrade/downgrade effective dates.
- **API key:** `active → rotated → revoked`.

## Dashboard
Queues: trials ending · past-due accounts · failed webhooks/jobs · abuse flags · support escalations.
KPIs: MRR/ARR, new vs churned, active tenants, usage vs limits, ARPA.

## Special permissions
`tenants.suspend`, `tenants.impersonate`, `billing.adjust`, `plans.manage`, `api_keys.revoke`, `data.export_tenant`.

## Audit-critical
Impersonation (start/stop), billing adjustments, plan changes, suspension/deletion, API key creation/revocation, data export/deletion (GDPR).

## Edge cases & pitfalls
- Tenant isolation in every query (admin queries cross-tenant intentionally - guard strictly).
- Billing provider is source of truth; admin shows synced state + deep link; webhook idempotency.
- Never display secrets again after creation; show last 4/prefix.
- Plan changes vs grandfathered customers; usage reset boundaries (timezone).
- Deleting a tenant = async purge job with confirmation delay.
