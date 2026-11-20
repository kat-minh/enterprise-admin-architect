# Food & Beverage / Restaurant / Ordering & Reservations

**Signals:** Menu, MenuItem, Modifier/Option, Table, Reservation, Order (dine-in/pickup/delivery), Branch, Kitchen, Combo/Voucher.

## Modules
| ID | Module | Pri | Notes |
|---|---|---|---|
| `menu` | Menu & Items | P0 | Categories, items, options/modifiers, price per branch, availability toggle (86'd), allergens |
| `orders` | Orders | P0 | Live board (new/preparing/ready/out/delivered) + history; sound/visual alert |
| `reservations` | Reservations & Tables | P0 (if present) | Floor/table plan, party size, time slots, deposits, waitlist |
| `branches` | Branches & Opening hours | P1 | Hours, holidays, delivery radius, prep time |
| `customers` | Customers | P1 | Order history, favourites, notes |
| `promotions` | Vouchers & Promotions | P1 | Combos, time-based, first-order |
| `delivery` | Delivery / Drivers | P1 | Zones, fees, driver assignment, status; or integration status (Grab/Now) |
| `payments` | Payments / Cash-up | P1 | Method split, reconciliation, refunds |
| `inventory` | Ingredients & Stock | P2 | Recipe-based depletion |
| `reviews` | Reviews | P2 | |
| `fnb-reports` | Sales by item/hour/branch | P2 | |

## Lifecycles
- **Order:** `placed → accepted → preparing → ready → out_for_delivery → delivered | picked_up`; `rejected`, `cancelled`, `refunded`.
- **Reservation:** `requested → confirmed → seated → completed`; `cancelled`, `no_show`.
- **Item:** `active ↔ sold_out(today) ↔ hidden`.

## Dashboard
Live: orders by status with timers (SLA breach highlight) · tables occupancy · items sold out. Queues: unaccepted orders · late orders · reservations to confirm.
KPIs: revenue by hour/day, AOV, prep time, cancellation rate, top items.

## Special permissions
`orders.cancel`, `orders.refund`, `menu.price`, `menu.availability` (floor staff), `reservations.override`.

## Audit-critical
Price changes, voids/refunds, manual order edits, voucher creation.

## Edge cases & pitfalls
- Real-time needs (polling/WebSocket/SSE) with audible alerts; kiosk/tablet usage → larger touch targets and a dedicated "live" layout.
- Branch-specific menus/prices/availability; scheduled availability (breakfast menu).
- Order edits after acceptance; partial refunds; tips; split bills.
- Peak load: lists must be paginated/virtualised; auto-refresh without losing selection.
