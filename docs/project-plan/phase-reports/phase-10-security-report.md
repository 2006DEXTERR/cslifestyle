# Phase 10 — Security Report

**Date:** 2026-06-15 · **Phase:** 10 — Media Library & Asset Management

## 1. Permission model

New permissions (seed-driven RBAC catalog): `media.view`, `media.upload`, `media.manage` (+ a `media`
CRUD module). Grants: editor → view/upload/manage; author → view/upload (content authors add images);
analyst → view; admin → all.

| Permission | Grants | Endpoints |
| ---------- | ------ | --------- |
| `media.view` | Browse/search/stats/usage/get | GET `/api/media/*` |
| `media.upload` | Upload assets | POST `/api/media/upload` |
| `media.manage` | Replace/delete/metadata/usage/folders | the media write routes |

## 2. Write-operation controls

Every write goes through **authenticate (JWT)** → **requireCsrf** → **requirePermission** →
(**validateBody** where applicable) → **auditLogger** (`media.upload` / `media.replace` / `media.delete`
/ `media.update` / `media.usage_*` / `media.folder_*`). CSRF is the double-submit header, which works
with multipart uploads. Verified: plain user → `403`, missing CSRF → `403`, admin → `201/200`.

## 3. Upload hardening

- **Mime allow-list** (jpg/jpeg/png/webp/svg) at the multer filter — other types → `400`.
- **Size limit** (`MEDIA_MAX_FILE_MB`, default 10 MB) + **count limit** (20 files/request).
- **Hash-based filenames** (`<sha256>.<ext>`) — the user's original filename is never used as the path,
  so **no path traversal**. Files live only under `UPLOAD_DIR`.
- **In-memory processing** — uploads are buffered + processed by sharp before any disk write.

## 4. Serving + redirects

Files are served read-only via `express.static` at `/uploads` (immutable, 7-day cache). There is no
user-controlled redirect. The public URL is same-origin (`MEDIA_BASE_URL` empty by default).

## 5. Privacy / data

- Asset rows record the uploader (`createdById`) for audit; no PII in the files beyond what an admin
  uploads. Deleting an asset removes its files and (via cascade) its usage links.
- AI/Import integration is **link-only** (records `MediaUsage` from a `/uploads` URL) — no external
  fetch, no image generation.

## 6. Outstanding

- Virus/content scanning of uploads is deferred to deployment hardening.
- SVG is stored as-is; if SVGs are ever rendered inline (not as `<img src>`), they should be sanitised —
  the storefront uses `<img>`/URLs, which is safe.
- Object-store/CDN ACLs are a deployment concern (current store is local disk).
