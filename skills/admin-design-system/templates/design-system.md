# Admin Design System

> Project: <name> · Date: <YYYY-MM-DD> · Status: draft | approved (Gate 2)

## 0. Design direction
> Written before any token (`admin-design-system/references/anti-slop-design.md` §1). Not "professional, clean, modern".

| Item | Decision |
|---|---|
| Operators | <who, hours per day, device, ambient light, keyboard or mouse, locale> |
| Density class | <dense operations / content / analytics, per module group> |
| Three adjectives (each can be opposed) | <e.g. calm, exact, quick> |
| How the public brand is translated | <what carries over: type, palette, density, one move; what does not> |
| Reference 1 | <product and screen> · borrow: <one property> · why it fits · do not copy: <> |
| Reference 2 | <> |
| Reference 3 | <> |
| Anti-references (2) | <what this must not resemble> |
| Signature move | <one detail that carries identity without touching layout or controls> |
| Voice | <case convention, button and error wording rule> |
| Dark mode | <needed by whom, or dropped, and why> |
| Decisions the sources disagree on | font: <>, case: <>, side stripes: <>, motion: <> |
| Specificity and baseline tests | <date, result; which of font, accent hue, neutral tint, radius, density, status vocabulary, signature move differ from the default admin> |

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
| Font family | | Why this and not the default; supports Vietnamese diacritics? |
| Base size / table size | <e.g. 14px / 13px> | default: change unless a reason is recorded |
| Type scale / weights | <e.g. 12 / 13 / 14 / 16 / 20 / 24; 400 / 500 / 600> | ratio 1.125-1.2 |
| Spacing unit | 4px | |
| Radius (control / card / overlay) | <e.g. 4 / 6 / 10> | character: sharp / soft / round |
| Control height (compact / default / large) | 28 / 32 / 40 | |
| Table row height (compact / default / comfortable) | <e.g. 32 / 40 / 48> | default per module class; stored per user |
| Neutral scale | | |
| Accent | | |
| Success / Warning / Danger / Info | | |
| Surfaces (app / card / overlay) | | |
| Border / divider | | |
| Focus ring | | |
| Elevation levels | | 0 border only · 1 popover · 2 drawer and dialog; no glow |
| Icons | | one library, one stroke, 16 / 20, no tinted tiles |
| Chart palette | | fixed-order categories (≤ 7), one sequential, one diverging; colour-blind check |
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
