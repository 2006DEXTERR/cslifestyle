import { Prisma, type MediaAsset, type MediaUsage } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError, type Pagination } from '../../lib/http';
import { ALLOWED_MIME, hashBuffer, storeAndOptimize, deleteFiles, publicUrl, type OptimizeResult } from './storage';

/**
 * Media Library service (Phase 10): upload (hash-deduped + optimized), browse/search,
 * metadata edit, replace, delete, folders, and usage tracking + unused-asset detection.
 */

type Variants = OptimizeResult['variants'];

export function presentAsset(a: MediaAsset & { usages?: MediaUsage[] }): Record<string, unknown> {
  const v = (a.variants as Variants | null) ?? { thumbnail: null, webp: null, sizes: [] };
  return {
    id: a.id,
    filename: a.filename,
    originalName: a.originalName,
    mimeType: a.mimeType,
    size: a.size,
    width: a.width,
    height: a.height,
    altText: a.altText,
    caption: a.caption,
    folderId: a.folderId,
    url: publicUrl(a.storagePath),
    thumbnailUrl: publicUrl(v.thumbnail) ?? publicUrl(a.storagePath),
    webpUrl: publicUrl(v.webp),
    sizes: (v.sizes ?? []).map((s) => ({ w: s.w, url: publicUrl(s.path) })),
    hash: a.hash,
    createdAt: a.createdAt.toISOString(),
    ...(a.usages ? { usages: a.usages.map(presentUsage), usageCount: a.usages.length } : {}),
  };
}

function presentUsage(u: MediaUsage): Record<string, unknown> {
  return { id: u.id, mediaId: u.mediaId, entityType: u.entityType, entityId: u.entityId, field: u.field, createdAt: u.createdAt.toISOString() };
}

export function isAllowedMime(mime: string): boolean {
  return mime in ALLOWED_MIME;
}

// ── Upload ──

export interface UploadInput {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
  folderId?: string | null;
  altText?: string;
  caption?: string;
  userId?: string | null;
}

export async function uploadAsset(input: UploadInput): Promise<{ asset: Record<string, unknown>; duplicate: boolean }> {
  if (!isAllowedMime(input.mimeType)) throw ApiError.badRequest(`Unsupported file type: ${input.mimeType}`);
  const hash = hashBuffer(input.buffer);

  const existing = await prisma.mediaAsset.findUnique({ where: { hash } });
  if (existing) return { asset: presentAsset(existing), duplicate: true };

  const opt = await storeAndOptimize(input.buffer, input.mimeType, hash);
  const asset = await prisma.mediaAsset.create({
    data: {
      filename: opt.storagePath,
      originalName: input.originalName.slice(0, 255),
      mimeType: input.mimeType,
      size: input.size,
      width: opt.width,
      height: opt.height,
      altText: input.altText ?? null,
      caption: input.caption ?? null,
      storagePath: opt.storagePath,
      variants: opt.variants as unknown as Prisma.InputJsonValue,
      hash,
      folderId: input.folderId ?? null,
      createdById: input.userId ?? null,
    },
  });
  return { asset: presentAsset(asset), duplicate: false };
}

// ── Browse / search ──

export interface ListQuery {
  page: number;
  perPage: number;
  folderId?: string;
  mimeType?: string;
  search?: string;
  unused?: boolean;
}

export async function listAssets(q: ListQuery): Promise<{ items: unknown[]; pagination: Pagination }> {
  const and: Prisma.MediaAssetWhereInput[] = [];
  if (q.folderId) and.push({ folderId: q.folderId });
  if (q.mimeType) and.push({ mimeType: q.mimeType });
  if (q.search) and.push({ originalName: { contains: q.search, mode: 'insensitive' } });
  if (q.unused) and.push({ usages: { none: {} } });
  const where = and.length ? { AND: and } : {};

  const [rows, total] = await prisma.$transaction([
    prisma.mediaAsset.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * q.perPage, take: q.perPage, include: { usages: true } }),
    prisma.mediaAsset.count({ where }),
  ]);
  return {
    items: rows.map(presentAsset),
    pagination: { page: q.page, perPage: q.perPage, total, totalPages: Math.max(1, Math.ceil(total / q.perPage)) },
  };
}

export async function getAsset(id: string): Promise<Record<string, unknown>> {
  const a = await prisma.mediaAsset.findUnique({ where: { id }, include: { usages: true } });
  if (!a) throw ApiError.notFound('Media asset not found');
  return presentAsset(a);
}

export async function updateAsset(id: string, patch: { altText?: string; caption?: string; folderId?: string | null }): Promise<Record<string, unknown>> {
  const existing = await prisma.mediaAsset.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw ApiError.notFound('Media asset not found');
  const a = await prisma.mediaAsset.update({
    where: { id },
    data: { altText: patch.altText ?? undefined, caption: patch.caption ?? undefined, folderId: patch.folderId === undefined ? undefined : patch.folderId },
    include: { usages: true },
  });
  return presentAsset(a);
}

