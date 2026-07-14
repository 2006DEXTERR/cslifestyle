/**
 * Canonical buying-guide cover images (per-guide), the SINGLE SOURCE OF TRUTH that
 * `db:seed` restores on every run — so a reseed can never revert a guide to the old
 * Pexels stock photos in lib/data.ts. Keyed by guide slug.
 *
 * Every URL here was provided by the site owner (the same verified Amazon catalog URLs
 * used for the matching product in prisma/product-images.ts). Nothing is invented: a
 * guide without an owner-provided URL must be reported, not guessed.
 *
 * To change a guide cover: edit the URL here, then re-run `npm run guides:sync-images`.
 */
export const GUIDE_IMAGES: Record<string, string> = {
  'best-smartphones-under-30000': 'https://m.media-amazon.com/images/I/616-Eh2FbPL._SL1500_.jpg', // iphone-15-pro-max
  'best-wireless-earbuds-2024': 'https://m.media-amazon.com/images/I/715ANXAamCL._SL1500_.jpg', // boat-airdotes-pro-4
  'best-laptops-for-students': 'https://m.media-amazon.com/images/I/712WiT-wexL._SL1500_.jpg', // dell-xps-15
  'smartwatch-buying-guide': 'https://m.media-amazon.com/images/I/616e2t492uL._SL1500_.jpg', // noise-colorfit-pro-4 (owner-approved)
  'best-tv-buying-guide': 'https://m.media-amazon.com/images/I/815dn640DHL._SL1500_.jpg', // lg-c3-oled-55
};
