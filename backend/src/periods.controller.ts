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

@Controller('periods')
export class PeriodsController {
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
    const rows = await this.prisma.historicalPeriod.findMany({
      where: {
        state: EditorialState.PUBLISHED,
        sources: { some: {} },
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
        dateCertainty: true,
        publishedAt: true,
        translations: { where: { locale }, take: 1 },
      },
    });
    const hasMore = rows.length > limit;
    return {
      data: rows
        .slice(0, limit)
        .flatMap(({ translations, ...period }) =>
          translations[0]
            ? [{ ...period, ...translations[0], id: period.id }]
            : [],
        ),
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
    const period = await this.prisma.historicalPeriod.findFirst({
      where: {
        slug,
        state: EditorialState.PUBLISHED,
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
        dateCertainty: true,
        publishedAt: true,
        translations: { where: { locale }, take: 1 },
        sources: {
          select: {
            locator: true,
            claimNote: true,
            claimStanding: true,
            ...publicSourceRecordSelection(),
          },
        },
        events: {
          where: {
            event: {
              state: EditorialState.PUBLISHED,
              sources: { some: {} },
              translations: { some: { locale } },
            },
          },
          select: {
            event: {
              select: {
                slug: true,
                dateDisplay: true,
                startYear: true,
                endYear: true,
                translations: { where: { locale }, take: 1 },
              },
            },
          },
        },
      },
    });
    if (!period || !period.translations[0]) throw new NotFoundException();
    const { translations, events, ...base } = period;
    return {
      ...base,
      ...translations[0],
      id: base.id,
      events: events.map(({ event }) => ({
        ...event,
        title: event.translations[0]?.title ?? null,
        translations: undefined,
      })),
    };
  }
}
