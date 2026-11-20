# Discovery Checklist

Read when: step 2 of `admin-discovery`, or when the scanner misses something.

## Contents
- What to open, per concern
- Greps that save time
- Questions per public feature
- Reading the running site
- Smells that hint at missing admin capability

---

## What to open, per concern

| Concern | Look at | Extract |
|---|---|---|
| Stack & conventions | `package.json`, `tsconfig`, lint config, `components.json`, tailwind/theme config, monorepo config | Framework version, strictness, path aliases, naming, UI kit, tokens |
| Routing | `app/`, `pages/`, router files, `middleware.ts`/`proxy.ts` | Public routes, protected routes, route groups, layouts, existing `/admin` |
| Auth | auth config/lib, session helpers, login pages, middleware | Provider, session type (cookie/JWT), user model, roles/claims, how server checks identity |
| Authorization | `role`, `isAdmin`, `permissions` fields; guard helpers | Is there any RBAC? Where is it enforced? |
| Data model | Prisma/Drizzle/TypeORM/Mongoose/SQL migrations/Django models | Entities, relations, enums/status fields, soft-delete columns, audit columns, indexes, unique constraints |
| API | `app/api/**`, `pages/api/**`, controllers, tRPC routers, server actions | CRUD coverage, list params (page/limit/sort/filter), validation lib, error format, authz per endpoint |
| Existing UI kit | `components/ui`, shared components, form/table wrappers, theme | Buttons/inputs/tables/dialogs available; what to reuse; gaps |
| Forms & tables | existing forms (react-hook-form/formik/antd Form), tables | Patterns to follow; schema validation lib |
| Data fetching | react-query/swr/RSC/fetch wrappers | Cache strategy, error handling, auth headers |
| Integrations | payments, email, SMS, search, storage, analytics, webhooks | Which need admin visibility (status, retries, keys) |
| i18n/locale | locales dirs, next-intl/i18next, currency/date utils | Languages, default timezone, currency rules |
| Seed/test data | seed scripts, fixtures, e2e tests | Realistic data for building/QA; existing test accounts |
| Existing admin | anything under admin/dashboard/backoffice/cms/manage | Reuse, extend, or replace - never rewrite working parts |
| Ops/deploy | CI, Dockerfile, `vercel.json`, cron/jobs/queues | Background jobs to monitor, environments |

## Greps that save time

```bash
# status / lifecycle hints
rg -n "status|state|stage|step" --glob '!node_modules'  -g '*.prisma' -g '*.ts' -g '*.sql'
rg -n "enum " -g '*.prisma' -g '*.ts'
# soft delete / audit columns
rg -n "deletedAt|deleted_at|isDeleted|archived|createdBy|updatedBy"
# roles / permissions
rg -n "role|permission|isAdmin|ability|can\(" -g '!node_modules'
# money & inventory & scheduling hints
rg -n "price|amount|currency|stock|quantity|inventory|capacity|slot|booking|schedule"
# user-generated content
rg -n "comment|review|rating|upload|submission|message|ticket|inquiry|contact"
# external side effects
rg -n "stripe|paypal|vnpay|momo|zalo|twilio|sendgrid|resend|webhook|cron"
```
(Use the Grep tool equivalents on Windows.)

## Questions per public feature

1. What data powers it? 2. Who creates/manages that data today (code, DB console, third party)? 3. Who may modify it? 4. What happens when it changes (cache, email, stock, price)? 5. Does it need approval? 6. Does it have a lifecycle/status? 7. Does it need history/versioning? 8. Does it affect another entity?

Record the answers in the Feature Ledger. A feature with *no* answer to "who manages it" is the most important gap to surface.

## Reading the running site

If it can run (`npm run dev`) and browser tools exist: visit each primary nav item, submit each form once (in dev), inspect network calls (endpoints, payloads), note empty/error states. Never perform destructive or paid actions on production data.

## Smells that hint at missing admin capability

- Content hard-coded in components/JSON/markdown that business people will want to change (banners, FAQs, pricing, team, testimonials).
- Public forms that write rows nobody reads (contact, newsletter, quote requests).
- Status enums with no UI to transition them.
- Money/stock/availability columns with no adjustment history.
- Emails sent from code with inline text (need template management).
- `role` column used only to hide a link.
- Uploaded files with no listing or cleanup.
- Cron/jobs/webhooks with no visibility.
- Users who can be abusive (UGC) with no moderation or ban flow.
