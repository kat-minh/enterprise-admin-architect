# Module: Orders (`orders`)

> Archetype: workflow
> Layer/Evidence/Priority: domain / confirmed / P0
> Status: approved · Last updated: 2026-11-20

## Definition
- **Business purpose:** Let operators verify, fulfil, cancel and refund customer orders safely.
- **Navigation location:** Sales › Orders · `/admin/orders`
- **Primary entities:** Order, OrderItem
- **Related entities:** Payment, Customer, Product
- **Depends on modules:** customers, products, payments
- **Operators / roles:** order_staff (daily), finance (refunds), support (read)

## Permissions
| Permission | Description | Sensitive | Roles (default) |
|---|---|---|---|
| `orders.read` | View list and details | no | order_staff, support, finance |
| `orders.update` | Verify, ship, add notes | no | order_staff |
| `orders.cancel` | Cancel orders | yes | order_staff (unpaid only) |
| `orders.refund` | Refund orders | yes | finance |
| `orders.export` | Export orders | yes | finance |

Scopes: all.

## API dependencies
| Capability | Endpoint | Exists? | Notes |
|---|---|---|---|
| List | `GET /api/admin/orders` | no | Needs pagination, filters (status, date, customer), sort |
| Detail | `GET /api/admin/orders/:id` | partial | Add items, payments, timeline |
| Transition | `POST /api/admin/orders/:id/transitions` | no | Replaces free PATCH of status |
| Refund | `POST /api/admin/orders/:id/refund` | no | Idempotency key; Stripe refund |

Backend work required: implement in repo.

## List page
- **Search fields:** order number, customer name/email/phone (diacritic-insensitive)
- **Filters:** status, payment status, created date range, total range
- **Sortable columns:** created, total, status
- **Columns displayed:** number, customer, status, total, items, created, actions
- **Row actions:** open, mark shipped, cancel
- **Bulk actions:** export selected (orders.export); bulk mark shipped (limit 100, per-item results)
- **Pagination:** server-side, default 25
- **Export:** CSV honouring filters, async above 5,000 rows
- **Preview drawer contents:** items, totals, status, next action, last 3 timeline events

## Create / Edit
N/A - orders are created by checkout. Internal notes and shipping tracking are editable on the detail page.

## Detail page
- **Overview / header:** order number, status badge, customer, total, next-action banner
- **Tabs / sections:** Overview · Items · Payments · Shipping · Timeline
- **Related records:** customer, payments, refunds
- **Activity & audit timeline:** all transitions, notes, refunds
- **Available actions:** verify payment, mark shipped, complete, cancel, refund

## Business rules
- **Lifecycle & transitions:** PENDING → PAID (system) · PAID → SHIPPED (order_staff, needs tracking) · PENDING → CANCELLED (order_staff) · PAID/SHIPPED → CANCELLED only via refund (finance)
- **Constraints:** cannot ship unpaid; cannot refund more than paid minus refunded
- **Dependencies & deletion restrictions:** orders are never deleted
- **Approval requirements:** refunds over 5,000,000 VND require typed confirmation
- **Data integrity rules:** order item prices are snapshots; amounts in integer minor units

## Audit events
| Action key | When | Logged data | Sensitive? |
|---|---|---|---|
| `orders.update` | status transition, note | before/after status, reason | no |
| `orders.cancel` | cancel | reason | yes |
| `orders.refund` | refund | amount, reason, restock flag, Stripe refund ID | yes |
| `orders.export` | export | filter, row count | yes |

## Edge cases
| Case | Expected behaviour |
|---|---|
| No data | Empty state with explanation and link to storefront |
| Invalid data | Server returns 422 with field errors; shown inline |
| Duplicate records | Idempotency key prevents duplicate refunds |
| Missing relationships | Deleted product shown from item snapshot |
| Unauthorized (UI + API) | Buttons hidden; API returns 403 |
| API failure / timeout | Inline error with retry; no optimistic update |
| Concurrent modification | 409 STALE_VERSION → reload prompt |
| Large dataset | Server-side pagination; async export |

## Test scenarios
| # | Scenario | Type | Expected |
|---|---|---|---|
| 1 | support calls refund API | api | 403 |
| 2 | order_staff ships unpaid order | api | 409 |
| 3 | finance refunds partially twice | e2e | second respects remaining balance |
| 4 | filter + sort + page persists in URL | e2e | refresh keeps state |
