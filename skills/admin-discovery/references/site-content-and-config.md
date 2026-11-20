# Site Content & Configuration: deciding what to manage

Read when: the inventory step must decide whether `site-content` (and `localization`) belongs in the admin, or the owner says "settings", "CMS", "I want to edit the texts / banners / branding myself". Building it: `admin-module-builder/references/site-content-cms.md`. Operational switches and limits are a different thing: `admin-module-builder/references/runtime-controls.md`.

## Contents
- Three tiers of content
- Applicability test
- Three ways to manage each tier
- An existing CMS
- One owner per entity: where `settings` ends
- How to split the permissions
- Defaults

---

## Three tiers of content

| Tier | What | Where it usually lives |
|---|---|---|
| **A. UI strings** | Labels, messages, onboarding text, error text, translations | i18n bundles, dictionaries, or literals inside components |
| **B. Configuration and brand** | Product name, tagline, logo, theme accent, installed-app identity (manifest), contact details, social links, legal text, SEO defaults, plan or pricing constants, navigation | `config/`, `site.ts`, theme files, `index.html`, manifest, constants |
| **C. Content in the database** | Pages, banners and announcements, FAQs, menus, homepage sections, media | tables, headless CMS |

The scanner reports tiers A and B (`uiSurfaces`, `contentFiles`, `configFiles`, `i18n`) and part of C (static pages, banner components). It cannot see wording the owner wishes were editable: that is what the **owner intake** (SKILL step 3b) is for.

## Applicability test

Include `site-content` when **any** tier is owned by the business and must change without a release. This holds for **websites and apps**: an app whose text, colours and messages live in source files has the same need as a marketing site. The wrong test is "is this a content website?". Never exclude it without the owner's explicit yes; the exclusion appears as a Gate 1 question with its consequence.

Include `localization` when the product has two or more locales (tier A in code **or** tier C in the database) and non-developers own the wording.

## Three ways to manage each tier

| Option | Use when | Cost |
|---|---|---|
| **Keep in code, document how to change it** | Changes are rare and a developer is always available | none, but the owner stays dependent |
| **Override layer: code defaults plus a published, cached overlay edited in the admin** | The owner wants to change words, brand or banners without a release; the product already works with its defaults | a read endpoint, an overlay reader in the public code, draft/publish; recommended default for tiers A and B |
| **External CMS** | A headless CMS is already in use, or content is long-form and editorial | integration work: SSO, roles, preview; build only the gaps |

State the choice per tier in `product-discovery.md`. The override layer needs the **public code to read admin-managed values**: record that change in the module spec ("Public-site integration") instead of avoiding it; refusing to touch public code is how a CMS never gets built.

## An existing CMS

If the scan reports `stack.cms` (Sanity, Strapi, Contentful, Payload, Directus, Prismic, Keystatic…), do not build a second CMS next to it. Link out or embed, integrate sign-in and roles where possible, and build only what it lacks (audit, publishing workflow across tiers, operational switches). Record "CMS: external" in the inventory.

## One owner per entity: where `settings` ends

| Module | Owns |
|---|---|
| `settings` | Operational and integration configuration: secrets and keys (masked), locale, time zone, currency, toggles the system reads |
| `site-content` | Everything public-facing: copy, brand, theme accent, banners, pages, menus, SEO, legal text |
| `localization` | Translation workflow across locales: missing and outdated keys, glossary, import/export |
| runtime controls (`app-controls`) | Kill switches, maintenance mode, flags, tunable limits |

If a value could sit in two modules, it belongs to the one that owns the **audience**: the public sees it → `site-content`; operators and the system read it → `settings` / `app-controls`.

## How to split the permissions

Permission keys are `resource.action`. Instead of one `site-content.manage`, split by **risk**, either as separate permissions (`site-content.edit`, `site-content.publish`) or as separate modules with their own `edit` and `publish`: `ui-copy`, `branding`, `legal-pages`, `banners`. Marketing may then publish banners without touching legal pages or the theme. `publish` is sensitive and audited.

## Defaults

P1 when tier A or B is business-owned; P0 when the product is a content or marketing site. Draft/publish, preview, scheduling and version history are **required** for content modules (archetype 11 in `module-archetypes.md`), not "advanced".
