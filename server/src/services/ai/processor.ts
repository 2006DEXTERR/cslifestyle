import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import { buildPrompt } from './engine';
import { generate } from './providers';
import { validateGeneration } from './validation';

/**
 * Process one AiQueue job (used by both the inline driver and the BullMQ worker,
 * ADR-023). Steps: mark processing → build+render prompt → call provider abstraction →
 * quality-validate (§10.5) → write AiLog (model/prompt/response/tokens/cost, FR-055) →
 * store result on the queue row as `done` awaiting review (FR-052), or `failed` with
 * retry accounting. Generated content is NOT applied to the entity here — that happens
 * only on admin approval (the review gate, §4.6).
 */
export async function processAiJob(queueId: string): Promise<void> {
  const job = await prisma.aiQueue.findUnique({ where: { id: queueId } });
  if (!job || job.status === 'done' || job.status === 'processing') return;

  await prisma.aiQueue.update({
    where: { id: queueId },
    data: { status: 'processing', startedAt: new Date(), attempts: { increment: 1 } },
  });
  if (job.entityType === 'product') {
    await prisma.product
      .update({ where: { id: job.entityId }, data: { aiStatus: 'generating' } })
      .catch(() => undefined);
  }

  try {
    const { templateType, prompt, entityName } = await buildPrompt(job.entityType, job.entityId, job.jobType);
    const gen = await generate({ prompt, jobType: job.jobType, entityName });
    const check = validateGeneration(gen.text, job.jobType);

    await prisma.aiLog.create({
      data: {
        queueId,
        entityType: job.entityType,
        entityId: job.entityId,
        jobType: job.jobType,
        modelUsed: gen.model,
        provider: gen.provider,
        promptUsed: prompt,
        responseRaw: gen.text,
        tokensInput: gen.tokensInput,
        tokensOutput: gen.tokensOutput,
        costUsd: gen.costUsd,
        status: check.valid ? 'success' : 'failed',
        errorMessage: check.valid ? null : check.errors.join('; '),
      },
    });

    if (!check.valid) {
      throw new Error(`Validation failed: ${check.errors.join('; ')}`);
    }

    await prisma.aiQueue.update({
      where: { id: queueId },
      data: {
        status: 'done',
        promptTemplate: templateType,
        result: { text: gen.text.trim(), parsed: check.parsed ?? null, provider: gen.provider, model: gen.model },
        errorMessage: null,
        completedAt: new Date(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI generation failed';
    const fresh = await prisma.aiQueue.findUnique({ where: { id: queueId }, select: { attempts: true, maxAttempts: true } });
    const exhausted = (fresh?.attempts ?? job.attempts + 1) >= (fresh?.maxAttempts ?? job.maxAttempts);
    await prisma.aiQueue.update({
      where: { id: queueId },
      data: { status: 'failed', errorMessage: message, completedAt: exhausted ? new Date() : null },
    });
    if (job.entityType === 'product') {
      await prisma.product
        .update({ where: { id: job.entityId }, data: { aiStatus: 'failed' } })
        .catch(() => undefined);
    }
    logger.warn({ queueId, err: message }, 'ai job failed');
  }
}
