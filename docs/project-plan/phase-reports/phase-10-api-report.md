# Phase 10 — API Report

**Date:** 2026-06-15 · **Phase:** 10 — Media Library & Asset Management

All endpoints mount at `/api` (router `server/src/routes/media.ts`), documented under the Swagger
**Media** tag, proxied via `/api/media/:path*` (+ `/uploads/:path*` for files). Standard envelope.

## 1. Endpoints (17 + static)

| Method | Path | Permission | CSRF | Audit | Purpose |
| ------ | ---- | ---------- | :--: | ----- | ------- |
| POST | `/api/media/upload` | media.upload | ✓ | `media.upload` | Multi-file image upload (multipart) |
| GET | `/api/media` | media.view | — | — | Browse (page/perPage/folderId/mimeType/search/unused) |
| GET | `/api/media/search` | media.view | — | — | Search by file name |
| GET | `/api/media/unused` | media.view | — | — | Unused assets (no usage links) |
| GET | `/api/media/stats` | media.view | — | — | count/size/by-type/unused/folders |
| GET | `/api/media/folders` | media.view | — | — | List folders |
| GET | `/api/media/:id` | media.view | — | — | Asset + usages |
| GET | `/api/media/:id/usage` | media.view | — | — | Where an asset is used |
| POST | `/api/media/:id/replace` | media.manage | ✓ | `media.replace` | Replace binary in place |
| PATCH | `/api/media/:id` | media.manage | ✓ | `media.update` | Edit alt/caption/folder |
| DELETE | `/api/media/:id` | media.manage | ✓ | `media.delete` | Delete asset + files |
| POST | `/api/media/:id/usage` | media.manage | ✓ | `media.usage_attached` | Link asset → entity |
| DELETE | `/api/media/:id/usage` | media.manage | ✓ | `media.usage_detached` | Unlink |
| POST | `/api/media/folders` | media.manage | ✓ | `media.folder_created` | Create folder |
| DELETE | `/api/media/folders/:id` | media.manage | ✓ | `media.folder_deleted` | Delete folder |
| GET | `/uploads/*` | public (static) | — | — | Serve stored files + variants |

*(The task's required set — `/api/media/upload`, `/api/media`, `/api/media/:id`, `/api/media/search`,
`/api/media/usage` — is covered; usage is exposed as `/api/media/:id/usage`.)*

## 2. Validation / pagination / filtering

- zod-validated queries (`media.schemas.ts`): list/search accept `page`, `perPage` (≤100), `folderId`,
  `mimeType`, `search`, `unused`. Bodies: metadata update, usage attach (entityType enum + entityId),
  folder create. Invalid → `400` with field errors.
- Upload metadata (`folderId`, `altText`) arrive as multipart fields and are read in the controller.

## 3. Responses

Assets are presented with `url`, `thumbnailUrl`, `webpUrl`, `sizes[]` (responsive), dimensions, size,
hash, and — on detail — `usages[]` + `usageCount`. Lists carry `meta.pagination`.

## 4. Swagger

`@openapi` JSDoc on the route file; **Media** tag added in `docs/swagger.ts`. Served at `/docs` +
`/docs.json`.

## 5. Endpoint count delta

API surface: **+17** (+ a static `/uploads` mount).
