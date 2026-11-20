# Events & Ticketing

**Signals:** Event, Venue, Ticket type/Tier, Attendee, Order/Registration, Check-in/QR, Session/Speaker/Agenda, Seat map, Promo code.

## Modules
| ID | Module | Pri | Notes |
|---|---|---|---|
| `events` | Events | P0 | Draft/published; dates, venue, description, media, SEO, capacity |
| `ticket-types` | Ticket types & Pricing | P0 | Tiers, early-bird windows, quotas, per-order limits, visibility |
| `orders` | Orders / Registrations | P0 | Workflow; payment status; transfers; refunds |
| `attendees` | Attendees | P0 | Per-ticket holder data, custom registration questions |
| `checkin` | Check-in | P0 (on-site) | QR scan UI (mobile), live counters, offline tolerance, manual lookup |
| `agenda` | Sessions, Speakers & Agenda | P1 | Tracks, rooms, time conflicts |
| `venues` | Venues | P1 | Capacity, seat maps |
| `seating` | Seat maps / allocation | P2 | Only if reserved seating exists |
| `promos` | Promo codes & Discounts | P1 | |
| `sponsors` | Sponsors / Exhibitors | P2 | |
| `communications` | Attendee communications | P1 | Confirmation, reminders, updates; templates |
| `event-reports` | Sales & Attendance reports | P2 | |

## Lifecycles
- **Event:** `draft → published → on_sale → sold_out → ongoing → ended | cancelled | postponed`.
- **Order:** `pending → paid → issued → partially_refunded/refunded | cancelled`; tickets `issued → checked_in | void | transferred`.

## Dashboard
Per-event: tickets sold vs capacity (by tier), sales velocity, revenue, check-in rate (live on event day). Queues: pending payments expiring · refund requests · failed deliveries of tickets.

## Special permissions
`events.publish`, `orders.refund`, `tickets.void`, `tickets.transfer`, `checkin.operate` (separate staff role - minimal), `attendees.export`.

## Audit-critical
Capacity/price changes after on-sale, refunds, ticket voids/transfers, attendee exports, manual check-in overrides.

## Edge cases & pitfalls
- Overselling under load → atomic inventory reservation with expiry; queue (P2).
- Ticket uniqueness: QR signature, duplicate scan detection ("already checked in at 10:42 by X").
- Event cancellation/postponement → bulk refund/communication workflow.
- Time zone of event vs viewer; recurring events.
- Check-in staff need a stripped-down mobile view (separate layout/permission).
