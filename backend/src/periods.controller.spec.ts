import { describe, expect, it, vi } from 'vitest';
import { PeriodsController } from './periods.controller.js';
import type { PrismaService } from './prisma.service.js';

describe('historical period public reads', () => {
  it('lists only published, source-backed localized periods with uncertain dates intact', async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        id: 'period-1',
        slug: 'early-period',
        dateDisplay: 'c. 900–1100',
        startYear: 900,
        endYear: 1100,
        datePrecision: 'RANGE',
        dateCertainty: 'PROBABLE',
        publishedAt: new Date('2026-10-14'),
        translations: [
          {
            locale: 'en',
            title: 'Early period',
            summary: 'Summary',
            body: 'Body',
          },
        ],
      },
    ]);
    const prisma = {
      historicalPeriod: { findMany },
    } as unknown as PrismaService;
    const result = await new PeriodsController(prisma).list('en', '10');
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          state: 'PUBLISHED',
          sources: { some: {} },
        }),
      }),
    );
    expect(result.data[0]).toMatchObject({
      slug: 'early-period',
      startYear: 900,
      endYear: 1100,
      datePrecision: 'RANGE',
      dateCertainty: 'PROBABLE',
    });
  });
});
