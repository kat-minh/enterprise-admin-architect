# Admin Design System

> Project: Fixture Shop (example) · Date: 2026-11-20 · Status: approved (Gate 2)

## 0. Design direction
| Item | Decision |
|---|---|
| Operators | 3 order-desk staff, 6-7 hours a day, 24-inch monitor, keyboard-first, Vietnamese |
| Density class | Dense operations (orders, customers); content (catalogue pages) |
| Three adjectives | quick, exact, quiet |
| How the public brand is translated | the shop's warm off-white and its green carry over as neutral tint and accent; the storefront's large imagery and rounded cards do not |
| Reference 1 | Linear issue list · borrow: row density with keyboard navigation · fits order triage · do not copy: its purple accent |
| Reference 2 | Shopify Admin order page · borrow: the order timeline · fits fulfilment · do not copy: card-per-section layout |
| Reference 3 | Stripe payments list · borrow: right-aligned tabular amounts and status chips with labels · do not copy: its marketing gradients |
| Anti-references | a default component-library dashboard with a gradient hero; a rainbow chart page |
| Signature move | status chips combine a distinct shape, a colour and the label; an age marker shows how long an order has waited |
| Voice | sentence case; verb plus object on buttons; errors say what happened, why and what to do |
| Dark mode | dropped: the desk is a lit office; revisit if night-shift staff are hired |
| Decisions the sources disagree on | font: one family chosen for tabular figures; case: sentence; side stripes: none; motion: 150 ms for state changes only |
| Specificity and baseline tests | 2026-11-20: five of seven differ from the default admin (font, accent hue, neutral tint, radius, status vocabulary) |

## 1. Foundation decision
| Item | Decision | Reason |
|---|---|---|
| UI kit | Ant Design 5 (reused from public site) | Already in the project; mature Table/Form/Drawer |
| Styling | Ant Design theme tokens; Tailwind for layout utilities only | Avoid style conflicts |
| Table engine | Ant Design `Table`, controlled, server-side | |
| Forms + validation | Ant Design `Form` + zod schemas shared with the API | |
| Data fetching | TanStack Query | Already used |
| Deviations from public design system | Compact algorithm, neutral palette, 32px controls | Admin density |

## 2. Tokens
| Token | Value | Notes |
|---|---|---|
| Font family | Be Vietnam Pro | Full Vietnamese support and tabular figures; chosen over the system stack for numeral alignment in amount columns |
| Base size / table size | 14px / 13px | |
| Spacing unit | 4px | |
| Radius (control / card / overlay) | 4 / 6 / 10 | soft-sharp character: tables and inputs stay tight |
| Control height | 32 | compact 28, large 40 |
| Table row height | 40 | compact 32 |
| Accent | #0F766E | single accent, from the shop green; text on it ≥ 4.5:1 |
| Success / Warning / Danger / Info | green / amber / red / slate-blue | all four distinct from the accent |
| Sidebar / header | 240 (64 collapsed) / 56 | |

## 3. Status colour map
| Domain status | Semantic | Label | Icon |
|---|---|---|---|
| PENDING | warning | Pending | clock |
| PAID | success | Paid | check-circle |
| SHIPPED | info | Shipped | truck |
| CANCELLED | neutral | Cancelled | x-circle |

## 4. Component catalogue
| Component | Purpose | Key props | Used in | Spec |
|---|---|---|---|---|
| DataTable | server-side lists | columns, fetcher, filters | all lists | data-table-spec.md |
| StatusBadge | status display | status, map | all | - |
| ConfirmDialog | destructive confirmation | level 1-3 | refunds, delete | - |
| EntityHeader / Timeline | detail pages | | orders, customers | detail-page-spec.md |

## 5. Patterns
Table → Preview drawer → Detail page; typed confirmation for refunds over a threshold; skeleton rows for loading.

## 6. Accessibility, responsive, locale
Keyboard and focus per `accessibility-responsive.md`; vi-VN currency (no decimals); timezone Asia/Ho_Chi_Minh; diacritic-insensitive search via `unaccent`.

## 7. Reference module
| Module | Route | Demonstrates | Verified |
|---|---|---|---|
| orders | /admin/orders | list, drawer, detail, transitions | pending |

## 8. Known deviations & debt
- None yet.
