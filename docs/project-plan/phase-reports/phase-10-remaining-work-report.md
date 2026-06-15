# Phase 10 — Remaining Work Report (Honest Gaps)

**Date:** 2026-06-15 · **Phase:** 10 — Media Library & Asset Management

What Phase 10 deliberately did not do, called out so scope is unambiguous.

## 1. In-scope but intentionally limited

| Area | Shipped | Gap / deferred |
| ---- | ------- | -------------- |
| Storage backend | **Local disk** under `UPLOAD_DIR`, served at `/uploads` | The spec's **CDN/object-store** (S3 + Cloudflare) is a deployment swap — the URL/storage layer is abstracted (`MEDIA_BASE_URL` + `storage.ts`), so callers don't change. |
| AI integration | **Link-only** (attach asset by URL/usage) | **No automatic image generation** (explicitly out of scope). AI content references existing assets. |
| Import integration | CSV `imageUrl` that points to a `/uploads` asset is **linked** to the product | Bulk *fetch-and-store* of remote image URLs into the library is not done (only local-asset linking). |
| Existing product images | Products keep their existing URL-based images; the library can attach/replace | A bulk **migration of existing URL images into MediaAsset** is not run (the catalog still uses its URL fields; the library coexists). |
| Folder UI | Folders API + model + asset-folder filter | The `/admin/media` page does not yet expose folder create/move UI (API-only); browsing is flat + search/unused. |
| Storefront wiring | Optimized webp/responsive variants are produced + served | The public gallery still renders the catalog's existing image URLs; swapping it to the media variants (FR-014 responsive `srcset`) is a follow-up. |

## 2. Out of scope (correctly untouched)

Per the mandate, **none** of these were started: **Recommendation Engine**, **Deployment / Production
Infrastructure**, **Final Audit**. No framework migration, no redesign.

## 3. Data / ops caveats

- Uploaded files live on the app server's disk (`UPLOAD_DIR`, gitignored). For multi-instance/prod, move
  to shared object storage (deployment task).
- The library shows **real** data — empty until assets are uploaded (a fresh DB shows zeros).
- Virus scanning + inline-SVG sanitisation are deployment-hardening items (see Security report).

## 4. Summary

The Media Library is **functionally complete** for the Phase 10 requirements (storage, multi-file upload
+ dedup, sharp optimization, browse/search/folders, metadata, replace, delete, usage tracking + unused
detection, RBAC, AI/Import link integration, and a wired admin UI). The principal honest gaps are the
**CDN/object-store backend** and **migrating existing URL images + storefront `srcset` wiring** — all
incremental, none blocking.
