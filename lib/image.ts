/**
 * Shared image-fit styles so images render consistently across the site.
 *
 * `productImageClass` — `object-contain object-center`. Use where the WHOLE
 * product must stay visible with no cropping and product accuracy matters:
 * the product-detail gallery and the comparison hero.
 *
 * `productThumbClass` — `object-cover object-center`. Use for small/grid product
 * TILES (cards, carousel, deals, listing thumbnails). Cover fills the frame for a
 * uniform look with minimal whitespace; product photos carry enough margin that
 * centered cover trims only the image's own padding, not the product itself.
 *
 * `heroImageClass` — editorial / cover / hero images that are meant to crop-to-fill.
 *
 * Compose hover/zoom transitions by appending to the base, e.g.
 *   `${productThumbClass} transition-transform duration-300 group-hover:scale-105`
 */
export const productImageClass = 'w-full h-full object-contain object-center';
export const productThumbClass = 'w-full h-full object-cover object-center';
export const heroImageClass = 'w-full h-full object-cover object-center';

/** Generic, self-hosted placeholder shown only when a product has no real image. */
export const PRODUCT_IMAGE_PLACEHOLDER = '/product-placeholder.svg';

/**
 * Canonical product-image resolver — the single source of truth every product-image
 * surface should use, so fallback behaviour is consistent and never renders an empty
 * `<img src="">` (which shows a broken-image icon).
 *
 * Order uses REAL fields only, then a generic placeholder:
 *   1. `product.image` (the primary image column)
 *   2. first non-empty entry of `product.images` (the image relation)
 *   3. the generic placeholder — NOT a product-specific or fabricated URL
 *
 * It never masks real data: when the database has an image, that image is returned.
 */
export function resolveProductImage(
  product: { image?: string | null; images?: string[] | null } | null | undefined,
): string {
  const primary = product?.image?.trim();
  if (primary) return primary;
  const first = product?.images?.find((u) => typeof u === 'string' && u.trim().length > 0);
  if (first) return first.trim();
  return PRODUCT_IMAGE_PLACEHOLDER;
}
