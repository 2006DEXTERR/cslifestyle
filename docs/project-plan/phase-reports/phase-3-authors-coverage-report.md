# Phase 3 — Authors Coverage Report

> Author entity surface (DB → API → UI) and test coverage. Date: 2026-06-15.

---

## 1. Data model (`authors`)

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | cuid | string PK |
| slug | string **unique** | auto-generated + de-duplicated |
| name | string | |
| avatarUrl | string | |
| bio | text | |
| credentials | text | |
| expertise | json | `string[]` |
| socialLinks | json | `{ twitter?, linkedin?, website? }` |
| seoTitle / metaDescription | string | |
| isActive | bool | |
| createdAt / updatedAt | timestamps | |

`articlesCount` is **computed** (published guides by this author). Deleting an author keeps their
guides and **unlinks** them (`authorId` → NULL). Indexes: slug, isActive.

## 2. API

| Endpoint | Auth | Behaviour |
| -------- | ---- | --------- |
| `GET /api/authors` | public (optional auth) | pagination, search `q` (name), `status=active|all` (all requires `authors.view`), sort name/newest; live `articlesCount` |
| `GET /api/authors/:slug` | public | author + their **published guides**; inactive 404 for public |
| `POST /api/authors` | `authors.create` + CSRF + audit | slug auto-unique |
| `PUT /api/authors/:id` | `authors.edit` + CSRF + audit | partial |
| `DELETE /api/authors/:id` | `authors.delete` + CSRF + audit | guides kept, unlinked |

## 3. Frontend

- **Public `/authors`** — grid via `listAuthors` (avatar, bio, expertise chips, live article count).
- **Public `/authors/[slug]`** — hero (avatar/bio/expertise/social links), stat tiles (articles /
  views* / topics), tabbed content: **Guides** (the author's real published guides), **Comparisons**
  (recent comparisons — preserves the prior mock behaviour; comparisons have no author link in the
  domain), **Activity** (recent guides). *Views is a deterministic placeholder (no analytics yet) —
  replaced the previous `Math.random()` value, which also removed a latent hydration mismatch.
- **Admin `/admin/authors`** — card grid with **search**; **profile preview** drawer (real stats,
  expertise, social links, public-page link); create/edit/delete; editor with the three required
  tabs **General** (avatar/name/slug/bio/credentials/expertise/status), **Social**
  (twitter/linkedin/website), **SEO** (meta).

## 4. Requirements satisfied

Author CRUD ✅; search ✅; profile preview ✅; expertise + social links ✅; SEO ✅; RBAC + audit +
Swagger ✅; author→guides relation with safe unlink-on-delete ✅.

## 5. Test coverage

**Unit:** `content-presenters` — author mapping (avatar/expertise/social), light vs full (guides +
articlesCount). **Integration (vs real Postgres):** seeded list, get-by-slug with published guides +
`articlesCount ≥ 1`, admin create → update (bio) → delete, 401/403 RBAC.

## 6. Gaps / follow-ups

Authors have no rating in the domain (admin stat tiles show guides/published/topics, not a
fabricated rating); comparisons are not author-linked (the author "Comparisons" tab shows recent
comparisons, matching the prior mock); avatar is a URL (no upload — media phase); view counts
deferred (analytics phase).
