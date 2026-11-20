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

Professional · clean · structured · information-dense but readable · consistent · functional · trustworthy · minimal decoration. The admin is a tool used for hours: low visual noise, strong hierarchy, predictable positions.

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
| Font | Project font; else Inter / system UI stack. **Must support Vietnamese** if applicable (Inter, Be Vietnam Pro, Roboto OK) | Diacritics rendering |
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
- Cards used for grouping, not for decoration; avoid card-within-card-within-card.
- Right-aligned numeric columns; monospace/tabular numerals for money/IDs; truncation with tooltip.

## Dark mode, icons, motion

- Dark mode only if the product needs it; implement via the same tokens (CSS variables), test contrast, never invert images.
- One icon set (e.g. lucide / Ant Design icons / Tabler), 16px inline, 20px nav; consistent stroke.
- Motion: 120-200ms ease-out for overlays/expand/collapse; no decorative animation; honour `prefers-reduced-motion`.

## Example CSS variables

```css
:root {
  --font-sans: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --text-1: #111827; --text-2: #4b5563; --text-3: #6b7280;
  --bg-app: #f9fafb; --bg-surface: #ffffff; --bg-subtle: #f3f4f6;
  --border: #e5e7eb; --border-strong: #d1d5db;
  --accent: #2563eb; --accent-hover: #1d4ed8; --accent-subtle: #eff6ff;
  --success: #16a34a; --warning: #d97706; --danger: #dc2626; --info: #2563eb;
  --radius-control: 6px; --radius-card: 8px; --radius-overlay: 12px;
  --control-h: 32px; --row-h: 40px; --sidebar-w: 240px; --header-h: 56px;
  --focus-ring: 0 0 0 2px var(--bg-surface), 0 0 0 4px var(--accent);
}
```
Map these into the UI kit's theme (see `stack-adapters.md`) instead of duplicating styling.

## What to avoid

Gradients and glassmorphism as decoration · giant KPI cards · oversized padding that pushes data below the fold · multiple accent colours · inconsistent radius/spacing between modules · emoji as icons · fake charts · centre-aligned tables · nested scroll containers · modals for long forms.
