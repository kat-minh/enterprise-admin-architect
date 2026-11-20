# Audit Logging

Read when: implementing the `audit-log` module or adding audit events to any module.

## Contents
- What to log
- Schema
- Action naming
- How to record
- Redaction and sensitivity
- Integrity and retention
- The Audit Log module (UI)
- Acceptance checklist

---

## What to log

**Always:** admin login/logout/failed login/MFA events · role & permission changes · admin user create/deactivate · settings & integration key changes · create/update/delete/restore of business records · **workflow transitions** (with reason) · bulk operations · exports/imports · refunds, price/stock/balance adjustments · publish/unpublish · impersonation start/stop · **denied attempts** on sensitive permissions · sensitive data reveal (PII/clinical/KYC).
**Not:** high-volume reads of non-sensitive lists, heartbeat calls, UI state.

## Schema

```
audit_logs(
  id            uuid pk,
  at            timestamptz not null default now(),
  actor_id      uuid null,           -- null for system/job
  actor_type    text not null,       -- admin | system | api_key | customer(impersonated)
  actor_label   text,                -- snapshot: name/email at time
  actor_role    text,
  action        text not null,       -- 'orders.refund'
  entity_type   text,                -- 'order'
  entity_id     text,
  entity_label  text,                -- 'Order #1042' (snapshot)
  changes       jsonb,               -- [{ field, before, after }] (redacted)
  reason        text,
  metadata      jsonb,               -- request-specific: bulk filter, job id, provider ref
  ip            inet, user_agent text, request_id text,
  outcome       text not null default 'success'   -- success | denied | failed
)
indexes: (at desc), (entity_type, entity_id, at desc), (actor_id, at desc), (action, at desc)
```
For large volumes partition by month; keep indexes lean.

## Action naming

`<module>.<verb>` matching permission keys (`orders.refund`, `articles.publish`, `rbac.update`), plus auth events `auth.login`, `auth.login_failed`, `auth.logout`. Consistent keys make filtering and alerting easy.

## How to record

1. **Service wrapper**: `audit.record({ actor, action, entity, before, after, reason, metadata })`. Call inside the **same DB transaction** as the change so the log and data cannot diverge (or use an outbox if cross-system).
2. **Generic CRUD**: a thin helper `withAudit(entityType, handler)` that loads `before`, runs the change, computes `after` and diff.
3. **ORM hooks/extensions** (Prisma client extension, TypeORM subscribers, DB triggers) can capture generic changes, but they lack actor and reason context - pass actor via request-scoped context (AsyncLocalStorage) and still add explicit calls for workflow transitions and reasons.
4. **Diff**: store only changed fields; for large text store hashes/lengths or truncated excerpts; for relations store IDs + labels.
5. **Denied attempts**: log in the permission guard for sensitive permissions (rate-limit duplicates).

## Redaction and sensitivity

Never store: passwords/hashes, tokens, API keys/secrets (store `***rotated***` or last 4), full card/bank numbers, raw documents. Mask PII per policy (email partially) when full value isn't needed for the investigation; where legally required keep full values with restricted read permission. The audit log itself is sensitive: reading it needs `audit-log.read`; exporting `audit-log.export`.

## Integrity and retention

- **Append-only**: no update/delete endpoints; application DB role lacks `UPDATE/DELETE` on the table; admin UI offers no edit.
- High-assurance (fintech/health): hash-chain each row (`hash = H(prev_hash || row)`), periodic anchor/export to WORM storage, tamper checks.
- Retention policy (e.g. 1-7 years by regulation); archive old partitions; document in `product-discovery.md`.
- Clock: server time only.

## The Audit Log module (UI)

- List: time, actor, action, entity (link to the record), outcome, IP; filters: date range, actor, action (multi), entity type/id, outcome; search by entity label/request ID; server-side pagination.
- Detail drawer: full metadata, **before/after diff view**, reason, request ID, user agent.
- Entity-level **Timeline** component reused on detail pages (filter by `entity_type/entity_id`).
- Export (restricted, async). No delete/edit actions.
- Optional alerts: bursts of denied attempts, mass deletions, role changes, off-hours super-admin activity.

## Acceptance checklist

- [ ] Every sensitive/destructive action in the module's spec emits an event
- [ ] Event written transactionally with the change (or via outbox)
- [ ] Before/after + reason captured; secrets redacted
- [ ] Denied sensitive attempts logged
- [ ] Log is append-only and permission-gated
- [ ] Entity timeline shows events on detail pages
- [ ] Filters/search/detail inspection work with server-side pagination
