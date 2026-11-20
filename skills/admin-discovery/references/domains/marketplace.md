# Multi-vendor Marketplace / Platform with providers

**Signals:** Vendor/Seller/Provider/Host/Freelancer, Listing owned by third parties, Commission, Payout, Dispute, Review, buyer + seller sides.
Extends `ecommerce.md` (goods) or `travel-booking.md`/`healthcare-appointments.md` (services) - read the relevant one too.

## Modules
| ID | Module | Pri | Notes |
|---|---|---|---|
| `vendors` | Vendors / Sellers | P0 | Onboarding workflow, KYC docs, status, performance |
| `vendor-applications` | Vendor Applications | P0 | Review queue: pending → approved/rejected/more-info |
| `listings` | Listings (moderation) | P0 | Approve/reject/flag, quality score, policy violations |
| `orders` | Orders / Bookings (split by vendor) | P0 | Parent order + vendor sub-orders |
| `commissions` | Commission Rules | P1 | By category/vendor/tier; effective dating |
| `payouts` | Payouts & Settlements | P0 | Ledger; statements; holds; schedule; failed payout retry |
| `disputes` | Disputes & Claims | P1 | Case workflow with evidence and decision |
| `reviews` | Reviews & Ratings moderation | P1 | |
| `buyers` | Buyers / Customers | P1 | |
| `fees` | Fees & Taxes | P1 | |
| `trust-safety` | Trust & Safety | P1 | Fraud flags, bans, report queue |
| `marketplace-reports` | GMV, take rate, vendor leaderboard | P2 | |

## Lifecycles
- **Vendor:** `applied → in_review → approved | rejected → active → suspended → offboarded`.
- **Listing:** `draft → pending_review → live | rejected → paused → removed`.
- **Payout:** `accrued → on_hold → scheduled → paid | failed`.
- **Dispute:** `opened → evidence → under_review → resolved (refund/deny/split) → closed`.

## Dashboard
Queues: vendor applications · listings pending review · disputes by SLA · payouts failing/on hold · flagged content.
KPIs: GMV, take rate, active vendors, dispute rate, payout liability.

## Special permissions
`vendors.approve`, `listings.moderate`, `payouts.release`, `payouts.hold`, `commissions.manage`, `disputes.decide`.

## Audit-critical
Approvals, commission changes, payout release/hold, dispute decisions, vendor suspension, manual ledger adjustments.

## Edge cases & pitfalls
- Money flow is a ledger (double-entry style): never overwrite balances.
- Commission changes apply forward only; snapshot rate on each order.
- Refund after payout → negative balance handling.
- Vendor sees only their own data (vendor portal) - separate from platform admin; define boundary at Gate 1.
- Escrow/hold periods; tax/withholding per vendor country.
