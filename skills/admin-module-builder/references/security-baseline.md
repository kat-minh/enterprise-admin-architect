# Admin Security Baseline

Read when: foundation step, each module's step F, and before Gate 3. An admin panel is the highest-value target of the product.

## Contents
- Authentication & sessions
- Authorization
- Input, output, and injection
- Data protection
- Operations & hygiene
- Dangerous features
- Security acceptance checklist

---

## Authentication & sessions

- Separate admin login (`/admin/login`) and identity from customer auth; admin accounts are invited/created by admins, not self-registered.
- Strong password policy or SSO/OIDC; hash with Argon2id/bcrypt via the framework's standard library; never roll your own crypto.
- **MFA** (TOTP/WebAuthn) for Super Admin and money/PII roles; recovery codes; step-up for sensitive actions.
- **Brute-force protection**: rate-limit and progressively delay login, reset and MFA attempts per account + IP; generic error messages; lockout/notification.
- Sessions: `HttpOnly`, `Secure`, `SameSite=Lax` (or `Strict`), idle timeout (e.g. 30-60 min) and absolute lifetime; rotate ID on login/privilege change; revoke on logout/password change/deactivation; list and revoke active sessions in My Account.
- Password reset: single-use, short-lived, hashed tokens; don't reveal whether an account exists.
- **Credentials an admin hands to someone else** (temporary password on create or reset): generate on the server, return in that one response only, force a change at first sign-in, show it once in a dialog that cannot be dismissed (Esc, backdrop) until "I have saved it" is ticked, and never put it in the audit log, the server log, a later read or an error. Test that it appears exactly once across every response of the run. An admin may not reset, demote or deactivate their own account, and the last active Super Admin can never be removed, also under concurrent requests (lock the rows inside the transaction).
- **Suspension and deactivation must take effect on the next request.** Stateless long-lived tokens (JWT without a session store) cannot be revoked by themselves: add a session table, or a `token_version`/`status` check on every authenticated request, or short-lived tokens with refresh. Enforce it in the authentication layer, not only in the login endpoint.
- Log all auth events (`audit-logging.md`).

## Authorization

- Server-side permission checks on every route/action/job (`rbac-implementation.md`); deny by default.
- **IDOR**: verify the record belongs to the allowed scope (tenant/branch/owner) on every read/update/delete by ID. Tests with two users.
- **Mass assignment**: allow-list writable fields; never bind raw request bodies to models.
- No privilege escalation: cannot edit own role/permissions; cannot grant what you lack; last Super Admin protected.
- Internal API keys/service tokens are scoped and rotated; the admin UI does not hold a master credential in the browser.

## Input, output, and injection

- Validate all input server-side with schemas; reject unknown params; limit sizes.
- Parameterised queries only; no string-built SQL/NoSQL filters from user input (sanitise sort/filter field names via allow-lists).
- Escape output; sanitise rich text (allow-list tags/attrs, strip scripts/event handlers/`javascript:` URLs); sandbox embeds; strict CSP for admin pages (`default-src 'self'`, no inline scripts if feasible).
- **CSRF**: SameSite cookies + CSRF token or Origin/Referer verification for state-changing requests (server actions/frameworks may provide this - verify, don't assume).
- **SSRF**: if the admin fetches URLs (import by URL, webhooks test), allow-list hosts, block private IP ranges.
- **File uploads**: type/MIME/magic-byte/size checks, random keys, separate origin for user content, no executable uploads, SVG sanitised or blocked.
- **CSV/XLSX export**: neutralise formula injection.
- Open redirects: validate `next`/`returnTo` URLs are relative/same-origin.

## Data protection

- Mask PII in lists (phone/email partially); "reveal" is a permission + audited action. Default to least data in API responses.
- Secrets (API keys, SMTP, payment) write-only in UI, stored encrypted or in a secret manager; never in client bundles, logs or audit diffs.
- Encrypt sensitive columns/documents where regulation demands (KYC, health, genetic data); time-limited signed URLs for documents.
- Retention & deletion: soft delete default; anonymisation/purge workflow for privacy requests; backups considered.
- Do not log request bodies containing secrets/PII; scrub error reports.

## Operations & hygiene

- `noindex` on admin; exclude from sitemap; optionally restrict by IP/VPN/zero-trust for high-risk products; separate subdomain or path with distinct cookies if feasible.
- Security headers: `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors 'none'` (clickjacking), CSP.
- Environment badge (prod/staging) in the UI; staging never points at production data/credentials.
- Dependency hygiene: lockfile, audit (`npm audit`), pin critical packages; no secrets in repo (`.env` ignored; `.env.example` names only).
- Rate-limit expensive/sensitive endpoints (exports, bulk, search, password).
- Monitoring/alerts on auth anomalies and mass actions; error monitoring with PII scrubbing.

## Dangerous features (extra controls)

| Feature | Controls |
|---|---|
| Impersonation | Dedicated permission, reason required, visible banner, time-limited, read-only by default, blocked for Super Admin accounts and payment/credential changes, full audit |
| Bulk delete/update | Preview + count confirmation, limits, async job, audit, reversible window |
| Data export | Permission, scope, masking, audit, signed expiring link |
| Role/permission editing | `rbac.manage` only, MFA step-up, audit, invariants |
| Integration keys/webhooks | Masked, rotate/revoke, test endpoint safely (SSRF controls) |
| Viewing private user content (trips, messages, documents) | Separate `inspect` permission, mandatory reason, audit entry on every view, minimum fields, no bulk access; "public by link" content is still personal data |
| Raw SQL/console tools | Do not build; if unavoidable, read-only replica + approval |

## Security acceptance checklist

- [ ] Unauthenticated/unauthorised API calls return 401/403 (tested)
- [ ] IDOR and mass-assignment tests pass
- [ ] Login rate-limited; MFA available for privileged roles
- [ ] Cookies hardened; CSRF protection verified
- [ ] Uploads validated; exports injection-safe; rich text sanitised
- [ ] PII masked by default; reveal audited
- [ ] Secrets never exposed to client/logs/audit
- [ ] Security headers + noindex in place
- [ ] Sensitive actions audited and, where needed, step-up protected
