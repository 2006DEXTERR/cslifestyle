# Phase 10 — Upload Report

**Date:** 2026-06-15 · **Phase:** 10 · **Endpoint:** `POST /api/media/upload` (media.upload)

## 1. Pipeline

1. **multer** (memory storage) buffers up to 20 files under the `files` field; size capped at
   `MEDIA_MAX_FILE_MB` (default 10 MB); a **mime allow-list** filter accepts only jpg/jpeg/png/webp/svg.
   multer errors → `400`.
2. Per file: compute **SHA-256** of the bytes → **duplicate detection** (if an asset with that hash
   exists, it is returned as a duplicate; nothing is re-stored).
3. **Optimize + store** (sharp): write the original (`<hash>.<ext>`), read dimensions, and emit a webp,
   a thumbnail, and responsive sizes (raster only; SVG stored as-is).
4. Persist a `MediaAsset` row (with `variants` Json + dimensions + folder + creator).

Response: `{ uploaded: MediaAsset[], duplicates: <count> }` (201).

## 2. Drag-and-drop + multiple

The `/admin/media` page has a drag-drop dropzone **and** an Upload button (hidden multi-file input).
Both POST all selected files in one multipart request to `/api/media/upload`.

## 3. Validation

- **Type:** mime allow-list (415-equivalent → 400 with a clear message).
- **Size:** per-file limit (multer `limits.fileSize`).
- **Count:** up to 20 files per request.
- **Duplicate:** content hash — re-uploading identical bytes returns the existing asset (no dup row, no
  dup file).

## 4. Replace

`POST /api/media/:id/replace` (single `file`, media.manage) swaps the binary **under the same asset id**,
re-optimizes, removes the old variant files, and re-checks the hash for clashes — so every `MediaUsage`
reference now points at the new image automatically.

## 5. Security

JWT + CSRF (header, works with multipart) + `media.upload` (or `media.manage` for replace) + audit
(`media.upload` / `media.replace`). Files are written under a controlled `UPLOAD_DIR` with hash-based
names (no path traversal from the original filename).

## 6. Verification

Integration tests upload real PNGs via supertest `.attach`, assert dimensions + webp/thumbnail URLs, hit
the statically-served webp (200), and confirm dedup + bad-type rejection. Green.

## 7. Honest gaps

- No chunked/resumable upload (single request); fine for the ≤10 MB image use-case.
- No virus scanning (a deployment-time concern).
