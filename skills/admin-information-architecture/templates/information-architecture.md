# Information Architecture

> Project: <name> · Date: <YYYY-MM-DD> · Source: module-inventory.md
> The Route table is machine-checked: keep the header and fill `Module ID` with IDs from module-inventory.md.

## 1. Sidebar tree
```
Overview
  Dashboard                    /admin
Sales                          (domain group)
  Orders                       /admin/orders
  Payments                     /admin/payments
Catalog
  Products                     /admin/products
  Categories                   /admin/categories
Customers
  Customers                    /admin/customers
Content
  Pages & Banners              /admin/content
Settings & Access
  Admin Users                  /admin/admin-users
  Roles & Permissions          /admin/roles
  Audit Log                    /admin/audit-log
  Settings                     /admin/settings
```
Rationale: <why this grouping/order>. Collapsed-by-default groups: <…>. Pinned/bottom items: <settings, help, user menu>.

## 2. Route table
| Route | Page | Module ID | Type | Permission | Interaction |
|-------|------|-----------|------|------------|-------------|
| /admin | Dashboard | dashboard | dashboard | dashboard.read | page |
| /admin/orders | Orders | orders | list | orders.read | list + preview drawer |
| /admin/orders/[id] | Order detail | orders | detail | orders.read | full page (tabs via ?tab=) |

Types: `dashboard` · `list` · `detail` · `form` · `calendar` · `kanban` · `queue` · `wizard` · `settings` · `report`.

## 3. Module hierarchy & page relationships
| Module ID | Parent group | Quick view | Detail | Create/Edit surface | Related modules (links) |
|---|---|---|---|---|---|

## 4. URL state conventions
- List state in query: `?q=&status=&sort=-createdAt&page=1&pageSize=25&view=<saved>`
- Detail tabs: `?tab=timeline`
- Returning from detail restores the previous list URL (preserve filters, sort, page, density).

## 5. Navigation rules
- <naming, depth ≤ 2, one home per module, configuration separated from operations>

## 6. Role-based navigation
| Role | Landing page | Visible groups | Hidden |
|---|---|---|---|

## 7. Global interaction layer
| Element | Decision |
|---|---|
| Global search | <entities searched, min chars, shortcut `/` or `Ctrl+K`> |
| Command menu | <navigation + quick actions> |
| Notifications | <bell + unread count + deep links> |
| Breadcrumbs | <rules> |
| Toasts / confirmations | <patterns; typed confirmation for critical actions> |
| Keyboard shortcuts | <short list> |
