# Domain Catalog Index

Match **signals found in the code/data** (models, routes, integrations) to domain files. Read only the matching files. A product often spans 2-3 domains (e.g. education + e-commerce) - merge, deduplicate shared entities (Customer, Payment) and keep one owner module per entity.

| Domain file | Strong signals (models / routes / libs) |
|---|---|
| `ecommerce.md` | Product, Cart, Order, Checkout, Inventory/SKU, Coupon, Shipping, Stripe/PayPal/VNPay |
| `travel-booking.md` | Tour, Destination, Hotel/Room, Booking, Availability, Itinerary, Departure date |
| `education-lms.md` | Course, Lesson, Student, Enrollment, Class/Cohort, Instructor, Quiz/Assessment, Certificate |
| `corporate-agency.md` | Services, Portfolio/Projects, Team, Testimonials, Case studies, Contact/Quote form, static pages |
| `news-publishing.md` | Article/Post, Category, Tag, Author, Comment, Editorial status, Newsletter |
| `saas.md` | Organization/Workspace/Tenant, Subscription/Plan, Usage, API key, Invoice, Seats, Webhooks |
| `marketplace.md` | Vendor/Seller/Provider, Commission, Payout, Listing by third parties, Disputes |
| `healthcare-appointments.md` | Patient, Doctor/Practitioner, Appointment, Clinic/Branch, Service/Treatment, Medical record |
| `real-estate.md` | Property/Listing, Agent, Inquiry/Viewing, Project/Development, Location, Price |
| `job-board.md` | Job, Employer/Company, Candidate, Application, Resume/CV, Pipeline stage |
| `fnb-ordering.md` | Menu, MenuItem, Table, Reservation, Order (dine-in/delivery), Branch, Kitchen |
| `events-ticketing.md` | Event, Venue, Ticket type, Attendee, Check-in, Session/Speaker, Seat |
| `community-ugc.md` | Post/Thread, Comment, Report/Flag, Moderation, Reputation, Ban, Group |
| `fintech-kyc.md` | Wallet/Account, Transaction, KYC document, Loan/Application, Risk, Ledger |
| `_custom-domain-playbook.md` | **None of the above fit** (e.g. DNA testing, logistics, church/donation, agriculture, legal services). Derive modules from first principles. |

## Merge rules
1. One owner module per entity. Shared entities (Customer, Payment, Media) live in `foundation`/primary domain; others link to them.
2. Choose the **dominant revenue flow** as the sidebar's first domain group.
3. If the signals only half match (e.g. "Product" with no cart/orders - a catalogue site), take the catalogue part only. Do **not** add Orders/Inventory/Payments for a site that cannot sell.
4. Brochure sites with a few DB-driven sections → `corporate-agency.md` + foundation `site-content` + `leads-inbox`.
5. When unsure, list both candidate modules and mark the weaker one `proposed`.
