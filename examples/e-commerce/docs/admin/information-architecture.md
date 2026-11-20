# Information Architecture

> Project: Fixture Shop (example) · Date: 2026-11-20 · Source: module-inventory.md

## 1. Sidebar tree
```
Overview
  Dashboard                    /admin
Sales
  Orders                       /admin/orders
  Returns & Refunds            /admin/refunds-returns
  Payments                     /admin/payments
Catalog
  Products                     /admin/products
  Categories                   /admin/categories
  Inventory                    /admin/inventory
  Coupons                      /admin/promotions
Customers
  Customers                    /admin/customers
  Reviews                      /admin/reviews
  Contact Inbox                /admin/leads-inbox
Content
  Media                        /admin/media
  FAQ & Pages                  /admin/site-content
Settings & Access
  Admin Users                  /admin/admin-users
  Roles & Permissions          /admin/rbac
  Audit Log                    /admin/audit-log
  Settings                     /admin/settings
```
Rationale: operational work first (Sales), then catalog, customers, content; configuration last. 6 groups, max 2 levels. Contact Inbox sits under Customers because Support owns it. Badges only on actionable queues (Orders to ship, Returns pending, Inbox new).

## 2. Route table
| Route | Page | Module ID | Type | Permission | Interaction |
|-------|------|-----------|------|------------|-------------|
| /admin/login | Admin login | auth | form | public | page |
| /admin | Dashboard | dashboard | dashboard | dashboard.read | page |
| /admin/orders | Orders | orders | list | orders.read | list + preview drawer |
| /admin/orders/[id] | Order detail | orders | detail | orders.read | full page (tabs via ?tab=) |
| /admin/refunds-returns | Returns & Refunds | refunds-returns | queue | refunds-returns.read | queue + side detail |
| /admin/payments | Payments | payments | list | payments.read | list + detail drawer |
| /admin/products | Products | products | list | products.read | list + preview drawer |
| /admin/products/new | New product | products | form | products.create | full page |
| /admin/products/[id] | Product detail/edit | products | detail | products.read | full page |
| /admin/categories | Categories | categories | list | categories.read | tree + drawer |
| /admin/inventory | Inventory | inventory | list | inventory.read | list + adjust dialog |
| /admin/promotions | Coupons | promotions | list | promotions.read | list + drawer form |
| /admin/customers | Customers | customers | list | customers.read | list + preview drawer |
| /admin/customers/[id] | Customer profile | customers | detail | customers.read | full page |
| /admin/reviews | Reviews | reviews | queue | reviews.read | queue |
| /admin/leads-inbox | Contact Inbox | leads-inbox | queue | leads-inbox.read | queue + side detail |
| /admin/media | Media library | media | list | media.read | grid + preview panel |
| /admin/site-content | FAQ & Pages | site-content | list | site-content.read | list + page form |
| /admin/notifications | Notifications | notifications | list | dashboard.read | popover + page |
| /admin/admin-users | Admin users | admin-users | list | admin-users.read | list + drawer |
| /admin/rbac | Roles & Permissions | rbac | settings | rbac.read | matrix page |
| /admin/audit-log | Audit log | audit-log | list | audit-log.read | list + detail drawer |
| /admin/settings | Settings | settings | settings | settings.read | sectioned page |
| /admin/account | My account & security | my-account | settings | public | page |

Types: `dashboard` · `list` · `detail` · `form` · `calendar` · `kanban` · `queue` · `wizard` · `settings` · `report`.

## 3. URL state conventions
- List state in query: `?q=&status=&sort=-createdAt&page=1&pageSize=25`
- Detail tabs: `?tab=timeline`
- Returning from detail restores the previous list URL.

## 4. Navigation rules
Depth ≤ 2, one home per module, configuration separated from operations, names identical in sidebar/breadcrumb/title/permission key.

## 5. Role-based navigation
| Role | Landing page | Visible groups | Hidden |
|---|---|---|---|
| super_admin | /admin | all | - |
| order_staff | /admin/orders | Sales, Catalog (read) | Settings & Access |
| support | /admin/leads-inbox | Customers, Sales (read) | Catalog edit, Settings & Access |
| finance | /admin/payments | Sales, Settings & Access (audit only) | Catalog |
