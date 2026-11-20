# Dashboard Design

Read when: designing the admin overview / any role's landing page.

## Contents
- Purpose and structure
- Widgets
- Per-domain examples
- Rules for numbers and charts
- States
- Acceptance checklist

---

## Purpose and structure

The dashboard answers: **"What needs me now, and is the business healthy?"** - in that order. It is a task launcher, not a poster.

Layout (top → bottom):
1. **Needs attention** - queues of actionable items with counts, aging, and deep links (pending orders, unanswered leads, failed payments, expiring holds).
2. **KPI strip** - 3-6 stat tiles with period comparison and a one-line definition.
3. **Trends** - 1-3 charts, each answering a named question ("Revenue vs last period").
4. **Recent activity** - latest meaningful events (audit/timeline).
5. **Quick actions** - the 3-5 most frequent operator tasks.

Role-specific: the landing view differs per role (Finance sees payments/refunds; Editor sees drafts/review queue; Support sees tickets/leads). Derive from the permission matrix and personas.

## Widgets

| Widget | Rules |
|---|---|
| `AttentionQueue` | Title, count, oldest-item age/SLA colour, top 3-5 items, "View all" with the filter pre-applied. Hide for roles without access. |
| `StatTile` | Label, value, delta vs previous period (▲▼ with text, not colour alone), time window, tooltip with definition; click → filtered list. Compact (not giant). |
| Trend chart | Single question, labelled axes/units, time range control, comparison series optional, accessible summary/table alternative. |
| Activity feed | Actor · action · entity link · relative time. |
| Health/alerts | Integration down, jobs failing, low stock - actionable links. |

## Per-domain examples

| Domain | Attention queues | KPIs |
|---|---|---|
| E-commerce | Orders to verify/ship, refunds, low stock, failed payments | Revenue, orders, AOV, refund rate |
| Travel | Bookings to confirm, holds expiring, balances due, low-fill departures | Bookings, revenue, occupancy, cancellation rate |
| Education | Applications, unpaid enrolments, grading, classes under minimum | New enrolments, completion, revenue, fill rate |
| Corporate | New leads, unassigned leads, drafts to publish | Leads vs last period, conversion |
| News | Drafts in review, scheduled today, comments to moderate | Published, time-in-review, top articles |
| SaaS | Trials ending, past-due, failed webhooks | MRR, churn, active tenants, usage vs limits |

## Rules for numbers and charts

- Every number has a definition, a time window, and a data freshness indicator ("Updated 2 min ago") if cached/aggregated.
- Compare against a meaningful baseline (previous period / same period last year).
- Use the right chart: trend → line/area; composition → stacked bar or sorted bar; ranking → horizontal bar; avoid pies > 5 slices; avoid 3D, dual axes, decorative gradients.
- Colours from tokens; colour-blind-safe; label directly where possible; consistent colour per category across charts. Use the `dataviz` skill for charting specifics if installed.
- Only show metrics the data actually supports. **No placeholder stats**; if a KPI can't be computed yet, omit it or show "Not available" with the reason.
- Heavy aggregates: compute server-side (SQL/materialised/cached), never by fetching all rows to the browser.
- **State the window.** "Last 24 hours" is either a rolling window or N whole buckets (the current hour plus the 23 before it); pick one, write it in the spec, and make the chart series add up to the tile totals. Day buckets follow the business time zone, not UTC.
- **Axis labels are round numbers.** With three labels (0, half, max) the maximum must be even, so the half is whole too (a peak of 5 gives 0 / 3 / 6, never 0 / 3 / 5); otherwise round up to 1, 1.2, 1.6, 2, 3, 4, 5, 6, 8 × 10ⁿ. Every chart has a one-sentence text summary and a collapsible data table.
- **A work queue shows the count and the way in together.** Title and one-line description on the left, the count and a "View" action grouped on the right; the action opens the list already filtered to exactly those rows.

## States

Per-widget independent loading skeletons, empty states ("No pending orders - all caught up" is a good state), and error states with retry; one failing widget must not break the page.

## Acceptance checklist

- [ ] Top section is actionable queues, not vanity KPIs
- [ ] Every tile links to a filtered list
- [ ] Definitions + time windows + comparison present
- [ ] Role-specific content respects permissions
- [ ] No fake data; unavailable metrics are honest
- [ ] Works at 1440 / 1024 / 390 widths without horizontal scroll
