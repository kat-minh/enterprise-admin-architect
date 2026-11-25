# Backend Contract & Data Safety

Read when: step B of the module loop (API), or when documenting backend gaps.

## Contents
- Principles
- List endpoint contract
- Response and error format
- Mutations: create/update/delete/transitions
- Concurrency and idempotency
- Soft delete, archive, restore
- Bulk operations and exports
- File uploads
- Database constraints and performance
- External backend: gap documentation
- Backend acceptance checklist

---

## Principles

- The server is the authority for validation, authorization, business rules and data integrity.
- Follow the project's existing API style (REST route handlers, server actions, tRPC, GraphQL). The patterns below are REST-shaped; translate as needed.
- Admin endpoints live under a separate namespace (e.g. `/api/admin/...`) with admin auth, never reusing public endpoints that skip admin authorization.
- Reuse domain services between public and admin code paths so business rules aren't duplicated.

## List endpoint contract

`GET /api/admin/<resource>?q=&page=1&pageSize=25&sort=-createdAt&status=a,b&createdFrom=&createdTo=`
- Whitelist sortable and filterable fields; reject unknown with `400`.
- Cap `pageSize` (≤ 100); stable ordering with tie-breaker `id`.
- Search: case- and diacritic-insensitive; index-backed (trigram/FTS/normalised column) for big tables.
- Select only needed columns; avoid N+1 (join/include or batch loaders).
- Apply scope filters (`own`/`team`) and soft-delete filter (`deletedAt IS NULL` unless `includeArchived`).
- Return `{ data: [...], meta: { total, page, pageSize, totalPages } }` (use `hasMore`/cursor for very large sets; `total` may be estimated).

## Response and error format

Success: `{ data }` (or `{ data, meta }`). Errors use one shape everywhere:

```json
{ "error": { "code": "VALIDATION_FAILED", "message": "Human readable", "fields": [{ "field": "sku", "message": "SKU already exists" }], "requestId": "req_123" } }
```
Status codes: `400` malformed/unknown params · `401` unauthenticated · `403` forbidden · `404` not found (also for out-of-scope records when existence must not leak) · `409` conflict/stale version/state transition not allowed · `422` validation failed · `429` rate limited · `500` unexpected (log with request ID; never leak stack traces).

**A 5xx must be actionable.** The envelope's `requestId` is shown in the UI next to the error. An authenticated admin who holds a diagnostics permission also gets a short, safe `diagnostic` (the stage that failed, the error class and a message with no SQL, host names or secrets), shown in the UI behind a "Technical details" control with a copy button, so a report is one pasted line and not "it shows 500". Nothing of this reaches a non-admin response. Log the full error server-side with the same request id (`OPS-11`).

**Busy, limited and over quota are answers the client can act on** (`OPS-18`). A full pool, a statement timer or a restarting database answers `503` with `code: "db_busy"` and `Retry-After`; a write ceiling answers `429` with `Retry-After`; a creation over a quota answers `409` with `code: "quota_exceeded"`, the `resource` and the `limit`, so the client writes the sentence in the user's language. A bug is still a `500`. Every response carries `X-Request-Id`, the caller's own when it is well formed (`admin-qa-gate/references/operations-readiness.md` §5). When the contract adds a field the client sends (a request id inside a bug report), an older server refuses it with `400`: the client falls back without the field instead of losing the request.

## Mutations

- Validate every input with a schema (zod/class-validator/pydantic); strip unknown fields (**mass-assignment protection**: explicit allow-lists for updatable fields; never `update(req.body)`).
- Create returns the created resource (201). Update returns the updated resource. Delete = soft delete (see below).
- **Workflow transitions are explicit operations**: `POST /orders/:id/confirm`, `POST /orders/:id/refund` or `POST /orders/:id/transitions { to, reason }`. The service validates current state, guards (payment verified, stock available), and performs side effects atomically. Never expose `status` as a freely patchable field.
- Wrap multi-entity changes in a DB transaction; write the audit entry in the same transaction.
- Side effects that can fail/slow (emails, webhooks, third-party calls) go through an outbox/queue with retries; the UI shows their status.

## Concurrency and idempotency

- **Optimistic concurrency**: each record has `version` (int) or `updatedAt`; clients send it (`If-Match`/body); mismatch → `409 STALE_VERSION`. Atomic updates for counters/stock/capacity (`UPDATE … SET stock = stock - :n WHERE stock >= :n`), never read-modify-write in app code.
- **Idempotency keys** for money-moving and creating operations (`Idempotency-Key` header stored with the result for N hours) so double submits and retries are safe.
- Webhook handlers are idempotent (dedupe by provider event ID).

## Soft delete, archive, restore

- `deletedAt`/`archivedAt` + `deletedBy`; default queries exclude them; restore endpoint; purge is a separate, rare, sensitive permission with retention rules.
- Before deleting/archiving, check dependents (return `409 HAS_DEPENDENCIES` with counts and links) - or archive instead.
- Unique constraints should account for soft-deleted rows (partial unique indexes).

## Bulk operations and exports

