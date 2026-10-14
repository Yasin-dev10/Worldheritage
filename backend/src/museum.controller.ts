import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import prismaClientModule from '@prisma/client';
import { PrismaService } from './prisma.service.js';
import {
  parsePublicQuery,
  publicSourceRecordSelection,
} from './public-read.utils.js';

const { EditorialState } = prismaClientModule;

@Controller('museum')
export class MuseumController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('items')
  async items(
    @Query('locale') localeInput?: string,
    @Query('limit') limitInput?: string,
    @Query('cursor') cursor?: string,
    @Query('q') queryInput?: string,
  ) {
    const {
      locale,
      limit,
      cursor: after,
      query,
    } = parsePublicQuery({
      locale: localeInput,
      limit: limitInput,
      cursor,
      q: queryInput,
    });
    const rows = await this.prisma.museumItem.findMany({
      where: {
        state: EditorialState.PUBLISHED,
        sources: { some: {} },
        publishedAt: { not: null },
        translations: {
          some: {
            locale,
            ...(query
              ? {
                  OR: [
                    { title: { contains: query, mode: 'insensitive' } },
                    { description: { contains: query, mode: 'insensitive' } },
                  ],
                }
              : {}),
          },
        },
      },
      orderBy: { slug: 'asc' },
      take: limit + 1,
      ...(after ? { cursor: { id: after }, skip: 1 } : {}),
      select: {
        id: true,
        slug: true,
        dateDisplay: true,
        datePrecision: true,
        currentLocation: true,
        creatorAttribution: true,
        publishedAt: true,
        translations: { where: { locale }, take: 1 },
        mediaAsset: {
          select: {
            storageLocation: true,
            mediaType: true,
            altText: true,
            attribution: true,
            license: true,
          },
        },
      },
    });
    const hasMore = rows.length > limit;
    return {
      data: rows.slice(0, limit).map(({ translations, ...item }) => ({
        ...item,
        ...translations[0],
        id: item.id,
      })),
      nextCursor: hasMore ? (rows[limit - 1]?.id ?? null) : null,
      locale,
    };
  }

  @Get('items/:slug')
  async item(
    @Param('slug') slug: string,
    @Query('locale') localeInput?: string,
  ) {
    const { locale } = parsePublicQuery({ locale: localeInput });
    const item = await this.prisma.museumItem.findFirst({
      where: {
        slug,
        state: EditorialState.PUBLISHED,
        publishedAt: { not: null },
        sources: { some: {} },
        translations: { some: { locale } },
      },
      select: {
        id: true,
        slug: true,
        dateDisplay: true,
        datePrecision: true,
        provenance: true,
        currentLocation: true,
        creatorAttribution: true,
        rightsNotes: true,
        publishedAt: true,
        translations: { where: { locale }, take: 1 },
        mediaAsset: {
          select: {
            storageLocation: true,
            mediaType: true,
            altText: true,
            attribution: true,
            license: true,
            provenance: true,
            rightsNotes: true,
          },
        },
        sources: {
          select: {
            locator: true,
            claimNote: true,
            claimStanding: true,
            ...publicSourceRecordSelection(),
          },
        },
      },
    });
    if (!item || !item.translations[0]) throw new NotFoundException();
    const { translations, ...base } = item;
    return { ...base, ...translations[0], id: base.id };
  }

  @Get('exhibitions')
  async exhibitions(
    @Query('locale') localeInput?: string,
    @Query('limit') limitInput?: string,
    @Query('cursor') cursor?: string,
    @Query('q') queryInput?: string,
  ) {
    const {
      locale,
      limit,
      cursor: after,
      query,
    } = parsePublicQuery({
      locale: localeInput,
      limit: limitInput,
      cursor,
      q: queryInput,
    });
    const rows = await this.prisma.museumExhibition.findMany({
      where: {
        state: EditorialState.PUBLISHED,
        items: {
          some: {
            item: {
              state: EditorialState.PUBLISHED,
              sources: { some: {} },
              translations: { some: { locale } },
            },
          },
        },
        translations: {
          some: {
            locale,
            ...(query
              ? {
                  OR: [
                    { title: { contains: query, mode: 'insensitive' } },
                    { summary: { contains: query, mode: 'insensitive' } },
                  ],
                }
              : {}),
          },
        },
      },
      orderBy: { slug: 'asc' },
      take: limit + 1,
      ...(after ? { cursor: { id: after }, skip: 1 } : {}),
      select: {
        id: true,
        slug: true,
        topic: true,
        publishedAt: true,
        translations: { where: { locale }, take: 1 },
      },
    });
    const hasMore = rows.length > limit;
    return {
      data: rows.slice(0, limit).map(({ translations, ...row }) => ({
        ...row,
        ...translations[0],
        id: row.id,
      })),
      nextCursor: hasMore ? (rows[limit - 1]?.id ?? null) : null,
      locale,
    };
  }

  @Get('exhibitions/:slug')
  async exhibition(
    @Param('slug') slug: string,
    @Query('locale') localeInput?: string,
  ) {
    const { locale } = parsePublicQuery({ locale: localeInput });
    const exhibition = await this.prisma.museumExhibition.findFirst({
      where: {
        slug,
        state: EditorialState.PUBLISHED,
        translations: { some: { locale } },
        items: {
          some: {
            item: {
              state: EditorialState.PUBLISHED,
              sources: { some: {} },
              translations: { some: { locale } },
            },
          },
        },
      },
      select: {
        id: true,
        slug: true,
        topic: true,
        publishedAt: true,
        translations: { where: { locale }, take: 1 },
        items: {
          orderBy: { position: 'asc' },
          where: {
            item: {
              state: EditorialState.PUBLISHED,
              sources: { some: {} },
              translations: { some: { locale } },
            },
          },
          select: {
            position: true,
            item: {
              select: {
                id: true,
                slug: true,
                dateDisplay: true,
                translations: { where: { locale }, take: 1 },
                mediaAsset: {
                  select: {
                    storageLocation: true,
                    mediaType: true,
                    altText: true,
                    attribution: true,
                    license: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!exhibition || !exhibition.translations[0])
      throw new NotFoundException();
    const { translations, items, ...base } = exhibition;
    return {
      ...base,
      ...translations[0],
      id: base.id,
      items: items.map(({ position, item }) => ({
        position,
        ...item,
        ...item.translations[0],
        id: item.id,
      })),
    };
  }
}

@Controller('maps')
export class HistoricalMapsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(
    @Query('locale') localeInput?: string,
    @Query('limit') limitInput?: string,
    @Query('cursor') cursor?: string,
    @Query('q') queryInput?: string,
  ) {
    const {
      locale,
      limit,
      cursor: after,
      query,
    } = parsePublicQuery({
      locale: localeInput,
      limit: limitInput,
      cursor,
      q: queryInput,
    });
    const rows = await this.prisma.historicalMap.findMany({
      where: {
        state: EditorialState.PUBLISHED,
        publishedAt: { not: null },
        sources: { some: {} },
        translations: {
          some: {
            locale,
            ...(query
              ? {
                  OR: [
                    { title: { contains: query, mode: 'insensitive' } },
                    { description: { contains: query, mode: 'insensitive' } },
                  ],
                }
              : {}),
          },
        },
      },
      orderBy: [{ startYear: 'asc' }, { slug: 'asc' }],
      take: limit + 1,
      ...(after ? { cursor: { id: after }, skip: 1 } : {}),
      select: {
        id: true,
        slug: true,
        dateDisplay: true,
        startYear: true,
        endYear: true,
        datePrecision: true,
        geographicArea: true,
        publishedAt: true,
        translations: { where: { locale }, take: 1 },
        mediaAsset: {
          select: {
            storageLocation: true,
            mediaType: true,
            altText: true,
            attribution: true,
            license: true,
          },
        },
      },
    });
    const hasMore = rows.length > limit;
    return {
      data: rows.slice(0, limit).map(({ translations, ...row }) => ({
        ...row,
        ...translations[0],
        id: row.id,
      })),
      nextCursor: hasMore ? (rows[limit - 1]?.id ?? null) : null,
      locale,
    };
  }

  @Get(':slug')
  async detail(
    @Param('slug') slug: string,
    @Query('locale') localeInput?: string,
  ) {
    const { locale } = parsePublicQuery({ locale: localeInput });
    const map = await this.prisma.historicalMap.findFirst({
      where: {
        slug,
        state: EditorialState.PUBLISHED,
        publishedAt: { not: null },
        sources: { some: {} },
        translations: { some: { locale } },
      },
      select: {
        id: true,
        slug: true,
        dateDisplay: true,
        startYear: true,
        endYear: true,
        datePrecision: true,
        geographicArea: true,
        provenance: true,
        rightsNotes: true,
        publishedAt: true,
        translations: { where: { locale }, take: 1 },
        mediaAsset: {
          select: {
            storageLocation: true,
            mediaType: true,
            altText: true,
            attribution: true,
            license: true,
            provenance: true,
            rightsNotes: true,
          },
        },
        sources: {
          select: {
            claimNote: true,
            claimStanding: true,
            ...publicSourceRecordSelection(),
          },
        },
      },
    });
    if (!map || !map.translations[0]) throw new NotFoundException();
    const { translations, ...base } = map;
    return { ...base, ...translations[0], id: base.id };
  }
}
