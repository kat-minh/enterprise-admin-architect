# Consumer App / PWA / Freemium utility

**Signals:** user accounts with several sign-in methods, an installable PWA or mobile shell, personal data per user (plans, trips, notes, lists), a few tables with heavy UI copy, sharing by link or invite, third-party APIs or scraping behind the scenes, onboarding, device or push tokens, referral, app version. Few entities, but many content, configuration and messaging surfaces: **size the admin by operators, workflows and surfaces, not by entity count.**

## Modules
| ID | Module | Pri | Notes |
|---|---|---|---|
| `public-users` | App users (support lookup) | P0 | Sign-in methods, status, masked personal data with reveal + reason, suspend, revoke sessions; support 360 tab (last errors, notes, timeline) |
| `<primary-entity>` | The user's main record (trip, plan, list, project) | P0 | Metadata by default; content only through an `inspect` permission with reason and audit; archive/restore instead of delete |
| `site-content` | UI copy, brand, banners | P1 | The product's text and theme live in code: archetype 11; a published overlay with bundled defaults |
| `app-controls` | Runtime controls | P1 | Maintenance mode, sign-up open/closed, minimum app version / force update, kill switch for the costly dependency |
| `<dependency>-ops` | Third-party / scraping operations | P1 | Success rate, latency, rate-limit hits, pause switch (Ops monitor archetype) |
| `leads-inbox` | Feedback, bug and abuse reports | P1 | In-app "report a problem" counts as a form; queue archetype |
| `user-messaging` | Announcements, push, e-mail | P1-P2 | In-app messages first; push and e-mail when subscriptions exist |
| `privacy-requests` | Export and delete requests, retention | P1-P2 | Account-deletion state machine; store-listing requirements |
| `subscriptions` | Plans and entitlements | P1 if present | Stripe / in-app purchase: grants, refunds, lapsed states |
| `analytics` | Activation and retention | P2 | Needs an events source; if none exists, propose instrumentation, never a placeholder tile |

## Lifecycles
- **Account:** `active → suspended → deletion_requested → deleted`; suspension must take effect on the next request (revoke sessions).
- **Primary record:** `draft → active → archived` (admin archive hides it from the public API until restored).
- **Announcement:** `draft → scheduled → live → ended`.

## Dashboard
Queues: accounts needing action (suspended, legacy sign-in, deletion requests) · reports and feedback by age · third-party failure rate · paused switches. KPIs: sign-ups, activation, active users, retention, error rate; every figure states its window and its data source.

## Special permissions
`public-users.reveal_pii`, `<primary-entity>.inspect` (private content, reason + audit), `app-controls.manage`, `site-content.publish`, `privacy-requests.process`.

## Audit-critical
Reveal of personal data, content inspection, suspend/restore, publishing content, every runtime switch, deletion processing.

## Edge cases & pitfalls
- Data shared by link is still personal data: support access needs a reason.
- Long-lived stateless tokens cannot be revoked: add a session store or a token version before building suspension.
- A scraped or third-party dependency is the first thing to break: give it telemetry and a pause switch before anything else.
- The product's real surface is behind login: walk it with a seeded test user during discovery.
- Installed-app identity (name, icon) is build-time; do not promise to change it from the admin.
- Sample or demo data bundled in the public app may be someone's personal data: flag it.
