import type { AffiliateSettings, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';

/**
 * AffiliateSettings is a singleton (id = "default"). A short in-memory cache keeps
 * the /go redirect hot-path off the DB (FR-044 <100ms).
 */
let cache: { value: AffiliateSettings; at: number } | null = null;
const TTL_MS = 60_000;

export async function getAffiliateSettings(): Promise<AffiliateSettings> {
  return prisma.affiliateSettings.upsert({ where: { id: 'default' }, update: {}, create: { id: 'default' } });
}

/** Cached read for the redirect hot path. */
export async function getCachedSettings(): Promise<AffiliateSettings> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  const value = await getAffiliateSettings();
  cache = { value, at: Date.now() };
  return value;
}

export async function updateAffiliateSettings(
  patch: Prisma.AffiliateSettingsUncheckedUpdateInput,
): Promise<AffiliateSettings> {
  const value = await prisma.affiliateSettings.upsert({
    where: { id: 'default' },
    update: patch,
    create: { id: 'default', ...(patch as Prisma.AffiliateSettingsUncheckedCreateInput) },
  });
  cache = { value, at: Date.now() };
  return value;
}

export function invalidateSettingsCache(): void {
  cache = null;
}
