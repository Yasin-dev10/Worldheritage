import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from './prisma.service.js';
import { OidcAuthGuard } from './oidc-auth.guard.js';
import { RequireRoles } from './roles.decorator.js';
import { RolesGuard } from './roles.guard.js';
import prismaClientModule from '@prisma/client';
import type { AuthenticatedRequest } from './oidc-auth.guard.js';

const { EditorialState } = prismaClientModule;
const sourceKinds = [
  'PRIMARY',
  'SCHOLARLY_SECONDARY',
  'REFERENCE',
  'ORAL_HISTORY',
  'ARCHIVAL_RECORD',
  'OTHER',
];

@Controller('admin')
@UseGuards(OidcAuthGuard, RolesGuard)
@RequireRoles('Admin', 'Editor', 'Reviewer')
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('dashboard')
  async dashboard() {
    const results = await Promise.all([
      this.prisma.country.count(),
      this.prisma.historyArticle.count(),
      this.prisma.historicalEvent.count(),
      this.prisma.historicalPerson.count(),
      this.prisma.historicalTimeline.count(),
      this.prisma.civilization.count(),
      this.prisma.historyArticle.count({
        where: { state: EditorialState.PUBLISHED },
      }),
      Promise.all([
        this.prisma.historyArticle.count({
          where: { state: EditorialState.PUBLISHED },
        }),
        this.prisma.historicalEvent.count({
          where: { state: EditorialState.PUBLISHED },
        }),
        this.prisma.historicalPerson.count({
          where: { state: EditorialState.PUBLISHED },
        }),
        this.prisma.civilization.count({
          where: { state: EditorialState.PUBLISHED },
        }),
        this.prisma.historicalTimeline.count({
          where: { state: EditorialState.PUBLISHED },
        }),
        this.prisma.countryRevision.count({
          where: { state: EditorialState.PUBLISHED },
        }),
      ]).then((values) => values.reduce((sum, count) => sum + count, 0)),
      Promise.all([
        this.prisma.historyArticle.count({
          where: { state: EditorialState.DRAFT },
        }),
        this.prisma.historicalEvent.count({
          where: { state: EditorialState.DRAFT },
        }),
        this.prisma.historicalPerson.count({
          where: { state: EditorialState.DRAFT },
        }),
        this.prisma.civilization.count({
          where: { state: EditorialState.DRAFT },
        }),
        this.prisma.historicalTimeline.count({
          where: { state: EditorialState.DRAFT },
        }),
        this.prisma.countryRevision.count({
          where: { state: EditorialState.DRAFT },
        }),
      ]).then((values) => values.reduce((sum, count) => sum + count, 0)),
      Promise.all([
        this.prisma.historyArticle.count({
          where: {
            state: { in: [EditorialState.SUBMITTED, EditorialState.IN_REVIEW] },
          },
        }),
        this.prisma.historicalEvent.count({
          where: {
            state: { in: [EditorialState.SUBMITTED, EditorialState.IN_REVIEW] },
          },
        }),
        this.prisma.historicalPerson.count({
          where: {
            state: { in: [EditorialState.SUBMITTED, EditorialState.IN_REVIEW] },
          },
        }),
        this.prisma.civilization.count({
          where: {
            state: { in: [EditorialState.SUBMITTED, EditorialState.IN_REVIEW] },
          },
        }),
        this.prisma.historicalTimeline.count({
          where: {
            state: { in: [EditorialState.SUBMITTED, EditorialState.IN_REVIEW] },
          },
        }),
        this.prisma.countryRevision.count({
          where: {
            state: { in: [EditorialState.SUBMITTED, EditorialState.IN_REVIEW] },
          },
        }),
      ]).then((values) => values.reduce((sum, count) => sum + count, 0)),
      this.prisma.auditEvent.findMany({
        orderBy: { createdAt: 'desc' },
        take: 12,
        select: {
          id: true,
          actorSubject: true,
          action: true,
          targetType: true,
          targetId: true,
          createdAt: true,
        },
      }),
    ]);
    const [
      countries,
      articles,
      events,
      figures,
      timelines,
      civilizations,
      publishedArticles,
      publishedContent,
      drafts,
      pendingReviews,
      recentActivity,
    ] = results;

    return {
      counts: {
        countries,
        articles,
        events,
        figures,
        timelines,
        civilizations,
        publishedArticles,
        publishedContent,
        drafts,
        pendingReviews,
      },
      recentActivity,
    };
  }

  @Get('sources')
  async listSources(
    @Query('q') query?: string,
    @Query('limit') limitInput = '30',
    @Query('offset') offsetInput = '0',
  ) {
    const limit = this.pageNumber(limitInput, 'limit', 1, 100);
    const offset = this.pageNumber(offsetInput, 'offset', 0, 100_000);
    const term = query?.trim();
    if (term && term.length > 100)
      throw new BadRequestException('q cannot exceed 100 characters.');
    const where = term
      ? {
          OR: [
            { title: { contains: term, mode: 'insensitive' as const } },
            { creator: { contains: term, mode: 'insensitive' as const } },
          ],
        }
      : {};
    const [data, total] = await this.prisma.$transaction([
      this.prisma.source.findMany({
        where,
        orderBy: { title: 'asc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.source.count({ where }),
    ]);
    return { data, total, limit, offset };
  }

  @Post('sources')
  @RequireRoles('Admin', 'Editor')
  async createSource(
    @Body() body: Record<string, unknown>,
    @Req() request: AuthenticatedRequest,
  ) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException('Request body must be a JSON object.');
    }
    const sourceKind = this.requiredText(body.sourceKind, 'sourceKind', 60);
    if (!sourceKinds.includes(sourceKind)) {
      throw new BadRequestException(
        `sourceKind must be one of: ${sourceKinds.join(', ')}.`,
      );
    }
    const title = this.requiredText(body.title, 'title', 500);
    const url = this.optionalText(body.url, 'url', 2048);
    if (url) {
      try {
        const parsed = new URL(url);
        if (!['https:', 'http:'].includes(parsed.protocol))
          throw new Error('Unsupported URL protocol.');
      } catch {
        throw new BadRequestException('url must be a valid HTTP or HTTPS URL.');
      }
    }
    const created = await this.prisma.$transaction(async (tx) => {
      const source = await tx.source.create({
        data: {
          sourceKind: sourceKind as
            | 'PRIMARY'
            | 'SCHOLARLY_SECONDARY'
            | 'REFERENCE'
            | 'ORAL_HISTORY'
            | 'ARCHIVAL_RECORD'
            | 'OTHER',
          title,
          creator: this.optionalText(body.creator, 'creator', 500),
          publisherOrCollection: this.optionalText(
            body.publisherOrCollection,
            'publisherOrCollection',
            500,
          ),
          publicationDateText: this.optionalText(
            body.publicationDateText,
            'publicationDateText',
            100,
          ),
          stableIdentifier: this.optionalText(
            body.stableIdentifier,
            'stableIdentifier',
            500,
          ),
          url,
          rightsStatus:
            this.optionalText(body.rightsStatus, 'rightsStatus', 100) ??
            'UNKNOWN',
          rightsNotes: this.optionalText(body.rightsNotes, 'rightsNotes', 4000),
        },
      });
      await tx.auditEvent.create({
        data: {
          actorSubject: request.user.sub,
          action: 'SOURCE_CREATED',
          targetType: 'Source',
          targetId: source.id,
        },
      });
      return source;
    });
    return created;
  }

  @Get('media')
  async listMedia(
    @Query('limit') limitInput = '30',
    @Query('offset') offsetInput = '0',
  ) {
    const limit = this.pageNumber(limitInput, 'limit', 1, 100);
    const offset = this.pageNumber(offsetInput, 'offset', 0, 100_000);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.mediaAsset.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.mediaAsset.count(),
    ]);
    return { data, total, limit, offset };
  }

  @Post('media')
  @RequireRoles('Admin', 'Editor')
  async createMedia(
    @Body() body: Record<string, unknown>,
    @Req() request: AuthenticatedRequest,
  ) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException('Request body must be a JSON object.');
    }
    const storageLocation = this.requiredText(
      body.storageLocation,
      'storageLocation',
      2048,
    );
    const mediaType = this.requiredText(body.mediaType, 'mediaType', 100);
    if (
      !/^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/i.test(
        mediaType,
      )
    ) {
      throw new BadRequestException('mediaType must be a valid MIME type.');
    }
    const created = await this.prisma.$transaction(async (tx) => {
      const media = await tx.mediaAsset.create({
        data: {
          storageLocation,
          mediaType,
          altText: this.optionalText(body.altText, 'altText', 1000),
          attribution: this.optionalText(body.attribution, 'attribution', 1000),
          provenance: this.optionalText(body.provenance, 'provenance', 2000),
          license: this.optionalText(body.license, 'license', 200),
          rightsNotes: this.optionalText(body.rightsNotes, 'rightsNotes', 4000),
          createdBy: request.user.sub,
        },
      });
      await tx.auditEvent.create({
        data: {
          actorSubject: request.user.sub,
          action: 'MEDIA_METADATA_CREATED',
          targetType: 'MediaAsset',
          targetId: media.id,
        },
      });
      return media;
    });
    return created;
  }

  private requiredText(
    value: unknown,
    field: string,
    maxLength: number,
  ): string {
    if (
      typeof value !== 'string' ||
      !value.trim() ||
      value.length > maxLength
    ) {
      throw new BadRequestException(
        `${field} is required and must not exceed ${maxLength} characters.`,
      );
    }
    return value.trim();
  }

  private optionalText(
    value: unknown,
    field: string,
    maxLength: number,
  ): string | null {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value !== 'string' || value.length > maxLength) {
      throw new BadRequestException(
        `${field} must be text no longer than ${maxLength} characters.`,
      );
    }
    return value.trim();
  }

  private pageNumber(
    value: string,
    name: string,
    minimum: number,
    maximum: number,
  ): number {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
      throw new BadRequestException(
        `${name} must be an integer between ${minimum} and ${maximum}.`,
      );
    }
    return parsed;
  }
}
