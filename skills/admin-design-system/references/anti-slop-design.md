# Anti-slop design: decide a direction, then measure it

Read when: starting Step 1 of the design system, reviewing a UI that "looks AI-made", or filling the design gate. `visual-standard.md` gives sane defaults; this file stops them from becoming the whole design. An admin built from defaults is not wrong, it is **undecided**: the same system font, the same blue, one radius and one soft shadow on everything, a row of four identical stat tiles. Owners read that at a glance as "generated". The cure is a **recorded direction** before any token, and a set of **checks that catch the common tells**.

Basis (read 2026-11-21; popularity by GitHub stars, which measure attention, not quality): Anthropic `frontend-design` skill, Impeccable (a design skill with a rule detector and an explicit "operate" mode for product and admin UI), ui-ux-pro-max, Vercel Web Interface Guidelines, the `dataviz` guidance, and the public guidance of Carbon, Primer, Stripe, Linear, Refactoring UI and NN/g. Several design-system pages were read as summaries; the rules below are paraphrased, not quoted. Marketing-page skills (large type, hero sections, scroll effects) were read and **not** carried over: an admin is a tool used for hours.

## Contents
1. Direction before pixels
2. The tells
3. Rules that sources disagree on: decide once
4. What the audit measures
5. Review rubric
6. The design gate package
7. Optional external skills

## 1. Direction before pixels

No token is written before steps 1-3 are in `design-system.md` section 0.
1. **Brief, 12 lines at most.** Operators and hours per day, device, ambient light, keyboard or mouse, locale (from `product-discovery.md`); density class (table below); how the public brand is **translated** (type, palette, density and one signature move carry over; layout and controls do not); three adjectives that can be opposed. "Professional, clean, modern" is rejected: every admin claims it.
2. **Classify** each module group with the table; the row sets the defaults for steps 4-10. The shell takes the dominant class, density is per module.
3. **Reference board: exactly three real products.** For each: the screen, the one property to borrow, why it suits these operators, and what **not** to copy. Add two anti-references (what this must not resemble). A reference sets the craft bar, not the look.
4. **Type.** One family, or two clearly different; it must render the product's scripts (Vietnamese diacritics). A fixed scale with a ratio of 1.125-1.2 (12/13/14/16/20/24 fits), three weights, tabular numerals in tables, monospace only for ids and code. Record why this family and why not the default.
5. **Palette** from three inputs (base, accent, contrast), not 98 free variables. Neutrals **tinted** toward the accent, 8-10 steps; a second neutral layer for sidebar and toolbar; **one accent with a written role list** (primary action, selection, link, focus, active navigation); four status hues distinct from the accent (the accent is **not** also "info"); two designed theme sets, not an inversion. Chart palette: fixed-order categories (at most 7), one sequential hue, one diverging pair, validated for colour-blindness (`dataviz` has a validator).
6. **Spacing and radius.** A 4 px grid with named steps; radius per role (control, card, overlay) and a character chosen from the operators (sharp 2-4 / soft 6-8 / round 12+); tight inside groups, loose between them.
7. **Elevation, three levels.** 0 border only (everything in flow), 1 popover or menu, 2 drawer or dialog. Shadows have offset and blur, never a coloured glow. Dark themes separate by lightness steps and visible borders.
8. **Density modes** (compact, default, comfortable) with numbers for control, row and base size, a default per module class, stored per user, shown at the gate.
9. **Icons.** One library, one stroke, two sizes (16/20), outline with filled only for the active state, no tinted tiles, a status icon always beside its label.
10. **Charts** use the palette of step 5 and the emphasis form (one hue plus grey) by default.
11. **One signature move**: a detail that carries identity without touching layout or controls (the status vocabulary of shape, colour and label; an ageing or SLA marker in queues; the id chip; the active-row treatment). Spend boldness in one place.
12. **Voice.** One case convention, verb plus object on buttons, errors say what/why/fix, empty states offer the next action, a glossary from discovery.
13. **Record and test.** Write sections 0-2, then run (a) the **specificity test**: could an unrelated product use this unchanged? (b) the **baseline test**: imagine the default admin for this prompt and list which of {font, accent hue, neutral tint, radius, density, status vocabulary, signature move} differ; fewer than five means revise (a rule of thumb, not a measurement).

