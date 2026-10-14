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

@Controller('people')
export class PeopleController {
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
    const rows = await this.prisma.historicalPerson.findMany({
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
      orderBy: { slug: 'asc' },
      take: limit + 1,
      ...(after ? { cursor: { id: after }, skip: 1 } : {}),
      select: {
        id: true,
        slug: true,
        birthDateText: true,
        birthYear: true,
        deathDateText: true,
        deathYear: true,
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
          translations[0] ? [{ ...row, ...translations[0], id: row.id }] : [],
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
    const person = await this.prisma.historicalPerson.findFirst({
      where: {
        slug: idOrSlug,
        state: EditorialState.PUBLISHED,
        sources: { some: {} },
        translations: { some: { locale } },
      },
      select: {
        id: true,
        slug: true,
        birthDateText: true,
        birthYear: true,
        deathDateText: true,
        deathYear: true,
        publishedAt: true,
        translations: {
          where: { locale },
          take: 1,
          select: { locale: true, title: true, summary: true, body: true },
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
        countries: {
          where: {
            country: {
              revisions: {
                some: {
                  state: EditorialState.PUBLISHED,
                  sources: { some: {} },
                  translations: { some: { locale } },
                },
              },
            },
          },
          select: {
            relation: true,
            country: {
              select: {
                slug: true,
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
    if (!person || !person.translations[0]) throw new NotFoundException();
    const { translations, events, countries, civilizations, ...base } = person;
    return {
      ...base,
      ...translations[0],
      id: base.id,
      events: events.map(({ relation, event }) => ({
        ...event,
        title: event.translations[0]?.title ?? null,
        translations: undefined,
        relation,
      })),
      countries: countries.map(({ relation, country }) => ({
        slug: country.slug,
        title: country.revisions[0]?.translations[0]?.title ?? country.slug,
        relation,
      })),
      civilizations: civilizations.map(({ relation, civilization }) => ({
        slug: civilization.slug,
        title: civilization.translations[0]?.title ?? civilization.slug,
        relation,
      })),
    };
  }
}
