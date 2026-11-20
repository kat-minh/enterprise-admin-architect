# Module Inventory

> Project: Fixture Shop (example) · Date: 2026-11-20
> Example output of `admin-discovery` for a small Next.js + Prisma + Stripe shop. Not a real project.

| ID | Module | Layer | Evidence | Priority | Source / Justification | Depends on | Status |
|----|--------|-------|----------|----------|------------------------|------------|--------|
| auth | Authentication & Sessions | core | confirmed | P0 | `src/auth.ts` (NextAuth) serves customers; admin needs its own guarded login | - | done |
| rbac | Roles & Permissions | core | confirmed | P0 | `User.role` enum (CUSTOMER/ADMIN/EDITOR) is only used to hide links; needs real permissions | auth | planned |
| dashboard | Dashboard | core | implied | P0 | Operators need queues: orders to ship, refunds, low stock | auth, rbac, orders | planned |
| admin-users | Admin Accounts | core | implied | P0 | Staff must be separate from `User` customers | auth, rbac | planned |
| audit-log | Audit Log | core | implied | P0 | Refunds, price and stock edits must be traceable | auth | planned |
| settings | System Settings | core | confirmed | P1 | Shipping fee and store info are hard-coded in `src/lib/config.ts` | rbac | planned |
| my-account | My Account & Security | core | implied | P1 | Password/MFA/sessions for staff | auth | planned |
| products | Products | domain | confirmed | P0 | Prisma `Product`; `/products/[slug]`; `deletedAt` soft delete | categories, media | planned |
| categories | Categories | domain | confirmed | P0 | Prisma `Category` with products relation | - | planned |
| orders | Orders | domain | confirmed | P0 | Prisma `Order` + `OrderStatus` enum; `/api/orders` | customers, products, payments | in-progress |
| payments | Payments | domain | confirmed | P0 | Stripe dependency; paid status transitions | orders | planned |
| customers | Customers | domain | confirmed | P0 | Prisma `User` (role CUSTOMER) with orders | - | planned |
| refunds-returns | Returns & Refunds | domain | implied | P1 | Orders can be PAID/SHIPPED; no way to reverse them yet | orders, payments | planned |
| inventory | Inventory | domain | confirmed | P1 | `Product.stock` integer column, no movement history | products | planned |
| promotions | Coupons | domain | confirmed | P1 | Drizzle `coupons` table in `db/schema/coupons.ts` | - | planned |
| reviews | Reviews | domain | confirmed | P2 | Express `/api/reviews` endpoint in `server/app.js` | products | planned |
| media | Media Library | foundation | implied | P1 | Product images are uploaded; no listing or cleanup | - | planned |
| leads-inbox | Contact Inbox | foundation | confirmed | P1 | `/contact` form posts to `/api/contact` and nothing reads it | - | planned |
| site-content | Site Content (FAQ) | foundation | confirmed | P2 | `src/data/faq.json` is hard-coded content | - | planned |
| notifications | Notifications | foundation | proposed | P2 | Useful for new-order alerts; email alert may be enough | orders | proposed |

## Business purpose per module
| ID | Business purpose | Primary entities | Key workflows |
|----|------------------|------------------|---------------|
| orders | Review, verify, fulfil, cancel and refund customer orders | Order, OrderItem | Verify payment → ship → complete; cancel; refund |
| refunds-returns | Handle returns and money back safely | Order, Payment | Request → approve → refund → restock |
| inventory | Keep stock accurate with a movement history | Product | Adjust stock with reason; low-stock queue |

## Excluded / deferred (and why)
| Candidate module | Decision | Reason |
|---|---|---|
| Multi-tenant admin | excluded | Single store; no tenant column in schema |
| Approval workflows | excluded | Small team; refunds guarded by permission + audit instead |
| Trash / restore | excluded | `Product.deletedAt` handled by an "Archived" filter inside `products` |
| Message templates | deferred | Transactional emails are code-owned for now |
| Webhooks UI | excluded | Stripe webhooks are internal |
| public-users | merged | Covered by the `customers` module |
| import-export | deferred | Catalogue CSV import is planned after launch; the orders export lives inside `orders` |
| jobs-monitor | excluded | Stripe webhooks and the stock sync are internal; failures surface in `payments` and on the dashboard |
| search-command | excluded | Fewer than 10 modules |
| saved-views | excluded | No high-volume list with repeated filters yet |
| localization | excluded | Single-language (vi) store; FAQ, banners and meta text are covered by `site-content` |
| help | excluded | Two operators; a README runbook is enough |
| user-messaging | deferred | Order e-mails are code-owned (see Message templates); no broadcast, push or newsletter yet |
| privacy-requests | deferred | Customer data export and erasure are handled by the owner by hand for now; revisit before selling in the EU |
| app-controls | excluded | No feature flags or runtime switches; `ENABLE_REVIEWS` is set at deploy |

## Assumptions & approvals
- 2026-11-20 - Gate 1 approved by user (example).
