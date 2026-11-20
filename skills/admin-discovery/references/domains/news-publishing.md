# News / Blog / Publishing

**Signals:** Article/Post, Category, Tag, Author, Comment, status (draft/review/published), scheduled publish, Newsletter, Ads.

## Modules
| ID | Module | Pri | Notes |
|---|---|---|---|
| `articles` | Articles | P0 | Rich editor, cover, excerpt, slug, SEO, related, autosave, preview |
| `editorial` | Editorial Workflow | P0 (multi-writer) | Draft → review → approved → scheduled → published; assignments, comments on drafts |
| `categories-tags` | Categories & Tags | P0 | Tree; merge tags; counts |
| `authors` | Authors / Contributors | P1 | Bio, avatar, articles; may link to admin users |
| `comments` | Comments & Moderation | P1 | Queue, spam, ban; only if public comments exist |
| `revisions` | Revision History | P1 | Compare, restore |
| `scheduling` | Scheduling / Calendar | P1 | Editorial calendar |
| `seo` | SEO & Redirects | P1 | Meta, canonical, sitemap, slug-change redirects |
| `media` | Media Library | P0 | Foundation `media` with alt text, credits, focal point |
| `newsletter` | Newsletter / Subscribers | P2 | Lists, campaigns (or integration status) |
| `ads-placements` | Ads / Placements | P2 | Only if site manages them |
| `content-reports` | Content Analytics | P2 | Views by article/author (needs data source) |

## Lifecycle
`draft → in_review → changes_requested ↔ in_review → approved → scheduled → published → unpublished/archived`.
Roles: writer (own drafts), editor (review/publish), admin.

## Dashboard
Queues: drafts awaiting review · scheduled today · comments to moderate · articles with broken links/missing SEO · expiring embargo.
KPIs: published this week, time-in-review, top articles (if analytics), per-author output.

## Special permissions
`articles.publish`, `articles.edit_others`, `articles.unpublish`, `comments.moderate`, `authors.manage`.
Ownership scopes: **own** vs **all** (`articles.update:own`).

## Audit-critical
Publish/unpublish, slug changes, deleting published articles, author reassignment, comment bans.

## Edge cases & pitfalls
- Concurrent editing → lock or optimistic version check; autosave drafts separate from live version.
- Rich text sanitisation (XSS); pasted content cleaning; embed allow-list.
- Slug change must create redirect; scheduled publish timezone.
- Soft delete + restore; revisions for legal takedowns.
- Large archives → server-side search; tags explosion → merge tool.
