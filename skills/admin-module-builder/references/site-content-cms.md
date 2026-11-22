# Site Content & UI Configuration (CMS-style)

Read when: the product's public UI has copy, branding, banners, pages, menus or settings that the business changes (or should be able to change) without a code release. This applies to **websites and apps alike**: an app whose text, colours and messages live in source files has a CMS need exactly like a marketing site. Also read in discovery when the user says "settings" or "CMS". Deciding WHAT to manage (tiers, applicability, keep-in-code vs overlay vs external CMS, existing CMS, permission split): `admin-discovery/references/site-content-and-config.md`. This file is HOW to build it.

## Contents
- 1. Inventory first: what is content
- 2. Delivery contract: admin to public product
- 3. Draft, preview, publish, rollback
- 4. Pattern: UI text overrides (apps with i18n)
- 5. Pattern: theme and brand
- 6. Pattern: banners and announcements
- 7. Pattern: pages, menus, SEO (websites)
- 8. Acceptance and tests
- Pitfalls

---

## 1. Inventory first: what is content

Before deciding the module list, inventory every surface the user sees and ask: **"What do you change today by editing code and redeploying, and would you rather change yourself?"** Record the answer in `product-discovery.md` ("UI surface inventory"). Classify each surface:

| Surface | Typical evidence | Class |
|---|---|---|
| UI copy, microcopy, error messages | translation function calls (`t('…')`, `$t`, `intl.formatMessage`), dictionaries, hard-coded JSX text | **CMS** (per language) |
| Brand: name, tagline, meta title/description | `index.html`, layout metadata, manifest | **CMS** for name and meta; installed-app name/icon are **build-time** |
| Theme | token files (CSS custom properties, Tailwind theme) | **CMS only for a whitelist** (accent family); the rest is design (**code**) |
| Banners, announcements, maintenance notice | none yet, or ad-hoc components | **CMS** (new surface; schedule and audience) |
| Static and legal pages, FAQs, about | markdown/MDX, `pages/` | **CMS** |
| Menus, footer links, homepage sections | layout components, config files | **CMS** (validated structure) |
| SEO meta, redirects, sitemap | head tags, redirect config | **CMS** |
| Images and files | `public/`, uploads | **CMS** through the media module |
| Layout, behaviour, flows, data schema | components, routes | **code** |
| Catalog data (products, places, courses) | DB, JSON data files | a **catalog module**, not the CMS (demo/sample data in the bundle is a finding, not content) |

Disambiguate the word **settings**: (a) operational switches and limits → `runtime-controls.md`; (b) content and UI customisation → this file; (c) integrations and secrets → the `settings` module. Ask which one the user means before analysing.

## 2. Delivery contract: admin to public product

- **A public read endpoint** that serves only *published* content: unauthenticated, small, versioned, with `ETag`/304 and `Cache-Control: public, max-age=60, stale-while-revalidate`. It never returns drafts or staff identity.
- **The product keeps bundled defaults; remote content is an overlay.** Any failure (network, bad JSON, unknown schema version) falls back to the last good cached copy, then to the defaults. Rendering is never blocked or broken by it; validate the payload defensively on the client.
- **State when each surface takes effect.** Banners, brand name and CSS variables can apply live. UI strings that are evaluated at module load (constants built with the translation function) need the overrides **before** those modules run: read the cached copy synchronously, or defer importing the app until the config is loaded (with a short timeout on the very first visit). Tell the editor honestly ("new text appears the next time the app opens").
- **Static or pre-rendered sites:** publishing triggers revalidation or a rebuild hook; show "published, propagating" until done.
- **PWA / service worker:** never cache the config endpoint beyond its `max-age`. Web-manifest fields and icons are generated at build time: exclude them from v1 or document that changing them needs a build.

## 3. Draft, preview, publish, rollback

For configuration documents (not articles):

- **One draft + immutable versions.** Publishing copies the draft into a new version in a single transaction with its audit row. **Rollback creates a new version** that copies an old one; history is never rewritten. Version 0 means "the defaults in code".
- **Concurrency:** drafts carry a `revision`; a stale write is `409` and shows what the other editor changed. Discarding a draft needs a reason.
- **Rollback also resets the draft, and `revision` is required.** After a rollback to version 5 the draft equals version 5; otherwise the next publish quietly brings back the edits that were meant to be undone. A draft write **without** a `revision` is refused (`428` or `400`), never treated as "do not check", so a client that forgets it cannot bypass the `409`. Test both: two writes from a stale revision, and a rollback followed by a publish with no edit in between (`CMS-8`).
- **Preview in the real product,** not an approximation: a signed, short-lived token with its own audience, passed as `?preview=`, moved out of the URL at once (`history.replaceState`, so it does not leak through referrers), `no-store`, a visible "previewing a draft" ribbon, never written to the product's cache.
- **Before publishing:** a per-item diff (added, changed, removed), a confirmation dialog with counts and a mandatory reason. Schedules (banners, campaigns) are effective-dated and evaluated on the server at request time.
- **Permissions:** `read`, `edit` and `publish` are separate. Edit touches nobody; publish is sensitive and audited. A maker-checker step is optional.

