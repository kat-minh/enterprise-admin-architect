# E-commerce

**Signals:** Product/Variant/SKU, Cart, Order, Checkout, Coupon, Shipping, Stripe/PayPal/VNPay/MoMo, Inventory.
Skip modules the storefront cannot support (no stock tracking → no Inventory; no returns flow → start with order-level cancel/refund notes).

## Modules
| ID | Module | Pri | Notes |
|---|---|---|---|
| `products` | Products (+variants, options, pricing, media, SEO) | P0 | Draft/active/archived; variant matrix; bulk price/stock edit |
| `categories` | Categories / Collections / Brands | P0 | Tree; ordering; SEO; rule-based collections (P2) |
| `orders` | Orders | P0 | Workflow archetype (see lifecycle) |
| `payments` | Payments & Transactions | P0 | Ledger archetype; verification, reconcile, gateway status |
| `fulfillment` | Fulfilment & Shipping | P1 | Pick/pack/ship, carriers, tracking, labels; may live inside `orders` |
| `refunds-returns` | Returns & Refunds | P1 | RMA workflow; partial refunds; restock decision |
| `inventory` | Inventory | P1 | Stock levels, movements ledger, low-stock queue, warehouses (P2) |
| `customers` | Customers | P0 | Orders, addresses, LTV, notes, tags, block |
| `promotions` | Coupons & Promotions | P1 | Rules, usage limits, schedule, stacking, preview |
| `reviews` | Product Reviews | P2 | Moderation queue |
| `shipping-tax` | Shipping zones/rates & Tax | P1 | Settings-like; effective dating |
| `sales-reports` | Sales Analytics | P2 | Revenue, AOV, top products, conversion if tracked |
| `abandoned-carts` | Abandoned carts | P2 | Only if carts persisted server-side |

## Lifecycles
- **Order:** `pending → paid → processing → shipped → delivered → completed`; branches `cancelled`, `refunded` (partial/full), `failed`, `on-hold`. Guards: cannot ship unpaid (unless COD), cannot cancel after shipped without return.
- **Payment:** `initiated → authorized → captured → refunded/partially_refunded`, `failed`, `disputed`.
- **Return:** `requested → approved → received → refunded/rejected`.
- **Product:** `draft → active → archived`; deleting a product with orders = archive only.

## Dashboard queues & KPIs
Queues: orders awaiting payment verification · orders to ship (aging) · refund requests · low/out-of-stock · failed payments · pending reviews.
KPIs: revenue vs prior period, orders, AOV, conversion (if tracked), refund rate, top products.

## Special permissions
`orders.cancel`, `orders.refund`, `orders.export`, `products.publish`, `products.price`, `inventory.adjust`, `promotions.manage`, `customers.pii`.

## Audit-critical
Price changes, stock adjustments, refunds, order status overrides, coupon creation, customer data export, payment settings.

## Edge cases & pitfalls
- Price/stock updates racing with checkout → optimistic concurrency, stock ledger not raw overwrite.
- Money as integer minor units; currency per order (VND has no decimals).
- Order edits after payment (address, items) need re-pricing rules or are disallowed.
- Partial shipment/refund; guest checkout customers (no account).
- Deleting category with products; variant deletion with historical orders → snapshot data in order items.
- Large catalogues: server-side search/filter, bulk edit with preview and limits.
