# Fintech / Wallet / Lending / KYC-heavy products

**Signals:** Wallet/Account, Transaction/Ledger, KYC document, Loan/Application, Risk score, Limit, Settlement, AML flags, Bank/Card linking.
Highest-risk domain: correctness of money and regulatory auditability outrank UI polish. Require **maker-checker** on sensitive operations.

## Modules
| ID | Module | Pri | Notes |
|---|---|---|---|
| `customers` | Customers / Accounts | P0 | Status, tier, limits, linked instruments, risk flags |
| `kyc` | KYC / Verification Queue | P0 | Documents, liveness/OCR results, decision with reason code, re-submission |
| `transactions` | Transactions / Ledger | P0 | Read-only ledger archetype; filters by status/amount/time; trace to counterparties |
| `adjustments` | Manual adjustments / Reversals | P1 | Maker-checker, reason, attachments |
| `applications` | Loan / Credit Applications | P1 (lending) | Underwriting workflow, scoring inputs, documents, offers |
| `loans` | Loan servicing & Collections | P1 | Schedules, delinquency buckets, restructuring |
| `risk-aml` | Risk & AML Alerts | P0 | Rules hits, case management, SAR escalation (if regulated) |
| `limits` | Limits & Fees config | P1 | Effective-dated, versioned, approval required |
| `reconciliation` | Settlement & Reconciliation | P1 | Provider vs ledger breaks, resolution workflow |
| `disputes` | Chargebacks & Disputes | P2 | |
| `partners` | Partners/Providers status | P2 | Banks, PSPs health |
| `compliance-reports` | Regulatory reports & exports | P2 | |

## Lifecycles
- **KYC:** `not_started → submitted → in_review → approved | rejected | needs_more_info → expired/re-verify`.
- **Transaction:** `created → pending → completed | failed | reversed`.
- **Application:** `submitted → under_review → approved → disbursed → active → closed | defaulted`.
- **Alert/Case:** `open → investigating → escalated → closed (false positive | confirmed)`.

## Dashboard
Queues: KYC pending by age · AML alerts by severity · failed/stuck transactions · reconciliation breaks · approvals waiting (checker).
KPIs: approval rate, time-to-verify, volume/value, failure rate, delinquency.

## Special permissions
`kyc.decide`, `adjustments.create` / `adjustments.approve` (different people), `limits.change`, `transactions.reverse`, `customers.pii_full`, `reports.regulatory`.

## Audit-critical
Everything. Immutable, tamper-evident audit trail (hash chain or WORM storage), retained per regulation.

## Edge cases & pitfalls
- Ledger is append-only; corrections are reversing entries.
- Idempotency on every money-moving endpoint; no double submits from the UI.
- Four-eyes principle enforced server-side (maker ≠ checker).
- PII/documents: encrypted at rest, masked in UI, time-limited signed URLs, access logged.
- Regulatory retention vs deletion requests; data residency.
- Dual control for changing limits/fees; effective dating, never silent edits.
