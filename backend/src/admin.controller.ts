import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
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
import type { Prisma } from '@prisma/client';
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

const SLUG_RE = /^[a-z0-9-]+$/;

@Controller('admin')
@UseGuards(OidcAuthGuard, RolesGuard)
@RequireRoles('Admin', 'Editor', 'Reviewer')
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Dashboard ────────────────────────────────────────────────────────────

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
      this.prisma.auditEvent.count({
        where: {
          action: 'SOMALI_HISTORY_BATCH_IMPORTED',
          targetType: {
            in: ['historical_topic', 'historical_event', 'historical_figure'],
          },
          targetId: { not: null },
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
      somaliResearchDrafts,
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
        somaliResearchDrafts,
      },
      recentActivity,
    };
  }

  // ─── Sources ──────────────────────────────────────────────────────────────

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

  // ─── Media ────────────────────────────────────────────────────────────────

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

  // ─── Countries ────────────────────────────────────────────────────────────

  @Get('countries')
  async listCountries(
    @Query('limit') limitInput = '30',
    @Query('offset') offsetInput = '0',
    @Query('q') query?: string,
  ) {
    const limit = this.pageNumber(limitInput, 'limit', 1, 100);
    const offset = this.pageNumber(offsetInput, 'offset', 0, 100_000);
    const term = query?.trim();
    if (term && term.length > 100)
      throw new BadRequestException('q cannot exceed 100 characters.');

    const where = term
      ? { slug: { contains: term, mode: 'insensitive' as const } }
      : {};

    const [data, total] = await this.prisma.$transaction([
      this.prisma.country.findMany({
        where,
        orderBy: { slug: 'asc' },
        take: limit,
        skip: offset,
        include: {
          revisions: {
            orderBy: { revisionNumber: 'desc' },
            take: 1,
            include: {
              translations: { where: { locale: 'so' } },
            },
          },
        },
      }),
      this.prisma.country.count({ where }),
    ]);
    return { data, total, limit, offset };
  }

  @Get('countries/:id')
  async getCountry(@Param('id') id: string) {
    const country = await this.prisma.country.findUnique({
      where: { id },
      include: {
        revisions: {
          orderBy: { revisionNumber: 'desc' },
          include: { translations: true },
        },
      },
    });
    if (!country) throw new NotFoundException('Country not found.');
    return country;
  }

  @Post('countries/:id/workflow')
  @HttpCode(HttpStatus.OK)
  async transitionCountry(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @Req() request: AuthenticatedRequest,
  ) {
    this.assertBody(body);
    const action = this.requiredText(body.action, 'action', 40);
    const reviewerAction = ['review', 'approve', 'return', 'reject'].includes(
      action,
    );
    const allowedRoles = reviewerAction
      ? ['Admin', 'Reviewer']
      : ['Admin', 'Editor'];
    if (!allowedRoles.some((role) => request.user.roles?.includes(role))) {
      throw new ForbiddenException(
        'Your account cannot perform this workflow action.',
      );
    }
    const rationale =
      action === 'return' || action === 'reject'
        ? this.requiredText(body.rationale, 'rationale', 4000)
        : '';
    const result = await this.prisma.$transaction(async (tx) => {
      const country = await tx.country.findUnique({ where: { id } });
      if (!country) throw new NotFoundException('Country not found.');
      const revision = await tx.countryRevision.findFirst({
        where: { countryId: id },
        orderBy: { revisionNumber: 'desc' },
      });
      if (!revision) throw new NotFoundException('Country revision not found.');
      const transitions: Record<string, { from: string[]; to: string }> = {
        submit: { from: ['DRAFT', 'CHANGES_REQUESTED'], to: 'SUBMITTED' },
        review: { from: ['SUBMITTED'], to: 'IN_REVIEW' },
        approve: { from: ['IN_REVIEW'], to: 'APPROVED' },
        return: { from: ['IN_REVIEW'], to: 'CHANGES_REQUESTED' },
        reject: { from: ['IN_REVIEW'], to: 'REJECTED' },
        publish: { from: ['APPROVED'], to: 'PUBLISHED' },
      };
      const transition = transitions[action];
      if (!transition)
        throw new BadRequestException('Unsupported workflow action.');
      if (!transition.from.includes(revision.state)) {
        throw new BadRequestException(
          `Cannot ${action} country revision in ${revision.state} state.`,
        );
      }
      const updated = await tx.countryRevision.update({
        where: { id: revision.id },
        data: {
          state:
            transition.to as (typeof EditorialState)[keyof typeof EditorialState],
          ...(action === 'submit' ? { submittedAt: new Date() } : {}),
          ...(action === 'publish' ? { publishedAt: new Date() } : {}),
        },
      });
      if (reviewerAction && action !== 'review') {
        await tx.editorialReview.create({
          data: {
            revisionId: revision.id,
            reviewerSubject: request.user.sub,
            outcome: transition.to,
            rationale,
          },
        });
      }
      await tx.auditEvent.create({
        data: {
          actorSubject: request.user.sub,
          action: `COUNTRY_REVISION_${action.toUpperCase()}`,
          targetType: 'CountryRevision',
          targetId: revision.id,
          metadata: {
            countryId: id,
            from: revision.state,
            to: transition.to,
            ...(rationale ? { rationale } : {}),
          },
        },
      });
      return updated;
    });
    return result;
  }

  @Post('countries')
  @RequireRoles('Admin', 'Editor')
  async createCountry(
    @Body() body: Record<string, unknown>,
    @Req() request: AuthenticatedRequest,
  ) {
    this.assertBody(body);
    const slug = this.requiredText(body.slug, 'slug', 120);
    this.assertSlug(slug, 'slug', 120);
    const isoAlpha2 = this.optionalText(body.isoAlpha2, 'isoAlpha2', 2);
    const region = this.optionalText(body.region, 'region', 200);
    const title_so = this.requiredText(body.title_so, 'title_so', 500);
    const summary_so = this.requiredText(body.summary_so, 'summary_so', 2000);
    const body_so = this.requiredText(body.body_so, 'body_so', 100_000);

    const result = await this.prisma.$transaction(async (tx) => {
      const country = await tx.country.create({
        data: { slug, isoAlpha2, region },
      });
      const revision = await tx.countryRevision.create({
        data: {
          countryId: country.id,
          revisionNumber: 1,
          state: EditorialState.DRAFT,
          authorSubject: request.user.sub,
          translations: {
            create: {
              locale: 'so',
              title: title_so,
              summary: summary_so,
              body: body_so,
            },
          },
        },
        include: { translations: true },
      });
      await tx.auditEvent.create({
        data: {
          actorSubject: request.user.sub,
          action: 'COUNTRY_CREATED',
          targetType: 'Country',
          targetId: country.id,
        },
      });
      return { country, revision };
    });
    return result;
  }

  @Patch('countries/:id')
  @RequireRoles('Admin', 'Editor')
  async updateCountry(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @Req() request: AuthenticatedRequest,
  ) {
    this.assertBody(body);
    const region = this.optionalText(body.region, 'region', 200);
    const isoAlpha2 = this.optionalText(body.isoAlpha2, 'isoAlpha2', 2);
    const title = this.optionalText(body.title_so, 'title_so', 500);
    const summary = this.optionalText(body.summary_so, 'summary_so', 2000);
    const text = this.optionalText(body.body_so, 'body_so', 100_000);

    const result = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.country.findUnique({
        where: { id },
        include: {
          revisions: {
            orderBy: { revisionNumber: 'desc' },
            take: 1,
            include: { translations: true, sources: true },
          },
        },
      });
      if (!existing) throw new NotFoundException('Country not found.');
      const updated = await tx.country.update({
        where: { id },
        data: {
          ...(region !== undefined ? { region } : {}),
          ...(isoAlpha2 !== undefined ? { isoAlpha2 } : {}),
        },
      });
      const currentRevision = existing.revisions[0];
      if (title || summary || text) {
        if (!currentRevision)
          throw new NotFoundException('Country revision not found.');
        const somali = currentRevision.translations.find(
          (translation) => translation.locale === 'so',
        );
        if (!somali)
          throw new BadRequestException(
            'The current revision has no Somali translation.',
          );
        const maxRevision = await tx.countryRevision.findFirst({
          where: { countryId: id },
          orderBy: { revisionNumber: 'desc' },
          select: { revisionNumber: true },
        });
        await tx.countryRevision.create({
          data: {
            countryId: id,
            revisionNumber: (maxRevision?.revisionNumber ?? 0) + 1,
            state: EditorialState.DRAFT,
            authorSubject: request.user.sub,
            translations: {
              create: existing.revisions[0]!.translations.map(
                (translation) => ({
                  locale: translation.locale,
                  title:
                    translation.locale === 'so'
                      ? (title ?? somali.title)
                      : translation.title,
                  summary:
                    translation.locale === 'so'
                      ? (summary ?? somali.summary)
                      : translation.summary,
                  body:
                    translation.locale === 'so'
                      ? (text ?? somali.body)
                      : translation.body,
                  translationOfLocale: translation.translationOfLocale,
                  translatorSubject: translation.translatorSubject,
                }),
              ),
            },
            sources: {
              create: currentRevision.sources.map((source) => ({
                sourceId: source.sourceId,
                locale: source.locale,
                locator: source.locator,
                claimNote: source.claimNote,
                claimStanding: source.claimStanding,
              })),
            },
          },
        });
      }
      await tx.auditEvent.create({
        data: {
          actorSubject: request.user.sub,
          action:
            title || summary || text
              ? 'COUNTRY_REVISION_CREATED'
              : 'COUNTRY_UPDATED',
          targetType: 'Country',
          targetId: id,
        },
      });
      return updated;
    });
    return result;
  }

  @Delete('countries/:id')
  @RequireRoles('Admin')
  @HttpCode(HttpStatus.OK)
  async deleteCountry(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.country.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Country not found.');
      await tx.countryRevision.updateMany({
        where: { countryId: id },
        data: { state: EditorialState.ARCHIVED },
      });
      await tx.auditEvent.create({
        data: {
          actorSubject: request.user.sub,
          action: 'COUNTRY_ARCHIVED',
          targetType: 'Country',
          targetId: id,
        },
      });
    });
    return { success: true };
  }

  // ─── Articles ─────────────────────────────────────────────────────────────

  @Get('articles')
  async listArticles(
    @Query('limit') limitInput = '30',
    @Query('offset') offsetInput = '0',
    @Query('q') query?: string,
    @Query('state') stateFilter?: string,
  ) {
    const limit = this.pageNumber(limitInput, 'limit', 1, 100);
    const offset = this.pageNumber(offsetInput, 'offset', 0, 100_000);
    const term = query?.trim();
    if (term && term.length > 100)
      throw new BadRequestException('q cannot exceed 100 characters.');

    const stateEnum = this.parseOptionalState(stateFilter);
    const where: Record<string, unknown> = {};
    if (stateEnum) where['state'] = stateEnum;
    if (term) where['slug'] = { contains: term, mode: 'insensitive' };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.historyArticle.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          translations: { where: { locale: 'so' } },
        },
      }),
      this.prisma.historyArticle.count({ where }),
    ]);
    return { data, total, limit, offset };
  }

  @Get('articles/:id')
  async getArticle(@Param('id') id: string) {
    const article = await this.prisma.historyArticle.findUnique({
      where: { id },
      include: {
        translations: true,
        sources: true,
        countries: true,
        events: true,
        people: true,
        civilizations: true,
      },
    });
    if (!article) throw new NotFoundException('Article not found.');
    return article;
  }

  @Post('articles')
  @RequireRoles('Admin', 'Editor')
  async createArticle(
    @Body() body: Record<string, unknown>,
    @Req() request: AuthenticatedRequest,
  ) {
    this.assertBody(body);
    const slug = this.requiredText(body.slug, 'slug', 200);
    this.assertSlug(slug, 'slug', 200);
    const authorName = this.requiredText(body.authorName, 'authorName', 500);
    const editorName = this.optionalText(body.editorName, 'editorName', 500);
    const locale = this.optionalText(body.locale, 'locale', 10) ?? 'so';
    const title = this.requiredText(body.title, 'title', 500);
    const summary = this.requiredText(body.summary, 'summary', 2000);
    const articleBody = this.requiredText(body.body, 'body', 100_000);
    const sources = this.sourceReferences(body.sources ?? []);
    const countryIds = this.uuidArray(body.countryIds, 'countryIds');
    const eventIds = this.uuidArray(body.eventIds, 'eventIds');
    const personIds = this.uuidArray(body.personIds, 'personIds');
    const civilizationIds = this.uuidArray(
      body.civilizationIds,
      'civilizationIds',
    );

    const result = await this.prisma.$transaction(async (tx) => {
      const article = await tx.historyArticle.create({
        data: {
          slug,
          authorName,
          editorName,
          state: EditorialState.DRAFT,
          translations: {
            create: { locale, title, summary, body: articleBody },
          },
          sources: {
            create: sources.map((source) => ({
              ...source,
              claimStanding: source.claimStanding as never,
            })),
          },
          countries: countryIds.length
            ? { create: countryIds.map((countryId) => ({ countryId })) }
            : undefined,
          events: eventIds.length
            ? { create: eventIds.map((eventId) => ({ eventId })) }
            : undefined,
          people: personIds.length
            ? { create: personIds.map((personId) => ({ personId })) }
            : undefined,
          civilizations: civilizationIds.length
            ? {
                create: civilizationIds.map((civilizationId) => ({
                  civilizationId,
                })),
              }
            : undefined,
        },
        include: { translations: true },
      });
      await this.saveContentRevision(
        tx,
        'HistoryArticle',
        article.id,
        article.state,
        request.user.sub,
        article,
      );
      await tx.auditEvent.create({
        data: {
          actorSubject: request.user.sub,
          action: 'ARTICLE_CREATED',
          targetType: 'HistoryArticle',
          targetId: article.id,
        },
      });
      return article;
    });
    return result;
  }

  @Patch('articles/:id')
  @RequireRoles('Admin', 'Editor')
  async updateArticle(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @Req() request: AuthenticatedRequest,
  ) {
    this.assertBody(body);
    const authorName = this.optionalText(body.authorName, 'authorName', 500);
    const editorName = this.optionalText(body.editorName, 'editorName', 500);
    const locale = this.optionalText(body.locale, 'locale', 10) ?? 'so';
    const title = this.optionalText(body.title, 'title', 500);
    const summary = this.optionalText(body.summary, 'summary', 2000);
    const articleBody = this.optionalText(body.body, 'body', 100_000);
    const sources =
      body.sources === undefined
        ? undefined
        : this.sourceReferences(body.sources);
    const countryIds =
      body.countryIds === undefined
        ? undefined
        : this.uuidArray(body.countryIds, 'countryIds');
    const eventIds =
      body.eventIds === undefined
        ? undefined
        : this.uuidArray(body.eventIds, 'eventIds');
    const personIds =
      body.personIds === undefined
        ? undefined
        : this.uuidArray(body.personIds, 'personIds');
    const civilizationIds =
      body.civilizationIds === undefined
        ? undefined
        : this.uuidArray(body.civilizationIds, 'civilizationIds');

    const result = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.historyArticle.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Article not found.');

      await tx.historyArticle.update({
        where: { id },
        data: {
          ...(authorName !== null ? { authorName } : {}),
          ...(editorName !== undefined ? { editorName } : {}),
          ...(existing.state === EditorialState.PUBLISHED
            ? { state: EditorialState.DRAFT, publishedAt: null }
            : {}),
          ...(sources
            ? {
                sources: {
                  deleteMany: {},
                  create: sources.map((source) => ({
                    ...source,
                    claimStanding: source.claimStanding as never,
                  })),
                },
              }
            : {}),
          ...(countryIds
            ? {
                countries: {
                  deleteMany: {},
                  create: countryIds.map((countryId) => ({ countryId })),
                },
              }
            : {}),
          ...(eventIds
            ? {
                events: {
                  deleteMany: {},
                  create: eventIds.map((eventId) => ({ eventId })),
                },
              }
            : {}),
          ...(personIds
            ? {
                people: {
                  deleteMany: {},
                  create: personIds.map((personId) => ({ personId })),
                },
              }
            : {}),
          ...(civilizationIds
            ? {
                civilizations: {
                  deleteMany: {},
                  create: civilizationIds.map((civilizationId) => ({
                    civilizationId,
                  })),
                },
              }
            : {}),
        },
      });

      if (title || summary || articleBody) {
        await tx.articleTranslation.upsert({
          where: { articleId_locale: { articleId: id, locale } },
          update: {
            ...(title !== null ? { title } : {}),
            ...(summary !== null ? { summary } : {}),
            ...(articleBody !== null ? { body: articleBody } : {}),
          },
          create: {
            articleId: id,
            locale,
            title: title ?? '',
            summary: summary ?? '',
            body: articleBody ?? '',
          },
        });
      }
      const updated = await tx.historyArticle.findUnique({
        where: { id },
        include: { translations: true },
      });
      if (updated)
        await this.saveContentRevision(
          tx,
          'HistoryArticle',
          id,
          updated.state,
          request.user.sub,
          updated,
        );

      await tx.auditEvent.create({
        data: {
          actorSubject: request.user.sub,
          action: 'ARTICLE_UPDATED',
          targetType: 'HistoryArticle',
          targetId: id,
        },
      });
      return updated;
    });
    return result;
  }

  @Delete('articles/:id')
  @RequireRoles('Admin')
  @HttpCode(HttpStatus.OK)
  async deleteArticle(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.historyArticle.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Article not found.');
      await tx.historyArticle.update({
        where: { id },
        data: { state: EditorialState.ARCHIVED },
      });
      await tx.auditEvent.create({
        data: {
          actorSubject: request.user.sub,
          action: 'ARTICLE_ARCHIVED',
          targetType: 'HistoryArticle',
          targetId: id,
        },
      });
    });
    return { success: true };
  }

  @Post('articles/:id/submit')
  @HttpCode(HttpStatus.OK)
  async submitArticle(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      const article = await tx.historyArticle.findUnique({ where: { id } });
      if (!article) throw new NotFoundException('Article not found.');
      if (!(await tx.articleSource.count({ where: { articleId: id } }))) {
        throw new BadRequestException(
          'Add at least one source before submitting this article for review.',
        );
      }
      if (
        article.state !== EditorialState.DRAFT &&
        article.state !== EditorialState.CHANGES_REQUESTED
      ) {
        throw new BadRequestException(
          'Article must be in DRAFT or CHANGES_REQUESTED state to submit.',
        );
      }
      const updated = await tx.historyArticle.update({
        where: { id },
        data: { state: EditorialState.SUBMITTED },
        include: { translations: true },
      });
      const lastRevision = await tx.contentRevision.findFirst({
        where: { contentType: 'HistoryArticle', contentId: id },
        orderBy: { revisionNumber: 'desc' },
      });
      const nextRevNum = (lastRevision?.revisionNumber ?? 0) + 1;
      await tx.contentRevision.create({
        data: {
          contentType: 'HistoryArticle',
          contentId: id,
          revisionNumber: nextRevNum,
          state: EditorialState.SUBMITTED,
          editorSubject: request.user.sub,
          snapshot: JSON.parse(
            JSON.stringify(updated),
          ) as Prisma.InputJsonValue,
        },
      });
      await tx.auditEvent.create({
        data: {
          actorSubject: request.user.sub,
          action: 'ARTICLE_SUBMITTED',
          targetType: 'HistoryArticle',
          targetId: id,
        },
      });
      return updated;
    });
    return result;
  }

  @Post('articles/:id/review')
  @RequireRoles('Admin', 'Reviewer')
  @HttpCode(HttpStatus.OK)
  async reviewArticle(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      const article = await tx.historyArticle.findUnique({ where: { id } });
      if (!article) throw new NotFoundException('Article not found.');
      if (article.state !== EditorialState.SUBMITTED) {
        throw new BadRequestException(
          'Article must be SUBMITTED to enter review.',
        );
      }
      const updated = await tx.historyArticle.update({
        where: { id },
        data: { state: EditorialState.IN_REVIEW },
      });
      await tx.auditEvent.create({
        data: {
          actorSubject: request.user.sub,
          action: 'ARTICLE_IN_REVIEW',
          targetType: 'HistoryArticle',
          targetId: id,
        },
      });
      return updated;
    });
    return result;
  }

  @Post('articles/:id/approve')
  @RequireRoles('Admin', 'Reviewer')
  @HttpCode(HttpStatus.OK)
  async approveArticle(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      const article = await tx.historyArticle.findUnique({ where: { id } });
      if (!article) throw new NotFoundException('Article not found.');
      if (article.state !== EditorialState.IN_REVIEW) {
        throw new BadRequestException('Article must be IN_REVIEW to approve.');
      }
      const updated = await tx.historyArticle.update({
        where: { id },
        data: { state: EditorialState.APPROVED },
      });
      const lastRevision = await tx.contentRevision.findFirst({
        where: { contentType: 'HistoryArticle', contentId: id },
        orderBy: { revisionNumber: 'desc' },
      });
      if (lastRevision) {
        await tx.cmsReview.create({
          data: {
            revisionId: lastRevision.id,
            reviewerSubject: request.user.sub,
            outcome: 'APPROVED',
            rationale: '',
          },
        });
      }
      await tx.auditEvent.create({
        data: {
          actorSubject: request.user.sub,
          action: 'ARTICLE_APPROVED',
          targetType: 'HistoryArticle',
          targetId: id,
        },
      });
      return updated;
    });
    return result;
  }

  @Post('articles/:id/reject')
  @RequireRoles('Admin', 'Reviewer')
  @HttpCode(HttpStatus.OK)
  async rejectArticle(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @Req() request: AuthenticatedRequest,
  ) {
    this.assertBody(body);
    const rationale = this.requiredText(body.rationale, 'rationale', 4000);
    const result = await this.prisma.$transaction(async (tx) => {
      const article = await tx.historyArticle.findUnique({ where: { id } });
      if (!article) throw new NotFoundException('Article not found.');
      if (article.state !== EditorialState.IN_REVIEW) {
        throw new BadRequestException('Article must be IN_REVIEW to reject.');
      }
      const updated = await tx.historyArticle.update({
        where: { id },
        data: { state: EditorialState.REJECTED },
      });
      const lastRevision = await tx.contentRevision.findFirst({
        where: { contentType: 'HistoryArticle', contentId: id },
        orderBy: { revisionNumber: 'desc' },
      });
      if (lastRevision) {
        await tx.cmsReview.create({
          data: {
            revisionId: lastRevision.id,
            reviewerSubject: request.user.sub,
            outcome: 'REJECTED',
            rationale,
          },
        });
      }
      await tx.auditEvent.create({
        data: {
          actorSubject: request.user.sub,
          action: 'ARTICLE_REJECTED',
          targetType: 'HistoryArticle',
          targetId: id,
        },
      });
      return updated;
    });
    return result;
  }

  @Post('articles/:id/publish')
  @RequireRoles('Admin', 'Editor')
  @HttpCode(HttpStatus.OK)
  async publishArticle(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      const article = await tx.historyArticle.findUnique({
        where: { id },
        include: { translations: true, sources: true },
      });
      if (!article) throw new NotFoundException('Article not found.');
      if (article.state !== EditorialState.APPROVED) {
        throw new BadRequestException(
          'Article must be in APPROVED state to publish.',
        );
      }
      if (article.sources.length === 0) {
        throw new BadRequestException(
          'Articles require at least one source before publication.',
        );
      }
      const now = new Date();
      const updated = await tx.historyArticle.update({
        where: { id },
        data: { state: EditorialState.PUBLISHED, publishedAt: now },
        include: { translations: true },
      });
      const lastRevision = await tx.contentRevision.findFirst({
        where: { contentType: 'HistoryArticle', contentId: id },
        orderBy: { revisionNumber: 'desc' },
      });
      const nextRevNum = (lastRevision?.revisionNumber ?? 0) + 1;
      await tx.contentRevision.create({
        data: {
          contentType: 'HistoryArticle',
          contentId: id,
          revisionNumber: nextRevNum,
          state: EditorialState.PUBLISHED,
          editorSubject: request.user.sub,
          snapshot: JSON.parse(
            JSON.stringify(updated),
          ) as Prisma.InputJsonValue,
        },
      });
      await tx.auditEvent.create({
        data: {
          actorSubject: request.user.sub,
          action: 'ARTICLE_PUBLISHED',
          targetType: 'HistoryArticle',
          targetId: id,
        },
      });
      return updated;
    });
    return result;
  }

  @Post('articles/:id/return')
  @RequireRoles('Admin', 'Reviewer')
  @HttpCode(HttpStatus.OK)
  async returnArticle(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @Req() request: AuthenticatedRequest,
  ) {
    this.assertBody(body);
    const rationale = this.requiredText(body.rationale, 'rationale', 4000);
    const result = await this.prisma.$transaction(async (tx) => {
      const article = await tx.historyArticle.findUnique({ where: { id } });
      if (!article) throw new NotFoundException('Article not found.');
      if (article.state !== EditorialState.IN_REVIEW) {
        throw new BadRequestException(
          'Article must be IN_REVIEW to request changes.',
        );
      }
      const updated = await tx.historyArticle.update({
        where: { id },
        data: { state: EditorialState.CHANGES_REQUESTED },
      });
      const lastRevision = await tx.contentRevision.findFirst({
        where: { contentType: 'HistoryArticle', contentId: id },
        orderBy: { revisionNumber: 'desc' },
      });
      if (lastRevision) {
        await tx.cmsReview.create({
          data: {
            revisionId: lastRevision.id,
            reviewerSubject: request.user.sub,
            outcome: 'CHANGES_REQUESTED',
            rationale,
          },
        });
      }
      await tx.auditEvent.create({
        data: {
          actorSubject: request.user.sub,
          action: 'ARTICLE_CHANGES_REQUESTED',
          targetType: 'HistoryArticle',
          targetId: id,
        },
      });
      return updated;
    });
    return result;
  }

  // ─── Events ───────────────────────────────────────────────────────────────

  @Get('events')
  async listEvents(
    @Query('limit') limitInput = '30',
    @Query('offset') offsetInput = '0',
    @Query('q') query?: string,
    @Query('state') stateFilter?: string,
  ) {
    const limit = this.pageNumber(limitInput, 'limit', 1, 100);
    const offset = this.pageNumber(offsetInput, 'offset', 0, 100_000);
    const term = query?.trim();
    if (term && term.length > 100)
      throw new BadRequestException('q cannot exceed 100 characters.');
    const stateEnum = this.parseOptionalState(stateFilter);
    const where: Record<string, unknown> = {};
    if (stateEnum) where['state'] = stateEnum;
    if (term) where['slug'] = { contains: term, mode: 'insensitive' };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.historicalEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: { translations: { where: { locale: 'so' } } },
      }),
      this.prisma.historicalEvent.count({ where }),
    ]);
    return { data, total, limit, offset };
  }

  @Get('events/:id')
  async getEvent(@Param('id') id: string) {
    const event = await this.prisma.historicalEvent.findUnique({
      where: { id },
      include: {
        translations: true,
        countries: { include: { country: true } },
        people: { select: { personId: true } },
        civilizations: { select: { civilizationId: true } },
        sources: true,
      },
    });
    if (!event) throw new NotFoundException('Event not found.');
    return {
      ...event,
      countryIds: event.countries.map(({ countryId }) => countryId),
      personIds: event.people.map(({ personId }) => personId),
      civilizationIds: event.civilizations.map(
        ({ civilizationId }) => civilizationId,
      ),
    };
  }

  @Post('events')
  @RequireRoles('Admin', 'Editor')
  async createEvent(
    @Body() body: Record<string, unknown>,
    @Req() request: AuthenticatedRequest,
  ) {
    this.assertBody(body);
    const slug = this.requiredText(body.slug, 'slug', 200);
    this.assertSlug(slug, 'slug', 200);
    const category = this.requiredText(body.category, 'category', 200);
    const dateDisplay = this.optionalText(body.dateDisplay, 'dateDisplay', 200);
    const startYear = this.optionalInt(body.startYear, 'startYear');
    const endYear = this.optionalInt(body.endYear, 'endYear');
    const datePrecision =
      this.optionalText(body.datePrecision, 'datePrecision', 50) ?? 'UNKNOWN';
    const locale = this.optionalText(body.locale, 'locale', 10) ?? 'so';
    const title = this.requiredText(body.title, 'title', 500);
    const summary = this.requiredText(body.summary, 'summary', 2000);
    const eventBody = this.requiredText(body.body, 'body', 100_000);
    const countryIds = this.uuidArray(body.countryIds, 'countryIds');
    const personIds = this.uuidArray(body.personIds, 'personIds');
    const civilizationIds = this.uuidArray(
      body.civilizationIds,
      'civilizationIds',
    );
    const sourceRefs = this.sourceReferences(body.sources ?? []);

    const result = await this.prisma.$transaction(async (tx) => {
      const event = await tx.historicalEvent.create({
        data: {
          slug,
          category,
          dateDisplay,
          startYear,
          endYear,
          datePrecision: datePrecision as
            | 'EXACT_DAY'
            | 'MONTH'
            | 'YEAR'
            | 'DECADE'
            | 'CENTURY'
            | 'RANGE'
            | 'CIRCA'
            | 'UNKNOWN',
          state: EditorialState.DRAFT,
          translations: {
            create: { locale, title, summary, body: eventBody },
          },
          countries: countryIds.length
            ? { create: countryIds.map((countryId) => ({ countryId })) }
            : undefined,
          people: personIds.length
            ? { create: personIds.map((personId) => ({ personId })) }
            : undefined,
          civilizations: civilizationIds.length
            ? {
                create: civilizationIds.map((civilizationId) => ({
                  civilizationId,
                })),
              }
            : undefined,
          sources: {
            create: sourceRefs.map((source) => ({
              ...source,
              claimStanding: source.claimStanding as never,
            })),
          },
        },
        include: { translations: true },
      });
      await this.saveContentRevision(
        tx,
        'HistoricalEvent',
        event.id,
        event.state,
        request.user.sub,
        event,
      );
      await tx.auditEvent.create({
        data: {
          actorSubject: request.user.sub,
          action: 'EVENT_CREATED',
          targetType: 'HistoricalEvent',
          targetId: event.id,
        },
      });
      return event;
    });
    return result;
  }

  @Patch('events/:id')
  @RequireRoles('Admin', 'Editor')
  async updateEvent(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @Req() request: AuthenticatedRequest,
  ) {
    this.assertBody(body);
    const result = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.historicalEvent.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Event not found.');

      const updateData: Record<string, unknown> = {};
      const category = this.optionalText(body.category, 'category', 200);
      if (category !== null) updateData['category'] = category;
      const dateDisplay = this.optionalText(
        body.dateDisplay,
        'dateDisplay',
        200,
      );
      if (dateDisplay !== undefined) updateData['dateDisplay'] = dateDisplay;
      const startYear = this.optionalInt(body.startYear, 'startYear');
      if (startYear !== undefined) updateData['startYear'] = startYear;
      const endYear = this.optionalInt(body.endYear, 'endYear');
      if (endYear !== undefined) updateData['endYear'] = endYear;
      const locale = this.optionalText(body.locale, 'locale', 10) ?? 'so';
      const title = this.optionalText(body.title, 'title', 500);
      const summary = this.optionalText(body.summary, 'summary', 2000);
      const eventBody = this.optionalText(body.body, 'body', 100_000);
      const countryIds =
        body.countryIds === undefined
          ? undefined
          : this.uuidArray(body.countryIds, 'countryIds');
      const personIds =
        body.personIds === undefined
          ? undefined
          : this.uuidArray(body.personIds, 'personIds');
      const civilizationIds =
        body.civilizationIds === undefined
          ? undefined
          : this.uuidArray(body.civilizationIds, 'civilizationIds');
      const sourceRefs =
        body.sources === undefined
          ? undefined
          : this.sourceReferences(body.sources);
      if (title || summary || eventBody) {
        await tx.eventTranslation.upsert({
          where: { eventId_locale: { eventId: id, locale } },
          update: {
            ...(title ? { title } : {}),
            ...(summary ? { summary } : {}),
            ...(eventBody ? { body: eventBody } : {}),
          },
          create: {
            eventId: id,
            locale,
            title: title ?? '',
            summary: summary ?? '',
            body: eventBody ?? '',
          },
        });
      }

      const updated = await tx.historicalEvent.update({
        where: { id },
        data: {
          ...updateData,
          ...(countryIds
            ? {
                countries: {
                  deleteMany: {},
                  create: countryIds.map((countryId) => ({ countryId })),
                },
              }
            : {}),
          ...(personIds
            ? {
                people: {
                  deleteMany: {},
                  create: personIds.map((personId) => ({ personId })),
                },
              }
            : {}),
          ...(civilizationIds
            ? {
                civilizations: {
                  deleteMany: {},
                  create: civilizationIds.map((civilizationId) => ({
                    civilizationId,
                  })),
                },
              }
            : {}),
          ...(sourceRefs
            ? {
                sources: {
                  deleteMany: {},
                  create: sourceRefs.map((source) => ({
                    ...source,
                    claimStanding: source.claimStanding as never,
                  })),
                },
              }
            : {}),
          ...(existing.state === EditorialState.PUBLISHED
            ? { state: EditorialState.DRAFT, publishedAt: null }
            : {}),
        },
        include: { translations: true },
      });
      await this.saveContentRevision(
        tx,
        'HistoricalEvent',
        id,
        updated.state,
        request.user.sub,
        updated,
      );
      await tx.auditEvent.create({
        data: {
          actorSubject: request.user.sub,
          action: 'EVENT_UPDATED',
          targetType: 'HistoricalEvent',
          targetId: id,
        },
      });
      return updated;
    });
    return result;
  }

  @Delete('events/:id')
  @RequireRoles('Admin')
  @HttpCode(HttpStatus.OK)
  async deleteEvent(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.historicalEvent.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Event not found.');
      await tx.historicalEvent.update({
        where: { id },
        data: { state: EditorialState.ARCHIVED },
      });
      await tx.auditEvent.create({
        data: {
          actorSubject: request.user.sub,
          action: 'EVENT_ARCHIVED',
          targetType: 'HistoricalEvent',
          targetId: id,
        },
      });
    });
    return { success: true };
  }

  @Post('events/:id/publish')
  @RequireRoles('Admin', 'Editor')
  @HttpCode(HttpStatus.OK)
  async publishEvent(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      const event = await tx.historicalEvent.findUnique({
        where: { id },
        include: { translations: true },
      });
      if (!event) throw new NotFoundException('Event not found.');
      if (event.state !== EditorialState.APPROVED) {
        throw new BadRequestException(
          'Event must be in APPROVED state to publish.',
        );
      }
      if (!(await tx.eventSource.count({ where: { eventId: id } })))
        throw new BadRequestException(
          'Add at least one source before publication.',
        );
      const now = new Date();
      const updated = await tx.historicalEvent.update({
        where: { id },
        data: { state: EditorialState.PUBLISHED, publishedAt: now },
        include: { translations: true },
      });
      await tx.auditEvent.create({
        data: {
          actorSubject: request.user.sub,
          action: 'EVENT_PUBLISHED',
          targetType: 'HistoricalEvent',
          targetId: id,
        },
      });
      return updated;
    });
    return result;
  }

  // ─── Figures (HistoricalPerson) ───────────────────────────────────────────

  @Get('figures')
  async listFigures(
    @Query('limit') limitInput = '30',
    @Query('offset') offsetInput = '0',
    @Query('q') query?: string,
    @Query('state') stateFilter?: string,
  ) {
    const limit = this.pageNumber(limitInput, 'limit', 1, 100);
    const offset = this.pageNumber(offsetInput, 'offset', 0, 100_000);
    const term = query?.trim();
    if (term && term.length > 100)
      throw new BadRequestException('q cannot exceed 100 characters.');
    const stateEnum = this.parseOptionalState(stateFilter);
    const where: Record<string, unknown> = {};
    if (stateEnum) where['state'] = stateEnum;
    if (term) where['slug'] = { contains: term, mode: 'insensitive' };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.historicalPerson.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: { translations: { where: { locale: 'so' } } },
      }),
      this.prisma.historicalPerson.count({ where }),
    ]);
    return { data, total, limit, offset };
  }

  @Get('figures/:id')
  async getFigure(@Param('id') id: string) {
    const person = await this.prisma.historicalPerson.findUnique({
      where: { id },
      include: {
        translations: true,
        events: { include: { event: true } },
        countries: { select: { countryId: true } },
        civilizations: { select: { civilizationId: true } },
        sources: true,
      },
    });
    if (!person) throw new NotFoundException('Figure not found.');
    return {
      ...person,
      countryIds: person.countries.map(({ countryId }) => countryId),
      eventIds: person.events.map(({ eventId }) => eventId),
      civilizationIds: person.civilizations.map(
        ({ civilizationId }) => civilizationId,
      ),
    };
  }

  @Post('figures')
  @RequireRoles('Admin', 'Editor')
  async createFigure(
    @Body() body: Record<string, unknown>,
    @Req() request: AuthenticatedRequest,
  ) {
    this.assertBody(body);
    const slug = this.requiredText(body.slug, 'slug', 200);
    this.assertSlug(slug, 'slug', 200);
    const birthDateText = this.optionalText(
      body.birthDateText,
      'birthDateText',
      200,
    );
    const birthYear = this.optionalInt(body.birthYear, 'birthYear');
    const deathDateText = this.optionalText(
      body.deathDateText,
      'deathDateText',
      200,
    );
    const deathYear = this.optionalInt(body.deathYear, 'deathYear');
    const locale = this.optionalText(body.locale, 'locale', 10) ?? 'so';
    const title = this.requiredText(body.title, 'title', 500);
    const summary = this.requiredText(body.summary, 'summary', 2000);
    const figureBody = this.requiredText(body.body, 'body', 100_000);
    const countryIds = this.uuidArray(body.countryIds, 'countryIds');
    const eventIds = this.uuidArray(body.eventIds, 'eventIds');
    const civilizationIds = this.uuidArray(
      body.civilizationIds,
      'civilizationIds',
    );
    const sourceRefs = this.sourceReferences(body.sources ?? []);

    const result = await this.prisma.$transaction(async (tx) => {
      const person = await tx.historicalPerson.create({
        data: {
          slug,
          birthDateText,
          birthYear,
          deathDateText,
          deathYear,
          state: EditorialState.DRAFT,
          translations: {
            create: { locale, title, summary, body: figureBody },
          },
          countries: countryIds.length
            ? { create: countryIds.map((countryId) => ({ countryId })) }
            : undefined,
          events: eventIds.length
            ? { create: eventIds.map((eventId) => ({ eventId })) }
            : undefined,
          civilizations: civilizationIds.length
            ? {
                create: civilizationIds.map((civilizationId) => ({
                  civilizationId,
                })),
              }
            : undefined,
          sources: {
            create: sourceRefs.map((source) => ({
              ...source,
              claimStanding: source.claimStanding as never,
            })),
          },
        },
        include: { translations: true },
      });
      await this.saveContentRevision(
        tx,
        'HistoricalPerson',
        person.id,
        person.state,
        request.user.sub,
        person,
      );
      await tx.auditEvent.create({
        data: {
          actorSubject: request.user.sub,
          action: 'FIGURE_CREATED',
          targetType: 'HistoricalPerson',
          targetId: person.id,
        },
      });
      return person;
    });
    return result;
  }

  @Patch('figures/:id')
  @RequireRoles('Admin', 'Editor')
  async updateFigure(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @Req() request: AuthenticatedRequest,
  ) {
    this.assertBody(body);
    const result = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.historicalPerson.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Figure not found.');

      const updateData: Record<string, unknown> = {};
      const birthDateText = this.optionalText(
        body.birthDateText,
        'birthDateText',
        200,
      );
      if (birthDateText !== undefined)
        updateData['birthDateText'] = birthDateText;
      const birthYear = this.optionalInt(body.birthYear, 'birthYear');
      if (birthYear !== undefined) updateData['birthYear'] = birthYear;
      const deathDateText = this.optionalText(
        body.deathDateText,
        'deathDateText',
        200,
      );
      if (deathDateText !== undefined)
        updateData['deathDateText'] = deathDateText;
      const deathYear = this.optionalInt(body.deathYear, 'deathYear');
      if (deathYear !== undefined) updateData['deathYear'] = deathYear;
      const locale = this.optionalText(body.locale, 'locale', 10) ?? 'so';
      const title = this.optionalText(body.title, 'title', 500);
      const summary = this.optionalText(body.summary, 'summary', 2000);
      const figureBody = this.optionalText(body.body, 'body', 100_000);
      const countryIds =
        body.countryIds === undefined
          ? undefined
          : this.uuidArray(body.countryIds, 'countryIds');
      const eventIds =
        body.eventIds === undefined
          ? undefined
          : this.uuidArray(body.eventIds, 'eventIds');
      const civilizationIds =
        body.civilizationIds === undefined
          ? undefined
          : this.uuidArray(body.civilizationIds, 'civilizationIds');
      const sourceRefs =
        body.sources === undefined
          ? undefined
          : this.sourceReferences(body.sources);
      if (title || summary || figureBody) {
        await tx.personTranslation.upsert({
          where: { personId_locale: { personId: id, locale } },
          update: {
            ...(title ? { title } : {}),
            ...(summary ? { summary } : {}),
            ...(figureBody ? { body: figureBody } : {}),
          },
          create: {
            personId: id,
            locale,
            title: title ?? '',
            summary: summary ?? '',
            body: figureBody ?? '',
          },
        });
      }

      const updated = await tx.historicalPerson.update({
        where: { id },
        data: {
          ...updateData,
          ...(countryIds
            ? {
                countries: {
                  deleteMany: {},
                  create: countryIds.map((countryId) => ({ countryId })),
                },
              }
            : {}),
          ...(eventIds
            ? {
                events: {
                  deleteMany: {},
                  create: eventIds.map((eventId) => ({ eventId })),
                },
              }
            : {}),
          ...(civilizationIds
            ? {
                civilizations: {
                  deleteMany: {},
                  create: civilizationIds.map((civilizationId) => ({
                    civilizationId,
                  })),
                },
              }
            : {}),
          ...(sourceRefs
            ? {
                sources: {
                  deleteMany: {},
                  create: sourceRefs.map((source) => ({
                    ...source,
                    claimStanding: source.claimStanding as never,
                  })),
                },
              }
            : {}),
          ...(existing.state === EditorialState.PUBLISHED
            ? { state: EditorialState.DRAFT, publishedAt: null }
            : {}),
        },
        include: { translations: true },
      });
      await this.saveContentRevision(
        tx,
        'HistoricalPerson',
        id,
        updated.state,
        request.user.sub,
        updated,
      );
      await tx.auditEvent.create({
        data: {
          actorSubject: request.user.sub,
          action: 'FIGURE_UPDATED',
          targetType: 'HistoricalPerson',
          targetId: id,
        },
      });
      return updated;
    });
    return result;
  }

  @Delete('figures/:id')
  @RequireRoles('Admin')
  @HttpCode(HttpStatus.OK)
  async deleteFigure(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.historicalPerson.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Figure not found.');
      await tx.historicalPerson.update({
        where: { id },
        data: { state: EditorialState.ARCHIVED },
      });
      await tx.auditEvent.create({
        data: {
          actorSubject: request.user.sub,
          action: 'FIGURE_ARCHIVED',
          targetType: 'HistoricalPerson',
          targetId: id,
        },
      });
    });
    return { success: true };
  }

  @Post('figures/:id/publish')
  @RequireRoles('Admin', 'Editor')
  @HttpCode(HttpStatus.OK)
  async publishFigure(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      const person = await tx.historicalPerson.findUnique({
        where: { id },
        include: { translations: true },
      });
      if (!person) throw new NotFoundException('Figure not found.');
      if (person.state !== EditorialState.APPROVED) {
        throw new BadRequestException(
          'Figure must be in APPROVED state to publish.',
        );
      }
      if (!(await tx.personSource.count({ where: { personId: id } })))
        throw new BadRequestException(
          'Add at least one source before publication.',
        );
      const now = new Date();
      const updated = await tx.historicalPerson.update({
        where: { id },
        data: { state: EditorialState.PUBLISHED, publishedAt: now },
        include: { translations: true },
      });
      await tx.auditEvent.create({
        data: {
          actorSubject: request.user.sub,
          action: 'FIGURE_PUBLISHED',
          targetType: 'HistoricalPerson',
          targetId: id,
        },
      });
      return updated;
    });
    return result;
  }

  // ─── Timelines ────────────────────────────────────────────────────────────

  @Get('timelines')
  async listTimelines(
    @Query('limit') limitInput = '30',
    @Query('offset') offsetInput = '0',
    @Query('q') query?: string,
    @Query('state') stateFilter?: string,
  ) {
    const limit = this.pageNumber(limitInput, 'limit', 1, 100);
    const offset = this.pageNumber(offsetInput, 'offset', 0, 100_000);
    const term = query?.trim();
    if (term && term.length > 100)
      throw new BadRequestException('q cannot exceed 100 characters.');
    const stateEnum = this.parseOptionalState(stateFilter);
    const where: Record<string, unknown> = {};
    if (stateEnum) where['state'] = stateEnum;
    if (term) where['slug'] = { contains: term, mode: 'insensitive' };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.historicalTimeline.findMany({
        where,
        orderBy: { slug: 'asc' },
        take: limit,
        skip: offset,
        include: { translations: { where: { locale: 'so' } } },
      }),
      this.prisma.historicalTimeline.count({ where }),
    ]);
    return { data, total, limit, offset };
  }

  @Get('timelines/:id')
  async getTimeline(@Param('id') id: string) {
    const timeline = await this.prisma.historicalTimeline.findUnique({
      where: { id },
      include: {
        translations: true,
        events: { include: { event: true }, orderBy: { position: 'asc' } },
      },
    });
    if (!timeline) throw new NotFoundException('Timeline not found.');
    return {
      ...timeline,
      eventIds: timeline.events.map(({ eventId }) => eventId),
    };
  }

  @Post('timelines')
  @RequireRoles('Admin', 'Editor')
  async createTimeline(
    @Body() body: Record<string, unknown>,
    @Req() request: AuthenticatedRequest,
  ) {
    this.assertBody(body);
    const slug = this.requiredText(body.slug, 'slug', 200);
    this.assertSlug(slug, 'slug', 200);
    const locale = this.optionalText(body.locale, 'locale', 10) ?? 'so';
    const title = this.requiredText(body.title, 'title', 500);
    const summary = this.requiredText(body.summary, 'summary', 2000);
    const eventIds = this.uuidArray(body.eventIds, 'eventIds');

    const result = await this.prisma.$transaction(async (tx) => {
      const timeline = await tx.historicalTimeline.create({
        data: {
          slug,
          state: EditorialState.DRAFT,
          translations: {
            create: { locale, title, summary },
          },
          events: eventIds.length
            ? {
                create: eventIds.map((eventId, position) => ({
                  eventId,
                  position,
                })),
              }
            : undefined,
        },
        include: { translations: true },
      });
      await this.saveContentRevision(
        tx,
        'HistoricalTimeline',
        timeline.id,
        timeline.state,
        request.user.sub,
        timeline,
      );
      await tx.auditEvent.create({
        data: {
          actorSubject: request.user.sub,
          action: 'TIMELINE_CREATED',
          targetType: 'HistoricalTimeline',
          targetId: timeline.id,
        },
      });
      return timeline;
    });
    return result;
  }

  @Patch('timelines/:id')
  @RequireRoles('Admin', 'Editor')
  async updateTimeline(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @Req() request: AuthenticatedRequest,
  ) {
    this.assertBody(body);
    const result = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.historicalTimeline.findUnique({
        where: { id },
      });
      if (!existing) throw new NotFoundException('Timeline not found.');

      const locale = this.optionalText(body.locale, 'locale', 10) ?? 'so';
      const title = this.optionalText(body.title, 'title', 500);
      const summary = this.optionalText(body.summary, 'summary', 2000);
      const eventIds =
        body.eventIds === undefined
          ? undefined
          : this.uuidArray(body.eventIds, 'eventIds');

      if (title || summary) {
        await tx.timelineTranslation.upsert({
          where: { timelineId_locale: { timelineId: id, locale } },
          update: {
            ...(title !== null ? { title } : {}),
            ...(summary !== null ? { summary } : {}),
          },
          create: {
            timelineId: id,
            locale,
            title: title ?? '',
            summary: summary ?? '',
          },
        });
      }

      if (
        existing.state === EditorialState.PUBLISHED ||
        eventIds !== undefined
      ) {
        await tx.historicalTimeline.update({
          where: { id },
          data: {
            ...(existing.state === EditorialState.PUBLISHED
              ? { state: EditorialState.DRAFT, publishedAt: null }
              : {}),
            ...(eventIds !== undefined
              ? {
                  events: {
                    deleteMany: {},
                    create: eventIds.map((eventId, position) => ({
                      eventId,
                      position,
                    })),
                  },
                }
              : {}),
          },
        });
      }
      const updated = await tx.historicalTimeline.findUnique({
        where: { id },
        include: { translations: true },
      });
      if (updated)
        await this.saveContentRevision(
          tx,
          'HistoricalTimeline',
          id,
          updated.state,
          request.user.sub,
          updated,
        );
      await tx.auditEvent.create({
        data: {
          actorSubject: request.user.sub,
          action: 'TIMELINE_UPDATED',
          targetType: 'HistoricalTimeline',
          targetId: id,
        },
      });
      return updated;
    });
    return result;
  }

  @Delete('timelines/:id')
  @RequireRoles('Admin')
  @HttpCode(HttpStatus.OK)
  async deleteTimeline(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.historicalTimeline.findUnique({
        where: { id },
      });
      if (!existing) throw new NotFoundException('Timeline not found.');
      await tx.historicalTimeline.update({
        where: { id },
        data: { state: EditorialState.ARCHIVED },
      });
      await tx.auditEvent.create({
        data: {
          actorSubject: request.user.sub,
          action: 'TIMELINE_ARCHIVED',
          targetType: 'HistoricalTimeline',
          targetId: id,
        },
      });
    });
    return { success: true };
  }

  @Post('timelines/:id/publish')
  @RequireRoles('Admin', 'Editor')
  @HttpCode(HttpStatus.OK)
  async publishTimeline(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      const timeline = await tx.historicalTimeline.findUnique({
        where: { id },
      });
      if (!timeline) throw new NotFoundException('Timeline not found.');
      if (timeline.state !== EditorialState.APPROVED) {
        throw new BadRequestException(
          'Timeline must be in APPROVED state to publish.',
        );
      }
      if (
        !(await tx.timelineEvent.count({
          where: {
            timelineId: id,
            event: { state: EditorialState.PUBLISHED, sources: { some: {} } },
          },
        }))
      )
        throw new BadRequestException(
          'A timeline needs published, cited events before publication.',
        );
      const now = new Date();
      const updated = await tx.historicalTimeline.update({
        where: { id },
        data: { state: EditorialState.PUBLISHED, publishedAt: now },
      });
      await tx.auditEvent.create({
        data: {
          actorSubject: request.user.sub,
          action: 'TIMELINE_PUBLISHED',
          targetType: 'HistoricalTimeline',
          targetId: id,
        },
      });
      return updated;
    });
    return result;
  }

  // ─── Civilizations ────────────────────────────────────────────────────────

  @Get('civilizations')
  async listCivilizations(
    @Query('limit') limitInput = '30',
    @Query('offset') offsetInput = '0',
    @Query('q') query?: string,
    @Query('state') stateFilter?: string,
  ) {
    const limit = this.pageNumber(limitInput, 'limit', 1, 100);
    const offset = this.pageNumber(offsetInput, 'offset', 0, 100_000);
    const term = query?.trim();
    if (term && term.length > 100)
      throw new BadRequestException('q cannot exceed 100 characters.');
    const stateEnum = this.parseOptionalState(stateFilter);
    const where: Record<string, unknown> = {};
    if (stateEnum) where['state'] = stateEnum;
    if (term) where['slug'] = { contains: term, mode: 'insensitive' };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.civilization.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: { translations: { where: { locale: 'so' } } },
      }),
      this.prisma.civilization.count({ where }),
    ]);
    return { data, total, limit, offset };
  }

  @Get('civilizations/:id')
  async getCivilization(@Param('id') id: string) {
    const civ = await this.prisma.civilization.findUnique({
      where: { id },
      include: {
        translations: true,
        countries: { include: { country: true } },
        events: { include: { event: true } },
        people: { select: { personId: true } },
      },
    });
    if (!civ) throw new NotFoundException('Civilization not found.');
    return {
      ...civ,
      countryIds: civ.countries.map(({ countryId }) => countryId),
      eventIds: civ.events.map(({ eventId }) => eventId),
      personIds: civ.people.map(({ personId }) => personId),
    };
  }

  @Post('civilizations')
  @RequireRoles('Admin', 'Editor')
  async createCivilization(
    @Body() body: Record<string, unknown>,
    @Req() request: AuthenticatedRequest,
  ) {
    this.assertBody(body);
    const slug = this.requiredText(body.slug, 'slug', 200);
    this.assertSlug(slug, 'slug', 200);
    const region = this.optionalText(body.region, 'region', 200);
    const startYear = this.optionalInt(body.startYear, 'startYear');
    const endYear = this.optionalInt(body.endYear, 'endYear');
    const dateDisplay = this.optionalText(body.dateDisplay, 'dateDisplay', 200);
    const locale = this.optionalText(body.locale, 'locale', 10) ?? 'so';
    const title = this.requiredText(body.title, 'title', 500);
    const summary = this.requiredText(body.summary, 'summary', 2000);
    const civBody = this.requiredText(body.body, 'body', 100_000);
    const countryIds = this.uuidArray(body.countryIds, 'countryIds');
    const eventIds = this.uuidArray(body.eventIds, 'eventIds');
    const personIds = this.uuidArray(body.personIds, 'personIds');
    const sourceRefs = this.sourceReferences(body.sources ?? []);

    const result = await this.prisma.$transaction(async (tx) => {
      const civ = await tx.civilization.create({
        data: {
          slug,
          region,
          startYear,
          endYear,
          dateDisplay,
          state: EditorialState.DRAFT,
          translations: {
            create: { locale, title, summary, body: civBody },
          },
          countries: countryIds.length
            ? { create: countryIds.map((countryId) => ({ countryId })) }
            : undefined,
          events: eventIds.length
            ? { create: eventIds.map((eventId) => ({ eventId })) }
            : undefined,
          people: personIds.length
            ? { create: personIds.map((personId) => ({ personId })) }
            : undefined,
          sources: {
            create: sourceRefs.map((source) => ({
              ...source,
              claimStanding: source.claimStanding as never,
            })),
          },
        },
        include: { translations: true },
      });
      await this.saveContentRevision(
        tx,
        'Civilization',
        civ.id,
        civ.state,
        request.user.sub,
        civ,
      );
      await tx.auditEvent.create({
        data: {
          actorSubject: request.user.sub,
          action: 'CIVILIZATION_CREATED',
          targetType: 'Civilization',
          targetId: civ.id,
        },
      });
      return civ;
    });
    return result;
  }

  @Patch('civilizations/:id')
  @RequireRoles('Admin', 'Editor')
  async updateCivilization(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @Req() request: AuthenticatedRequest,
  ) {
    this.assertBody(body);
    const result = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.civilization.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Civilization not found.');

      const updateData: Record<string, unknown> = {};
      const region = this.optionalText(body.region, 'region', 200);
      if (region !== undefined) updateData['region'] = region;
      const startYear = this.optionalInt(body.startYear, 'startYear');
      if (startYear !== undefined) updateData['startYear'] = startYear;
      const endYear = this.optionalInt(body.endYear, 'endYear');
      if (endYear !== undefined) updateData['endYear'] = endYear;
      const dateDisplay = this.optionalText(
        body.dateDisplay,
        'dateDisplay',
        200,
      );
      if (dateDisplay !== undefined) updateData['dateDisplay'] = dateDisplay;
      const locale = this.optionalText(body.locale, 'locale', 10) ?? 'so';
      const title = this.optionalText(body.title, 'title', 500);
      const summary = this.optionalText(body.summary, 'summary', 2000);
      const civBody = this.optionalText(body.body, 'body', 100_000);
      const countryIds =
        body.countryIds === undefined
          ? undefined
          : this.uuidArray(body.countryIds, 'countryIds');
      const eventIds =
        body.eventIds === undefined
          ? undefined
          : this.uuidArray(body.eventIds, 'eventIds');
      const personIds =
        body.personIds === undefined
          ? undefined
          : this.uuidArray(body.personIds, 'personIds');
      const sourceRefs =
        body.sources === undefined
          ? undefined
          : this.sourceReferences(body.sources);
      if (title || summary || civBody) {
        await tx.civilizationTranslation.upsert({
          where: { civilizationId_locale: { civilizationId: id, locale } },
          update: {
            ...(title ? { title } : {}),
            ...(summary ? { summary } : {}),
            ...(civBody ? { body: civBody } : {}),
          },
          create: {
            civilizationId: id,
            locale,
            title: title ?? '',
            summary: summary ?? '',
            body: civBody ?? '',
          },
        });
      }

      const updated = await tx.civilization.update({
        where: { id },
        data: {
          ...updateData,
          ...(countryIds
            ? {
                countries: {
                  deleteMany: {},
                  create: countryIds.map((countryId) => ({ countryId })),
                },
              }
            : {}),
          ...(eventIds
            ? {
                events: {
                  deleteMany: {},
                  create: eventIds.map((eventId) => ({ eventId })),
                },
              }
            : {}),
          ...(personIds
            ? {
                people: {
                  deleteMany: {},
                  create: personIds.map((personId) => ({ personId })),
                },
              }
            : {}),
          ...(sourceRefs
            ? {
                sources: {
                  deleteMany: {},
                  create: sourceRefs.map((source) => ({
                    ...source,
                    claimStanding: source.claimStanding as never,
                  })),
                },
              }
            : {}),
          ...(existing.state === EditorialState.PUBLISHED
            ? { state: EditorialState.DRAFT, publishedAt: null }
            : {}),
        },
        include: { translations: true },
      });
      await this.saveContentRevision(
        tx,
        'Civilization',
        id,
        updated.state,
        request.user.sub,
        updated,
      );
      await tx.auditEvent.create({
        data: {
          actorSubject: request.user.sub,
          action: 'CIVILIZATION_UPDATED',
          targetType: 'Civilization',
          targetId: id,
        },
      });
      return updated;
    });
    return result;
  }

  @Delete('civilizations/:id')
  @RequireRoles('Admin')
  @HttpCode(HttpStatus.OK)
  async deleteCivilization(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.civilization.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Civilization not found.');
      await tx.civilization.update({
        where: { id },
        data: { state: EditorialState.ARCHIVED },
      });
      await tx.auditEvent.create({
        data: {
          actorSubject: request.user.sub,
          action: 'CIVILIZATION_ARCHIVED',
          targetType: 'Civilization',
          targetId: id,
        },
      });
    });
    return { success: true };
  }

  @Post('civilizations/:id/publish')
  @RequireRoles('Admin', 'Editor')
  @HttpCode(HttpStatus.OK)
  async publishCivilization(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      const civ = await tx.civilization.findUnique({ where: { id } });
      if (!civ) throw new NotFoundException('Civilization not found.');
      if (civ.state !== EditorialState.APPROVED) {
        throw new BadRequestException(
          'Civilization must be in APPROVED state to publish.',
        );
      }
      if (
        !(await tx.civilizationSource.count({ where: { civilizationId: id } }))
      )
        throw new BadRequestException(
          'Add at least one source before publication.',
        );
      const now = new Date();
      const updated = await tx.civilization.update({
        where: { id },
        data: { state: EditorialState.PUBLISHED, publishedAt: now },
      });
      await tx.auditEvent.create({
        data: {
          actorSubject: request.user.sub,
          action: 'CIVILIZATION_PUBLISHED',
          targetType: 'Civilization',
          targetId: id,
        },
      });
      return updated;
    });
    return result;
  }

  // ─── Reviews Queue ────────────────────────────────────────────────────────

  @Post(':contentType/:id/workflow')
  @HttpCode(HttpStatus.OK)
  async transitionContent(
    @Param('contentType') contentType: string,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @Req() request: AuthenticatedRequest,
  ) {
    this.assertBody(body);
    const action = this.requiredText(body.action, 'action', 40);
    const reviewerAction = ['review', 'approve', 'return', 'reject'].includes(
      action,
    );
    const allowedRoles = reviewerAction
      ? ['Admin', 'Reviewer']
      : ['Admin', 'Editor'];
    if (!allowedRoles.some((role) => request.user.roles?.includes(role))) {
      throw new ForbiddenException(
        'Your account cannot perform this workflow action.',
      );
    }
    const delegates: Record<string, { model: string; type: string }> = {
      events: { model: 'historicalEvent', type: 'HistoricalEvent' },
      figures: { model: 'historicalPerson', type: 'HistoricalPerson' },
      timelines: { model: 'historicalTimeline', type: 'HistoricalTimeline' },
      civilizations: { model: 'civilization', type: 'Civilization' },
    };
    const delegateInfo = delegates[contentType];
    if (!delegateInfo)
      throw new BadRequestException('Unsupported content type.');
    type WorkflowRecord = {
      id: string;
      state: string;
      publishedAt?: Date | null;
    };
    type WorkflowDelegate = {
      findUnique(args: {
        where: { id: string };
      }): Promise<WorkflowRecord | null>;
      update(args: {
        where: { id: string };
        data: Record<string, unknown>;
      }): Promise<WorkflowRecord>;
    };
    const rationale =
      action === 'return' || action === 'reject'
        ? this.requiredText(body.rationale, 'rationale', 4000)
        : '';
    const result = await this.prisma.$transaction(async (tx) => {
      const txDelegate = (tx as unknown as Record<string, unknown>)[
        delegateInfo.model
      ] as WorkflowDelegate;
      const current = await txDelegate.findUnique({ where: { id } });
      if (!current) throw new NotFoundException('Content not found.');
      const transitions: Record<string, { from: string[]; to: string }> = {
        submit: { from: ['DRAFT', 'CHANGES_REQUESTED'], to: 'SUBMITTED' },
        review: { from: ['SUBMITTED'], to: 'IN_REVIEW' },
        approve: { from: ['IN_REVIEW'], to: 'APPROVED' },
        return: { from: ['IN_REVIEW'], to: 'CHANGES_REQUESTED' },
        reject: { from: ['IN_REVIEW'], to: 'REJECTED' },
        publish: { from: ['APPROVED'], to: 'PUBLISHED' },
      };
      const transition = transitions[action];
      if (!transition)
        throw new BadRequestException('Unsupported workflow action.');
      if (!transition.from.includes(current.state)) {
        throw new BadRequestException(
          `Cannot ${action} content in ${current.state} state.`,
        );
      }
      if (action === 'submit' || action === 'publish') {
        const referenceCount =
          contentType === 'events'
            ? await tx.eventSource.count({ where: { eventId: id } })
            : contentType === 'figures'
              ? await tx.personSource.count({ where: { personId: id } })
              : contentType === 'civilizations'
                ? await tx.civilizationSource.count({
                    where: { civilizationId: id },
                  })
                : contentType === 'timelines'
                  ? await tx.timelineEvent.count({
                      where: {
                        timelineId: id,
                        event: {
                          state: EditorialState.PUBLISHED,
                          sources: { some: {} },
                        },
                      },
                    })
                  : 0;
        if (!referenceCount)
          throw new BadRequestException(
            contentType === 'timelines'
              ? 'A timeline needs published, cited events before review or publication.'
              : 'Add at least one source before review or publication.',
          );
      }
      const updated = await txDelegate.update({
        where: { id },
        data: {
          state: transition.to,
          ...(action === 'publish' ? { publishedAt: new Date() } : {}),
        },
      });
      if (action === 'submit' || action === 'publish') {
        const last = await tx.contentRevision.findFirst({
          where: { contentType: delegateInfo.type, contentId: id },
          orderBy: { revisionNumber: 'desc' },
        });
        await tx.contentRevision.create({
          data: {
            contentType: delegateInfo.type,
            contentId: id,
            revisionNumber: (last?.revisionNumber ?? 0) + 1,
            state:
              transition.to as (typeof EditorialState)[keyof typeof EditorialState],
            editorSubject: request.user.sub,
            snapshot: JSON.parse(
              JSON.stringify(updated),
            ) as Prisma.InputJsonValue,
          },
        });
      }
      if (reviewerAction && action !== 'review') {
        const last = await tx.contentRevision.findFirst({
          where: { contentType: delegateInfo.type, contentId: id },
          orderBy: { revisionNumber: 'desc' },
        });
        if (last)
          await tx.cmsReview.create({
            data: {
              revisionId: last.id,
              reviewerSubject: request.user.sub,
              outcome: transition.to,
              rationale,
            },
          });
      }
      await tx.auditEvent.create({
        data: {
          actorSubject: request.user.sub,
          action: `${contentType.toUpperCase()}_${action.toUpperCase()}`,
          targetType: delegateInfo.type,
          targetId: id,
          metadata: {
            from: current.state,
            to: transition.to,
            ...(rationale ? { rationale } : {}),
          },
        },
      });
      return updated;
    });
    return result;
  }

  @Get('reviews')
  async listReviews(
    @Query('limit') limitInput = '30',
    @Query('offset') offsetInput = '0',
  ) {
    const limit = this.pageNumber(limitInput, 'limit', 1, 100);
    const offset = this.pageNumber(offsetInput, 'offset', 0, 100_000);
    const reviewStates = [EditorialState.SUBMITTED, EditorialState.IN_REVIEW];

    const [
      articles,
      events,
      figures,
      timelines,
      civilizations,
      periods,
      museumItems,
      museumExhibitions,
      historicalMaps,
      countryRevisions,
    ] = await this.prisma.$transaction([
      this.prisma.historyArticle.findMany({
        where: { state: { in: reviewStates } },
        include: { translations: { where: { locale: 'so' } } },
      }),
      this.prisma.historicalEvent.findMany({
        where: { state: { in: reviewStates } },
        include: { translations: { where: { locale: 'so' } } },
      }),
      this.prisma.historicalPerson.findMany({
        where: { state: { in: reviewStates } },
        include: { translations: { where: { locale: 'so' } } },
      }),
      this.prisma.historicalTimeline.findMany({
        where: { state: { in: reviewStates } },
        include: { translations: { where: { locale: 'so' } } },
      }),
      this.prisma.civilization.findMany({
        where: { state: { in: reviewStates } },
        include: { translations: { where: { locale: 'so' } } },
      }),
      this.prisma.historicalPeriod.findMany({
        where: { state: { in: reviewStates } },
        include: { translations: { where: { locale: 'so' } } },
      }),
      this.prisma.museumItem.findMany({
        where: { state: { in: reviewStates } },
        include: { translations: { where: { locale: 'so' } } },
      }),
      this.prisma.museumExhibition.findMany({
        where: { state: { in: reviewStates } },
        include: { translations: { where: { locale: 'so' } } },
      }),
      this.prisma.historicalMap.findMany({
        where: { state: { in: reviewStates } },
        include: { translations: { where: { locale: 'so' } } },
      }),
      this.prisma.countryRevision.findMany({
        where: { state: { in: reviewStates } },
        orderBy: { createdAt: 'desc' },
        include: { translations: { where: { locale: 'so' } } },
      }),
    ]);

    const toItem = (
      contentType: string,
      items: Array<{
        id: string;
        state: string;
        createdAt?: Date;
        updatedAt?: Date;
        translations: Array<{ title: string }>;
      }>,
    ) =>
      items.map((item) => ({
        contentType,
        id: item.id,
        title: item.translations[0]?.title ?? null,
        state: item.state,
        createdAt: item.createdAt ?? null,
        updatedAt: item.updatedAt ?? null,
      }));

    const seenCountryIds = new Set<string>();
    const latestCountryReviews = countryRevisions.filter((revision) => {
      if (seenCountryIds.has(revision.countryId)) return false;
      seenCountryIds.add(revision.countryId);
      return true;
    });
    const all = [
      ...toItem('HistoryArticle', articles as Parameters<typeof toItem>[1]),
      ...toItem('HistoricalEvent', events as Parameters<typeof toItem>[1]),
      ...toItem('HistoricalPerson', figures as Parameters<typeof toItem>[1]),
      ...toItem(
        'HistoricalTimeline',
        timelines as Parameters<typeof toItem>[1],
      ),
      ...toItem('Civilization', civilizations as Parameters<typeof toItem>[1]),
      ...toItem('HistoricalPeriod', periods as Parameters<typeof toItem>[1]),
      ...toItem('MuseumItem', museumItems as Parameters<typeof toItem>[1]),
      ...toItem(
        'MuseumExhibition',
        museumExhibitions as Parameters<typeof toItem>[1],
      ),
      ...toItem(
        'HistoricalMap',
        historicalMaps as Parameters<typeof toItem>[1],
      ),
      ...latestCountryReviews.map((revision) => ({
        contentType: 'CountryRevision',
        id: revision.countryId,
        revisionId: revision.id,
        title: revision.translations[0]?.title ?? null,
        state: revision.state,
        createdAt: revision.createdAt,
        updatedAt: revision.createdAt,
      })),
    ].sort(
      (a, b) =>
        new Date(b.updatedAt ?? 0).getTime() -
        new Date(a.updatedAt ?? 0).getTime(),
    );

    const total = all.length;
    const data = all.slice(offset, offset + limit);
    return { data, total, limit, offset };
  }

  // ─── Content Revisions ────────────────────────────────────────────────────

  @Get('revisions')
  async listRevisions(
    @Query('limit') limitInput = '30',
    @Query('offset') offsetInput = '0',
    @Query('contentType') contentType?: string,
  ) {
    const limit = this.pageNumber(limitInput, 'limit', 1, 100);
    const offset = this.pageNumber(offsetInput, 'offset', 0, 100_000);
    const where = contentType ? { contentType } : {};

    const [contentRevisions, contentTotal, countryRevisions, countryTotal] =
      await this.prisma.$transaction([
        this.prisma.contentRevision.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit + offset,
        }),
        this.prisma.contentRevision.count({ where }),
        this.prisma.countryRevision.findMany({
          orderBy: { createdAt: 'desc' },
          take: limit + offset,
          include: { country: { select: { slug: true } } },
        }),
        this.prisma.countryRevision.count(),
      ]);
    const countryRows =
      contentType && contentType !== 'CountryRevision'
        ? []
        : countryRevisions.map((revision) => ({
            id: revision.id,
            contentType: 'CountryRevision',
            contentId: revision.countryId,
            revisionNumber: revision.revisionNumber,
            state: revision.state,
            editorSubject: revision.authorSubject,
            createdAt: revision.createdAt,
            countrySlug: revision.country.slug,
          }));
    const data = [...contentRevisions, ...countryRows]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + limit);
    const total =
      contentTotal +
      (contentType && contentType !== 'CountryRevision' ? 0 : countryTotal);
    return { data, total, limit, offset };
  }

  // ─── Audit Logs ───────────────────────────────────────────────────────────

  @Get('audit-logs')
  async listAuditLogs(
    @Query('limit') limitInput = '30',
    @Query('offset') offsetInput = '0',
    @Query('targetType') targetType?: string,
  ) {
    const limit = this.pageNumber(limitInput, 'limit', 1, 100);
    const offset = this.pageNumber(offsetInput, 'offset', 0, 100_000);
    const where = targetType ? { targetType } : {};

    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.auditEvent.count({ where }),
    ]);
    return { data, total, limit, offset };
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private async saveContentRevision(
    tx: Prisma.TransactionClient,
    contentType: string,
    contentId: string,
    state: string,
    editorSubject: string,
    snapshot: unknown,
  ) {
    const last = await tx.contentRevision.findFirst({
      where: { contentType, contentId },
      orderBy: { revisionNumber: 'desc' },
    });
    return tx.contentRevision.create({
      data: {
        contentType,
        contentId,
        revisionNumber: (last?.revisionNumber ?? 0) + 1,
        state: state as (typeof EditorialState)[keyof typeof EditorialState],
        editorSubject,
        snapshot: JSON.parse(JSON.stringify(snapshot)) as Prisma.InputJsonValue,
      },
    });
  }

  private assertBody(body: unknown): asserts body is Record<string, unknown> {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException('Request body must be a JSON object.');
    }
  }

  private uuidArray(value: unknown, field: string): string[] {
    if (value === undefined || value === null || value === '') return [];
    if (
      !Array.isArray(value) ||
      value.some(
        (item) =>
          typeof item !== 'string' ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            item,
          ),
      )
    ) {
      throw new BadRequestException(`${field} must be an array of UUIDs.`);
    }
    return [...new Set(value as string[])];
  }

  private sourceReferences(value: unknown): Array<{
    sourceId: string;
    locator: string | null;
    claimNote: string;
    claimStanding: string;
  }> {
    if (!Array.isArray(value))
      throw new BadRequestException(
        'sources must be an array of source references.',
      );
    return value.map((entry) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry))
        throw new BadRequestException(
          'Each source reference must be an object.',
        );
      const source = entry as Record<string, unknown>;
      const sourceId = this.requiredText(source.sourceId, 'sourceId', 36);
      if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          sourceId,
        )
      )
        throw new BadRequestException('sourceId must be a UUID.');
      const claimStanding = this.requiredText(
        source.claimStanding,
        'claimStanding',
        60,
      );
      if (
        ![
          'WELL_SUPPORTED',
          'SCHOLARLY_INTERPRETATION',
          'DISPUTED',
          'UNCERTAIN',
        ].includes(claimStanding)
      )
        throw new BadRequestException('claimStanding is invalid.');
      return {
        sourceId,
        locator: this.optionalText(source.locator, 'locator', 1000),
        claimNote: this.requiredText(source.claimNote, 'claimNote', 4000),
        claimStanding,
      };
    });
  }

  private assertSlug(slug: string, field: string, maxLength: number): void {
    if (!SLUG_RE.test(slug) || slug.length > maxLength) {
      throw new BadRequestException(
        `${field} must match /^[a-z0-9-]+$/ and not exceed ${maxLength} characters.`,
      );
    }
  }

  private parseOptionalState(value?: string): string | null {
    if (!value) return null;
    const valid = [
      'DRAFT',
      'SUBMITTED',
      'IN_REVIEW',
      'CHANGES_REQUESTED',
      'APPROVED',
      'PUBLISHED',
      'REJECTED',
      'ARCHIVED',
    ];
    const upper = value.toUpperCase();
    if (!valid.includes(upper)) {
      throw new BadRequestException(
        `state must be one of: ${valid.join(', ')}.`,
      );
    }
    return upper;
  }

  private optionalInt(value: unknown, field: string): number | null {
    if (value === undefined || value === null || value === '') return null;
    const n = Number(value);
    if (!Number.isInteger(n)) {
      throw new BadRequestException(`${field} must be an integer.`);
    }
    return n;
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
