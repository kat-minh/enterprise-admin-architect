# Runtime Controls (kill switches, flags, tunable limits)

Read when: the user asks for "settings" or "toggles", an operator must change behaviour during an incident without a deploy, or a feature is fragile, expensive or risky. For editing words, colours and banners see `site-content-cms.md`.

## Contents
- 1. Runtime or deploy time: three tests
- 2. Design
- 3. Delivery and failure behaviour
- 4. UI
- 5. Tests
- Pitfalls

---

## 1. Runtime or deploy time: three tests

A value belongs in the admin only if **all** hold: (1) it must change within minutes during an incident, or it is a business decision; (2) a wrong value cannot lock the operators out or weaken security; (3) it is not a secret or infrastructure.

| Usually runtime | Usually deploy time (show read-only) |
|---|---|
| Kill switch for a fragile or costly integration (pause scraping, payments, an exporter) | Secrets, database URLs, signing keys (show only "set / not set") |
| Maintenance or read-only mode, with a message | Allowed origins / CORS (a mistake can lock the admin out) |
| Open or close sign-ups | Concurrency and pool sizes (depend on memory) |
| Retire a legacy sign-in path, **with the number of affected accounts shown first** | Token lifetimes, lockout and sign-in rate limits (security policy) |
| Rate or size limits within hard bounds | Limits that mirror column sizes or schema |
| Feature flags and gradual rollouts | Anything the code reads once at start-up |

## 2. Design

- A **typed registry in code**: key, type, default, bounds, description, sensitivity, who may change it. Unknown keys are rejected; nothing is free-form.
- **Effective value = runtime override, else deploy-time default, else code default.** Show which one is in force and offer "reset to default".
- Every change needs a **reason**, shows its **consequences** (counts of affected users where possible), is **audited with before and after**, and is atomic with the audit row. Security-relevant switches are top-role only. Use optimistic concurrency.
- Switches that are meant to be temporary carry an `expires_at` or a visible "on since" age, so they are not forgotten.
- A **read-only configuration view** answers "what is this server running with" without exposing secrets.

## 3. Delivery and failure behaviour

- Read through a **per-process cache of a few seconds** and invalidate it on the instance that handled the change; say that other instances see the change within the cache lifetime. Never query the settings table on the hot path uncached.
- **Decide the failure mode per switch and write it down.** A kill switch that cannot be read should fail **open** (keep serving); a security toggle should keep the **last known** value. Bound the lookup time so a slow settings store cannot slow the product.
- Code that enforces a limit must read it through a function, not a constant captured at start-up (a limiter built with a fixed `max` ignores the setting).
- While a switch is on, say so wherever it matters: dashboard attention queue, the affected page, and the user-facing message of the blocked action.

## 4. UI

Danger zone for risky switches; confirmation dialog listing consequences plus a reason field; the current state, who changed it and when, always visible; link to the audit entry.

## 5. Tests

A flip takes effect on the next request (within the cache window); a failing settings store does not take the product down; bounds are enforced server-side; the reason and before/after are audited and a forced audit failure changes nothing; the permission matrix (only the intended roles can change it).

## Pitfalls

Toggles no code reads; a runtime setting that can disable the admin itself; secrets shown in the UI; no record of who flipped what; "temporary" switches left on for months; limits that exist only in the UI.
