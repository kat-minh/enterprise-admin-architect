# Product Discovery

> Project: Fixture Shop (example) · Date: 2026-11-20 · Phase: Discovery

## 1. Product overview
Small online shop selling physical products with card payments via Stripe. Customers browse categories, add to cart, check out and track orders. Staff currently manage everything through the database console.

## 2. Existing technical architecture
| Area | Finding | Evidence |
|---|---|---|
| Framework | Next.js 15 App Router, React 19, TypeScript | `package.json` |
| UI kit / styling | Ant Design 5 + Tailwind 4 | `package.json` |
| Forms / data | react-hook-form + zod, TanStack Query | `package.json` |
| Auth | NextAuth (customers); `User.role` enum exists but is only used in `middleware.ts` | `src/middleware.ts` |
| Database | Prisma (Postgres) + one Drizzle table (`coupons`) + a Supabase SQL `tickets` table | `prisma/schema.prisma`, `db/schema/coupons.ts` |
| API | Next route handlers under `/api/orders`, `/api/products`; Express `server/app.js` for reviews | scanner output |
| Integrations | Stripe | `package.json` |

**Reuse decision:** reuse Ant Design + Tailwind and TanStack Query; build admin under `(admin)` route group; add a separate admin identity (not `User`).

## 3. Public site map & user journeys
| Journey | Pages / routes | Data touched | Evidence |
|---|---|---|---|
| Browse & buy | `/products`, `/products/[slug]`, `/cart`, checkout | Product, Category, Order, OrderItem | routes |
| Contact | `/contact` | none persisted yet (`/api/contact` has no handler) | `src/app/contact/page.tsx` |

## 4. Feature Ledger
| Feature | Data / entities | Who manages it today | Lifecycle / status | Approval? | Side effects | History needed? | Evidence |
|---|---|---|---|---|---|---|---|
| Product catalogue | Product, Category | DB console | active/archived (`deletedAt`) | no | public pages | price history | schema |
| Orders | Order, OrderItem | DB console | PENDING→PAID→SHIPPED / CANCELLED | refunds yes | Stripe, email, stock | yes | `OrderStatus` enum |
| Coupons | coupons | DB console | none | no | pricing | yes | Drizzle table |
| FAQ | `faq.json` | developers | none | no | public page | no | `src/data/faq.json` |

## 5. Existing API capabilities
| Resource | Endpoints | List params | Authz | Notes |
|---|---|---|---|---|
| orders | GET/POST `/api/orders`, PATCH/DELETE `/api/orders/[id]` | none | none seen | PATCH changes status directly |
| products | GET `/api/products` | none | none | public read only |

## 6. Backend gaps
| # | Needed by module | Missing capability | Status | Resolution | Effort |
|---|---|---|---|---|---|
| 1 | orders | Paginated/filtered admin list + explicit transitions + refund | missing | implement in repo | M |
| 2 | rbac | Admin users, roles, permissions tables and guard | missing | implement in repo | M |
| 3 | audit-log | Audit table + service | missing | implement in repo | S |
| 4 | leads-inbox | `/api/contact` handler + table | missing | implement in repo | S |

## 7. Potential administrative workflows
1. Process an order - Order staff - new paid order - verify → pack → ship with tracking → complete.
2. Refund an order - Finance - customer request - check order state → partial/full refund via Stripe → restock decision → audit.
3. Handle a contact message - Support - new message - assign → reply → close.

## 8. Operators
| Persona | Responsibilities | Frequency | Sensitive powers |
|---|---|---|---|
| Owner (super_admin) | Everything | weekly | roles, settings |
| Order staff | Fulfilment | daily | cancel orders |
| Support | Customers, inbox | daily | reveal PII |
| Finance | Payments, refunds | weekly | refunds |

## 9. Assumptions
- Single store, single currency (VND), no multi-warehouse.

## 10. Open questions
| # | Question | Why it matters | Recommended default |
|---|---|---|---|
| 1 | Is there a separate vendor portal? | Marketplace modules | No |
| 2 | Who sends order emails today? | Templates/notifications | Code-owned, keep |
| 3 | Delivery mode: full-stack or fe-first? | Whether the UI is approved on a mock layer before backend work | full-stack (the repo already has order/product APIs) |

## 11. Existing admin audit
N/A - no existing admin.