- Bulk endpoints accept either explicit IDs (≤ limit) or a **filter** (server re-evaluates and counts); require confirmation token with the count; return per-item results `{ succeeded: [...], failed: [{ id, reason }] }`; audit the operation as one entry referencing the set/filter.
- Large operations/exports: create an async **job** (`POST /exports` → `202 { jobId }`; poll `GET /jobs/:id`; download via short-lived signed URL). Honour filters and the caller's permissions/scope; mask PII unless permitted.
- Exports: neutralise CSV/XLSX formula injection (prefix cells starting with `= + - @` with `'`), use UTF-8 with BOM for Excel Vietnamese compatibility, include the timezone.

## File uploads

- Serverless request bodies are small (e.g. 4.5 MB on Vercel Functions): issue **signed upload URLs** (S3/R2/Vercel Blob client upload) and confirm completion with metadata.
- Validate extension + MIME + magic bytes + size; randomise storage keys; never trust client filenames; serve user content from a separate domain/bucket with `Content-Disposition` for non-images; block SVG/HTML or sanitise; scan for malware if available.
- Track usage references so referenced files can't be deleted blindly.

## Admin-managed public content

Whenever the admin manages something the public product renders or enforces (copy, brand, banners, pages, flags, catalogue, availability), the module spec's **"Public-site integration"** section must be filled, and the build must follow these rules. Full CMS pattern: `site-content-cms.md`; switches and limits: `runtime-controls.md`.

- **A public read API separate from the admin namespace.** Unauthenticated (or with the public caller's own auth), published data only, never drafts, staff identity or internal ids; response size bounded; `ETag` or a version field and a short `Cache-Control`.
- **Invalidation on publish:** cache tag or CDN purge, framework revalidation, or a version bump the client sees on its next fetch. State the delay between "published" and "visible" in the spec and in the editor UI.
- **Defaults stay in the public code.** The public product must work with the admin down, the endpoint failing or returning garbage: last good cached copy, then the defaults.
- **Extract hard-coded values in the same change as the reader**, so the first publish reproduces today's behaviour exactly (a backfill that is checked, not assumed).
- **Changing the public code is part of the module.** List the files in the spec. Keep the change small and reversible, run the public site's own test suite, and never let an admin-side failure break a public page.
- **Service workers and PWAs:** do not cache the read endpoint beyond its `max-age`; build-time artefacts (manifest, icons) cannot be changed from the admin.
- **Preview** uses a short-lived signed token with its own audience, `no-store`, never written to the public cache.

## Database constraints and performance

- Enforce integrity in the DB: NOT NULL, FKs (with sensible `ON DELETE`), unique/partial-unique, CHECK (e.g. `stock >= 0`), enums or lookup tables for statuses.
- Indexes for every filtered/sorted column and FK used in lists; composite indexes matching common filters; avoid `LIKE '%x%'` on large tables without trigram/FTS.
- **Page the keys first.** A list row with per-row counts (`LEFT JOIN LATERAL (SELECT count(*) …)`, or a correlated sub-select in the select list) pays for those counts on every row the database walks, including every row skipped by `OFFSET`: a deep page and a "sort by count" read the whole table (measured: 5 s and 8 s at 400k rows). Select only the ids with the filter, sort, `LIMIT` and `OFFSET`, then join the counts to that page and repeat the `ORDER BY` (same tie-break) on the outer query. When the sort column is itself the count, join a pre-aggregated `GROUP BY` instead, under the same alias. Compare the new ordering against an independent query for every sort field and direction before shipping.
- Diacritic-insensitive search: fold with `lower(unaccent(x))`, never `unaccent(lower(x))`; databases in the C locale do not lower-case non-ASCII capitals (`Đ`), so the second order silently misses them. Index every foreign key that is used in a cascade or list (an unindexed `invited_by` made deleting users scan the whole membership table once per user).
- Money as integer minor units (+ currency); timestamps in UTC (`timestamptz`); IDs opaque (UUID/cuid), not sequential if exposed.
- Reversible migrations; backfills in batches; never destructive migration without backup plan.

## External backend: gap documentation

When the backend isn't in the repo, write `docs/admin/api-contract.md` with one block per missing capability:

```
### POST /admin/orders/{id}/refund   (needed by: orders, P0)
Auth: admin session; permission orders.refund
Request: { amount: int(minor units), reason: string, restock: boolean }
Response 200: { data: Order }  | 409 INVALID_STATE | 422 VALIDATION_FAILED
Side effects: payment provider refund, stock restock, audit entry, customer email
Notes: idempotency key required
```
Mark affected modules `blocked`/`partial` in the inventory; build UI only for what is connected, with honest "not available" states.

## Backend acceptance checklist

- [ ] Server-side authz on every endpoint (401/403 tested)
- [ ] Schema validation, allow-listed fields, consistent error format
- [ ] Pagination/filter/sort whitelisted + indexed
- [ ] Transitions explicit, guarded, transactional, audited
- [ ] Optimistic concurrency + idempotency where money/creation
- [ ] Soft delete + dependency checks
- [ ] Bulk/export limits, async for large, injection-safe
- [ ] DB constraints in place; migrations reversible
- [ ] No sensitive data in logs/errors/responses
- [ ] Busy (`503 db_busy`), write ceiling (`429`) and quotas (`409 quota_exceeded`) answer with a machine code and `Retry-After` where it applies; a bug stays `500`
