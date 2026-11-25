# Identity, Sessions and Access Hardening of the Admin

Read when: building or reviewing admin sign-in, accounts, sessions, roles that can reach sensitive data, or the hosting of the admin app. `security-baseline.md` lists the rules; this file says how to meet them and what "done" means. Gates: `SEC-13` to `SEC-20` in `quality-gates.md`. Basis: OWASP ASVS 4.0.3 and 5.0 (authentication, session management, access control, logging, web frontend security), the OWASP Authentication, Session Management and MFA cheat sheets, NIST SP 800-63B-4.

## Contents
1. Password policy
2. Multi-factor authentication
3. Step-up before sensitive actions
4. Lockout that cannot be used as an attack
5. Sessions
6. Accounts: invitation, offboarding, review, break-glass
7. Roles in the database
8. Security headers for the admin host
9. Token storage decision
10. Depth options

## 1. Password policy

Minimum **12 characters** (**15** when the password is the only factor; 8 is acceptable only as one factor of MFA, NIST SP 800-63B-4); allow at least 64 and allow paste and password managers; check against a blocklist of common and previously breached passwords (a list of at least 3,000 entries, or a k-anonymity breach-check API); **no composition rules and no scheduled rotation**; show a strength hint, never a rule list that pushes people to `Password1!`. Hash with scrypt, argon2id or bcrypt. A password change ends the other sessions (raise a token version in the same statement that stores the password) and notifies the owner of the account; the response carries a fresh token for the device that made the change, so that one stays signed in. Test that a token issued before the change now answers 401. The same applies to the public product's own accounts, not only to the admins'.

## 2. Multi-factor authentication

Any role holding a **sensitive** permission (reveal personal data, publish, change roles or accounts, export, break a flag) signs in with a second factor, or through an identity provider that enforces one. This is a go-live gate, not "where planned". Deferring it needs the product owner's **signed risk acceptance** (who, what is exposed, until when) in `qa-report.md`.
- **TOTP recipe:** a random seed per admin shown once as a QR code and text; store it **encrypted** with a key that is not in the database; accept the current 30-second step and one neighbour; **remember the last accepted step** so a code cannot be replayed; 8-10 single-use **recovery codes**, shown once, stored hashed; enrolment verifies a first code before the factor is active; changing or removing a factor needs the password and a current code; a Super Admin can reset another admin's factor (audited, with a reason, and the person is told).
- WebAuthn / passkeys are the strongest option and the depth level above TOTP.

## 3. Step-up before sensitive actions

Even before MFA exists, a sensitive action (role edit, admin create or reset, publish, reveal, export) requires **re-entering the password** if the last authentication is older than a few minutes. Keep `authenticated_at` on the session; a sensitive endpoint answers `401 reauth_required` and the UI opens a password dialog and retries. With MFA, step-up asks for a fresh code instead. A reason field is not authentication.

## 4. Lockout that cannot be used as an attack

A counter that locks an account after N bad tries lets anyone who knows an e-mail lock the only Super Admin out. Prefer **progressive delay** per account **and** address; alert on repeated failures; give an **unlock path** (another Super Admin, or an out-of-band recovery documented in the runbook); never answer 429 to the **correct** password because of someone else's bad tries unless you also provide that path. Keep at least **two Super Admins**. The per-IP limiter must not take a whole office behind one NAT offline.

How the limiter is built decides whether it works:

- **Key IPv6 clients by their `/64` prefix.** One home connection owns 2^64 addresses, so a per-address counter is bypassed by changing the last bits. Count IPv4 by address and IPv6 by `/64`.
- **Add a per-account ceiling across all addresses.** Without it a distributed guesser tries one password per address for ever. It slows (progressive delay); it does not lock, for the reason above.
- **Reserve the attempt before checking the password** (an in-flight reservation, released on success). Counting after the check lets 50 parallel requests all see "4 failures so far" and each test a password.
- **Rate-limit the endpoints that confirm a guess indirectly:** reveal and inspect, "does this e-mail exist", password reset, invitation lookup and the step-up dialog.
- **Bound the limiter itself:** expire its keys, cap what it may hold in memory or rows, and cap the **denied** rows it writes to the audit log (one aggregated row per actor, action and window, with a count). A flood of refusals must not fill the audit table or bury the real events.
- A limiter slows guessing; it does not make a weak password strong. Sensitive roles still need the second factor or step-up of §2 and §3 (`SEC-22`).

