# Admin Design System

> Project: <name> · Date: <YYYY-MM-DD> · Status: draft | approved (Gate 2)

## 1. Foundation decision
| Item | Decision | Reason |
|---|---|---|
| UI kit | <e.g. Ant Design 5 (reused from public site)> | |
| Styling | <Tailwind / CSS-in-JS / CSS modules> | |
| Table engine | | |
| Forms + validation | | |
| Data fetching | | |
| Icons | | |
| Charts | | |
| Rich text | | |
| Deviations from public design system | | |

## 2. Tokens
| Token | Value | Notes |
|---|---|---|
| Font family | | Supports Vietnamese diacritics? |
| Base size / table size | 14px / 13px | |
| Type scale | 12 / 13 / 14 / 16 / 20 / 24 | |
| Spacing unit | 4px | |
| Radius (control / card / overlay) | 6 / 8 / 12 | |
| Control height (compact / default / large) | 28 / 32 / 40 | |
| Table row height (compact / default / comfortable) | 32 / 40 / 48 | |
| Neutral scale | | |
| Accent | | |
| Success / Warning / Danger / Info | | |
| Surfaces (app / card / overlay) | | |
| Border / divider | | |
| Focus ring | | |
| Shadows | | overlays only |
| Breakpoints | 768 / 1024 / 1280 / 1536 | |
| Sidebar / header | 240 (64 collapsed) / 56 | |
| Motion | 120-200ms, respects reduced-motion | |

## 3. Status colour map
| Domain status | Semantic | Label | Icon |
|---|---|---|---|
| pending | warning | Pending | clock |

## 4. Component catalogue
| Component | Purpose | Key props | Used in | Spec |
|---|---|---|---|---|
| PageHeader | | | all | |
| DataTable | | | lists | data-table-spec.md |
| FilterBar | | | lists | |
| StatusBadge | | | all | |
| ConfirmDialog | | | destructive | |
| FormSection / StickyFormFooter | | | forms | form-spec.md |
| EntityHeader / Timeline | | | details | detail-page-spec.md |
| AttentionQueue / StatTile | | | dashboard | dashboard-design.md |
| PermissionGate | | | all | |
| EmptyState / ErrorState / Skeleton | | | all | |

## 5. Patterns
- Table → Preview drawer → Detail page
- Destructive confirmation levels (simple / typed / step-up)
- Loading / empty / error conventions
- Toast conventions (success short, error actionable)
- URL state conventions

## 6. Accessibility, responsive, locale
- Keyboard & focus: <rules> · Breakpoint behaviour: <rules> · Locale: <currency, dates, timezone, search normalisation>

## 7. Reference module
| Module | Route | Demonstrates | Verified |
|---|---|---|---|

## 8. Known deviations & debt
