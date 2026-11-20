# Job board / Recruitment

**Signals:** Job/Position, Employer/Company, Candidate/Applicant, Application, Resume/CV, Pipeline stage, Interview, Offer.
Two variants: **job board** (many employers, marketplace-like - also read `marketplace.md`) and **in-house careers/ATS** (one employer).

## Modules
| ID | Module | Pri | Notes |
|---|---|---|---|
| `jobs` | Jobs / Positions | P0 | Status, expiry, location, salary range, requirements, featured |
| `employers` | Employers / Companies (board) | P0 | Verification, plan/credits, jobs, team |
| `candidates` | Candidates | P0 | Profile, CV files, history, consent, tags |
| `applications` | Applications / Pipeline | P0 | Kanban + table; stages; bulk move; notes; scorecards |
| `interviews` | Interviews / Scheduling | P1 | Slots, panel, feedback |
| `offers` | Offers | P2 | |
| `job-moderation` | Job moderation | P1 | Review queue; spam/scam detection |
| `credits-billing` | Employer plans, credits & payments | P1 | Board only |
| `taxonomy` | Categories / Skills / Locations | P1 | Normalisation, merges |
| `alerts` | Job alerts / Subscriptions | P2 | |
| `talent-pool` | Talent pool / Saved searches | P2 | |
| `recruit-reports` | Funnel & time-to-hire | P2 | |

## Lifecycles
- **Job:** `draft → pending_review → published → paused → expired | filled | closed`.
- **Application:** `new → screened → interview → offer → hired | rejected | withdrawn` (stages configurable per job).
- **Employer:** `registered → verified → suspended`.

## Dashboard
Queues: jobs pending review · applications unreviewed (aging) · employers pending verification · interviews today · jobs expiring.
KPIs: active jobs, applications/job, time-to-hire, source effectiveness, revenue (board).

## Special permissions
`jobs.moderate`, `candidates.pii`, `candidates.export`, `applications.reject`, `employers.verify`.

## Audit-critical
Candidate data export/access, rejections with reasons, employer verification, job removal, credit adjustments.

## Edge cases & pitfalls
- Candidate PII/consent and retention (auto-anonymise after N months); GDPR-like deletion.
- CV file scanning, size/type limits; preview without download.
- Duplicate candidates (email/phone) → merge.
- Fair-hiring: don't expose protected attributes in lists by default.
- Salary currency/ranges; expired jobs still reachable for existing applications.
