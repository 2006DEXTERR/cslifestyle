import type { AiEntityType, AiJobType, AiQueue } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../lib/http';
import { getPrompt, JOB_TO_TEMPLATE, renderPrompt } from './prompts';

/**
 * Entity loading + prompt building + applying approved AI content to the entity.
 * Entity references are polymorphic (entityType + entityId). The review gate lives in
 * `approveJob` (queue.service) — `applyApprovedResult` is only called after approval,
 * which is what blocks unreviewed AI content from public fields (FR-052 / §4.6).
 */

export interface EntityContext {
  name: string;
  vars: Record<string, string | undefined>;
}

/** Job types valid for each entity type. */
export const JOBS_FOR_ENTITY: Record<AiEntityType, AiJobType[]> = {
  product: ['title', 'meta_description', 'description', 'pros', 'cons', 'faq'],
  comparison: ['verdict'],
  category: ['category_description'],
  guide: ['guide', 'meta_description'],
  brand: ['description'],
};

export async function loadEntityContext(entityType: AiEntityType, entityId: string): Promise<EntityContext> {
  switch (entityType) {
    case 'product': {
      const p = await prisma.product.findUnique({
        where: { id: entityId },
        include: { brand: true, category: true },
      });
      if (!p) throw ApiError.notFound('Product not found');
      const features = [
        ...(Array.isArray(p.highlights) ? (p.highlights as string[]) : []),
      ].slice(0, 8).join(', ');
      return {
        name: p.title,
        vars: { title: p.title, name: p.title, brand: p.brand?.name ?? '', category: p.category?.name ?? '', features },
      };
    }
    case 'comparison': {
      const c = await prisma.comparison.findUnique({
        where: { id: entityId },
        include: { productA: true, productB: true },
      });
      if (!c) throw ApiError.notFound('Comparison not found');
      return {
        name: c.title,
        vars: { title: c.title, productA: c.productA.title, productB: c.productB.title },
      };
    }
    case 'category': {
      const c = await prisma.category.findUnique({ where: { id: entityId } });
      if (!c) throw ApiError.notFound('Category not found');
      return { name: c.name, vars: { name: c.name, title: c.name } };
    }
    case 'guide': {
      const g = await prisma.guide.findUnique({ where: { id: entityId }, include: { category: true } });
      if (!g) throw ApiError.notFound('Guide not found');
      return { name: g.title, vars: { title: g.title, category: g.category?.name ?? '' } };
    }
    case 'brand': {
      const b = await prisma.brand.findUnique({ where: { id: entityId } });
      if (!b) throw ApiError.notFound('Brand not found');
      return { name: b.name, vars: { name: b.name, title: b.name, brand: b.name } };
    }
  }
}

/** Resolve + render the prompt for a queue job. Returns the template key + final text. */
export async function buildPrompt(
  entityType: AiEntityType,
  entityId: string,
  jobType: AiJobType,
): Promise<{ templateType: string; prompt: string; entityName: string }> {
  const ctx = await loadEntityContext(entityType, entityId);
  const templateType = JOB_TO_TEMPLATE[jobType];
  const template = await getPrompt(templateType);
  return { templateType, prompt: renderPrompt(template, ctx.vars), entityName: ctx.name };
}

/**
 * Apply an approved generation to its entity field (FR-052). Called only after the
 * review gate passes. `result` is the stored generation (text + optional parsed JSON).
 */
export async function applyApprovedResult(job: AiQueue): Promise<void> {
  const result = (job.result ?? {}) as { text?: string; parsed?: unknown };
  const text = (result.text ?? '').trim();
  if (!text) return;

  switch (job.entityType) {
    case 'product': {
      const data: Record<string, unknown> = {};
      if (job.jobType === 'title') data.seoTitle = text;
      else if (job.jobType === 'meta_description') data.metaDescription = text;
      else if (job.jobType === 'description') data.description = text;
      else if (job.jobType === 'pros') data.pros = (result.parsed as { pros?: unknown })?.pros ?? [];
      else if (job.jobType === 'cons') data.cons = (result.parsed as { cons?: unknown })?.cons ?? [];
      else if (job.jobType === 'faq') data.faqs = result.parsed ?? [];
      data.aiStatus = 'done';
      data.aiGeneratedAt = new Date();
      await prisma.product.update({ where: { id: job.entityId }, data });
      return;
    }
    case 'comparison': {
      if (job.jobType === 'verdict') {
        await prisma.comparison.update({ where: { id: job.entityId }, data: { verdict: text } });
      }
      return;
    }
    case 'category': {
      if (job.jobType === 'category_description') {
        await prisma.category.update({ where: { id: job.entityId }, data: { description: text } });
      }
      return;
    }
    case 'guide': {
      const data: Record<string, unknown> = {};
      if (job.jobType === 'guide') data.content = text;
      else if (job.jobType === 'meta_description') data.metaDescription = text;
      if (Object.keys(data).length) await prisma.guide.update({ where: { id: job.entityId }, data });
      return;
    }
    case 'brand':
      // Brand has no AI-applied field in this phase; result stays on the queue row.
      return;
  }
}
