import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import prismaClientModule from '@prisma/client';
import { PrismaService } from './prisma.service.js';
import { parsePublicQuery } from './public-read.utils.js';

const { EditorialState } = prismaClientModule;
const searchTypes = [
  'countries',
  'events',
  'figures',
  'civilizations',
  'history',
  'timelines',
] as const;
type SearchType = (typeof searchTypes)[number];
type Boundary = { type: SearchType; slug: string };

@Controller('search')
export class SearchController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async search(
    @Query('q') q?: string,
    @Query('locale') localeInput?: string,
    @Query('limit') limitInput?: string,
    @Query('cursor') cursorInput?: string,
    @Query('type') typeInput?: string,
    @Query('fromYear') fromYearInput?: string,
    @Query('toYear') toYearInput?: string,
  ) {
    const { locale, limit, query } = parsePublicQuery({
      locale: localeInput,
      limit: limitInput,
      q,
    });
    if (!query) {
      throw new BadRequestException(
        'q must contain between 2 and 100 characters.',
      );
    }
    const types = typeInput
      ? typeInput.split(',')
      : fromYearInput || toYearInput
        ? ['events']
        : [...searchTypes];
    if (
      !types.length ||
      types.some((type) => !searchTypes.includes(type as SearchType))
    ) {
      throw new BadRequestException(
        `type must be one or more of: ${searchTypes.join(', ')}.`,
      );
    }
    const fromYear = this.year(fromYearInput, 'fromYear');
    const toYear = this.year(toYearInput, 'toYear');
    if (
      (fromYear !== undefined || toYear !== undefined) &&
      types.some((type) => type !== 'events')
    ) {
      throw new BadRequestException(
        'Date filters are supported for events only.',
      );
    }
    if (fromYear !== undefined && toYear !== undefined && fromYear > toYear) {
      throw new BadRequestException(
        'fromYear must be less than or equal to toYear.',
      );
    }
    const boundary = this.decodeCursor(cursorInput);
    const requested = new Set(types as SearchType[]);
    const rank = (type: SearchType) => searchTypes.indexOf(type);
    const terms = {
      country: { title: { contains: query!, mode: 'insensitive' as const } },
      summary: { summary: { contains: query!, mode: 'insensitive' as const } },
    };
    const includeAfter = (type: SearchType) =>
      !boundary || rank(type) >= rank(boundary.type);
    const slugAfter = (type: SearchType) =>
      boundary?.type === type ? { gt: boundary.slug } : undefined;
    const results: Array<{
      id: string;
      slug: string;
      type: SearchType;
      title: string;
      summary: string;
    }> = [];

    const [countries, events, people, civilizations, articles, timelines] =
      await Promise.all([
        requested.has('countries') && includeAfter('countries')
          ? this.prisma.country.findMany({
              where: {
                slug: slugAfter('countries'),
                revisions: {
                  some: {
                    state: EditorialState.PUBLISHED,
                    sources: { some: {} },
                    translations: {
                      some: { locale, OR: [terms.country, terms.summary] },
                    },
                  },
                },
              },
              orderBy: { slug: 'asc' },
              take: limit + 1,
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
                      where: { locale, OR: [terms.country, terms.summary] },
                      take: 1,
                      select: { title: true, summary: true },
                    },
                  },
                },
              },
            })
          : [],
        requested.has('events') && includeAfter('events')
          ? this.prisma.historicalEvent.findMany({
              where: {
                slug: slugAfter('events'),
                state: EditorialState.PUBLISHED,
                sources: { some: {} },
                ...(fromYear !== undefined
                  ? { endYear: { gte: fromYear } }
                  : {}),
                ...(toYear !== undefined ? { startYear: { lte: toYear } } : {}),
                translations: {
                  some: { locale, OR: [terms.country, terms.summary] },
                },
              },
              orderBy: { slug: 'asc' },
              take: limit + 1,
              select: {
                id: true,
                slug: true,
                translations: {
                  where: { locale },
                  take: 1,
                  select: { title: true, summary: true },
                },
              },
            })
          : [],
        requested.has('figures') && includeAfter('figures')
          ? this.prisma.historicalPerson.findMany({
              where: {
                slug: slugAfter('figures'),
                state: EditorialState.PUBLISHED,
                sources: { some: {} },
                translations: {
                  some: { locale, OR: [terms.country, terms.summary] },
                },
              },
              orderBy: { slug: 'asc' },
              take: limit + 1,
              select: {
                id: true,
                slug: true,
                translations: {
                  where: { locale },
                  take: 1,
                  select: { title: true, summary: true },
                },
              },
            })
          : [],
        requested.has('civilizations') && includeAfter('civilizations')
          ? this.prisma.civilization.findMany({
              where: {
                slug: slugAfter('civilizations'),
                state: EditorialState.PUBLISHED,
                sources: { some: {} },
                translations: {
                  some: { locale, OR: [terms.country, terms.summary] },
                },
              },
              orderBy: { slug: 'asc' },
              take: limit + 1,
              select: {
                id: true,
                slug: true,
                translations: {
                  where: { locale },
                  take: 1,
                  select: { title: true, summary: true },
                },
              },
            })
          : [],
        requested.has('history') && includeAfter('history')
          ? this.prisma.historyArticle.findMany({
              where: {
                slug: slugAfter('history'),
                state: EditorialState.PUBLISHED,
                sources: { some: {} },
                publishedAt: { not: null },
                translations: {
                  some: { locale, OR: [terms.country, terms.summary] },
                },
              },
              orderBy: { slug: 'asc' },
              take: limit + 1,
              select: {
                id: true,
                slug: true,
                translations: {
                  where: { locale },
                  take: 1,
                  select: { title: true, summary: true },
                },
              },
            })
          : [],
        requested.has('timelines') && includeAfter('timelines')
          ? this.prisma.historicalTimeline.findMany({
              where: {
                slug: slugAfter('timelines'),
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
                  some: { locale, OR: [terms.country, terms.summary] },
                },
              },
              orderBy: { slug: 'asc' },
              take: limit + 1,
              select: {
                id: true,
                slug: true,
                translations: {
                  where: { locale },
                  take: 1,
                  select: { title: true, summary: true },
                },
              },
            })
          : [],
      ]);

    const add = <
      T extends {
        id: string;
        slug: string;
        translations: Array<{ title: string; summary: string }>;
      },
    >(
      type: SearchType,
      rows: T[],
    ) => {
      for (const row of rows) {
        const translation = row.translations[0];
        if (translation)
          results.push({ slug: row.slug, type, ...translation, id: row.id });
      }
    };
    add(
      'countries',
      countries.flatMap((row) =>
        row.revisions[0]?.translations[0]
          ? [
              {
                id: row.id,
                slug: row.slug,
                translations: [row.revisions[0].translations[0]],
              },
            ]
          : [],
      ),
    );
    add('events', events);
    add('figures', people);
    add('civilizations', civilizations);
    add('history', articles);
    add('timelines', timelines);
    results.sort(
      (a, b) => rank(a.type) - rank(b.type) || a.slug.localeCompare(b.slug),
    );
    const page = results.slice(0, limit);
    const hasMore =
      results.length > limit ||
      [countries, events, people, civilizations, articles, timelines].some(
        (rows) => rows.length > limit,
      );
    const last = page.at(-1);
    return {
      data: page,
      nextCursor:
        hasMore && last
          ? Buffer.from(
              JSON.stringify({
                type: last.type,
                slug: last.slug,
              } satisfies Boundary),
            ).toString('base64url')
          : null,
      locale,
    };
  }

  private decodeCursor(value?: string): Boundary | undefined {
    if (!value) return undefined;
    try {
      const decoded: unknown = JSON.parse(
        Buffer.from(value, 'base64url').toString('utf8'),
      );
      if (
        typeof decoded === 'object' &&
        decoded !== null &&
        'type' in decoded &&
        'slug' in decoded &&
        typeof decoded.type === 'string' &&
        searchTypes.includes(decoded.type as SearchType) &&
        typeof decoded.slug === 'string'
      ) {
        return decoded as Boundary;
      }
    } catch {
      // Fall through to the stable validation response below.
    }
    throw new BadRequestException('cursor is invalid.');
  }

  private year(value: string | undefined, name: string) {
    if (value === undefined) return undefined;
    if (!/^-?\d{1,6}$/.test(value))
      throw new BadRequestException(`${name} must be an integer year.`);
    return Number(value);
  }
}
