# Amazon PA-API Product Fetch Workflow

Add Amazon products to the catalog at scale (100+) by **keyword**, using the official
**Amazon Product Advertising API (PA-API 5.0)**.

> ⚠️ **PA-API only — never scraping.** These scripts call the signed PA-API
> `SearchItems` endpoint. They do **not** fetch or parse Amazon HTML pages, and they
> never modify the database automatically. You review the output before importing.

## Pipeline

```
amazon-product-keywords.csv               (you write: category,keyword,brand?,limit?)
        │  npm run products:fetch-amazon          → PA-API SearchItems (signed, no scraping)
        ▼
amazon-products.review.csv                (you REVIEW + edit selected=true/false)
        │  npm run products:apply-amazon-review   → converts selected rows
        ▼
my-products.generated.csv                 (existing import format: slug,name,asin,image,affiliateUrl)
        │  npm run products:validate -- my-products.generated.csv
        │  npm run products:bulk -- my-products.generated.csv     (see "Importing" below)
        ▼
DB (affiliate URL auto-generated from the ASIN)
```

## 1. Required env vars

| Var | Required | Notes |
| --- | :---: | --- |
| `AMAZON_PAAPI_ACCESS_KEY` | ✅ | from your approved Amazon Associates + PA-API account |
| `AMAZON_PAAPI_SECRET_KEY` | ✅ | keep secret — never commit |
| `AMAZON_PAAPI_PARTNER_TAG` | ✅ | your associate tag (defaults to `AMAZON_ASSOCIATE_TAG` if unset) |
| `AMAZON_PAAPI_MARKETPLACE` | — | default `www.amazon.in` |
| `AMAZON_PAAPI_REGION` | — | default `eu-west-1` (correct for amazon.in) |

PA-API access requires an approved Associate account with qualifying sales. Without
credentials the fetch script exits cleanly without writing anything.

## 2. Input CSV format — `server/amazon-product-keywords.csv`

```
category,keyword,brand,limit
smartphones,iPhone 17 Pro Max,Apple,1
smartphones,Samsung Galaxy S26 Ultra,Samsung,1
laptops,MacBook Pro,Apple,1
earbuds,Samsung Galaxy Buds Core,Samsung,1
```

- `category`, `keyword` — required. `brand`, `limit` — optional (`limit` default `1`, max `10`).
- One keyword per row; add as many rows as you like (100+ supported).

## 3. Fetch (PA-API SearchItems → review CSV)

```bash
cd server
npm run products:fetch-amazon
```

Writes **`server/amazon-products.review.csv`**:

```
category,keyword,asin,title,brand,image,amazonUrl,price,availability,selected
```

- Requests resources: `ItemInfo.Title`, `ItemInfo.ByLineInfo`, `Images.Primary.Large`,
  `Offers.Listings.Price`, `Offers.Listings.Availability.Message`.
- The **first** result of each keyword is pre-marked `selected=true`; extra results (when
  `limit>1`) are `selected=false`.
- No result → a row with `selected=no_result`. PA-API error → `selected=error`.
- Throttled (~1 req/s) to respect PA-API limits.

## 4. Review step (manual — required)

Open `amazon-products.review.csv` and set `selected=true` on exactly the rows you want.
Nothing is imported automatically.

## 5. Apply (review CSV → product-import CSV)

```bash
npm run products:apply-amazon-review
```

Reads only `selected=true` rows and writes **`server/my-products.generated.csv`** in the
existing import format (`slug,name,asin,image,affiliateUrl`). `slug` is derived from the
title; `affiliateUrl` is left blank (generated from the ASIN on import). It **never**
overwrites `my-products.csv`.

## 6. Validate

```bash
npm run products:validate -- my-products.generated.csv
```

## 7. Importing into the DB

```bash
npm run products:bulk -- my-products.generated.csv
```

> **Important:** `products:bulk` **updates existing products by slug — it does not
> create new rows.** For brand-new products, create them first via the Admin **Import
> Center** (`/admin/import`, which supports CSV/ASIN creation), then use this CSV to
> enrich them. The fetch → review → apply steps are identical either way.

## Safety guarantees

- PA-API only; **no scraping**.
- Fetch/apply scripts **never touch the DB** and **never run the import**.
- `my-products.csv` is never overwritten (apply writes `my-products.generated.csv`).
- Human review is mandatory between fetch and import.
- Secrets stay in env (`server/.env`, gitignored) — never invented, never committed.
