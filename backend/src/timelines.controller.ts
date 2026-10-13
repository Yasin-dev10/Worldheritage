import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import prismaClientModule from '@prisma/client';
import { PrismaService } from './prisma.service.js';
import { parsePublicQuery } from './public-read.utils.js';

const { EditorialState } = prismaClientModule;

@Controller('timelines')
export class TimelinesController {
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
    const rows = await this.prisma.historicalTimeline.findMany({
      where: {
        state: EditorialState.PUBLISHED,
        events: {
          some: {
            event: {
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
        publishedAt: true,
        translations: {
          where: { locale },
          take: 1,
          select: { locale: true, title: true, summary: true },
        },
      },
    });
    const hasMore = rows.length > limit;
    return {
      data: rows
        .slice(0, limit)
        .flatMap(({ translations, ...row }) =>
          translations[0] ? [{ ...row, ...translations[0] }] : [],
        ),
      nextCursor: hasMore ? (rows[limit - 1]?.id ?? null) : null,
      locale,
    };
  }

  @Get(':idOrSlug')
  async detail(
    @Param('idOrSlug') idOrSlug: string,
    @Query('locale') localeInput?: string,
  ) {
    const { locale } = parsePublicQuery({ locale: localeInput });
    const timeline = await this.prisma.historicalTimeline.findFirst({
      where: {
        slug: idOrSlug,
        state: EditorialState.PUBLISHED,
        events: {
          some: {
            event: {
              state: EditorialState.PUBLISHED,
              sources: { some: {} },
              translations: { some: { locale } },
            },
          },
        },
        translations: { some: { locale } },
      },
      select: {
        id: true,
        slug: true,
        publishedAt: true,
        translations: {
          where: { locale },
          take: 1,
          select: { locale: true, title: true, summary: true },
        },
        events: {
          orderBy: { position: 'asc' },
          where: {
            event: {
              state: EditorialState.PUBLISHED,
              sources: { some: {} },
              translations: { some: { locale } },
            },
          },
          select: {
            position: true,
            event: {
              select: {
                id: true,
                slug: true,
                category: true,
                dateDisplay: true,
                startYear: true,
                endYear: true,
                datePrecision: true,
                dateCertainty: true,
                translations: {
                  where: { locale },
                  take: 1,
                  select: { title: true, summary: true },
                },
              },
            },
          },
        },
      },
    });
    if (!timeline || !timeline.translations[0]) throw new NotFoundException();
    const { translations, events, ...base } = timeline;
    return {
      ...base,
      ...translations[0],
      events: events.map(({ position, event }) => ({
        position,
        id: event.id,
        slug: event.slug,
        category: event.category,
        dateDisplay: event.dateDisplay,
        startYear: event.startYear,
        endYear: event.endYear,
        datePrecision: event.datePrecision,
        dateCertainty: event.dateCertainty,
        title: event.translations[0]?.title ?? null,
        summary: event.translations[0]?.summary ?? null,
      })),
    };
  }
}
