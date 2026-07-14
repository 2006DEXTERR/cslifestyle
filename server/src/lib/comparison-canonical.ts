/**
 * Pure helpers for keeping comparison text in sync with canonical product names.
 *
 * A comparison's `title`/`summary`/etc. are stored strings that historically embedded
 * product names captured at authoring time. When a product is renamed those strings go
 * stale. These helpers derive/repair the text from the CURRENT linked product titles —
 * never inventing a name (only exact old→new full-name swaps are applied to prose).
 *
 * Used by BOTH scripts/sync-comparison-names.ts and prisma/seed.ts so the sync and the
 * seed can never diverge (requirement: reseed must not restore old titles).
 */

/**
 * Rebuild a comparison title as "A vs B", preserving any editorial tagline that the old
 * title carried after a colon (e.g. ": Which Pro Laptop Wins?"). A and B are the current
 * canonical product titles, so the result always reflects the latest names.
 */
export function deriveComparisonTitle(oldTitle: string, aName: string, bName: string): string {
  const colon = oldTitle.indexOf(':');
  const tagline = colon >= 0 ? oldTitle.slice(colon) : '';
  return `${aName} vs ${bName}${tagline}`;
}

/**
 * Replace EXACT old full product-name substrings with their canonical replacement.
 * Longest-first so a longer name is swapped before a shorter one it contains. Only exact
 * full-name matches are touched — short forms / brand words are never guessed (that would
 * risk rewriting editorial claims), so callers should report any residual references.
 */
export function replaceProductNames(
  text: string | null | undefined,
  pairs: Array<[oldName: string, newName: string]>,
): string | null {
  if (text == null) return null;
  let out = text;
  const effective = pairs
    .filter(([o, n]) => o && n && o !== n)
    .sort((a, b) => b[0].length - a[0].length);
  for (const [oldN, newN] of effective) out = out.split(oldN).join(newN);
  return out;
}