| Axis | Dense operations (orders, tickets, bookings) | Content / CMS | Analytics (reports, finance) |
|---|---|---|---|
| Job | triage a queue, move state, bulk act | write, review, schedule, publish | read, compare, explain |
| Default density | compact: control 28-32, row 32-40, base 13-14 | comfortable: row 48, base 14-15, forms max 720 | tables compact; tiles and charts roomy |
| First screen | attention queues with age, then 3-6 figures | my drafts, in review, scheduled | one lead figure, range and baseline; one filter row above all charts |
| Colour load | restrained; status colours are the loudest thing | restrained canvas; accent marks publish state | neutral chrome; colour belongs to data |
| Shape | radius 4-6, borders, no shadows | radius 6-8 | radius 6-8, thin chart marks |
| Signature candidates | status vocabulary, SLA marker | draft / live / scheduled ribbon, diff | headline figure with its baseline |
| Typical slop | KPI row, generic table, all blue | blog-template look, hero banner | rainbow charts, four identical tiles, dual axis |

## 2. The tells

"Key" says how it is checked: **M#** a metric computed by `ui-audit.mjs` (section 4), **P** a scripted probe, **H** a person or a vision review only.

| # | Tell | Professional alternative | Key |
|---|---|---|---|
| 1 | Purple or indigo-to-blue gradient on buttons, sidebar, headers | flat accent derived from brand and product; gradients only inside charts | M6 |
| 2 | Gradient text on titles and KPI numbers | emphasis by weight or size | M6 |
| 3 | Glass or backdrop blur on cards and sidebars | opaque surfaces; blur only on an overlay scrim | M6 |
| 4 | Glow shadows, coloured halos, neon on dark | neutral shadow with offset, overlays only | M4 |
| 5 | The same soft shadow under every card | border for structure, shadow for overlays | M4 |
| 6 | One radius on everything, inputs and tables included | radius per role from a three-step scale | M3 |
| 7 | An icon in a tinted square or circle above each heading or KPI | inline neutral icon beside the label, or none | M9 |
| 8 | Emoji as icons or markers | one drawn icon set | M9 |
| 9 | A different accent hue per module, KPI or badge | one accent with listed roles plus four status hues | M5 |
| 10 | Framework-default accent and neutrals left unchanged | a chosen hue and a tinted ramp with a recorded reason | M5 (advisory) |
| 11 | A coloured bar down one side of a card, alert or row | full border, tint or leading icon; a stripe only as a documented status token on square rows | M6 |
| 12 | Pure black or white, untinted greys, grey on grey | tinted ramp; text at 4.5:1 | axe, M5 (advisory) |
| 13 | Dark mode as an inverted light mode, or chosen by product category | decide from the use scene; two designed sets | M12, P, H |
| 14 | An undecided font; one size and weight everywhere | recorded font decision, 5-6 sizes, 3 weights | M1, M2 |
| 15 | Tracked all-caps eyebrow above headings; 01/02/03 numbering | delete; the heading carries it | M2 |
| 16 | Monospace as a "technical" costume | mono for ids, code, hashes only | M2 |
| 17 | Numbers not right-aligned or not tabular | right-align and tabular figures in tables | M8 |
| 18 | A row of four identical stat tiles (icon, big number, green "+12%") as the page header | attention queues first; one lead figure with a baseline; the rest as a ranked list | M10 |
| 19 | Everything in rounded cards, cards inside cards | spacing and dividers; one container level | M10 |
| 20 | Centred text, headings and table cells | left-aligned text, right-aligned numbers | M10 |
| 21 | Uniform spacing everywhere, or ad-hoc off-grid values | a scale: tight inside groups, loose between | M7 |
| 22 | Greeting banner ("Welcome back, Admin") with art; data below the fold | title and queues in the first viewport | M10, M11 |
| 23 | Everything at once: entry panel, table and export panel; a 12-field form in a modal | progressive disclosure; a page or drawer | P, H |
| 24 | Lorem, "John Doe", round fake numbers, identical deltas | seeded realistic data | M11 |
| 25 | Raw enum text or i18n keys; colour-only status; one status in two colours | one status-badge map | M11, M5 |
| 26 | Empty state = sad illustration and "No data", no next step | text plus a primary action | M11, H |
| 27 | Generic labels and errors ("OK", "Submit", "Something went wrong") | verb plus object; error = what, why, fix | M11 |
| 28 | The primary action only in the overflow menu, or hover-only row actions | primary visible; reveal on focus-within and touch | M8, H |
| 29 | Truncation with no way to read the full value | wrap first; a tooltip with a keyboard and touch path | M8 |
| 30 | Modal on modal; modal for a non-blocking task | drawer, inline, page | P |
| 31 | Toast spam | one toast per action; an inline result for bulk | P |
| 32 | Chart junk: 3D, gradients, rainbow, dual axis, two-slice pie, a number on every point | emphasis, ranked bars, a validated palette | M6, H |
| 33 | Decorative motion: fade-up on every section, pulsing dots, bounce, `transition: all` | motion only for state | M6 |

