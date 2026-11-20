# Community / User-generated content / Social

**Signals:** Post/Thread, Comment, Group/Space, Report/Flag, Reaction, Follow, Reputation/Points, Ban, Direct message.
Trust & safety is the core operational concern.

## Modules
| ID | Module | Pri | Notes |
|---|---|---|---|
| `members` | Members | P0 | Profile, status, strikes, reputation, activity; shadow-ban |
| `moderation-queue` | Moderation Queue (reports & auto-flagged) | P0 | Prioritised by severity/age; decision + reason; bulk actions; context view |
| `content` | Content browser (posts, comments, media) | P0 | Search across content; hide/remove/restore |
| `sanctions` | Warnings, Mutes & Bans | P0 | Durations, appeals, history |
| `appeals` | Appeals | P1 | Review workflow with prior decision visible |
| `groups` | Groups / Spaces / Categories | P1 | Owners, rules, membership |
| `policies` | Rules & Policy library | P1 | Reason codes used in decisions |
| `automod` | Auto-moderation rules | P2 | Keyword/regex/link/rate rules with dry-run |
| `verification` | Verification / badges | P2 | |
| `announcements` | Announcements & Pinned content | P2 | |
| `community-reports` | Health metrics | P2 | Reports volume, response time, repeat offenders |

## Lifecycles
- **Report:** `open → in_review → actioned | dismissed → appealed → upheld | overturned`.
- **Content:** `visible → hidden (pending review) → removed | restored`.
- **Member:** `active → warned → muted → suspended → banned` (+ expiry).

## Dashboard
Queues: reports by severity/SLA · appeals · new accounts with flags · spikes (raid detection).
KPIs: reports/1000 posts, median time-to-action, repeat offenders, false-positive rate.

## Special permissions
`moderation.act`, `moderation.escalate`, `members.ban`, `members.view_private` (DMs - highly restricted), `automod.manage`.

## Audit-critical
Every moderation decision with reason code, bans/unbans, access to private messages, rule changes, mass actions.

## Edge cases & pitfalls
- Moderator wellbeing: blur sensitive media by default, click-to-reveal.
- Legal takedowns/retention: remove vs hide, evidence preservation.
- Mass actions need preview + limit; reversible within window.
- Conflicts of interest: moderators cannot action reports about themselves.
- Context: show surrounding thread and user's history on the same screen.
- Rate of incoming data → queue-based UI with keyboard shortcuts.
