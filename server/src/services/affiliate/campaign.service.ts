import { Prisma, type AffiliateCampaign } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../lib/http';
import { uniqueSlug } from '../../lib/slug';

export interface PresentedCampaign {
  id: string;
  name: string;
  slug: string;
  affiliateTag: string | null;
  description: string | null;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  clickCount: number;
  goUrl: string;
  createdAt: string;
  updatedAt: string;
}

function present(c: AffiliateCampaign & { _count?: { clicks: number } }): PresentedCampaign {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    affiliateTag: c.affiliateTag,
    description: c.description,
    isActive: c.isActive,
    startsAt: c.startsAt ? c.startsAt.toISOString() : null,
    endsAt: c.endsAt ? c.endsAt.toISOString() : null,
    clickCount: c._count?.clicks ?? 0,
    // append ?c=<slug> to any /go link to attribute a click to this campaign
    goUrl: `/go/{asin}?c=${c.slug}`,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

export async function listCampaigns(): Promise<PresentedCampaign[]> {
  const rows = await prisma.affiliateCampaign.findMany({
    include: { _count: { select: { clicks: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(present);
}

function campaignExistsBySlug(slug: string): Promise<string | null> {
  return prisma.affiliateCampaign.findUnique({ where: { slug }, select: { id: true } }).then((r) => r?.id ?? null);
}

interface CampaignBody {
  name: string;
  slug?: string;
  affiliateTag?: string | null;
  description?: string;
  isActive?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}

function scalarData(body: Partial<CampaignBody>): Prisma.AffiliateCampaignUncheckedUpdateInput {
  const d: Prisma.AffiliateCampaignUncheckedUpdateInput = {};
  if (body.name !== undefined) d.name = body.name;
  if (body.affiliateTag !== undefined) d.affiliateTag = body.affiliateTag;
  if (body.description !== undefined) d.description = body.description;
  if (body.isActive !== undefined) d.isActive = body.isActive;
  if (body.startsAt !== undefined) d.startsAt = body.startsAt ? new Date(body.startsAt) : null;
  if (body.endsAt !== undefined) d.endsAt = body.endsAt ? new Date(body.endsAt) : null;
  return d;
}

export async function createCampaign(body: CampaignBody): Promise<PresentedCampaign> {
  const slug = await uniqueSlug(body.slug ?? body.name, campaignExistsBySlug);
  const row = await prisma.affiliateCampaign.create({
    data: { ...(scalarData(body) as Prisma.AffiliateCampaignUncheckedCreateInput), slug },
    include: { _count: { select: { clicks: true } } },
  });
  return present(row);
}

export async function updateCampaign(id: string, body: Partial<CampaignBody>): Promise<PresentedCampaign> {
  const existing = await prisma.affiliateCampaign.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Campaign not found');
  const data = scalarData(body);
  if (body.slug) data.slug = await uniqueSlug(body.slug, campaignExistsBySlug, id);
  const row = await prisma.affiliateCampaign.update({
    where: { id },
    data,
    include: { _count: { select: { clicks: true } } },
  });
  return present(row);
}

export async function deleteCampaign(id: string): Promise<void> {
  const existing = await prisma.affiliateCampaign.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw ApiError.notFound('Campaign not found');
  await prisma.affiliateCampaign.delete({ where: { id } });
}
