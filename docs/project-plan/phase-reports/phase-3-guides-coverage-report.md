# Phase 3 — Guides Coverage Report

> Guide entity surface (DB → API → UI) and test coverage. Date: 2026-06-15.

---

## 1. Data model (`guides` + `guide_products`)

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | cuid | string PK |
| slug | string **unique** | auto-generated + de-duplicated |
| title | string | |
| excerpt / content | text | |
| coverImage | string | |
| categoryId | FK→categories? | `SetNull` on category delete |
| authorId | FK→authors? | `SetNull` on author delete |
| readingTime | int | minutes |
| tableOfContents | json | `{ title, id }[]` |
| faqItems | json | `{ question, answer }[]` |
| tags | json | `string[]` (UI preservation) |
| seoTitle / metaDescription | string | |
| status | enum `ContentStatus` | draft / published |
| publishedAt | datetime? | set on publish |
| createdAt / updatedAt | timestamps | |

**`guide_products`** (composite PK guideId+productId): position, **reason**, **isTopPick** —
the product picks rendered on the guide page. Indexes: slug, categoryId, authorId,
(status, publishedAt).

## 2. API

| Endpoint | Auth | Behaviour |
| -------- | ---- | --------- |
| `GET /api/guides` | public (optional auth) | pagination, sort (newest/oldest/title), filter (category, author, status), search `q` (title/excerpt); `status=all|draft` requires `guides.view` |
| `GET /api/guides/:slug` | public | full content + author + product picks; drafts 404 for public |
| `POST /api/guides` | `guides.create` + CSRF + audit | validates category/author; slug auto-unique; syncs product picks |
| `PUT /api/guides/:id` | `guides.edit` + CSRF + audit | partial; re-syncs picks; manages publishedAt |
| `DELETE /api/guides/:id` | `guides.delete` + CSRF + audit | cascades guide_products |
| `POST /api/guides/:id/{publish,unpublish,draft}` | `guides.publish` + CSRF + audit | status transitions (publish stamps publishedAt) |

Reads return the presenter superset (frontend `BuyingGuide` + admin fields). `getGuideBySlug`
backfills the embedded author's real published-guide count.

## 3. Frontend

- **Public `/guides`** — category-filtered grid via `listGuides` (existing `GuideCard`).
- **Public `/guides/[slug]`** — hero (author/last-updated), TOC sidebar, article body (the existing
  synthetic rich-article layout, preserved), product recommendations (with Top-Pick badge + reason),
  related guides — all from the DB. Author blocks guarded for author-less guides.
- **Admin `/admin/guides`** — table with **search, status filter (All/Published/Draft),
  pagination**; row actions **publish/unpublish, preview, edit, delete**; full-screen editor with
  the six required tabs: **General** (title/slug/author/category/cover/excerpt/reading-time),
  **Content** (body + TOC JSON), **FAQ** (JSON), **Product Picks** (repeater: product + reason +
  top-pick), **SEO** (meta + tags), **Settings** (status). Header **Save Draft / Publish**.

## 4. Requirements satisfied

Guide CRUD (create/edit/delete) ✅; publish/unpublish/draft ✅; product picks with reason/top-pick
✅; category & author relations ✅; search/filter/sort/pagination ✅; RBAC + audit + Swagger ✅.

## 5. Test coverage

**Unit:** `content-presenters` — guide mapping, `lastUpdated` derivation, **pick ordering by
position**, TOC/FAQ. **Integration (vs real Postgres):** seeded list + pagination meta, get-by-slug
with author + picks, draft hidden → publish (action endpoint) → visible → unpublish → hidden →
delete, category filter, 401/403/CSRF guards.

## 6. Gaps / follow-ups

TOC/FAQ edited as JSON (a richer block editor is future); article view counts deferred (analytics);
no SSR yet (SEO phase); the public guide page renders a synthetic article body (the seeded mock
`content` is a placeholder) — real long-form content authoring works via the editor's Content tab.
