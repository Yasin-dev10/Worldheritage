import {
  BadRequestException,
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

@Controller('events')
export class EventsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(
    @Query('locale') localeInput?: string,
    @Query('limit') limitInput?: string,
    @Query('cursor') cursor?: string,
    @Query('q') queryInput?: string,
    @Query('category') category?: string,
    @Query('fromYear') fromYearInput?: string,
    @Query('toYear') toYearInput?: string,
  ) {
    const { locale, limit, query } = parsePublicQuery({
      locale: localeInput,
      limit: limitInput,
      cursor,
      q: queryInput,
    });
    const fromYear = this.parseYear(fromYearInput, 'fromYear');
    const toYear = this.parseYear(toYearInput, 'toYear');
    if (fromYear !== undefined && toYear !== undefined && fromYear > toYear) {
      throw new BadRequestException(
        'fromYear must be less than or equal to toYear.',
      );
    }

    const rows = await this.prisma.historicalEvent.findMany({
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
        ...(category ? { category } : {}),
        ...(fromYear !== undefined ? { endYear: { gte: fromYear } } : {}),
        ...(toYear !== undefined ? { startYear: { lte: toYear } } : {}),
      },
      orderBy: [{ startYear: 'asc' }, { slug: 'asc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        slug: true,
        category: true,
        calendar: true,
        dateDisplay: true,
        startYear: true,
        endYear: true,
        datePrecision: true,
        dateCertainty: true,
        publishedAt: true,
        translations: {
          where: { locale },
          take: 1,
          select: { locale: true, title: true, summary: true },
        },
      },
    });
    return this.pageResult(rows, limit, locale, (row) => row.translations[0]);
  }

  @Get(':idOrSlug')
  async detail(
    @Param('idOrSlug') idOrSlug: string,
    @Query('locale') localeInput?: string,
  ) {
    const { locale } = parsePublicQuery({ locale: localeInput });
    const event = await this.prisma.historicalEvent.findFirst({
      where: {
        OR: [
          { slug: idOrSlug },
          ...(this.isUuid(idOrSlug) ? [{ id: idOrSlug }] : []),
        ],
        state: EditorialState.PUBLISHED,
        sources: { some: {} },
        translations: { some: { locale } },
      },
      select: {
        id: true,
        slug: true,
        category: true,
        calendar: true,
        dateDisplay: true,
        startYear: true,
        endYear: true,
        datePrecision: true,
        dateCertainty: true,
        publishedAt: true,
        translations: {
          where: { locale },
          take: 1,
          select: { locale: true, title: true, summary: true, body: true },
        },
        sources: {
          select: {
            locator: true,
            claimNote: true,
            claimStanding: true,
            ...publicSourceRecordSelection(),
          },
        },
        countries: {
          select: {
            relation: true,
            country: {
              select: {
                id: true,
                slug: true,
                isoAlpha2: true,
                revisions: {
                  where: {
                    state: EditorialState.PUBLISHED,
                    sources: { some: {} },
                    translations: { some: { locale } },
                  },
                  orderBy: { publishedAt: 'desc' },
                  take: 1,
                  select: {
                    translations: {
                      where: { locale },
                      take: 1,
                      select: { title: true },
                    },
                  },
                },
              },
            },
          },
        },
        people: {
          where: {
            person: {
              state: EditorialState.PUBLISHED,
              sources: { some: {} },
              translations: { some: { locale } },
            },
          },
          select: {
            relation: true,
            person: {
              select: {
                id: true,
                slug: true,
                translations: {
                  where: { locale },
                  take: 1,
                  select: { title: true },
                },
              },
            },
          },
        },
        civilizations: {
          where: {
            civilization: {
              state: EditorialState.PUBLISHED,
              sources: { some: {} },
              translations: { some: { locale } },
            },
          },
          select: {
            relation: true,
            civilization: {
              select: {
                slug: true,
                translations: {
                  where: { locale },
                  take: 1,
                  select: { title: true },
                },
              },
            },
          },
        },
        periods: {
          where: {
            period: {
              state: EditorialState.PUBLISHED,
              sources: { some: {} },
              translations: { some: { locale } },
            },
          },
          select: {
            period: {
              select: {
                slug: true,
                dateDisplay: true,
                translations: {
                  where: { locale },
                  take: 1,
                  select: { title: true },
                },
              },
            },
          },
        },
      },
    });
    if (!event || !event.translations[0]) throw new NotFoundException();
    return {
      slug: event.slug,
      category: event.category,
      calendar: event.calendar,
      dateDisplay: event.dateDisplay,
      startYear: event.startYear,
      endYear: event.endYear,
      datePrecision: event.datePrecision,
      dateCertainty: event.dateCertainty,
      publishedAt: event.publishedAt,
      ...event.translations[0],
      id: event.id,
      sources: event.sources,
      countries: event.countries.map(({ relation, country }) => ({
        id: country.id,
        slug: country.slug,
        isoAlpha2: country.isoAlpha2,
        title: country.revisions[0]?.translations[0]?.title ?? null,
        relation,
      })),
      people: event.people.map(({ relation, person }) => ({
        id: person.id,
        slug: person.slug,
        title: person.translations[0]?.title ?? null,
        relation,
      })),
      civilizations: event.civilizations.map(({ relation, civilization }) => ({
        slug: civilization.slug,
        title: civilization.translations[0]?.title ?? civilization.slug,
        relation,
      })),
      periods: event.periods.map(({ period }) => ({
        slug: period.slug,
        title: period.translations[0]?.title ?? period.slug,
        dateDisplay: period.dateDisplay,
      })),
    };
  }

  private pageResult<T extends { id: string }, U extends object>(
    rows: T[],
    limit: number,
    locale: string,
    translation: (row: T) => U | null | undefined,
  ) {
    const hasMore = rows.length > limit;
    const data = rows.slice(0, limit).flatMap((row) => {
      const localized = translation(row);
      return localized ? [{ ...row, ...localized, id: row.id }] : [];
    });
    return {
      data,
      nextCursor: hasMore ? (rows[limit - 1]?.id ?? null) : null,
      locale,
    };
  }

  private parseYear(
    value: string | undefined,
    name: string,
  ): number | undefined {
    if (value === undefined) return undefined;
    if (!/^-?\d{1,6}$/.test(value))
      throw new BadRequestException(`${name} must be an integer year.`);
    return Number(value);
  }

  private isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }
}