## 5. Sessions

Idle timeout 30 minutes (15 for roles with sensitive permissions), absolute timeout 8-12 hours, revocation checked on every request (a disabled or role-changed admin loses access on the next request). Each admin has a **My sessions** list (device, address, created, last active, current) with revoke one and **sign out everywhere**; a Super Admin can force sign-out of anyone (audited). Store address and user agent at creation (they are the evidence). Purge expired sessions (`operations-readiness.md` §8).

## 6. Accounts: invitation, offboarding, review, break-glass

- **Invite, do not hand over a password.** An admin who creates an account must never learn the password. Create the account as `invited`, send a **single-use, expiring activation link**, and let the person choose the password. An admin-issued temporary password is only the fallback when there is no mail channel; flag such accounts and force a change at first sign-in. A person who can sign in as the invitee before the invitee does makes the audit log lie.
- **Offboarding:** disable (never delete), revoke sessions, reassign owned items and tasks, record who and when. **Dormant** accounts (no sign-in for 90 days) are reported and may be disabled automatically.
- **Access review:** a recurring task (quarterly) producing admin × role × last sign-in × sensitive actions, signed off by the product owner; the output is stored.
- **Break-glass:** at least one emergency account, strong credential kept offline, **any use alerts** the owner, tested on a schedule (the runbook records the drill).
- Notify the account owner of credential, factor and role changes, and new-device sign-ins. With no mail channel, show it in-app and write it to the audit log.

## 7. Roles in the database

Use two database roles: a **migrator** that owns the tables and runs migrations, and a **runtime** role the application uses, which can only `INSERT` and `SELECT` on the audit table (no `UPDATE`, `DELETE`, `TRUNCATE`, no trigger drop). A trigger that blocks changes does not protect against an owner who can drop the trigger. Add a test that connects as the runtime role and is refused. For stronger tamper evidence add a hash chain or a signed daily digest and an off-box copy.

## 8. Security headers for the admin host

The admin is an application with powerful actions: it gets the strictest policy. Ship a copy-paste header set with the project (static host config or reverse proxy) and a gate that **fetches the deployed or preview host and checks the headers**:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://<api-host>; frame-ancestors 'none'; base-uri 'none'; form-action 'self'
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Permissions-Policy: camera=(), microphone=(), geolocation=()
Cross-Origin-Opener-Policy: same-origin
```

No inline scripts (the theme initialiser that avoids a white flash belongs in a file, not in `index.html`: an inline one is blocked silently); React style attributes are the usual reason to allow `style-src-attr 'unsafe-inline'` and nothing broader; if an inline style element is unavoidable use hashes or nonces. The policy is defined once (the build config or the host config), served by the production build or preview, and **checked by `admin-qa-gate/templates/security-headers.mjs`**, which also walks real pages and fails on any violation. The API sends its own security headers too (`nosniff`, no sniffing of uploads, HSTS). The runbook states where each is set; "written in the runbook" while the runbook says "see the QA report" is a circular reference, not a delivery.

## 9. Token storage decision

OWASP advises against keeping tokens in `sessionStorage`; the safer shapes are a `Secure; HttpOnly; SameSite` cookie on a same-site API, or a backend-for-frontend that holds the token. If the project keeps a bearer token in `sessionStorage` (for a cross-site API), write the reason a cookie or BFF is impossible in an ADR, keep the token short-lived, and compensate with the CSP above and no third-party scripts.

## 10. Depth options

Ladder in `capability-ladders.md`: single sign-on (OIDC, then SAML) with a mapping from identity-provider groups to roles and a local break-glass account; SCIM provisioning; two-person approval for Super Admin creation and role changes; IP or network allow-lists as one signal (never the only one); scoped, expiring, hashed API tokens for service accounts with their own audit; impersonation only with consent, notice, expiry and audit (the "inspect with a reason" pattern is usually enough).
