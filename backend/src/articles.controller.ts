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

@Controller('articles')
export class ArticlesController {
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
    const rows = await this.prisma.historyArticle.findMany({
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
                    { summary: { contains: query, mode: 'insensitive' } },
                  ],
                }
              : {}),
          },
        },
      },
      orderBy: [{ publishedAt: 'desc' }, { slug: 'asc' }],
      take: limit + 1,
      ...(after ? { cursor: { id: after }, skip: 1 } : {}),
      select: {
        id: true,
        slug: true,
        authorName: true,
        editorName: true,
        publishedAt: true,
        updatedAt: true,
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
    const article = await this.prisma.historyArticle.findFirst({
      where: {
        slug: idOrSlug,
        state: EditorialState.PUBLISHED,
        sources: { some: {} },
        publishedAt: { not: null },
        translations: { some: { locale } },
      },
      select: {
        id: true,
        slug: true,
        authorName: true,
        editorName: true,
        publishedAt: true,
        updatedAt: true,
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
      },
    });
    if (!article || !article.translations[0]) throw new NotFoundException();
    const { translations, ...base } = article;
    return { ...base, ...translations[0] };
  }
}