## 4. Pattern: UI text overrides (apps with i18n)

- **Catalogue of editable keys extracted from the code** by a script and imported at deploy; the admin never invents keys and there is no import API.
- **When the key is the source text** (common in small apps), every place that uses the same sentence shares one override: show "used in N places" and the files.
- **Orphans:** when a developer rewrites a source string, its override stops matching. Keep it, flag it, never drop it silently.
- **Validation:** plain text only (no HTML), length caps, placeholders and plural forms must match the source set exactly, no control characters. Show both languages side by side with per-language status.
- **The brand name is also inside many strings.** The brand setting changes the name slots (title, logo); show "the old name appears in N strings" with a link to the filtered list, and prefer a `{app}` placeholder in new code.
- Accent-insensitive search; server-side pagination (1,000+ strings is normal).

## 5. Pattern: theme and brand

- Expose a **closed catalogue** of tokens (colours, font choice, type scale, radius, shadow, density, motion), never free CSS, and let the **server** validate, derive and resolve them. The accent family alone is level L1 of `capability-ladders.md`: an owner who says "edit the UI like a CMS" wants at least L2. The whole design layer (colour and contrast rules, fonts, assets, delivery, per-surface publish, preview, export) is in `design-system-cms.md`; read it before specifying or building any of it.
- Contrast is computed per theme (normal text ≥ 4.5:1, accent against the surface ≥ 3:1) and also for every derived colour; apply the result as CSS variables before first paint (keep the last good values in local storage, like the theme initialiser).
- Logos, favicon and the share image need an **asset store** (upload, magic-byte check, size and dimension limits, re-encoding, alt text, immutable storage): build the minimal one described in `design-system-cms.md` §5 instead of excluding images.
- **Brand is one place, and it is not a tab of this module.** The name, description, logo, favicon, share image and brand colour are edited together, as the first tab of the appearance screen (`design-system-cms.md` §14). Do not give the content module a "Brand" tab while the design module has another: the operator cannot guess which holds the colour and which the logo (`UX-19`). The texts surface may still store the name and description; the place that edits them is the appearance screen. **Publishing is not a tab of this module either**: publish, history and rollback apply to texts, banners, brand and design together, so they are one release screen of their own (`admin-information-architecture`, concept ledger).
- Free-form CSS, JS or HTML injection is a security hole. If "custom code" is demanded, restrict it to the top role, sanitise, and set a CSP.

## 6. Pattern: banners and announcements

Fields: message per language, tone (info, warning, success), optional link, audience (all, signed-in, guests), schedule in the business time zone, dismissible, enabled, order, and a cap on how many show at once. Accessibility and behaviour: `role="status"`; dismissal is stored per banner id **and content version** so an edited banner reappears; no layout shift; never cover fixed navigation.

**Announcements that reach devices** (push, e-mail, in-app messages). One announcement record holds **every language** (title and body per locale, one default as the fallback) and each recipient gets their own language; a composer with a language switch that sends one language per send makes the operator choose which users to leave out. Offer **scheduling** (`send_at`, cancel while pending, the business time zone shown) and a recipient-count dry run. When the host sleeps, a scheduler inside the web process fires late but never early: state the tolerance next to the picker ("sent within about 10 minutes of the time") and take a lock (a database advisory lock) so two instances do not send twice. The time is picked with the design system's own picker (`form-spec.md`), not the browser's.

## 7. Pattern: pages, menus, SEO (websites)

Draft/publish per page; changing a slug creates a redirect; sanitised rich text or blocks; sitemap updates; menus validated (depth, orphan links). Legal pages are effective-dated with version history, and if consent is tracked, record which version each user accepted.

## 8. Acceptance and tests

- Publish → the public product shows it within the cache TTL; a draft is invisible; preview shows the draft and does not touch the cache.
- Rollback restores the old content as a new version; every step has an audit row, atomic with the change (force an audit failure and assert nothing changed).
- The endpoint down, slow, or returning garbage → the product runs on cached or default content with no console errors.
- Invalid input (HTML, placeholder mismatch, over-long, unknown key, low contrast) is rejected server-side with a precise message; an XSS payload renders inert.
- Two editors conflict → `409`, nothing lost. Orphans and large catalogues (1k+ rows) behave.
- The text actually shows on real screens, in each language, including strings built at module level.

## Pitfalls

Editing live content directly; settings no code reads; a config endpoint that grows without bound or blocks first paint; a cache that never invalidates; overrides applied after module-level strings were already computed; changing installed-app identity without a build; free-form HTML; excluding this module because "it is not a content website" (apps need it too).
