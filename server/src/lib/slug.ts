/** URL-safe slug from arbitrary text (lowercase, hyphenated, ASCII). */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

/**
 * Ensures slug uniqueness by probing `existsBySlug`. Appends -2, -3, … until free.
 * Pass `currentId` so an entity keeps its own slug on update.
 */
export async function uniqueSlug(
  base: string,
  existsBySlug: (slug: string) => Promise<string | null>,
  currentId?: string,
): Promise<string> {
  const root = slugify(base) || 'item';
  let candidate = root;
  let n = 1;
  for (;;) {
    const ownerId = await existsBySlug(candidate);
    if (!ownerId || ownerId === currentId) return candidate;
    n += 1;
    candidate = `${root}-${n}`;
  }
}
