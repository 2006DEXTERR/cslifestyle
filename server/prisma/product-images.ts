/**
 * Canonical latest product image URLs (per-product), extracted from the verified
 * product catalog (my-products.csv). This is the SINGLE SOURCE OF TRUTH for product
 * images that `db:seed` restores on every run — replacing the generic placeholder
 * images in lib/data.ts so a reseed never reverts to old stock photos.
 *
 * To update an image: change the URL here (and/or my-products.csv, then re-run
 * `npm run products:bulk`). Keyed by product slug.
 */
export const PRODUCT_IMAGES: Record<string, string> = {
  "iphone-15-pro-max": "https://m.media-amazon.com/images/I/616-Eh2FbPL._SL1500_.jpg",
  "samsung-galaxy-s24-ultra": "https://m.media-amazon.com/images/I/71RLLn9RZxL._SL1500_.jpg",
  "macbook-pro-14-m3": "https://m.media-amazon.com/images/I/61+jOMbYhYL._SL1500_.jpg",
  "boat-airdotes-pro-4": "https://m.media-amazon.com/images/I/715ANXAamCL._SL1500_.jpg",
  "apple-watch-ultra-2": "https://m.media-amazon.com/images/I/81Scp0aak9L._SL1500_.jpg",
  "noise-colorfit-pro-4": "https://m.media-amazon.com/images/I/616e2t492uL._SL1500_.jpg",
  "sony-wh-1000xm5": "https://m.media-amazon.com/images/I/51KGPDttQhL._SL1500_.jpg",
  "lg-c3-oled-55": "https://m.media-amazon.com/images/I/815dn640DHL._SL1500_.jpg",
  "oneplus-12": "https://m.media-amazon.com/images/I/616kkUbRg4L._SL1500_.jpg",
  "dell-xps-15": "https://m.media-amazon.com/images/I/712WiT-wexL._SL1500_.jpg",
  "samsung-galaxy-buds-pro-2": "https://m.media-amazon.com/images/I/61WRrNa6BIL._SL1500_.jpg",
  "sony-zv-e10-ii": "https://m.media-amazon.com/images/I/71Urdn-UoQL._SL1500_.jpg",
};
