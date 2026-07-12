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
