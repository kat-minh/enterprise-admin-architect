# Healthcare / Clinic / Appointment-based services

**Signals:** Patient/Client, Doctor/Practitioner/Therapist/Stylist, Appointment/Slot, Clinic/Branch, Treatment/Service, Medical record/Note, Prescription.
Also fits salons, spas, gyms, consulting, legal clinics (replace "patient" with "client"). Regulated data (health) raises the bar for access control and audit.

## Modules
| ID | Module | Pri | Notes |
|---|---|---|---|
| `appointments` | Appointments | P0 | Calendar + list; status workflow; reschedule/cancel with reasons |
| `schedules` | Practitioner Schedules & Availability | P0 | Working hours, breaks, leave, slot length, buffers, overrides |
| `patients` | Patients / Clients | P0 | Demographics, contact, history, consent, notes (restricted) |
| `practitioners` | Doctors / Practitioners | P0 | Profile, specialty, services, branches, credentials |
| `services` | Services / Treatments & Pricing | P0 | Duration, price, prerequisites, required resources |
| `branches` | Clinics / Branches / Rooms | P1 | Opening hours, rooms/equipment as resources |
| `records` | Clinical Notes / Records | P1 | Only if the product stores them; strict access, immutability + amendments |
| `billing` | Billing & Payments | P1 | Invoices, insurance codes (if any), deposits, refunds |
| `reminders` | Reminders & Messaging | P1 | SMS/email/Zalo templates, delivery status |
| `waitlist` | Waitlist | P2 | Auto-offer cancelled slots |
| `feedback` | Feedback / Reviews | P2 | |
| `clinic-reports` | Utilisation & No-show reports | P2 | |

## Lifecycle
- **Appointment:** `requested → confirmed → checked_in → in_progress → completed`; `cancelled`, `no_show`, `rescheduled`.
- **Patient record:** `active → archived`; records are amended, never overwritten.

## Dashboard
Queues: requests to confirm · today's schedule by practitioner · no-shows to follow up · unpaid invoices · reminders failed.
KPIs: bookings, utilisation %, no-show rate, revenue by service/practitioner.

## Special permissions
`patients.read_clinical` (separate from demographics), `records.amend`, `appointments.override_slot`, `billing.refund`, `patients.export`.

## Audit-critical
**Every read of clinical data** (access log), record amendments, schedule overrides, exports, refunds, deletions/anonymisation.

## Edge cases & pitfalls
- Double booking → slot reservation with unique constraint; practitioner + room + equipment resources.
- Time zones, daylight changes, recurring appointments, series edits.
- Minors/guardians, consent versions, data retention and deletion rules (legal).
- Mask PII in lists; reveal-on-demand with audit; never email clinical details.
- Reschedule rules (cut-off window), late-cancel fees.
