# Phase 6 — Import Coverage Report

**Date:** 2026-06-15 · **Phase:** 6 — Import Center & Catalog Automation · **Status:** Complete

This report maps the Phase 6 functional requirements (FR-015…FR-021) to the shipped implementation
and records the import engine's behaviour, validation rules, and verification.

## 1. Requirement coverage

| FR | Requirement | Status | Where |
| -- | ----------- | :----: | ----- |
| FR-015 | Bulk product import | ✅ | `POST /api/import/csv` (multi-row CSV) → queue → `processor.ts` |
| FR-016 | CSV product import | ✅ | `lib/csv.ts` + `services/import/product-import.ts` (exact 10-column schema) |
| FR-017 | ASIN import | ✅ | `POST /api/import/asins` + `services/import/asin-import.ts` |
| FR-018 | Category import (nested) | ✅ | `POST /api/import/categories` + `services/import/category-import.ts` |
| FR-019 | Duplicate detection | ✅ | `services/import/helpers.ts#detectProductDuplicate` (asin/slug/title × skip/overwrite/create-copy) |
| FR-020 | Import reports | ✅ | `processor.ts#ImportReport` stored on `ImportJob.report`; `GET /api/import/jobs/:id/report` |
| FR-021 | Import job tracking | ✅ | `ImportJob`/`ImportItem` models; `GET /api/import/jobs`, `/jobs/:id`, `/stats` |

## 2. CSV import engine

**Columns (exact, header-aliased, case-insensitive):** `asin, title, brand, category, price,
originalPrice, rating, reviewCount, imageUrl, description`. Header aliases are tolerated (e.g.
`name`→title, `mrp`/`list price`→originalPrice, `reviews`→reviewCount).

**Parser (`lib/csv.ts`):** RFC-4180-ish — quoted fields, embedded commas, escaped `""` quotes, CRLF,
blank-line dropping. Money cells strip `₹`/`$`/commas/whitespace.

**Validation (per row):**
- **Required:** `asin`, `title` → missing → row `failed` with `Missing ASIN` / `Missing title`.
- **Invalid ASIN format** → `failed` with `Invalid ASIN format: "…"` (10-char `[A-Z0-9]`, via
  `lib/affiliate#isValidAsin`).
- **Malformed rows** (wrong column count) are tolerated by the parser; missing cells default to empty
  → caught by required-field validation.
- **Duplicate ASIN / slug / title** → handled per the configured DuplicateMode (below).

Imported products are created as **drafts** (`isPublished: false`) so an editor reviews before
publishing. Brand and category are resolved via find-or-create (so a CSV referencing a new brand/
category does not fail).

## 3. Duplicate detection (FR-019)

`detectProductDuplicate(asin, slug, title)` checks, in order: **ASIN → slug → title**, returning the
first match and its `matchType`. Behaviour by `DuplicateMode`:

| Mode | Behaviour |
| ---- | --------- |
| `skip` (default) | Item marked `duplicate`; existing record untouched; reason recorded |
| `overwrite` | Existing record updated in place; **asin + slug kept stable**; item `success` |
| `create_copy` | New record inserted; title suffixed ` (Copy)`, unique slug; **synthetic unique ASIN** when the match was on ASIN (real ASIN reused for slug/title matches since it is already unique) |

## 4. ASIN import (FR-017)

`POST /api/import/asins` with `{ asins: string[], duplicateMode?, name? }`. Input is trimmed,
upper-cased, and **de-duplicated** before queueing. Each new ASIN creates a **draft stub product**
(`Product <ASIN>`); existing ASINs are reported as `duplicate`. Title/price/image enrichment from the
Amazon PA-API is deferred to the dedicated import-sync phase (honest gap — see Remaining Work report).

## 5. Category import (FR-018)

`POST /api/import/categories` with `{ categories: [{ name, parentName?, slug?, description? }], … }`.
Supports **nested** categories: `parentName` is resolved via find-or-create, so a child can reference a
parent created earlier in the same import. Slugs are generated (and de-duplicated) from the name when
not supplied. Self-parenting is guarded against.

## 6. Import reports (FR-020)

Every job writes an `ImportReport` to `ImportJob.report`:

```
{ imported, duplicates, skipped, failed, total, durationMs, startedAt, completedAt,
  errors: [{ position, externalId, errors[] }] }
```

Exposed at `GET /api/import/jobs/:id/report`. Per-item detail (status + errors + created product/
category id) is available at `GET /api/import/jobs/:id`.

## 7. Verification

- **Unit (`tests/unit/import.test.ts`, 9):** CSV parsing (simple, quoted/embedded-comma/escaped-quote,
  CRLF + blank lines), header→object mapping, header-only CSV, money parsing, and row validation
  (missing ASIN, invalid ASIN format, missing title).
- **Integration (`tests/integration/import.integration.test.ts`, DB-gated):** RBAC (401/403/200),
  CSRF rejection, CSV import with a valid + an invalid row → report asserts `imported=1, failed=1`,
  ASIN import + duplicate-on-reimport (report `duplicates≥1`), nested category import (2 created,
  parent mapped), job listing pagination + stats shape.
- **Result:** 161/161 tests green against embedded Postgres (migrate → seed → test). No regressions
  in catalog/content/affiliate/auth/SSR suites.

## 8. Preservation

`/admin/import` keeps its exact layout, tabs, stat cards, wizard, and brand colors — only the data
source changed from mock arrays to the live `/api/import/*` API. No other UI/route/color changed.
