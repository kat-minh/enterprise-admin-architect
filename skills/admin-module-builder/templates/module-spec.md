# Module: <Name> (`<module-id>`)

> Archetype: catalog | workflow | content | inbox/queue | ledger | settings | calendar | directory | media | report
> Layer/Evidence/Priority: <core|foundation|domain> / <confirmed|implied|proposed> / <P0|P1|P2>
> Status: draft | approved | implemented · Last updated: <YYYY-MM-DD>
> Headings below are machine-checked. If a section does not apply, write `N/A - <reason>`; never delete it.

## Definition
- **Business purpose:** <one or two sentences>
- **Navigation location:** <group › item · route>
- **Primary entities:** <…>
- **Related entities:** <…>
- **Depends on modules:** <…>
- **Operators / roles:** <who uses it and how often>

## Permissions
| Permission | Description | Sensitive | Roles (default) |
|---|---|---|---|
| `<module-id>.read` | View list and details | no | |
| `<module-id>.create` | | | |
| `<module-id>.update` | | | |
| `<module-id>.delete` | Archive / soft delete | yes | |

Scopes: <own / team / all, if any>

## API dependencies
| Capability | Endpoint | Exists? | Notes (pagination, filters, authz, validation) |
|---|---|---|---|

Backend work required: <implement / document / none>

## Public-site integration
Fill for every module whose data the public product renders or enforces (content, configuration, flags, catalogue, availability, banners). Write `N/A - admin-only` if the public product never reads it.
- **Public read path:** <endpoint or build hook; published data only, never drafts or staff identity>
- **Caching and invalidation:** <ETag / version, max-age, CDN purge or revalidation on publish, service-worker handling>
- **When a change takes effect:** <seconds / next app start / next build; stated to the editor>
- **Fallback:** <what the public product does when the read path fails: cached copy, then code defaults>
- **Backfill:** <how today's hard-coded values are extracted, in the same change as the reader>
- **Preview and rollback:** <how an editor sees the change before users do; how it is undone>
- **Public code changed:** <files, in the public repo or app, that now read admin-managed values>

## List page
- **Search fields:** 
- **Filters:** 
- **Sortable columns:** 
- **Columns displayed:** 
- **Row actions:** 
- **Bulk actions:** (permission, confirmation, limits, per-item results)
- **Pagination:** server-side, default page size <25>
- **Export:** <formats, filters honoured, async threshold>
- **Preview drawer contents:** 

## Create / Edit
- **Fields:** | name | type | required | validation | default | notes |
- **Relationships:** 
- **Uploads:** <types, size, storage>
- **Submission behaviour:** <success navigation, idempotency, optimistic concurrency>

## Detail page
- **Overview / header:** <title, status, key facts, primary action>
- **Tabs / sections:** 
- **Related records:** 
- **Activity & audit timeline:** 
- **Available actions:** 

## Business rules
- **Lifecycle & transitions:** `<state> → <state>` (who, guard, side effects)
- **Constraints:** 
- **Dependencies & deletion restrictions:** 
- **Approval requirements:** 
- **Data integrity rules (DB constraints/indexes):** 

## Audit events
| Action key | When | Logged data | Sensitive? |
|---|---|---|---|
| `<module-id>.create` | | | |

## Edge cases
| Case | Expected behaviour |
|---|---|
| No data | |
| Invalid data | |
| Duplicate records | |
| Missing relationships | |
| Unauthorized (UI + API) | |
| API failure / timeout | |
| Concurrent modification | |
| Large dataset | |

## Test scenarios
| # | Scenario | Type (unit/api/e2e/manual) | Expected |
|---|---|---|---|