/** Replace an asset's binary in place (keeps id → all references update automatically). */
export async function replaceAsset(id: string, input: { buffer: Buffer; originalName: string; mimeType: string; size: number }): Promise<Record<string, unknown>> {
  const existing = await prisma.mediaAsset.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Media asset not found');
  if (!isAllowedMime(input.mimeType)) throw ApiError.badRequest(`Unsupported file type: ${input.mimeType}`);

  const newHash = hashBuffer(input.buffer);
  if (newHash !== existing.hash) {
    const clash = await prisma.mediaAsset.findUnique({ where: { hash: newHash }, select: { id: true } });
    if (clash && clash.id !== id) throw new ApiError(409, 'An identical asset already exists');
  }

  await deleteFiles(existing.storagePath, existing.variants as Variants | null);
  const opt = await storeAndOptimize(input.buffer, input.mimeType, newHash);
  const a = await prisma.mediaAsset.update({
    where: { id },
    data: {
      filename: opt.storagePath,
      originalName: input.originalName.slice(0, 255),
      mimeType: input.mimeType,
      size: input.size,
      width: opt.width,
      height: opt.height,
      storagePath: opt.storagePath,
      variants: opt.variants as unknown as Prisma.InputJsonValue,
      hash: newHash,
    },
    include: { usages: true },
  });
  return presentAsset(a);
}

export async function deleteAsset(id: string): Promise<{ id: string; usageCount: number }> {
  const a = await prisma.mediaAsset.findUnique({ where: { id }, include: { _count: { select: { usages: true } } } });
  if (!a) throw ApiError.notFound('Media asset not found');
  await deleteFiles(a.storagePath, a.variants as Variants | null);
  await prisma.mediaAsset.delete({ where: { id } });
  return { id, usageCount: a._count.usages };
}

// ── Usage tracking + unused detection ──

export async function attachUsage(mediaId: string, entityType: string, entityId: string, field?: string): Promise<Record<string, unknown>> {
  const media = await prisma.mediaAsset.findUnique({ where: { id: mediaId }, select: { id: true } });
  if (!media) throw ApiError.notFound('Media asset not found');
  const usage = await prisma.mediaUsage.upsert({
    where: { mediaId_entityType_entityId_field: { mediaId, entityType, entityId, field: field ?? '' } },
    update: {},
    create: { mediaId, entityType, entityId, field: field ?? null },
  });
  return presentUsage(usage);
}

export async function detachUsage(mediaId: string, entityType: string, entityId: string, field?: string): Promise<void> {
  await prisma.mediaUsage.deleteMany({ where: { mediaId, entityType, entityId, ...(field !== undefined ? { field } : {}) } });
}

/**
 * Link a media asset to an entity by its public `/uploads/...` URL (best-effort, no-op if
 * the URL isn't a known asset). Used by the Import Center (CSV image columns) and lets
 * AI-generated content reference an existing asset — **no image generation, linking only**.
 */
export async function attachMediaByUrl(url: string | null | undefined, entityType: string, entityId: string, field?: string): Promise<void> {
  if (!url) return;
  const m = /\/uploads\/([^/?#]+)$/.exec(url);
  if (!m) return;
  const asset = await prisma.mediaAsset.findFirst({ where: { storagePath: m[1] }, select: { id: true } });
  if (!asset) return;
  await attachUsage(asset.id, entityType, entityId, field).catch(() => undefined);
}

export async function listUsage(mediaId: string): Promise<unknown[]> {
  const rows = await prisma.mediaUsage.findMany({ where: { mediaId }, orderBy: { createdAt: 'desc' } });
  return rows.map(presentUsage);
}

export async function listUnused(q: { page: number; perPage: number }): Promise<{ items: unknown[]; pagination: Pagination }> {
  return listAssets({ ...q, unused: true });
}

export async function getStats(): Promise<Record<string, unknown>> {
  const [total, sizeAgg, byType, unused, folders] = await Promise.all([
    prisma.mediaAsset.count(),
    prisma.mediaAsset.aggregate({ _sum: { size: true } }),
    prisma.mediaAsset.groupBy({ by: ['mimeType'], _count: { id: true }, _sum: { size: true } }),
    prisma.mediaAsset.count({ where: { usages: { none: {} } } }),
    prisma.mediaFolder.count(),
  ]);
  return {
    totalAssets: total,
    totalSize: sizeAgg._sum.size ?? 0,
    unusedCount: unused,
    folders,
    byType: byType.map((t) => ({ mimeType: t.mimeType, count: t._count.id, size: t._sum.size ?? 0 })),
  };
}

// ── Folders ──

export async function listFolders(): Promise<unknown[]> {
  const rows = await prisma.mediaFolder.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { assets: true } } } });
  return rows.map((f) => ({ id: f.id, name: f.name, parentId: f.parentId, assetCount: f._count.assets, createdAt: f.createdAt.toISOString() }));
}

export async function createFolder(input: { name: string; parentId?: string | null }): Promise<Record<string, unknown>> {
  const f = await prisma.mediaFolder.create({ data: { name: input.name, parentId: input.parentId ?? null } });
  return { id: f.id, name: f.name, parentId: f.parentId, createdAt: f.createdAt.toISOString() };
}

export async function deleteFolder(id: string): Promise<void> {
  const existing = await prisma.mediaFolder.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw ApiError.notFound('Folder not found');
  // Assets keep existing (folderId → null via SetNull); child folders detach.
  await prisma.mediaFolder.delete({ where: { id } });
}
