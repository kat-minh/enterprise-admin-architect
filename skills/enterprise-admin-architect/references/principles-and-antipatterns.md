# Principles & Anti-patterns

Read when: calibrating quality, reviewing output, or tempted to take a shortcut.

## Contents
- The professional bar
- "AI-generated admin" tells (and fixes)
- Resolving apparent contradictions
- Questions that keep you honest

---

## The professional bar

A mature admin (think Shopify Admin, Stripe Dashboard, Linear, GitHub settings) has:

- **Task-first navigation**: grouped by what operators *do* ("Orders", "Fulfilment", "Customers"), not by DB tables.
- **A "what needs me now" surface**: queues of pending/overdue/failed items with counts and deep links, not decorative KPIs.
- **Dense, scannable data**: tables with real filters, saved views, sticky headers, bulk actions, URL-synced state.
- **Safe operations**: confirmation proportional to risk, undo/soft-delete, concurrency protection, audit trail for every sensitive action.
- **Entity pages that tell the story**: status, key facts, primary action, related records, timeline.
- **Permission-aware everywhere**: nav, routes, buttons, API.
- **Consistent system**: one component for each job, one pattern for each interaction.

## "AI-generated admin" tells (and fixes)

| Tell | Why it fails | Fix |
|---|---|---|
| Sidebar + 4 KPI cards + generic tables, regardless of business | Not tied to any real operation | Dashboard = attention queues + domain KPIs derived from `module-inventory.md` |
| Same CRUD template for every entity | Orders, bookings, tickets, leads have lifecycles | Use the archetype (workflow/queue/ledger) in `admin-module-builder/references/module-archetypes.md` |
| Fake numbers, lorem data, buttons that toast "Saved!" with no call | Dishonest; hides missing backend | Real API or documented gap + honest empty/"not available" state |
| Client-side filtering of all records | Breaks at scale | Server-side pagination/filter/sort from day one |
| Role check only on the sidebar | Direct URL/API access bypasses it | Route guard + API guard + tests that call the API without permission |
| Delete = hard delete with `confirm()` | Irreversible, unlogged | Soft delete / archive, typed confirmation for critical, audit entry |
| 12-field form in a modal | Cramped, loses work | Page or drawer with sections, sticky save bar, dirty guard |
| Giant gradient cards, random charts | Decoration over information | Compact stats with definition + comparison; chart only if it answers a question |
| Invented modules ("Gamification", "AI Insights") | Scope inflation | Evidence tags; `proposed` needs approval |
| New UI kit imported next to the existing one | Inconsistent, heavier | Reuse the project's kit; wrap, don't fork |
| Every page its own spacing/typography | Looks amateur | Tokens first, shared page scaffolding |
| Status shown as raw enum text | Hard to scan | `StatusBadge` with semantic colours + icon/label (not colour alone) |
| Nested scroll containers, modals on modals | Poor UX | One scroll region per page; drawer → page escalation |
| "Done" because it compiles | Workflow may be broken | Verification evidence per module |

## Resolving apparent contradictions

- *"Discover missing operational capabilities"* vs *"never invent functionality"* → use the evidence tags. `implied` capabilities (necessary consequences of confirmed features) are allowed; `proposed` ones wait for approval.
- *"Professional/enterprise"* vs *"don't over-engineer"* → enterprise quality is about **correctness, safety, consistency**, not feature count. A 3-module admin can be enterprise-grade.
- *"Reuse existing stack"* vs *"enterprise UI"* → raise the bar through tokens, density, layout and patterns within the existing kit. Switch kits only if the existing one cannot meet table/form needs, and say so at Gate 2.
- *"Build real"* vs *"backend missing"* → build the backend slice if the repo owns the backend; otherwise write the contract in `product-discovery.md` § Backend gaps and keep the module `blocked`/`partial` - never fake it.

## Questions that keep you honest

Before declaring anything complete, answer these in the report:

1. Which public-site feature has **no** admin owner? (If any → gap.)
2. Which module exists with **no** public-site or operational justification? (If any → remove.)
3. Can a user without permission still perform the action via URL/API?
4. If an operator makes a mistake here, can it be undone or traced?
5. What happens with 100,000 rows? With 0 rows? With the API down?
6. What did I not verify, and does the report say so?
