/**
 * Shared image-fit styles so images render consistently across the site.
 *
 * `productImageClass` — product photos use `object-contain object-center` so the
 * whole product stays visible and centered inside its container (no cropping or
 * shifting), regardless of the container's aspect ratio.
 *
 * `heroImageClass` — editorial / cover / hero images keep `object-cover` where
 * deliberate cropping-to-fill is intended, but pinned to center for consistency.
 *
 * Compose hover/zoom transitions by appending to the base, e.g.
 *   `${productImageClass} transition-transform duration-300 group-hover:scale-105`
 */
export const productImageClass = 'w-full h-full object-contain object-center';
export const heroImageClass = 'w-full h-full object-cover object-center';
