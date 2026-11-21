# Visual Standard

Read when: defining tokens or reviewing whether an admin "looks professional".

## Contents
- Target qualities
- Reference products (design principles, not to copy)
- Default token set
- Status colour semantics
- Layout metrics
- Dark mode, icons, motion
- Example CSS variables
- What to avoid

---

## Target qualities

The admin is a tool used for hours: low visual noise, strong hierarchy, predictable positions, information-dense but readable, consistent, minimal decoration. "Professional, clean, modern" is **not** a direction: every admin claims it. The qualities below are the floor; the identity comes from the recorded design direction (`anti-slop-design.md` §1), and the values in this file are **defaults to change unless a reason is recorded**.

## Reference products (principles to learn from)

- **Linear** - speed, keyboard-first, restrained colour, crisp density.
- **Stripe Dashboard** - data clarity, filtering, detail pages with timeline, careful typography.
- **Shopify Admin** - merchant workflows, resource lists with saved views, contextual save bar.
- **Vercel / GitHub** - settings structure, neutral palette, status semantics.
- **Notion** - content editing ergonomics, quiet UI.
- **Retool** - dense operational tooling.

## Default token set (adjust to the project's brand)

| Token | Default | Rationale |
|---|---|---|
| Base font size | 14px (tables 13px, captions 12px) | Admin density |
| Font | Project font, or a **recorded choice** (a system stack is acceptable when chosen on purpose). **Must support the product's scripts** (Vietnamese diacritics: Be Vietnam Pro, Inter, IBM Plex Sans, Public Sans, Roboto, Source Sans 3 and others do) | Diacritics rendering; an undecided font is the tell |
| Type scale | 12 / 13 / 14 / 16 / 20 / 24 (page title 20-24, section 16) | Few steps |
| Weight | 400 body, 500 labels/headers, 600 titles | |
| Spacing | 4px grid: 4, 8, 12, 16, 24, 32, 48 | |
| Radius | 6 controls · 8 cards · 12 modals | Subtle, consistent |
| Control height | 32 default · 28 compact · 40 large (touch) | |
| Table row | 40 default · 32 compact · 48 comfortable | User density toggle |
| Neutral | 10-step gray; app bg gray-50, card white, borders gray-200, text gray-900/600/500 | Surface hierarchy |
| Accent | **One** brand colour for primary actions, links, active nav, focus | Avoid rainbow |
| Semantic | success green, warning amber, danger red, info blue (each with bg/border/text variants) | Status |
| Shadows | None on cards; small shadow only on popovers/drawers/modals | Flat, structured |
| Focus ring | 2px accent outline + 2px offset, always visible on keyboard focus | A11y |
| Sidebar | 240px (collapsed 64px), header 56px | |
| Content width | Fluid for tables; forms max 720-960px; detail pages up to 1280px with right rail | |

Contrast: text ≥ 4.5:1, large text/UI components ≥ 3:1.

## Status colour semantics

| Meaning | Colour | Examples |
|---|---|---|
| Needs attention / waiting | warning (amber) | pending, awaiting payment, in review |
| In progress | info (blue) | processing, shipped, scheduled |
| Positive terminal | success (green) | paid, completed, published, active |
| Negative terminal | danger (red) | failed, rejected, overdue, banned |
| Inactive / neutral | gray | draft, archived, cancelled(by user), disabled |

Always render **label text** (and optionally an icon); colour alone is insufficient. Use one `StatusBadge` mapping per domain defined in `design-system.md` §3 - not ad-hoc colours per page.

## Layout metrics

- Page = `PageHeader` (title, description, primary action, secondary actions) → toolbar (search, filters, view, density) → content. 16-24px page padding.
- One scroll region (the main area); sticky table headers; sticky form footer.
- **Tab rows and other horizontal strips** never show a native scrollbar: the hairline is a `box-shadow` of the row (not a border), the active underline sits inside the tab (`bottom: 0`, never `-1px`), `overflow-y` is hidden, the horizontal scrollbar is hidden, a fade marks the edge that has more, and the chosen tab is scrolled into view. Labels are short (about 14 characters or fewer) so a row fits at 768 px. Gate `UX-20`.
- Cards used for grouping, not for decoration; avoid card-within-card-within-card.
- Right-aligned numeric columns; monospace/tabular numerals for money/IDs; truncation with tooltip.

## Dark mode, icons, motion

- Dark mode only if the product needs it; implement via the same tokens (CSS variables), test contrast, never invert images.
- One icon set (e.g. lucide / Ant Design icons / Tabler), 16px inline, 20px nav; consistent stroke.
- Motion: 120-200ms ease-out for overlays/expand/collapse; no decorative animation; honour `prefers-reduced-motion`.

## Example CSS variables

**Shape of the token set** (names and roles only; **the values come from the direction, not from this file**: a copied palette is the framework default and an undecided design):
```css
:root {
  --font-sans: <chosen family>, <fallbacks>;
  --text-1 / --text-2 / --text-3: <neutral ramp tinted toward the accent, 4.5:1 or better on every surface>
  --bg-app / --bg-surface / --bg-subtle: <three steps, plus a second layer for sidebar and toolbar>
  --border / --border-strong: <visible in both themes; inputs reach 3:1 against their surface>
  --accent / --accent-hover / --accent-subtle / --on-accent: <one accent with listed roles>
  --success / --warning / --danger / --info: <four hues, none equal to the accent>
  --radius-control / --radius-card / --radius-overlay: <per role, one character>
  --control-h / --row-h / --sidebar-w / --header-h: <numbers per density mode>
  --focus-ring: <two-layer ring, 3:1 against the surface>
}
```
Derive the ramp from three inputs (base, accent, contrast) instead of picking ninety values; steps five apart reach 4.5:1.
Map these into the UI kit's theme (see `stack-adapters.md`) instead of duplicating styling.

## What to avoid

The 33 recognisable tells and how each is checked are in `anti-slop-design.md` §2. In short: gradients and glassmorphism as decoration · giant KPI cards · oversized padding that pushes data below the fold · multiple accent colours · inconsistent radius/spacing between modules · emoji as icons · fake charts · centre-aligned tables · nested scroll containers · modals for long forms.
