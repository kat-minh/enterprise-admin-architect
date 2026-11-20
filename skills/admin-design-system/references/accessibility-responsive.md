# Accessibility, Responsive & Locale

Read when: building the shell/components, or reviewing quality gates for UI.

## Contents
- Accessibility baseline (WCAG 2.2 AA)
- Interaction quality
- Responsive strategy
- Locale & i18n (including Vietnamese)
- Feedback & error recovery

---

## Accessibility baseline (WCAG 2.2 AA)

- **Keyboard**: every action reachable; logical tab order; Esc closes dialogs/drawers/popovers; arrow keys in menus; shortcuts documented and not conflicting with browser/AT.
- **Focus**: always-visible focus ring (token); focus trapped inside modals/drawers and returned to the trigger on close; skip-to-content link; focus moves to the page title/heading after route change.
- **Labels**: every input has a programmatic label; icon-only buttons have `aria-label`; errors linked with `aria-describedby`; required fields `aria-required`.
- **Semantics**: real `<button>`/`<a>`/`<table>`; headings in order; landmarks (`nav`, `main`, `header`); tables with `th scope` and `aria-sort`; dialogs with `role="dialog"`/`alertdialog` and titles.
- **Contrast**: text ≥ 4.5:1, UI components/large text ≥ 3:1 (including disabled/placeholder legibility where informative); status never conveyed by colour alone.
- **Target size**: ≥ 24×24px (WCAG 2.2), 40-44px for touch-primary screens (kiosk/mobile).
- **Live regions**: toasts and result counts announced politely (`aria-live="polite"`), errors assertively when blocking.
- **Motion**: honour `prefers-reduced-motion`; no auto-playing animation; no flashing.
- **Page titles**: `<title>` per route ("Orders · Admin").

## Interaction quality

- Visible hover/active/disabled/loading states for every control; disabled controls explain why (tooltip/aria-description).
- Destructive confirmation proportional to risk; undo (toast action) where feasible.
- Optimistic UI only when safe; otherwise show pending state.
- Debounced search; no layout shift when data loads (skeletons sized to content).
- Consistent toasts: success short & specific; errors state what happened and what to do; include request ID for server errors.
- Don't use `alert()/confirm()` native dialogs - use the design-system `ConfirmDialog`.

## Responsive strategy

Admin is **desktop-first but must be usable on tablet and phone** for urgent tasks (approve, reply, check status).

| Width | Behaviour |
|---|---|
| ≥ 1280 | Full sidebar, full tables, detail right rail |
| 1024-1279 | Collapsed icon sidebar (expand on hover/click), fewer default columns |
| 768-1023 | Off-canvas nav; tables hide low-priority columns; forms single column |
| < 768 | Off-canvas nav; list pages become card rows with primary fields + actions; drawers full-screen; sticky action footer; no horizontal **page** scroll |

Only data tables may scroll horizontally (inside their container). Check long Vietnamese/English strings, large numbers, and 200% zoom. Dedicated touch layouts for kiosk-like roles (check-in staff, kitchen display).

## Locale & i18n (including Vietnamese)

- Formatting via `Intl`: currency `new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })` (VND has no decimals); dates `dd/MM/yyyy`, times 24h; relative times with absolute tooltip.
- **Timezone**: store UTC; display in a configured business timezone (e.g. `Asia/Ho_Chi_Minh`); scheduled actions show the timezone explicitly.
- **Fonts** must render Vietnamese diacritics (Inter, Be Vietnam Pro, Roboto OK); check stacked marks and line-height (≥ 1.4) so accents are not clipped.
- **Search** must be diacritic-insensitive ("nguyen" finds "Nguyễn"): Postgres `unaccent` extension, MySQL accent-insensitive collation, or a normalised search column; also case-insensitive and whitespace-trimmed.
- **Names**: don't split into first/last blindly (Vietnamese family name first); use "Full name" unless the domain needs more.
- **Phone**: normalise to E.164 (`+84…`) while accepting local input (`0xxx`).
- **Addresses**: reuse the structure the public site/backend already uses; don't invent levels.
- Text expansion (translated UI is 20-40% longer): no fixed-width buttons; truncation with tooltip.
- Admin UI language: default to the operators' language; translate through the project's i18n system if one exists; content localisation is a separate module (`localization`).
- Numbers/units/currency consistent between list, detail, exports, and emails.

## Feedback & error recovery

- Error pages: 401 → login with return URL; 403 → explain missing permission + contact path; 404 → record not found with back link; 500 → friendly + retry + request ID.
- Network offline/timeouts: inline retry; preserve form input; never lose data.
- Session expiry mid-edit: preserve draft, re-authenticate, resume.
