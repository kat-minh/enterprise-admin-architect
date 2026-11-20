# Travel & Booking (tours, hotels, activities)

**Signals:** Tour/Package, Destination, Hotel/Room, Booking/Reservation, Departure/Availability, Itinerary, Supplier.

## Modules
| ID | Module | Pri | Notes |
|---|---|---|---|
| `destinations` | Destinations / Regions | P0 | Hierarchy (country→city), SEO, media |
| `tours` | Tours / Packages (or `properties`+`rooms` for hotels) | P0 | Itinerary builder (day-by-day), inclusions/exclusions, media, policies |
| `departures` | Departures & Availability Calendar | P0 | Capacity per date, cut-off, close/open, calendar view with bulk edit |
| `pricing` | Pricing & Seasonal Rates | P0 | Adult/child/infant tiers, seasons, surcharges, effective dating |
| `bookings` | Bookings | P0 | Workflow archetype; hold → confirm → paid → travelled |
| `payments` | Payments / Deposits | P0-P1 | Deposit & balance schedule, manual bank-transfer confirm |
| `cancellations` | Cancellations & Refunds | P1 | Policy-driven fee calculation |
| `customers` | Customers / Travellers | P1 | Passenger details, passport (PII - restricted) |
| `suppliers` | Suppliers & Partners | P2 | Hotels, transport, guides; contracts, payables |
| `enquiries` | Enquiries / Custom-tour requests | P1 | Leads inbox variant → convert to booking |
| `reviews` | Reviews | P2 | Moderation |
| `booking-reports` | Booking Analytics | P2 | By destination, source, lead time, occupancy |

## Lifecycles
- **Booking:** `enquiry → held (expires) → confirmed → deposit_paid → fully_paid → completed`; `cancelled`, `no_show`, `refunded`. Hold must auto-expire and release capacity.
- **Departure:** `open → limited → sold_out → closed/guaranteed → departed`.

## Dashboard
Queues: bookings pending confirmation · holds expiring today · balance payments due · enquiries unanswered > SLA · departures with low fill (go/no-go).
KPIs: bookings & revenue vs prior, occupancy by departure, cancellation rate, lead sources.

## Special permissions
`bookings.confirm`, `bookings.cancel`, `bookings.refund`, `pricing.manage`, `departures.close`, `customers.pii` (passport data).

## Audit-critical
Price/season edits, manual booking confirmation, capacity overrides, refunds, cancellation fee waivers, passenger data export.

## Edge cases & pitfalls
- Overbooking via concurrent bookings → atomic capacity decrement.
- Pricing changes must not alter existing bookings (snapshot).
- Multi-room/multi-pax booking, child ages affecting price, group bookings.
- Time zones for cut-offs; multi-currency.
- Availability calendar must be server-driven per range (month), not whole-year load.
- Partial cancellation of a party; waitlists (P2).
