# Phase 11 — Internal Linking Report

**Date:** 2026-06-15 · **Phase:** 11 · **Service:** `services/discovery/linking.service.ts`

## 1. Coverage

| Feature | Status | Where |
| ------- | :----: | ----- |
| Auto internal-link suggestions | ✅ | `generateSuggestions(guide\|comparison, id)` |
| Anchor-text generation | ✅ | target title/name as the anchor |
| Link recommendations for guides | ✅ | top-rated products in the guide's category + same-category guides |
| Link recommendations for comparisons | ✅ | products of the compared items + their category |
| Broken internal-link detection | ✅ | `detectBrokenLinks()` scans published content |
| **No auto-insert without review** | ✅ | suggestions stored as `InternalLink` (status `suggested`); content is never modified |

## 2. Review workflow

`InternalLink` rows carry a status: **suggested → approved | rejected** (plus **broken**). Generation
**upserts** suggestions (unique source+target tuple) with generated anchor text + target URL + a score.
The `/admin/search` → Internal Links tab lists them and lets an editor approve / reject / delete — but
**nothing is written into guide/comparison content**; applying approved links is left to the editor (by
design — "do not auto-insert without review").

## 3. Broken-link detection

`detectBrokenLinks()` scans published guide content/excerpt and comparison summary/verdict for internal
`/{products|guides|comparisons|categories|brands|authors}/{slug}` links, and flags any whose slug is not
in the live slug set. Returns `{ broken: [{ sourceType, sourceId, url }], scanned }`. Surfaced via
`POST /api/recommendations/internal-links/detect-broken` and the admin "Detect Broken" button.

## 4. Automation

The discovery worker runs `internal-link-suggestions` (daily) across all published guides/comparisons
and `broken-link-detection` (daily). Inline driver runs them in dev/test/CI.

## 5. Security

All internal-link writes (generate / status / delete / detect) require `recommendations.manage` + JWT +
CSRF + audit; reads require `recommendations.view`.

## 6. Verification

Integration: generate suggestions for a guide → list → approve a link → broken-link scan returns
`scanned`. Green.

## 7. Honest gaps

- Suggestions are not auto-applied to content (intended). A one-click "insert approved links into
  content" action (still editor-initiated) is a possible follow-up.
- Broken-link findings are returned (not persisted as `InternalLink` rows) — persisting them for a
  triage queue is a small follow-up.
