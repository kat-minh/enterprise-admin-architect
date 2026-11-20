# API Contract

> Project: <name> · Version: v0 (draft) | v1 (frozen at Gate 2b on <YYYY-MM-DD>)
> The contract the admin UI is built against (FE-first mock) and the backend must implement. Zod schemas in code are the executable form; keep both in sync.

## Conventions
- Base path: `/api/admin` · Auth: admin session · Errors: `{ error: { code, message, fields?, requestId } }`
- List query: `q, page, pageSize, sort, <filters>` → `{ data: T[], meta: { total, page, pageSize, totalPages } }`
- Money: integer minor units + currency · Timestamps: ISO-8601 UTC · IDs: opaque strings
- Concurrency: `version` on mutable records; stale → `409 STALE_VERSION` · Idempotency: `Idempotency-Key` on money/creating POSTs

## Change log
| Version | Date | Change | Affects modules |
|---|---|---|---|
| v0 | <YYYY-MM-DD> | initial draft from FE build | |

## Endpoints

### GET /api/admin/<resource>   (module: `<module-id>`, priority P0)
- Permission: `<module-id>.read`
- Query: `q`, `page`, `pageSize`, `sort` (allowed: `createdAt`, `status`), `status` (csv), `createdFrom`, `createdTo`
- Response 200: `{ data: Resource[], meta }`
- Errors: 401, 403, 422 (bad params)
- Notes: scope filter `own|team`; excludes archived unless `includeArchived=true`

### POST /api/admin/<resource>/{id}/<transition>   (module: `<module-id>`)
- Permission: `<module-id>.<verb>` (sensitive: yes/no)
- Request: `{ reason?: string, ... }`
- Response 200: `{ data: Resource }` · Errors: 403, 404, 409 (`INVALID_STATE`, `STALE_VERSION`), 422
- Side effects: <email, stock, ledger, audit entry `<module-id>.<verb>`>
- Idempotency: required / not required

## Mock behaviours the backend must reproduce
| Behaviour | Mock implementation | Backend requirement |
|---|---|---|
| Diacritic-insensitive search | normalised compare | `unaccent`/collation/search column |
| Stable sort tie-break | by `id` | `ORDER BY …, id` |
| State machine guards | table in `business-domain-map.md` | service-level guard + DB constraint |

## Open contract questions
| # | Question | Decision |
|---|---|---|
