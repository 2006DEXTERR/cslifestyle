/**
 * Fetch Amazon products by keyword via the official Amazon Product Advertising API
 * (PA-API 5.0 SearchItems) and write a REVIEW CSV. Safe + ToS-compliant — NO SCRAPING.
 *
 * This is a thin CLI wrapper around the shared implementation in
 * `src/services/import/amazon-paapi.ts` (also used by the admin "Import through API"
 * endpoint, so there is a single PA-API implementation).
 *
 *   - Reads server/amazon-product-keywords.csv (category,keyword,brand?,limit?).
 *   - Writes server/amazon-products.review.csv for a HUMAN to review.
 *   - Does NOT touch the DB, does NOT import, does NOT overwrite my-products.csv.
 *
 *   npm run products:fetch-amazon
 *
 * Required env (see server/.env.example):
 *   AMAZON_PAAPI_ACCESS_KEY  AMAZON_PAAPI_SECRET_KEY  AMAZON_PAAPI_PARTNER_TAG
 *   AMAZON_PAAPI_MARKETPLACE (default www.amazon.in)   AMAZON_PAAPI_REGION (default eu-west-1)
 */
import { fetchAmazonReview, resolvePaapiConfig, PaapiNotConfiguredError } from '../src/services/import/amazon-paapi';

async function main(): Promise<void> {
  if (resolvePaapiConfig().config === null) {
    console.error(
      '\n❌ PA-API credentials not set. Set these env vars (PA-API only — never scraping):\n' +
        '   AMAZON_PAAPI_ACCESS_KEY, AMAZON_PAAPI_SECRET_KEY, AMAZON_PAAPI_PARTNER_TAG\n' +
        '   (optional: AMAZON_PAAPI_MARKETPLACE=www.amazon.in, AMAZON_PAAPI_REGION=eu-west-1)\n' +
        'See server/docs/amazon-paapi-workflow.md. No review CSV was written.',
    );
    process.exit(1);
  }

  const result = await fetchAmazonReview({ log: (m) => console.log(m) });
  console.log(
    `\n✓ Wrote ${result.reviewFile} — ${result.rows} row(s), ${result.selected} pre-selected.\n` +
      `REVIEW it, set selected=true/false, then:\n` +
      `  npm run products:apply-amazon-review   # → my-products.generated.csv\n` +
      `  npm run products:validate -- my-products.generated.csv`,
  );
}

main().catch((err) => {
  if (err instanceof PaapiNotConfiguredError) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }
  console.error('❌ fetch-amazon-products failed:', err);
  process.exit(1);
});
