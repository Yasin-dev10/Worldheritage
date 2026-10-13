import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import prismaClientModule from '../generated/prisma/index.js';
import { PrismaService } from './prisma.service.js';

const { EditorialState } = prismaClientModule;

const MAX_PAGE_SIZE = 50;

@Controller('countries')
export class CountriesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('search')
  async search(
    @Query('q') query: string | undefined,
    @Query('locale') locale = 'so',
    @Query('limit') limitValue = '20',
  ) {
    this.validateLocale(locale);
    const term = query?.trim();
    if (!term || term.length < 2 || term.length > 100) {
      throw new BadRequestException(
        'q must contain between 2 and 100 characters.',
      );
    }
    const limit = Number(limitValue);
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
      throw new BadRequestException(
        `limit must be an integer between 1 and ${MAX_PAGE_SIZE}.`,
      );
    }

    const matches = await this.prisma.country.findMany({
      where: {
        revisions: {
          some: {
            state: EditorialState.PUBLISHED,
            translations: {
              some: {
                locale,
                OR: [
                  { title: { contains: term, mode: 'insensitive' } },
                  { summary: { contains: term, mode: 'insensitive' } },
                ],
              },
            },
          },
        },
      },
      orderBy: { slug: 'asc' },
      take: limit,
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
            id: true,
            publishedAt: true,
            translations: {
              where: {
                locale,
                OR: [
                  { title: { contains: term, mode: 'insensitive' } },
                  { summary: { contains: term, mode: 'insensitive' } },
                ],
              },
              take: 1,
              select: { locale: true, title: true, summary: true },
            },
          },
        },
      },
    });

    return {
      data: matches.flatMap((country) => {
        const revision = country.revisions[0];
        const translation = revision?.translations[0];
        if (!revision || !translation) return [];
        return [
          {
            id: country.id,
            slug: country.slug,
            isoAlpha2: country.isoAlpha2,
            revisionId: revision.id,
            publishedAt: revision.publishedAt,
            locale: translation.locale,
            title: translation.title,
            summary: translation.summary,
          },
        ];
      }),
      locale,
    };
  }

  @Get()
  async list(
    @Query('locale') locale = 'so',
    @Query('limit') limitValue = '20',
    @Query('cursor') cursor?: string,
  ) {
    this.validateLocale(locale);
    const limit = Number(limitValue);
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
      throw new BadRequestException(
        `limit must be an integer between 1 and ${MAX_PAGE_SIZE}.`,
      );
    }
    if (
      cursor &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        cursor,
      )
    ) {
      throw new BadRequestException('cursor must be a country UUID.');
    }

    const countries = await this.prisma.country.findMany({
      where: {
        revisions: {
          some: {
            state: EditorialState.PUBLISHED,
            translations: { some: { locale } },
          },
        },
      },
      orderBy: { slug: 'asc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
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
            id: true,
            publishedAt: true,
            translations: {
              where: { locale },
              take: 1,
              select: { locale: true, title: true, summary: true, body: true },
            },
          },
        },
      },
    });

    const hasMore = countries.length > limit;
    const page = countries.slice(0, limit).flatMap((country) => {
      const revision = country.revisions[0];
      const translation = revision?.translations[0];
      // Do not reveal published records without an approved translation in the requested locale.
      if (!revision || !translation) return [];
      return [
        {
          id: country.id,
          slug: country.slug,
          isoAlpha2: country.isoAlpha2,
          revisionId: revision.id,
          publishedAt: revision.publishedAt,
          locale: translation.locale,
          title: translation.title,
          summary: translation.summary,
        },
      ];
    });

    return {
      data: page,
      nextCursor: hasMore ? (countries[limit - 1]?.id ?? null) : null,
    };
  }

  @Get(':idOrSlug')
  async detail(
    @Param('idOrSlug') idOrSlug: string,
    @Query('locale') locale = 'so',
  ) {
    this.validateLocale(locale);
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        idOrSlug,
      );
    const country = await this.prisma.country.findFirst({
      where: {
        OR: [...(isUuid ? [{ id: idOrSlug }] : []), { slug: idOrSlug }],
        revisions: {
          some: {
            state: EditorialState.PUBLISHED,
            translations: { some: { locale } },
          },
        },
      },
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
            id: true,
            publishedAt: true,
            translations: {
              where: { locale },
              take: 1,
              select: { locale: true, title: true, summary: true, body: true },
            },
            sources: {
              select: {
                locale: true,
                locator: true,
                claimNote: true,
                claimStanding: true,
                source: {
                  select: {
                    sourceKind: true,
                    creator: true,
                    title: true,
                    publisherOrCollection: true,
                    publicationDateText: true,
                    stableIdentifier: true,
                    url: true,
                    rightsStatus: true,
                    rightsNotes: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const revision = country?.revisions[0];
    const translation = revision?.translations[0];
    if (!country || !revision || !translation) throw new NotFoundException();

    return {
      id: country.id,
      slug: country.slug,
      isoAlpha2: country.isoAlpha2,
      revisionId: revision.id,
      publishedAt: revision.publishedAt,
      locale: translation.locale,
      title: translation.title,
      summary: translation.summary,
      body: translation.body,
      sources: revision.sources,
    };
  }

  private validateLocale(locale: string): void {
    if (locale !== 'so' && locale !== 'en') {
      throw new BadRequestException('locale must be so or en.');
    }
  }
}
