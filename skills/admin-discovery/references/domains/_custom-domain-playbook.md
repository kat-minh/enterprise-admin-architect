# Custom-Domain Playbook

Use when no domain file fits (DNA/lab testing, logistics, agriculture traceability, legal services, church/donation, equipment rental, funeral services, …). **Derive modules from the business process, not from a template.** Do not force the business into e-commerce.

## Contents
- Method (7 steps)
- Entity & process heuristics
- Worked example: DNA testing platform
- Worked example: Equipment rental
- Self-check

---

## Method

1. **Trace the customer's journey end-to-end** (from discovery to after-sales). List each *business event* (ordered a kit, sample received, result issued).
2. **Name the nouns that persist** → entities. Name the nouns that are *work items* with owners and deadlines → queues.
3. **Find the physical or off-system steps** (shipping a kit, lab analysis, driver pickup). They need *status entry points* in the admin because no code advances them automatically.
4. **Find the lifecycles**: for every entity that changes state, list states, who moves it, and what each move triggers (email, invoice, stock).
5. **Find the money**: what is sold, how paid, what can be refunded, what costs the business (COGS, vendor payouts).
6. **Find the risk**: PII, regulated data, irreversible actions, fraud. → permissions + audit + masking.
7. **Group into 3-8 domains and name modules by operator verbs/nouns** ("Sample Collection", not "Table 4").

## Entity & process heuristics

| Pattern in the business | Admin implication |
|---|---|
| Something is *ordered* then *fulfilled* later | Order + fulfilment workflow modules with status timeline |
| Something is *received/checked/processed* in steps | Processing pipeline (kanban/queue) with per-stage owner |
| A *result/document/report* is produced for the customer | Results/Report management: generate, review, approve, publish, revoke, version |
| A *scarce resource* is allocated (slots, rooms, devices, drivers) | Availability/scheduling module + conflict detection |
| A *third party* performs part of the work | Partner/supplier module + integration status + payables |
| *Regulated or sensitive* data | Restricted permissions, field masking, access log, retention policy |
| *Recurring* service or membership | Subscription/renewal module + dunning |
| *Physical goods* move | Inventory/serial tracking, shipments, chain of custody |

## Worked example - DNA testing platform

Journey: customer buys test package → kit shipped → customer returns sample → lab processes → report issued → optional counselling.

| ID | Module | Why |
|---|---|---|
| `test-packages` | Test Packages & Pricing | Sellable catalogue (panels, add-ons) |
| `orders` | Orders & Payments | Purchase, refunds |
| `kits` | Kit Inventory & Shipping | Kit serials, outbound shipments, returns |
| `sample-collection` | Sample Collection & Receiving | Chain of custody: received, damaged, insufficient → re-collection |
| `lab-orders` | Laboratory Orders / Batches | Group samples into batches, assign lab/instrument |
| `processing` | Test Processing Pipeline | Stage tracking (extraction → sequencing → QC) |
| `results` | Results Management | Raw → validated → approved; reviewer sign-off; amendments |
| `reports` | Report Management | Generate PDF, versioning, publish to customer, revoke/reissue |
| `customers` | Customer Records & Consent | Strict PII/genetic data access, consent versions |
| `partners` | Lab Partners | Contracts, TAT, integration status |
| `counselling` | Counselling Appointments | If offered |
| `compliance` | Consent, Retention & Data Requests | Export/delete requests, access logging |

Lifecycle highlight: `Sample: kit_sent → in_transit → received → qc_passed|qc_failed → processing → resulted → reported`.
Permissions highlight: `results.approve` ≠ `results.edit`; `customers.genetic_data` isolated; every access logged.
Dashboard queues: samples awaiting QC · batches overdue vs TAT · results awaiting approval · reports failed to deliver.

## Worked example - Equipment rental

Entities: Asset/Equipment (serialised), Rental/Reservation, Customer, Deposit, Damage report, Maintenance.
Modules: `assets`, `availability-calendar`, `rentals` (reserve → pick-up → out → returned → inspected → closed), `deposits-payments`, `damage-claims`, `maintenance`, `customers`, `pricing-rules`.
Critical logic: double-booking prevention, late fees, condition checklists at hand-over/return, asset unavailability during maintenance.

## Self-check
- Is every module justified by an event or entity discovered in step 1-2?
- Does every physical/off-system step have a manual status entry point?
- Is there an owner persona for every queue?
- Are sensitive data and irreversible actions identified with permissions and audit?
- Did I avoid importing modules from another domain "just because"?
