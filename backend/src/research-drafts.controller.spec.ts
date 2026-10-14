import { describe, expect, it, vi } from 'vitest';
import { ResearchDraftsController } from './research-drafts.controller.js';
import type { PrismaService } from './prisma.service.js';

describe('Somali public research drafts', () => {
  it('lists only imported records that remain drafts and labels them unverified', async () => {
    const findAuditEvents = vi.fn().mockResolvedValue([
      { targetType: 'historical_topic', targetId: 'article-1' },
      { targetType: 'historical_event', targetId: 'event-1' },
    ]);
    const findArticles = vi.fn().mockResolvedValue([
      {
        id: 'article-1',
        slug: 'somali-culture',
        updatedAt: new Date('2026-10-14'),
        translations: [{ title: 'Dhaqanka Soomaaliyeed', summary: 'Kooban', body: 'Qoraal.' }],
        sources: [],
      },
    ]);
    const prisma = {
      auditEvent: { findMany: findAuditEvents },
      historyArticle: { findMany: findArticles },
      historicalEvent: { findMany: vi.fn().mockResolvedValue([]) },
      historicalPerson: { findMany: vi.fn().mockResolvedValue([]) },
    } as unknown as PrismaService;

    const result = await new ResearchDraftsController(prisma).list();

    expect(findArticles).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ['article-1'] }, state: 'DRAFT' },
      }),
    );
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({
      slug: 'somali-culture',
      editorialStatus: 'RESEARCH_DRAFT',
      locale: 'so',
    });
    expect(result.historicalVerification).toContain('Not completed');
  });
});
