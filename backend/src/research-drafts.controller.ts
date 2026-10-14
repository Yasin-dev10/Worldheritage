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
import { publicSourceRecordSelection } from './public-read.utils.js';

const { EditorialState } = prismaClientModule;
const IMPORT_ACTION = 'SOMALI_HISTORY_BATCH_IMPORTED';
const CONTENT_TYPES = [
  'historical_topic',
  'historical_event',
  'historical_figure',
] as const;
type ImportedType = (typeof CONTENT_TYPES)[number];

@Controller('research-drafts')
export class ResearchDraftsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(
    @Query('q') queryInput?: string,
    @Query('limit') limitInput?: string,
    @Query('offset') offsetInput?: string,
  ) {
    const query = queryInput?.trim().toLocaleLowerCase() ?? '';
    if (query.length > 100) {
      throw new BadRequestException('q cannot exceed 100 characters.');
    }
    const limit = this.integer(limitInput, 100, 1, 100);
    const offset = this.integer(offsetInput, 0, 0, 100_000);
    const imported = await this.importedIds();
    const [articles, events, people] = await Promise.all([
      imported.historical_topic.length
        ? this.prisma.historyArticle.findMany({
            where: {
              id: { in: imported.historical_topic },
              state: EditorialState.DRAFT,
            },
            select: {
              id: true,
              slug: true,
              updatedAt: true,
              translations: {
                where: { locale: 'so' },
                take: 1,
                select: { title: true, summary: true, body: true },
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
          })
        : [],
      imported.historical_event.length
        ? this.prisma.historicalEvent.findMany({
            where: {
              id: { in: imported.historical_event },
              state: EditorialState.DRAFT,
            },
            select: {
              id: true,
              slug: true,
              dateDisplay: true,
              startYear: true,
              endYear: true,
              updatedAt: true,
              translations: {
                where: { locale: 'so' },
                take: 1,
                select: { title: true, summary: true, body: true },
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
          })
        : [],
      imported.historical_figure.length
        ? this.prisma.historicalPerson.findMany({
            where: {
              id: { in: imported.historical_figure },
              state: EditorialState.DRAFT,
            },
            select: {
              id: true,
              slug: true,
              birthDateText: true,
              birthYear: true,
              deathDateText: true,
              deathYear: true,
              updatedAt: true,
              translations: {
                where: { locale: 'so' },
                take: 1,
                select: { title: true, summary: true, body: true },
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
          })
        : [],
    ]);

    const data = [
      ...articles.map((row) => ({ ...row, type: 'historical_topic' as const })),
      ...events.map((row) => ({ ...row, type: 'historical_event' as const })),
      ...people.map((row) => ({ ...row, type: 'historical_figure' as const })),
    ]
      .flatMap(({ translations, ...row }) =>
        translations[0]
          ? [{ ...row, ...translations[0], locale: 'so' as const, editorialStatus: 'RESEARCH_DRAFT' as const }]
          : [],
      )
      .filter(
        (row) =>
          !query ||
          row.title.toLocaleLowerCase().includes(query) ||
          row.summary.toLocaleLowerCase().includes(query),
      )
      .sort((a, b) => a.title.localeCompare(b.title, 'so'));

    return {
      data: data.slice(offset, offset + limit),
      total: data.length,
      limit,
      offset,
      historicalVerification: 'Not completed; each claim requires source review.',
    };
  }

  @Get(':slug')
  async detail(@Param('slug') slug: string) {
    const imported = await this.importedIds();
    const shared = {
      where: { slug, state: EditorialState.DRAFT },
      include: {
        translations: { where: { locale: 'so' }, take: 1 },
        sources: {
          select: {
            locator: true,
            claimNote: true,
            claimStanding: true,
            ...publicSourceRecordSelection(),
          },
        },
      },
    };
    const [article, event, person] = await Promise.all([
      imported.historical_topic.length
        ? this.prisma.historyArticle.findFirst({
            ...shared,
            where: {
              ...shared.where,
              id: { in: imported.historical_topic },
            },
          })
        : null,
      imported.historical_event.length
        ? this.prisma.historicalEvent.findFirst({
            ...shared,
            where: { ...shared.where, id: { in: imported.historical_event } },
          })
        : null,
      imported.historical_figure.length
        ? this.prisma.historicalPerson.findFirst({
            ...shared,
            where: { ...shared.where, id: { in: imported.historical_figure } },
          })
        : null,
    ]);
    const record = article
      ? { ...article, type: 'historical_topic' }
      : event
        ? { ...event, type: 'historical_event' }
        : person
          ? { ...person, type: 'historical_figure' }
          : null;
    if (!record || !record.translations[0]) throw new NotFoundException();
    const { translations, ...base } = record;
    return {
      ...base,
      ...translations[0],
      locale: 'so',
      editorialStatus: 'RESEARCH_DRAFT',
      historicalVerification: 'Not completed; each claim requires source review.',
    };
  }

  private async importedIds(): Promise<Record<ImportedType, string[]>> {
    const rows = await this.prisma.auditEvent.findMany({
      where: {
        action: IMPORT_ACTION,
        targetType: { in: [...CONTENT_TYPES] },
        targetId: { not: null },
      },
      select: { targetType: true, targetId: true },
    });
    const ids: Record<ImportedType, string[]> = {
      historical_topic: [],
      historical_event: [],
      historical_figure: [],
    };
    for (const row of rows) {
      if (
        row.targetId &&
        CONTENT_TYPES.includes(row.targetType as ImportedType)
      ) {
        ids[row.targetType as ImportedType].push(row.targetId);
      }
    }
    return ids;
  }

  private integer(
    input: string | undefined,
    fallback: number,
    min: number,
    max: number,
  ) {
    if (input === undefined) return fallback;
    const value = Number(input);
    return Number.isInteger(value) && value >= min && value <= max
      ? value
      : fallback;
  }
}