Not tells (do not turn them into bans): the three-dot menu (hiding the primary action in it is the tell, 28); a flat indigo accent (the gradient in that hue is, 1); Inter or the system font (an undecided font is, 14); a status stripe on square table rows when it is a documented token (11). The brief wins over any single warning here, provided the decision is written down.

## 3. Rules that sources disagree on: decide once

Record each in `design-system.md` section 0 instead of copying a default: **font** (one family or a pair; the system stack is acceptable when chosen on purpose); **letter case** (sentence case or Title Case, one for the whole product); **side stripes** (documented status token, or none); **motion** (none in product UI, or 120-250 ms for state changes only); **dark mode** (needed by an operator, or dropped).

## 4. What the audit measures

`admin-qa-gate/templates/ui-audit.mjs` computes the consistency metrics below on every page and state, per page and across all pages (drift only shows app-wide), and prints them as `must` or `should`. Thresholds are **starting values, calibrated only by one run on one admin** (which removed four false positives: tinted neutrals counted as hues, stacked-card tables, a small table on a dashboard, avatar colours): pin them per project in `CONFIG.thresholds` after reading a first run against two admins the owner likes, and keep `must` for source-backed bans (gradient text, coloured glow, emoji icons, raw keys, placeholder text) and objectively wrong output. A clean metrics run proves **consistency, not good design**. Mark a **specimen** of a style (a colour swatch, a shadow or radius preview, a font sample, an embedded preview frame) with `data-design-sample`: it displays a token instead of using one, and the metrics skip it.

| Metric | What it counts | Starting threshold |
|---|---|---|
| M1 fonts | distinct text families (mono apart) and, when `CONFIG.design.fonts` is filled, whether each is declared | ≤ 2 text + 1 mono, all declared |
| M2 type | distinct sizes and weights, smallest functional text, h1 against body, kickers, mono share | sizes ≤ 8, weights ≤ 3, functional text ≥ 12, no kickers |
| M3 radius | distinct border radii on boxes | ≤ 4 non-pill, none above 16 on wide boxes |
| M4 elevation | distinct shadows; shadowed in-flow boxes; coloured or zero-offset glows | in-flow 0, distinct ≤ 3, glow 0 |
| M5 colour | distinct hue families among clearly coloured text and backgrounds (tinted neutrals, soft status tints, avatars and charts are not counted), one status in one colour | hues ≤ 5 (more than 6 is a must) |
| M6 decoration | gradients, gradient text, backdrop blur, side stripes, infinite animations, `transition: all` | each 0 (blur ≤ 1 on overlays) |
| M7 spacing | share of paddings, margins and gaps up to 64 px on the 4 px grid (1, 2 and 6 allowed); distinct values | ≥ 92 % on grid, ≤ 14 values |
| M8 tables | numeric columns right-aligned and tabular (tables drawn as stacked cards on a phone are skipped), truncation without a full-value path, row actions invisible at rest | all 0 |
| M9 icons | distinct sizes and strokes, emoji in controls, icon tiles | sizes ≤ 3, emoji 0, tiles < 3 |
| M10 cards | nesting depth, identical-tile rows, centred text share, how far down the first data table (8 or more rows) starts | depth ≤ 2, one tile row |
| M11 content | placeholder text, greeting banners, raw keys and enums, generic labels, round numbers, empty states without an action | placeholders and raw keys 0 |
| M12 boundaries | form-control border (or fill) against the surface behind it | all ≥ 3:1 |

