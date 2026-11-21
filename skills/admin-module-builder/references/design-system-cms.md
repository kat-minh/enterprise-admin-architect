# Design System and Brand Control (CMS-style)

Read when: the owner wants to change how the public product **looks** from the admin: colours, fonts, shapes, spacing, motion, logo, favicon. `site-content-cms.md` covers text, banners and the draft-publish machinery; this file covers the design layer on top of it. Do not stop at "two accent colours": that is level L1 of `capability-ladders.md` and an owner who says "edit the UI like a CMS" means L2 at least. Gates: `DS-1` to `DS-13` in `quality-gates.md` (inside section A, site content), plus `UX-19` and `UX-20` for the screens.

Three things this file used to leave out, and an owner notices at once: **what a design system covers** (section 12: a palette and a radius are not a design system), **how the editor itself must look and behave** (section 13: a form with the preview at the bottom is not a design tool) and **that brand is one place** (section 14).

## Contents
1. Principle: a closed catalogue, decided by the server
2. Building the catalogue from the product's own tokens
3. Colour rules
4. Typography, shape, density, motion
5. Brand assets
6. Delivery to the public product
7. Publish, schedule, roll back
8. Preview and the publish check
9. Export and import
10. What is deliberately not offered
11. Tests
12. The catalogue: what a design system covers
13. The editor is a workbench, not a form
14. Brand is one place

## 1. Principle: a closed catalogue, decided by the server

The editor never types CSS. It chooses **tokens from a closed catalogue** kept in server code: each has an id, a group, a label, a type (colour, enumeration, image), its limits, its default, whether it is locked, and a plain description of what it affects. The server validates every value, derives the dependent ones (hover, soft background, on-colour) and returns a resolved set of CSS variables; the client never sends or computes CSS. Discrete choices (font, type scale, radius, shadow, density, motion) are **enumerations**, so a bad combination cannot be typed. Only colours are free input, and they are checked.

## 2. Building the catalogue from the product's own tokens

Read the product's token file (the scanner counts the custom properties) and classify every token: **editable colour**, **editable preset**, **derived** (computed from another), **locked** (and say why). Lock what makes the UI readable and operable: text and surface colours, borders, the scrim, the focus ring, minimum touch-target height, on-colour text. Record the table in the module spec; it is also the answer to "what can I change?".

## 3. Colour rules

- Contrast is computed **on the server per theme** and shown by the form with the same numbers. Normal text needs **4.5:1**; only large text (about 24 px, or 19 px bold) may use 3:1; interface components and graphics need 3:1 (WCAG 2.2 1.4.3 and 1.4.11).
- Check **every derived colour too** (hover, soft background, status colours as text on their tinted background and on the surface), in both themes.
- **Measure the colour the product really draws, read from the product's own token** (`--ds-on-accent` in the CSS), not an assumed white. The proving project's rule measured white text on the dark accent and accepted 3:1, while its CSS drew near-black text there (5.7:1): the check judged a colour nobody sees, and the editor's own sample chip, which hard-coded white, failed the accessibility audit at 3.3:1. The rule, the sample and the product must read the same token.
- Do not weaken the rule to fit a default. If the current dark accent only reaches 3:1 with white text, choose the **text colour on the accent** by the server (near-black or white, whichever gives at least 4.5:1) and emit it as a token, or change the default. A rule that accepts 3:1 for ordinary button text is wrong.
- Status colours (success, warning, danger) are edited as the foreground; the soft background is derived. Colour never carries meaning alone (an icon or a word stays).

## 4. Typography, shape, density, motion

