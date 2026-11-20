# Real estate / Property listings

**Signals:** Property/Listing, Project/Development, Agent/Broker, Location (province/district), Inquiry/Viewing request, Price, Amenities, Floor plan.

## Modules
| ID | Module | Pri | Notes |
|---|---|---|---|
| `properties` | Properties / Listings | P0 | Type, purpose (sale/rent), price, area, specs, media/360, map location, legal docs, status |
| `projects` | Projects / Developments | P1 | Phases, units inventory, price lists, progress updates |
| `units` | Units / Inventory | P1 | Availability/hold/sold per unit; price list versions |
| `locations` | Locations & Areas | P1 | Hierarchy, slugs, SEO; boundaries optional |
| `amenities` | Amenities & Attributes | P1 | Filterable attributes |
| `agents` | Agents / Brokers | P1 | Profile, listings, commission, performance |
| `inquiries` | Inquiries & Viewing Requests | P0 | Leads inbox variant: assign agent, SLA, outcome |
| `owners` | Owners / Landlords | P2 | |
| `deals` | Deals / Pipeline | P2 | Reserve → deposit → contract → closed |
| `listing-moderation` | Listing moderation (user-submitted) | P1 | Only if public users can post |
| `property-reports` | Market & Performance reports | P2 | |

## Lifecycle
- **Listing:** `draft → pending_review → published → under_offer/reserved → sold/rented | expired | withdrawn`.
- **Inquiry:** `new → assigned → contacted → viewing_scheduled → viewed → negotiating → won | lost`.
- **Unit:** `available → held (expires) → deposit → sold`.

## Dashboard
Queues: inquiries unassigned/aging · listings pending review · listings expiring · holds expiring · stale listings (no updates).
KPIs: new listings, inquiries per listing, response time, conversion, inventory by status.

## Special permissions
`listings.publish`, `listings.feature`, `inquiries.assign`, `units.hold`, `pricing.edit`, `agents.manage`.

## Audit-critical
Price changes, status changes (sold/reserved), publish/unpublish, owner/contact data exports.

## Edge cases & pitfalls
- Duplicate listings (same address/phone) → detection and merge.
- Price history retained; currency/area units (m², sqft) conversions.
- Map coordinate validation; hide exact address option.
- Listing expiry/renewal; featured/boost schedules.
- Document uploads (legal) with restricted access; watermarking of images (P2).