**Not automated yet** (walk them by hand while looking, and say so in the report): the keyboard focus ring (visible, 3:1 against its surface), a second dialog opened on top of one (P1), more than three toasts at once (P2), dark-theme surfaces and borders (P3), a dialog with more than eight inputs (P4).

**Cannot be measured** and therefore goes to a person or a vision review: whether this is *this* product's identity, whether the most prominent thing is the right thing, whether every colour carries meaning, copy tone, whether an empty state teaches, whether a chart is honest, whether dark mode is designed rather than inverted, whether the signature move helps.

## 5. Review rubric

Score 1-5 with one line of evidence per score (an element and a screenshot file). Pass: no item at 2 or below and a mean of at least 3.5 (a working bar, not a standard). The reviewer scores the screenshots **before** seeing the metric output and in a fresh context (not the session that built the UI); a vision-model score is a review aid and never evidence of accessibility.

| # | Question | 1 | 3 | 5 |
|---|---|---|---|---|
| R1 | Cover the logo: could this be any other product's admin? | stock template | recognisable in type or colour only | type, palette, density and one signature move visibly specific |
| R2 | In 5 seconds, what is most prominent, and is it what this role needs now? | nothing, or the wrong thing | right thing, competing with two others | one clear lead, queues before KPIs |
| R3 | Point at any coloured pixel: what job does it do? | decoration | mostly meaning | every colour is action, selection, status or data |
| R4 | Density and rhythm: tight inside groups, loose between? | dead space beside cramped data | acceptable, uneven | consistent, matches the brief |
| R5 | Same job, same pattern across three screens? | each page different | mostly consistent | toolbar, badges, dialogs, empty states identical |
| R6 | Data: aligned, formatted, with units and baselines? | fake-looking | correct, some chartjunk | exact, labelled, comparisons present |
| R7 | States and copy: empty, error, loading, labels | placeholder or generic | specific in most places | specific everywhere, next steps |
| R8 | Dark theme: designed or inverted? | inverted | readable, accent or borders off | own steps, borders and chips legible |

## 6. The design gate package

Gate 2 shows the owner a package generated from the **running** app, not a mock: (1) the design brief, section 0; (2) a **token sheet** rendered from the real CSS (type specimen with real strings in each language, palette with role names and contrast pairs, the four status chips, radius, elevation and focus on real controls, the icon set, the chart palette on a real chart); (3) three key screens (dashboard, dense list with the drawer open, one detail or form) in light and dark at desktop width plus the list at phone width; (4) the **density comparison**: the same list at three densities with "rows visible per screen" printed under each; (5) the audit evidence (metrics, rubric scores, what could not be verified).

Questions a non-designer can answer: Which of the three references does it feel closest to, and which would you be embarrassed to resemble? Who uses it, for how many hours, on what screen, and is the default density right? Where do you look first on the dashboard, and is that what you need today? Point at three coloured things: can you say why each is coloured? Can you tell paid, pending and failed at arm's length and in greyscale? Does anyone need dark mode? Is any word one you would not say to your staff? Approve, approve with one change to a single lever (type, colour, density, shape), or reject with the reason.

## 7. Optional external skills

If a design skill is installed (for example `frontend-design`, `impeccable`, `ui-ux-pro-max`, `web-design-guidelines`, `dataviz`), consult it **after** steps 1-3, for review and for charts: it refines the direction, it does not replace it, and marketing-page rules (hero type, scroll effects, decorative motion) do not apply to an admin. With none installed, this file is sufficient.
