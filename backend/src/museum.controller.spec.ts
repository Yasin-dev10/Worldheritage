import { describe, expect, it, vi } from 'vitest';
import {
  MuseumController,
  HistoricalMapsController,
} from './museum.controller.js';
import type { PrismaService } from './prisma.service.js';

describe('museum public reads', () => {
  it('only queries published, cited item records and returns localized list data', async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        id: 'item-1',
        slug: 'archival-object',
        dateDisplay: 'c. 1900',
        datePrecision: 'CIRCA',
        currentLocation: null,
        creatorAttribution: null,
        publishedAt: new Date('2020-01-01'),
        translations: [
          {
            locale: 'en',
            title: 'Archival object',
            description: 'Description',
          },
        ],
        mediaAsset: null,
      },
    ]);
    const prisma = { museumItem: { findMany } } as unknown as PrismaService;
    const result = await new MuseumController(prisma).items('en', '10');
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          state: 'PUBLISHED',
          sources: { some: {} },
          publishedAt: { not: null },
        }),
        take: 11,
      }),
    );
    expect(result.data[0]).toMatchObject({
      slug: 'archival-object',
      title: 'Archival object',
      locale: 'en',
    });
  });

  it('does not reveal a draft map even when requested by slug', async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const prisma = { historicalMap: { findFirst } } as unknown as PrismaService;
    await expect(
      new HistoricalMapsController(prisma).detail('unpublished-map', 'so'),
    ).rejects.toMatchObject({ status: 404 });
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          slug: 'unpublished-map',
          state: 'PUBLISHED',
          sources: { some: {} },
        }),
      }),
    );
  });
});
