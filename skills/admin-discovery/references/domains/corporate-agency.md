# Corporate / Agency / Portfolio website

**Signals:** Services, Projects/Portfolio/Case studies, Team, Testimonials, Clients/Logos, Blog, Contact/Quote forms, mostly static pages.
Smallest admin family - **resist over-building**. Often 6-9 modules total.

## Modules
| ID | Module | Pri | Notes |
|---|---|---|---|
| `pages` | Pages & Sections (see foundation `site-content`) | P0 | Hero, about, terms; section-based editing rather than raw HTML |
| `services` | Services | P0 | Order, icon/image, summary, detail, SEO |
| `projects` | Projects / Portfolio / Case studies | P0 | Categories, gallery, client, results, featured flag, ordering |
| `team` | Team Members | P1 | Order, social links, visibility |
| `testimonials` | Testimonials / Clients | P1 | Rating, approval, featured |
| `posts` | Blog / News | P1 | Use `news-publishing.md` only if editorial workflow is needed |
| `leads` | Contact & Quote Inquiries | P0 | Foundation `leads-inbox`: status, assignee, notes, spam, export |
| `seo` | SEO & Redirects | P1 | Meta, OG, sitemap, redirects, robots |
| `careers` | Careers (if present) | P2 | Light job list; use `job-board.md` only for full ATS |
| `newsletter` | Newsletter subscribers | P2 | Export, unsubscribe handling |

## Lifecycles
- **Lead:** `new → contacted → qualified → proposal → won | lost | spam`.
- **Content (project/post/page):** `draft → published → archived` (+ `scheduled` if needed).

## Dashboard
Queues: new leads (aging) · leads without assignee · drafts awaiting publish · stale content.
KPIs: leads this week/month vs prior, lead source, conversion if tracked, top pages if analytics available. Avoid vanity metrics.

## Special permissions
`pages.publish`, `leads.export`, `leads.assign`, `seo.manage`, `settings.manage`.

## Audit-critical
Publish/unpublish, redirect changes (SEO risk), lead export, settings/integration keys.

## Edge cases & pitfalls
- Content previews before publishing; slug uniqueness and redirects on slug change.
- Image sizes/alt text; per-locale content if multilingual.
- Spam on forms (honeypot/captcha, rate limit) → "spam" status, not delete.
- Hard-coded content in components → decide: move to DB (needs content model) or keep in code (document it).
- Ordering of items (drag-and-drop with persisted order field).
