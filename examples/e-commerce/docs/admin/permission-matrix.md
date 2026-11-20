# Permission Matrix

> Project: Fixture Shop (example) · Date: 2026-11-20
> Keys are `resource.action`; enforced on the server.

## 1. Roles
| Role key | Name | Who | Notes |
|---|---|---|---|
| super_admin | Super Admin | Owner | Full access; last one cannot be removed |
| admin | Admin | Operations lead | All operations, no role management |
| catalog_manager | Catalog Manager | Merchandiser | Products, categories, media, promotions |
| order_staff | Order Staff | Fulfilment | Orders, inventory, shipping |
| support | Support Agent | Customer care | Orders (read), customers, leads, reviews |
| finance | Finance | Accounting | Payments, refunds, exports |

## 2. Permission catalog
| Permission | Module ID | Description | Sensitive |
|---|---|---|---|
| dashboard.read | dashboard | View dashboard | no |
| admin-users.read | admin-users | View staff accounts | no |
| admin-users.create | admin-users | Invite staff | yes |
| admin-users.update | admin-users | Edit staff | yes |
| admin-users.deactivate | admin-users | Deactivate staff | yes |
| rbac.read | rbac | View roles | no |
| rbac.manage | rbac | Change roles & permissions | yes |
| audit-log.read | audit-log | View audit log | yes |
| audit-log.export | audit-log | Export audit log | yes |
| settings.read | settings | View settings | no |
| settings.manage | settings | Change settings | yes |
| products.read | products | View products | no |
| products.create | products | Create products | no |
| products.update | products | Edit products | no |
| products.delete | products | Archive products | yes |
| products.publish | products | Publish/unpublish | no |
| categories.read | categories | View categories | no |
| categories.manage | categories | Manage categories | no |
| orders.read | orders | View orders | no |
| orders.update | orders | Verify, ship, add notes | no |
| orders.cancel | orders | Cancel orders | yes |
| orders.refund | orders | Refund orders | yes |
| orders.export | orders | Export orders | yes |
| payments.read | payments | View payments | no |
| payments.reconcile | payments | Reconcile with Stripe | yes |
| customers.read | customers | View customers | no |
| customers.update | customers | Edit customers | no |
| customers.reveal_pii | customers | Reveal full contact data | yes |
| refunds-returns.read | refunds-returns | View return requests | no |
| refunds-returns.process | refunds-returns | Approve/reject returns | yes |
| inventory.read | inventory | View stock and movements | no |
| inventory.adjust | inventory | Adjust stock | yes |
| promotions.read | promotions | View coupons | no |
| promotions.manage | promotions | Create/edit coupons | yes |
| reviews.read | reviews | View reviews | no |
| reviews.moderate | reviews | Approve/hide reviews | no |
| media.read | media | Browse media | no |
| media.upload | media | Upload files | no |
| media.delete | media | Delete unreferenced files | yes |
| leads-inbox.read | leads-inbox | View contact messages | no |
| leads-inbox.update | leads-inbox | Assign, change status, note | no |
| leads-inbox.export | leads-inbox | Export messages | yes |
| site-content.read | site-content | View content | no |
| site-content.manage | site-content | Edit FAQ and pages | no |

## 3. Role × Permission matrix
| Permission | super_admin | admin | catalog_manager | order_staff | support | finance |
|---|---|---|---|---|---|---|
| dashboard.read | yes | yes | yes | yes | yes | yes |
| admin-users.read | yes | yes | no | no | no | no |
| admin-users.create | yes | no | no | no | no | no |
| admin-users.update | yes | no | no | no | no | no |
| admin-users.deactivate | yes | no | no | no | no | no |
| rbac.read | yes | yes | no | no | no | no |
| rbac.manage | yes | no | no | no | no | no |
| audit-log.read | yes | yes | no | no | no | yes |
| audit-log.export | yes | no | no | no | no | no |
| settings.read | yes | yes | no | no | no | no |
| settings.manage | yes | yes | no | no | no | no |
| products.read | yes | yes | yes | yes | yes | no |
| products.create | yes | yes | yes | no | no | no |
| products.update | yes | yes | yes | no | no | no |
| products.delete | yes | yes | yes | no | no | no |
| products.publish | yes | yes | yes | no | no | no |
| categories.read | yes | yes | yes | yes | yes | no |
| categories.manage | yes | yes | yes | no | no | no |
| orders.read | yes | yes | no | yes | yes | yes |
| orders.update | yes | yes | no | yes | no | no |
| orders.cancel | yes | yes | no | yes | no | no |
| orders.refund | yes | yes | no | no | no | yes |
| orders.export | yes | yes | no | no | no | yes |
| payments.read | yes | yes | no | no | no | yes |
| payments.reconcile | yes | no | no | no | no | yes |
| customers.read | yes | yes | no | yes | yes | yes |
| customers.update | yes | yes | no | no | yes | no |
| customers.reveal_pii | yes | yes | no | no | yes | no |
| refunds-returns.read | yes | yes | no | yes | yes | yes |
| refunds-returns.process | yes | yes | no | no | no | yes |
| inventory.read | yes | yes | yes | yes | no | no |
| inventory.adjust | yes | yes | no | yes | no | no |
| promotions.read | yes | yes | yes | no | no | no |
| promotions.manage | yes | yes | yes | no | no | no |
| reviews.read | yes | yes | yes | no | yes | no |
| reviews.moderate | yes | yes | no | no | yes | no |
| media.read | yes | yes | yes | no | no | no |
| media.upload | yes | yes | yes | no | no | no |
| media.delete | yes | yes | yes | no | no | no |
| leads-inbox.read | yes | yes | no | no | yes | no |
| leads-inbox.update | yes | yes | no | no | yes | no |
| leads-inbox.export | yes | yes | no | no | no | no |
| site-content.read | yes | yes | yes | no | no | no |
| site-content.manage | yes | yes | yes | no | no | no |

## 4. Rules
- Super Admin is seeded; the last Super Admin cannot be deactivated or demoted.
- A user cannot grant permissions they do not hold or edit their own role.
- Separation of duties: `orders.refund` and `payments.reconcile` stay with Finance; Order Staff can cancel unpaid orders only (enforced by state guard).
- Sensitive permissions are step-up protected when MFA is on.

## 5. Navigation visibility
A nav item is visible iff the role has `<module>.read` (dashboard: `dashboard.read`).
