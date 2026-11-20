# Admin Design System

> Project: Fixture Shop (example) · Date: 2026-11-20 · Status: approved (Gate 2)

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
| Font family | Inter | Supports Vietnamese diacritics |
| Base size / table size | 14px / 13px | |
| Spacing unit | 4px | |
| Radius (control / card / overlay) | 6 / 8 / 12 | |
| Control height | 32 | compact 28, large 40 |
| Table row height | 40 | compact 32 |
| Accent | #2563EB | single accent |
| Success / Warning / Danger / Info | green / amber / red / blue | |
| Sidebar / header | 240 (64 collapsed) / 56 | |

## 3. Status colour map
| Domain status | Semantic | Label | Icon |
|---|---|---|---|
| PENDING | warning | Pending | clock |
| PAID | info | Paid | check-circle |
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
