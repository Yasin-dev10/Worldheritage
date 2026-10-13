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

@Controller('civilizations')
export class CivilizationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(
    @Query('locale') localeInput?: string,
    @Query('limit') limitInput?: string,
    @Query('cursor') cursor?: string,
    @Query('q') queryInput?: string,
    @Query('region') region?: string,
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
    const rows = await this.prisma.civilization.findMany({
      where: {
        state: EditorialState.PUBLISHED,
        sources: { some: {} },
        ...(region ? { region: { equals: region, mode: 'insensitive' } } : {}),
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
        region: true,
        calendar: true,
        dateDisplay: true,
        startYear: true,
        endYear: true,
        datePrecision: true,
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
    const item = await this.prisma.civilization.findFirst({
      where: {
        slug: idOrSlug,
        state: EditorialState.PUBLISHED,
        sources: { some: {} },
        translations: { some: { locale } },
      },
      select: {
        id: true,
        slug: true,
        region: true,
        calendar: true,
        dateDisplay: true,
        startYear: true,
        endYear: true,
        datePrecision: true,
        publishedAt: true,
        translations: {
          where: { locale },
          take: 1,
          select: { locale: true, title: true, summary: true, body: true },
        },
        countries: {
          select: {
            country: {
              select: {
                id: true,
                slug: true,
                isoAlpha2: true,
                revisions: {
                  where: {
                    state: EditorialState.PUBLISHED,
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
              translations: { some: { locale } },
            },
          },
          select: {
            relation: true,
            person: {
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
        events: {
          where: {
            event: {
              state: EditorialState.PUBLISHED,
              translations: { some: { locale } },
            },
          },
          select: {
            relation: true,
            event: {
              select: {
                slug: true,
                startYear: true,
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
    const { translations, countries, people, events, ...base } = item;
    return {
      ...base,
      ...translations[0],
      countries: countries.map(({ country }) => ({
        id: country.id,
        slug: country.slug,
        isoAlpha2: country.isoAlpha2,
        title: country.revisions[0]?.translations[0]?.title ?? null,
      })),
      people: people.map(({ relation, person }) => ({
        slug: person.slug,
        title: person.translations[0]?.title ?? null,
        relation,
      })),
      events: events.map(({ relation, event }) => ({
        slug: event.slug,
        startYear: event.startYear,
        dateDisplay: event.dateDisplay,
        title: event.translations[0]?.title ?? null,
        relation,
      })),
    };
  }
}
