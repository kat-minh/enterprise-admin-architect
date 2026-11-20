# Dashboard Design

Read when: designing the admin overview / any role's landing page.

## Contents
- Purpose and structure
- Widgets
- Per-domain examples
- Rules for numbers and charts
- Choosing a chart
- Metric catalogue (write it before any widget)
- Tasks versus state counters
- Period, comparison and freshness
- Role views
- The enterprise bar and a design review
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

## Choosing a chart

| Question | Chart | Notes |
|---|---|---|
| How is it moving over time? | line or area (bars for counts per day) | one series per question; label the unit; fill every bucket; a small sparkline inside a KPI tile is fine, with a text summary |
| How do the parts compare? | sorted horizontal bars | direct labels; show the previous period beside the value |
| What share is each part? | one stacked bar or a donut with ≤ 5 slices | a table beside it; never 3D |
| Where do people drop off? | funnel (steps with count, share of step 1, drop from the step before) | each step is a defined event; say what "step" means |
| Which cells are busy? | heat map (hour × weekday) | only with enough data; colour-blind-safe scale |
| One number | tile with delta | a chart only if it answers a second question |

Every chart: a one-sentence text summary, a collapsible data table, colour never the only carrier of meaning, one consistent colour per category across the page. If the `dataviz` skill is installed, use it for palettes and marks.

## Metric catalogue (write it before any widget)

A dashboard is built from a catalogue, not from what is easy to count. Put it in the dashboard module spec and show it at the design gate. One row per figure:

| ID | Metric | Definition / formula | Source | Comparison | Drill-down | Limitation |
|---|---|---|---|---|---|---|

- **Derive candidates from the product's value moments** in `product-discovery.md`, in this order: acquisition (new users), activation (first valuable action within N days), engagement (active users, depth of use, sharing), content or catalogue health (what people create, top destinations or products, sizes), operations (job and integration health, drafts waiting), governance (admin actions, sensitive actions by person, denied attempts, failed sign-ins, dormant admin accounts). Not from table names.
- **Definitions are exact**: numerator, denominator, window, time zone, exclusions. A ratio with no data is "-" with the reason, never "0 %".
- **Limitations are written honestly** ("last sign-in only: a lower bound of real activity", "cohorts younger than 7 days are left out").
- **Every metric has a source that exists.** If the product does not record what the metric needs, the metric is a gap: record the missing instrumentation in the ledger, do not approximate silently.
- Group the catalogue into tabs by question (Overview, Growth, Usage, Content, Operations, Governance), and give the overview only the six to eight figures that answer "is it healthy?".

## Tasks versus state counters

A **task** has an owner, an action and disappears when done (an unpublished draft, a paused job, an admin who never signed in, a spike of denied attempts). A **state counter** (suspended accounts, archived items, legacy accounts) is monitoring. Show tasks under "Needs attention" **only when there is one**, and say "Nothing waiting" otherwise; put state counters in a quiet "Watching" strip with a note that they are not to-dos. A counter dressed as a task trains operators to ignore the section.

## Period, comparison and freshness

- A range selector (7 / 30 / 90 days) in the page header and the URL; every figure compared with the previous period of the same length, as text and an arrow ("+3 vs previous period"), never colour alone. For ratios compare in percentage points.
- Show the range, the time zone ("days in Vietnam time") and "updated N min ago"; day buckets follow the business time zone; series add up to the tile totals.
- Cohort rates leave out cohorts that have not had the whole window, and say so.
- Offer **Export CSV** of what is on screen (UTF-8 with BOM so spreadsheets read accents; values quoted; a leading `= + - @` neutralised).

## Role views

Landing page and blocks follow the permission matrix; a block a role may not read is not rendered and its endpoint refuses it.

| Role (typical) | Lands on | Sees |
|---|---|---|
| Owner / super admin | Overview | everything, including who did sensitive things |
| Support | Overview with a quick search for people and records | recent signs-ups and work; their own actions only in governance |
| Analyst | Growth | growth, usage, content, operations; no governance |
| Content editor | the content module | a card with draft, live version and shortcuts, not user data |

## The enterprise bar and a design review

Before showing a dashboard to the owner, answer these by looking at the screenshot at desktop and phone width:
1. What needs me *now* (tasks), and does the page say so when nothing does?
2. Is there a number without a comparison, a definition or a way in? Remove or fix it.
3. Do two tiles say the same thing? Remove one.
4. Does every chart answer a question that is written above it?
5. Would each role want this page as their landing page? What would the other roles delete?
6. Is every empty, loading and error state honest and specific?
7. Does a number match the list it links to, and was it checked against an independent computation (`admin-module-builder/references/analytics-endpoints.md`)?
8. Could a stranger tell in ten seconds whether the product is healthy?

## States

Per-widget independent loading skeletons, empty states ("No pending orders - all caught up" is a good state), and error states with retry; one failing widget must not break the page.

## Acceptance checklist

- [ ] Top section is actionable queues, not vanity KPIs
- [ ] Every tile links to a filtered list
- [ ] Definitions + time windows + comparison present
- [ ] Role-specific content respects permissions
- [ ] No fake data; unavailable metrics are honest
- [ ] Works at 1440 / 1024 / 390 widths without horizontal scroll
- [ ] A metric catalogue exists (definition, source, comparison, drill-down, limitation) and the widgets are exactly its rows
- [ ] Tasks and state counters are separate; "Nothing waiting" is shown when there is nothing
- [ ] Range selector, previous-period comparison, time zone, "updated N min ago", CSV export
- [ ] Each role's landing view differs and was reviewed as that role
