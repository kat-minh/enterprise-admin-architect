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
| Feature | Data / entities | Who manages it today | Lifecycle / status | Approval? | Side effects | History needed? | Owner module | Evidence |
|---|---|---|---|---|---|---|---|---|
| Product catalogue | Product, Category | DB console | active/archived (`deletedAt`) | no | public pages | price history | products, categories | schema |
| Orders | Order, OrderItem | DB console | PENDING→PAID→SHIPPED / CANCELLED | refunds yes | Stripe, email, stock | yes | orders, refunds-returns | `OrderStatus` enum |
| Coupons | coupons | DB console | none | no | pricing | yes | promotions | Drizzle table |
| FAQ | `faq.json` | developers | none | no | public page | no | site-content | `src/data/faq.json` |
| Homepage banners and shipping notice | JSX literals in `Home.tsx` | developers | none | no | public page | no | site-content | `src/pages/Home.tsx` |
| Nightly stock import | `scripts/import-stock.ts` run by hand | owner | none | no | stock levels | yes | excluded: moved to the supplier feed in `inventory` (P2) | `package.json` script `stock:import` |

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

## 12. Owner intake
| # | Question | Owner's answer | Maps to (module ID / ledger row / excluded: reason) |
|---|---|---|---|
| 1 | What do you ask a developer to change today? | FAQ answers, the homepage banner and the free-shipping threshold text, product badges; every change is a deploy | site-content (FAQ, banners, shipping notice) |
| 2 | What do you wish you could see or do every day without a developer? | See orders waiting to ship, fix a stock number, create a coupon for a campaign | dashboard, orders, inventory, promotions |
| 3 | What support requests arrive from users, and how are they handled? | "Where is my order", refund requests, wrong address; handled by e-mail and the database console | orders, refunds-returns, customers |
| 4 | What must be undoable, approved or auditable? | Refunds and price changes; every stock adjustment | audit-log, refunds-returns, inventory |
| 5 | Who operates the admin, and who must not see personal data? | Owner (everything), one fulfilment clerk (orders and stock only); the accountant sees payments without customer contact details | rbac, payments |

## 13. Content & configuration inventory
| Surface | Where it lives (file / DB / env) | Who changes it today | How often | Class | Admin control (yes / later / no + reason) | Module ID | Evidence |
|---|---|---|---|---|---|---|---|
| UI strings and translations | `src/locales/vi.json` (single language) | developers | monthly | CMS | yes: published overlay on the JSON defaults | site-content | `src/locales/vi.json` |
| Branding: name, logo, theme, manifest | `src/config/site.ts`, `tailwind.config.ts`, `public/manifest.json` | developers | rarely | code / build-time | no: name and logo change a few times a year, a developer is available | - | `src/config/site.ts` |
| Legal pages (terms, privacy) | `content/legal/*.md` | developers | yearly | CMS | later (P2) | site-content | `content/legal/` |
| SEO defaults and redirects | `next.config.js` redirects, page metadata | developers | monthly | CMS | yes: meta title and description per page, redirects | site-content | `next.config.js` |
| Email / SMS / push copy | `emails/*.tsx` (order confirmation, shipping) | developers | rarely | code | no: see Excluded / deferred (templates) | - | `emails/` |
| Pricing and plan constants | `Product.price`, `FREE_SHIPPING_FROM` in `src/config/shop.ts` | owner (DB) / developers | weekly | CMS | yes: shipping threshold becomes a setting | settings | `src/config/shop.ts` |
| Banners and announcements | JSX literals in `Home.tsx` | developers | per campaign | CMS | yes: scheduled banner | site-content | `src/pages/Home.tsx` |
| Feature toggles and env switches | `process.env.ENABLE_REVIEWS` | developers | never | code | no: set at deploy | - | `src/config/features.ts` |
| Seed or sample content in the product | none | - | - | N/A - none found | - | - | scan: `contentFiles` only `faq.json` |
| Metrics the owner watches: where the data lives | orders per day, revenue, refund rate: DB; traffic: Vercel Analytics | owner | daily | CMS | yes: dashboard KPIs from the DB; traffic is a link-out | dashboard | `orders` table |
