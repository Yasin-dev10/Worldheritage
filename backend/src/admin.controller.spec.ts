import { describe, expect, it, vi } from 'vitest';
import { AdminController } from './admin.controller.js';
import type { PrismaService } from './prisma.service.js';

describe('editorial source gates', () => {
  it('reports the imported Somali research drafts in the admin dashboard', async () => {
    const count = vi.fn().mockResolvedValue(0);
    const auditCount = vi.fn().mockResolvedValue(60);
    const prisma = {
      country: { count },
      historyArticle: { count },
      historicalEvent: { count },
      historicalPerson: { count },
      historicalTimeline: { count },
      civilization: { count },
      countryRevision: { count },
      auditEvent: {
        count: auditCount,
        findMany: vi.fn().mockResolvedValue([]),
      },
    } as unknown as PrismaService;

    const result = await new AdminController(prisma).dashboard();

    expect(result.counts.somaliResearchDrafts).toBe(60);
    expect(auditCount).toHaveBeenCalledWith({
      where: {
        action: 'SOMALI_HISTORY_BATCH_IMPORTED',
        targetType: {
          in: ['historical_topic', 'historical_event', 'historical_figure'],
        },
        targetId: { not: null },
      },
    });
  });

  it('does not publish an approved article without source references', async () => {
    const prisma = {
      $transaction: vi.fn(
        async (callback: (client: unknown) => Promise<unknown>) =>
          callback({
            historyArticle: {
              findUnique: vi.fn().mockResolvedValue({
                id: 'article-id',
                state: 'APPROVED',
                sources: [],
                translations: [],
              }),
              update: vi.fn(),
            },
          }),
      ),
    } as unknown as PrismaService;
    const controller = new AdminController(prisma);
    await expect(
      controller.publishArticle('article-id', {
        user: { sub: 'editor', roles: ['Editor'] },
      } as never),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('checks backend roles before entering the review transaction', async () => {
    const transaction = vi.fn();
    const controller = new AdminController({
      $transaction: transaction,
    } as unknown as PrismaService);
    await expect(
      controller.transitionContent(
        'events',
        'event-id',
        { action: 'approve' },
        { user: { sub: 'contributor', roles: ['Editor'] } } as never,
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(transaction).not.toHaveBeenCalled();
  });
});