- **Font:** a short curated list (system stack plus two or three families with Vietnamese or the product's scripts), **self-hosted**, loaded **lazily** only when chosen, at most four weights, `font-display: swap`. No arbitrary font upload, no third-party font host (privacy, performance, safety). Until a font loads the system font shows.
- **Type scale:** three presets that scale the whole token ladder (compact, standard, comfortable); line-height and letter-spacing stay in code.
- **Shape:** radius presets (sharp, standard, soft), shadow presets (flat, soft, strong). **Density:** control height presets; the phone touch height stays locked.
- **Motion:** standard or calm (animations shrink to nothing). The visitor's `prefers-reduced-motion` is honoured in both and cannot be switched off from the admin. The focus ring cannot be removed.

## 5. Brand assets

These are edited in the one place for brand (section 14), not on a tab of the design module and again on a tab of the content module.

Logo (light, dark, compact), favicon, share image (OG).
- Accept PNG, JPEG, WebP. **Verify the first bytes** match the declared type, parse the dimensions, enforce size, dimensions and aspect ratio **per slot**, reject animated files and anything that is not a plain image. **Re-encode** on upload to strip metadata and polyglot payloads. **SVG is excluded** until a sanitiser is part of the design (an SVG can run script).
- Logos need **alt text** (per language) and the alternative of "no logo: icon and name". Say in the UI what each slot is used for and its limits.
- Store assets **immutable** (content-addressed or by id); versions refer to them, so a rollback restores the same image. Public URLs serve **only assets referenced by the published version** (drafts are reachable only with a preview token), with `nosniff` and long immutable caching.
- Provide a **usage view** (which versions use this image) and a **takedown** for a super admin (purge the bytes, keep the audit row) so a wrong or infringing image can be removed.
- The share image does nothing for a single-page app: crawlers do not run JavaScript. Say so in the UI; it matters only with server-side rendering.

## 6. Delivery to the public product

The public config endpoint returns the resolved design from the **published** version only, cached and tagged like the rest of the config. The client applies it through **one `<style>` element** (common values on both theme selectors, because the dark token block has equal specificity and comes first), a data attribute for motion, the favicon link and a lazy font import. It keeps the **last good copy** in storage so the first paint is right, validates against an **allow-list of variable names and a safe value pattern**, and on any problem runs on the bundled design. The design must never break a screen.

## 7. Publish, schedule, roll back

- **Per surface.** Texts, banners, brand and design are separate surfaces. When permissions are split by surface (and they should be: the person who posts a banner is not the person who restyles the product) one shared draft blocks the banner until the designer's unfinished work is ready. Provide **publish selected surfaces** and **restore selected surfaces**: the server merges the chosen surfaces into a **new version**, so undoing a bad theme does not undo later text edits.
- A draft touching design needs the design publish permission **in addition to** the content publish permission (403 names the missing one).
- **Schedule:** publish at a time and, optionally, revert at a later one (a campaign theme, a rebrand day), evaluated on the server, audited with the scheduler as actor.
- History compares any two versions; each design change in the diff shows the token, before and after.

## 8. Preview and the publish check

Preview in the **real product**, not a mock: an embedded frame at phone, tablet and desktop widths, light and dark, each language, driven by the signed preview token (the preview-only theme and language parameters live in session storage and are ignored without a token). Offer an optional **review link** for people who are not admins: longer lived, revocable, audited, `noindex`, `no-store`.
Before publishing, run a **publish check** against the product with the draft applied: automated accessibility check in both themes, no horizontal overflow at 390 px, the logo renders, the font loads. Show the result in the publish dialog.

## 9. Export and import

Export the design as **W3C Design Tokens** JSON and as a CSS variables block. Pin the format version you write (the stable 2025.10 draft as of this writing; verify against the current specification), state how a colour is written and how light and dark are encoded, and test a **round trip** with Style Dictionary or Tokens Studio rather than claiming compatibility. **Import** validates against the catalogue, rejects unknown tokens (listing them), shows a **dry-run diff**, and writes only to the **draft**. Binary images are not in the export: only ids and URLs.

## 10. What is deliberately not offered

Free CSS or custom CSS injection (bypasses every limit, can leak data through CSS, cannot be audited or rolled back; if ever needed: super admin only, filtered, size-limited, scoped, audited); arbitrary fonts; SVG uploads (v1); breakpoints and grid (code); per-component variants until the product has declarative variants; multi-brand and scoped section themes (depth L3); A/B or staged rollout of a design (use feature flags). Write each exclusion and its reason in the module spec.

## 11. Tests

Every enumeration and bound; contrast pass and fail in both themes, including derived colours and the on-colour; each forged upload (renamed extension, SVG, wrong magic bytes, animated file, oversize, wrong ratio, HTML polyglot); unpublished assets are not public and published ones are; publish needs both permissions; per-surface publish and restore; rollback restores design and assets; schema-1 documents still read; export then import round trip; the public product applies colour, font, radius, density, logo, favicon after publish, ignores a hostile payload, and runs when the endpoint is down; `calm` reduces motion and `prefers-reduced-motion` still works; axe in both themes on every editor tab and on the product with the draft applied. And the editor itself (section 13): an unsaved edit shows in the preview within a second; the options of each enumeration render different samples; the save bar is absent when nothing is unsaved; no tab row or toolbar shows a native scrollbar (run the browser with scrollbars visible: a headless browser hides them by default and the check then proves nothing); the resolve endpoint writes nothing, audits nothing and refuses a hostile payload exactly as save does.

## 12. The catalogue: what a design system covers

An owner who asks to "edit the design system" expects more than a few colours and a radius. At Gate 1, walk this table and record, per family, **editable**, **derived**, **locked** (with the reason) or **excluded** (with the reason). A family that is silently absent is the failure: the owner finds out on the screen, not in the spec.

| Family | What the owner expects to choose | Rules |
|---|---|---|
| **Theme presets** | Start from a named bundle (default, cool neutral, warm, high contrast, compact data) that fills many tokens at once, then adjust, with "back to the bundle" | Bundles live in the server catalogue; choosing one fills the working copy, it is never a second source of truth |
| **Brand colour** | Primary (light and dark) and, if the product uses one, a secondary accent | The server derives hover, soft background, the text colour on it and the focus ring, and verifies contrast for each (section 3). Edited in the one place for brand (section 14) |
| **Neutrals** | Two to four curated ramps (cool, warm, pure, slate) for surface, text, secondary text and lines | Tinted, never pure grey; each ramp is contrast-locked in both themes; only the ramp is chosen, not the hex |
| **Status colours** | Success, warning, danger (and info if used) | Foreground edited, soft background derived; colour never carries meaning alone |
| **Data colours** | A curated categorical set (default, colour-blind safe, brand-tinted) when the product draws charts or maps | Only if the product has such graphics; otherwise record "excluded: no charts" |
| **Typography** | Heading font and body font from the curated list (they may be the same), text scale, heading weight, line height | Self-hosted, lazy, at most four weights (section 4); line height and letter spacing as presets |
| **Shape** | Radius per role (controls, cards, overlays), border strength (hairline, standard, strong), elevation | Presets only; the focus ring is locked |
| **Layout and density** | Control density, spacing rhythm (tight, standard, airy), content width (narrow, standard, wide) | The phone touch height stays locked |
| **Components** | Button style (solid, soft, outline), input style (outlined, filled), badge style, link style, icon stroke | Offer only what the product already supports through declarative variants (a data attribute the CSS reads); never invent a variant the CSS does not have |
| **Motion** | Standard or calm | The visitor's reduced-motion setting wins in both |
| **Brand assets** | Logo, favicon, share image, name, description | Section 14 |
| **Default theme** | Light, dark or follow the device | A behaviour token; the visitor's own choice still wins |

Levels (`capability-ladders.md`): **L1** is name, logo and brand colour; **L2** is every row above that the product can consume, with presets, the guardrails and the workbench of section 13; **L3** adds scoped themes, multi-brand, semantic aliasing, approvals and staged rollout. Name the level honestly in the module spec: a catalogue of status colours, one font list and a radius is L1 plus a little, not L2.

Order the editor by what the owner thinks they change, not by the token file: presets first, then brand colour, neutrals, type, shape and layout, components, motion.

## 13. The editor is a workbench, not a form

The machinery above can be correct while the screen is unusable. A design editor is judged by the loop "change something, see the product change". These rules are checked by `DS-11` and `DS-12`, with screenshots.

1. **Controls and preview side by side.** At desktop width (about 1100 px and up) the controls sit on one side and the preview on the other, the preview sticky and visible on every tab that changes the look. Below that width the preview follows the controls or opens from a button; say which in the spec. A preview at the bottom of a long page, under a scroll, is the failure this rule exists for.
2. **The preview shows unsaved edits.** Within about a second of a change the preview reflects it. Mechanism that keeps the closed-catalogue principle: the editor sends the working copy to a **resolve** endpoint (same validation as save, no write, no audit row, no draft revision, permission of the edit right, rate limited, `200` with `ok: false` and the issues for a bad value so typing does not fill the logs with 4xx), then posts the resolved variables to the preview frame. The frame accepts them **only in preview mode, only from an allowed origin, only from its parent window**, through the same allow-list as production, and says when it is listening. The client never computes CSS.
3. **A representative screen.** The product's login or home page uses few tokens (a login screen has no status colour, no shadow, no list). Add a page of the product's **real** components, reachable in preview mode only: the text scale, buttons, inputs, a card and a list row, the status tags, a toast and a dialog surface, a motion sample that replays on a click. Keep the real home page as a second choice in the frame.
4. **Every choice shows its effect.** The samples of an enumeration differ from option to option: three text scales that share one identical sample make a blind choice; a shadow option shows a shadow, density shows the control heights, a font shows its name set in that font, motion replays once. A colour field is a swatch, the hex, and a one-line verdict ("5.0:1, passes"); the ratios sit in a tooltip or details, and the full sentence appears only on failure and says what to change.
5. **One working copy, one save bar, shown only when it matters.** The bar appears when something is unsaved or a save failed, never as a permanent bar with disabled buttons. It is sticky **inside** the controls column (not floating over the content), keeps its own height out of the content, shows the number of unsaved changes, and offers undo. A conflict is a banner with a reload. One line says "saved to the draft, not yet published".
6. **Flat structure.** A section is a heading and a divider, not a card around a card around option cards. The locked tokens and the list of differences from the live version are closed disclosures. Tab labels are short (about 14 characters or fewer), and a label never repeats a label of another module (`UX-19`).
7. **No native scrollbar on tab rows, toolbars or navigation strips** (`UX-20`). Overflow scrolls with the bar hidden and a fade at the hidden edge, the chosen tab is scrolled into view, and an underline never sits outside its box (a 1 px underline outside a box with `overflow-x: auto` adds a vertical scrollbar of its own).
8. **Review the screens, not only the checks.** Before the gate, screenshots of every tab at 1440 px and 390 px, both themes, **in a browser with scrollbars visible**, taken on realistic data. Test debris left in the dev data (a banner whose text was set to `&amp;` by an e2e test) shows up in the preview and reads as a product bug: tests clean up after themselves or run on a throwaway database.

## 14. Brand is one place

Brand identity is edited in **one** place: the name, the description per language, the logo (light, dark, compact), the favicon, the share image and the brand colour with its derived family. The natural home is the **first tab of the appearance screen** (the screen of the design system, with the live preview): who the product is and the system that follows from it are one task, with one preview. Do not split it by where it is stored (the texts surface versus the design surface): that produced a "Brand" tab in the content module and another in the design module, with the colour in one and the logo in the other, and no operator could guess which to open; and a separate sidebar item next to the design item only moves the same question to the sidebar. Split by the owner's task instead: write (content), style (appearance), ship (publishing, one release screen for all of it).

- Sections of the place may follow different permissions (a content editor changes the name, only a designer changes the colour and the logo): show each section editable or read-only by the role's rights. Publishing stays per surface (section 7).
- The appearance screen holds the brand tab and the system tokens (neutrals, status, type, shape, layout, components, motion) side by side; the content module has no brand tab and the sidebar has no separate Brand item. Old `?tab=brand` addresses redirect to the brand tab. A role with only the content rights sees the appearance screen with the brand tab alone; the rest needs the design rights. When one tab saves through a different endpoint than the others (text and colour versus tokens), each keeps its own save bar, shown only while something is unsaved, and the screen says where unsaved work is (an alert on the other tabs) instead of unmounting it silently.
- The brand colour is a design token like the others: the **server** derives hover, soft background, the on-colour text and the ring, and verifies contrast. A client that mixes the colours itself is the L1 shortcut that this section replaces.
