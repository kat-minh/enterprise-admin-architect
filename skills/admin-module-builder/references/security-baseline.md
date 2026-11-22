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
- Password policy with numbers (≥ 12 characters, blocklist, no composition rules) or SSO/OIDC; hash with Argon2id/bcrypt/scrypt via the framework's standard library; never roll your own crypto. Details and the recipes: `identity-and-sessions.md`.
- **MFA** (TOTP/WebAuthn) is **required** for any role with a sensitive permission (Super Admin, money, PII, publish, export), or enforced by the identity provider; deferring it needs a signed risk acceptance. **Step-up** (recent authentication) is required for sensitive actions even before MFA exists. Gates `SEC-13`, `SEC-14`.
- **Brute-force protection**: rate-limit and progressively delay login, reset and MFA attempts per account + IP; generic error messages; a lockout that **cannot lock out the only Super Admin** (progressive delay, unlock path, ≥ 2 Super Admins) and a notification (`SEC-16`).
- Sessions: `HttpOnly`, `Secure`, `SameSite=Lax` (or `Strict`), idle timeout (e.g. 30-60 min) and absolute lifetime; rotate ID on login/privilege change; revoke on logout/password change/deactivation; list and revoke active sessions in My Account.
- Password reset: single-use, short-lived, hashed tokens; don't reveal whether an account exists.
- **Credentials an admin hands to someone else** (temporary password on create or reset): generate on the server, return in that one response only, force a change at first sign-in, show it once in a dialog that cannot be dismissed (Esc, backdrop) until "I have saved it" is ticked, and never put it in the audit log, the server log, a later read or an error. Test that it appears exactly once across every response of the run. An admin may not reset, demote or deactivate their own account, and the last active Super Admin can never be removed, also under concurrent requests (lock the rows inside the transaction).
- **Suspension and deactivation must take effect on the next request.** Stateless long-lived tokens (JWT without a session store) cannot be revoked by themselves: add a session table, or a `token_version`/`status` check on every authenticated request, or short-lived tokens with refresh. Enforce it in the authentication layer, not only in the login endpoint.
- Log all auth events (`audit-logging.md`).
- **Separate-origin admin** (an SPA on its own origin calling an API elsewhere, typical for PWAs). Decide explicitly and record the decision (a short ADR in `design-system.md` or `api-contract.md`), because the cookie baseline above does not carry over: `SameSite=Lax` cookies are not sent on cross-site XHR. Options, in order of preference: (1) admin and API on the same registrable domain (`admin.x.com`, `api.x.com`) with a `Domain` cookie, a CORS allow-list with credentials, an `Origin` check and a CSRF token; (2) a same-origin BFF or proxy that holds the session; (3) a bearer token kept in `sessionStorage`, accepted only with the compensating controls: short absolute and idle lifetimes enforced by a server-side session table (revocable), no third-party scripts, a strict CSP, no HTML injection sinks, a token that is invalid for the public API and vice versa (separate audience and key), and the residual XSS risk stated in the QA report. Never `localStorage`, never a long-lived token.

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
- **Admin-editable strings are untrusted at every sink.** A banner, label, site title, alt text or link that an editor saves reaches the public product through a template, `innerHTML` or an attribute built by string concatenation, and one saved string becomes stored XSS for every visitor. A gate that only tried `<` and `>` passed while an attribute context needed nothing but a quote. Escape at the **sink**, not at save time: all five characters (`& < > " '`) for text and for attribute values, or use text nodes and framework bindings instead of string-built HTML. Accept link schemes from an allow-list (`https`, `http`, `mailto`, `tel`, relative) and reject `javascript:` and `data:`. The test saves a payload set (`"><img src=x onerror=…>`, `' onmouseover='…`, `javascript:…`) into **every** editable field and asserts on the rendered public page that nothing runs and the text shows literally (`SEC-21`).
- **A backslash in a JavaScript string is not a backslash in the SQL.** `'\s+'` inside an ordinary JS string reaches the database as `'s+'` and silently matches the wrong rows. Write regex-bearing SQL in a `.sql` file or with `String.raw`, and review every query that contains a backslash by running it on a fixture row that should match and one that should not.

## Data protection

- Mask PII in lists (phone/email partially); "reveal" is a permission + audited action. Default to least data in API responses.
- Secrets (API keys, SMTP, payment) write-only in UI, stored encrypted or in a secret manager; never in client bundles, logs or audit diffs.
- Encrypt sensitive columns/documents where regulation demands (KYC, health, genetic data); time-limited signed URLs for documents.
- Retention & deletion: soft delete default; anonymisation/purge workflow for privacy requests; backups considered. When end users have personal data (GDPR, Vietnam's Law 91/2025/QH15 with Decree 356/2025/ND-CP in force since 2026-01-01, CCPA and similar; see the jurisdiction table in `privacy-and-data-rights.md`), build the `privacy-requests` module: request queue with deadline, export, erasure with legal holds, consent and terms-version log, retention jobs for sessions, audit and soft-deleted data, and a restore drill noted in the runbook.
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
| Impersonation | Dedicated permission, reason required, visible banner, time-limited, read-only by default, blocked for Super Admin accounts and payment/credential changes, full audit. Prefer a read-only "view as user" page inside the admin. If a real "log in as" is unavoidable (the public app is on another origin): mint a short-lived, single-use, scoped token (read-only scope, audience of the public app), record the admin as the audit actor, block credential, payment and personal-data changes, and keep a persistent banner with a one-click exit |
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
