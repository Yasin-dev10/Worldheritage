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
import prismaClientModule from '@prisma/client';
import { PrismaService } from './prisma.service.js';
import { OidcAuthGuard } from './oidc-auth.guard.js';
import { RequireRoles } from './roles.decorator.js';
import { RolesGuard } from './roles.guard.js';
import type { AuthenticatedRequest } from './oidc-auth.guard.js';

const { EditorialState } = prismaClientModule;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePrecisions = [
  'EXACT_DAY',
  'MONTH',
  'YEAR',
  'DECADE',
  'CENTURY',
  'RANGE',
  'CIRCA',
  'UNKNOWN',
];
const dateCertainties = [
  'CERTAIN',
  'PROBABLE',
  'POSSIBLE',
  'DISPUTED',
  'UNKNOWN',
];

@Controller('admin/periods')
@UseGuards(OidcAuthGuard, RolesGuard)
@RequireRoles('Admin', 'Editor', 'Reviewer')
export class PeriodsAdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(
    @Query('limit') limitInput = '30',
    @Query('offset') offsetInput = '0',
    @Query('q') query?: string,
    @Query('state') state?: string,
  ) {
    const limit = this.page(limitInput, 1, 100);
    const offset = this.page(offsetInput, 0, 100_000);
    const where = {
      ...(state
        ? {
            state: this.enumValue(
              state,
              Object.keys(EditorialState),
              'state',
            ) as never,
          }
        : {}),
      ...(query
        ? { slug: { contains: query.trim(), mode: 'insensitive' as const } }
        : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.historicalPeriod.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
        include: { translations: { where: { locale: 'so' } } },
      }),
      this.prisma.historicalPeriod.count({ where }),
    ]);
    return { data, total, limit, offset };
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    const period = await this.prisma.historicalPeriod.findUnique({
      where: { id },
      include: { translations: true, sources: true, events: true },
    });
    if (!period) throw new NotFoundException('Historical period not found.');
    return { ...period, eventIds: period.events.map(({ eventId }) => eventId) };
  }

  @Post()
  @RequireRoles('Admin', 'Editor')
  async create(
    @Body() body: Record<string, unknown>,
    @Req() request: AuthenticatedRequest,
  ) {
    this.assertBody(body);
    const slug = this.text(body.slug, 'slug', 200);
    if (!/^[a-z0-9-]+$/.test(slug))
      throw new BadRequestException(
        'slug must use lowercase letters, numbers, and hyphens.',
      );
    const locale = this.enumValue(body.locale ?? 'so', ['so', 'en'], 'locale');
    const title = this.text(body.title, 'title', 500);
    const summary = this.text(body.summary, 'summary', 2000);
    const content = this.text(body.body, 'body', 100_000);
    const sourceRefs = this.sourceRefs(body.sources);
    if (!sourceRefs.length)
      throw new BadRequestException(
        'At least one source reference is required.',
      );
    const eventIds = this.uuidArray(body.eventIds, 'eventIds');
    const datePrecision = this.enumValue(
      body.datePrecision ?? 'UNKNOWN',
      datePrecisions,
      'datePrecision',
    );
    const dateCertainty = this.enumValue(
      body.dateCertainty ?? 'UNKNOWN',
      dateCertainties,
      'dateCertainty',
    );
    const period = await this.prisma.$transaction(async (tx) => {
      const created = await tx.historicalPeriod.create({
        data: {
          slug,
          dateDisplay: this.optional(body.dateDisplay, 200),
          startYear: this.optionalInt(body.startYear, 'startYear'),
          endYear: this.optionalInt(body.endYear, 'endYear'),
          datePrecision: datePrecision as never,
          dateCertainty: dateCertainty as never,
          state: EditorialState.DRAFT,
          translations: { create: { locale, title, summary, body: content } },
          sources: {
            create: sourceRefs.map((ref) => ({
              ...ref,
              claimStanding: ref.claimStanding as never,
            })),
          },
          events: eventIds.length
            ? { create: eventIds.map((eventId) => ({ eventId })) }
            : undefined,
        },
        include: { translations: true, sources: true, events: true },
      });
      await tx.contentRevision.create({
        data: {
          contentType: 'HistoricalPeriod',
          contentId: created.id,
          revisionNumber: 1,
          state: EditorialState.DRAFT,
          editorSubject: request.user.sub,
          snapshot: JSON.parse(JSON.stringify(created)),
        },
      });
      await tx.auditEvent.create({
        data: {
          actorSubject: request.user.sub,
          action: 'HISTORICAL_PERIOD_CREATED',
          targetType: 'HistoricalPeriod',
          targetId: created.id,
        },
      });
      return created;
    });
    return period;
  }

  @Patch(':id')
  @RequireRoles('Admin', 'Editor')
  async update(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @Req() request: AuthenticatedRequest,
  ) {
    this.assertBody(body);
    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await tx.historicalPeriod.findUnique({
        where: { id },
        include: { translations: true, sources: true, events: true },
      });
      if (!current) throw new NotFoundException('Historical period not found.');
      const locale = this.enumValue(
        body.locale ?? 'so',
        ['so', 'en'],
        'locale',
      );
      const title = this.optional(body.title, 500);
      const summary = this.optional(body.summary, 2000);
      const content = this.optional(body.body, 100_000);
      const sourceRefs =
        body.sources === undefined ? undefined : this.sourceRefs(body.sources);
      const eventIds =
        body.eventIds === undefined
          ? undefined
          : this.uuidArray(body.eventIds, 'eventIds');
      const precision =
        body.datePrecision === undefined
          ? undefined
          : this.enumValue(body.datePrecision, datePrecisions, 'datePrecision');
      const certainty =
        body.dateCertainty === undefined
          ? undefined
          : this.enumValue(
              body.dateCertainty,
              dateCertainties,
              'dateCertainty',
            );
      await tx.historicalPeriod.update({
        where: { id },
        data: {
          ...(body.dateDisplay !== undefined
            ? { dateDisplay: this.optional(body.dateDisplay, 200) }
            : {}),
          ...(body.startYear !== undefined
            ? { startYear: this.optionalInt(body.startYear, 'startYear') }
            : {}),
          ...(body.endYear !== undefined
            ? { endYear: this.optionalInt(body.endYear, 'endYear') }
            : {}),
          ...(precision ? { datePrecision: precision as never } : {}),
          ...(certainty ? { dateCertainty: certainty as never } : {}),
          ...(current.state === EditorialState.PUBLISHED
            ? { state: EditorialState.DRAFT, publishedAt: null }
            : {}),
          ...(sourceRefs
            ? {
                sources: {
                  deleteMany: {},
                  create: sourceRefs.map((ref) => ({
                    ...ref,
                    claimStanding: ref.claimStanding as never,
                  })),
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
        },
      });
      if (title !== null || summary !== null || content !== null) {
        const existingTranslation = current.translations.find(
          (item) => item.locale === locale,
        );
        await tx.periodTranslation.upsert({
          where: { periodId_locale: { periodId: id, locale } },
          update: {
            ...(title !== null ? { title } : {}),
            ...(summary !== null ? { summary } : {}),
            ...(content !== null ? { body: content } : {}),
          },
          create: {
            periodId: id,
            locale,
            title: title ?? '',
            summary: summary ?? '',
            body: content ?? '',
          },
        });
        if (!existingTranslation && !(title && summary && content))
          throw new BadRequestException(
            'A new translation requires a title, summary, and body.',
          );
      }
      const record = await tx.historicalPeriod.findUnique({
        where: { id },
        include: { translations: true, sources: true, events: true },
      });
      if (!record) throw new NotFoundException('Historical period not found.');
      const previous = await tx.contentRevision.findFirst({
        where: { contentType: 'HistoricalPeriod', contentId: id },
        orderBy: { revisionNumber: 'desc' },
      });
      await tx.contentRevision.create({
        data: {
          contentType: 'HistoricalPeriod',
          contentId: id,
          revisionNumber: (previous?.revisionNumber ?? 0) + 1,
          state: record.state,
          editorSubject: request.user.sub,
          snapshot: JSON.parse(JSON.stringify(record)),
        },
      });
      await tx.auditEvent.create({
        data: {
          actorSubject: request.user.sub,
          action: 'HISTORICAL_PERIOD_UPDATED',
          targetType: 'HistoricalPeriod',
          targetId: id,
        },
      });
      return record;
    });
    return updated;
  }

  @Delete(':id')
  @RequireRoles('Admin')
  @HttpCode(HttpStatus.OK)
  async archive(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.prisma.$transaction(async (tx) => {
      const period = await tx.historicalPeriod.findUnique({ where: { id } });
      if (!period) throw new NotFoundException('Historical period not found.');
      const updated = await tx.historicalPeriod.update({
        where: { id },
        data: { state: EditorialState.ARCHIVED },
      });
      await tx.auditEvent.create({
        data: {
          actorSubject: request.user.sub,
          action: 'HISTORICAL_PERIOD_ARCHIVED',
          targetType: 'HistoricalPeriod',
          targetId: id,
        },
      });
      return updated;
    });
  }

  @Post(':id/workflow')
  async workflow(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @Req() request: AuthenticatedRequest,
  ) {
    this.assertBody(body);
    const action = this.text(body.action, 'action', 30);
    const transitions: Record<string, { from: string; to: string }> = {
      submit: { from: 'DRAFT', to: 'SUBMITTED' },
      review: { from: 'SUBMITTED', to: 'IN_REVIEW' },
      approve: { from: 'IN_REVIEW', to: 'APPROVED' },
      return: { from: 'IN_REVIEW', to: 'CHANGES_REQUESTED' },
      reject: { from: 'IN_REVIEW', to: 'REJECTED' },
      publish: { from: 'APPROVED', to: 'PUBLISHED' },
    };
    const transition = transitions[action];
    if (!transition)
      throw new BadRequestException('Unsupported workflow action.');
    const reviewerAction = ['review', 'approve', 'return', 'reject'].includes(
      action,
    );
    const allowedRoles = reviewerAction
      ? ['Admin', 'Reviewer']
      : ['Admin', 'Editor'];
    if (!allowedRoles.some((role) => request.user.roles?.includes(role)))
      throw new ForbiddenException(
        'Your account cannot perform this workflow action.',
      );
    const rationale = ['return', 'reject'].includes(action)
      ? this.text(body.rationale, 'rationale', 4000)
      : '';
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.historicalPeriod.findUnique({
        where: { id },
        include: { sources: true, translations: true },
      });
      if (!current) throw new NotFoundException('Historical period not found.');
      if (current.state !== transition.from)
        throw new BadRequestException(
          `Cannot ${action} a period in ${current.state}.`,
        );
      if (
        ['submit', 'publish'].includes(action) &&
        current.sources.length === 0
      )
        throw new BadRequestException(
          'A cited source is required before review or publication.',
        );
      const updated = await tx.historicalPeriod.update({
        where: { id },
        data: {
          state: transition.to as never,
          ...(action === 'publish' ? { publishedAt: new Date() } : {}),
        },
      });
      const previous = await tx.contentRevision.findFirst({
        where: { contentType: 'HistoricalPeriod', contentId: id },
        orderBy: { revisionNumber: 'desc' },
      });
      const revision = await tx.contentRevision.create({
        data: {
          contentType: 'HistoricalPeriod',
          contentId: id,
          revisionNumber: (previous?.revisionNumber ?? 0) + 1,
          state: transition.to as never,
          editorSubject: request.user.sub,
          snapshot: JSON.parse(JSON.stringify({ ...current, ...updated })),
        },
      });
      if (reviewerAction && action !== 'review')
        await tx.cmsReview.create({
          data: {
            revisionId: revision.id,
            reviewerSubject: request.user.sub,
            outcome: transition.to,
            rationale,
          },
        });
      await tx.auditEvent.create({
        data: {
          actorSubject: request.user.sub,
          action: `HISTORICAL_PERIOD_${action.toUpperCase()}`,
          targetType: 'HistoricalPeriod',
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
  }

  private assertBody(body: unknown): asserts body is Record<string, unknown> {
    if (!body || typeof body !== 'object' || Array.isArray(body))
      throw new BadRequestException('Request body must be a JSON object.');
  }
  private text(value: unknown, field: string, max: number) {
    if (typeof value !== 'string' || !value.trim() || value.length > max)
      throw new BadRequestException(
        `${field} is required and must not exceed ${max} characters.`,
      );
    return value.trim();
  }
  private optional(value: unknown, max: number) {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value !== 'string' || value.length > max)
      throw new BadRequestException(`Text must not exceed ${max} characters.`);
    return value.trim();
  }
  private optionalInt(value: unknown, field: string) {
    if (value === undefined || value === null || value === '') return null;
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number < -999_999 || number > 999_999)
      throw new BadRequestException(`${field} must be an integer year.`);
    return number;
  }
  private page(value: string, min: number, max: number) {
    const number = Number(value);
    if (!Number.isInteger(number) || number < min || number > max)
      throw new BadRequestException('Pagination value is invalid.');
    return number;
  }
  private enumValue(value: unknown, choices: string[], field: string) {
    if (typeof value !== 'string' || !choices.includes(value))
      throw new BadRequestException(`${field} is invalid.`);
    return value;
  }
  private uuidArray(value: unknown, field: string) {
    if (value === undefined) return [];
    if (
      !Array.isArray(value) ||
      value.some((id) => typeof id !== 'string' || !uuidPattern.test(id))
    )
      throw new BadRequestException(`${field} must be an array of UUIDs.`);
    return [...new Set(value as string[])];
  }
  private sourceRefs(value: unknown) {
    if (!Array.isArray(value))
      throw new BadRequestException(
        'sources must be an array of source references.',
      );
    return value.map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item))
        throw new BadRequestException('Source reference is invalid.');
      const ref = item as Record<string, unknown>;
      if (typeof ref.sourceId !== 'string' || !uuidPattern.test(ref.sourceId))
        throw new BadRequestException('sourceId must be a UUID.');
      return {
        sourceId: ref.sourceId,
        claimNote: this.text(ref.claimNote, 'claimNote', 4000),
        claimStanding: this.enumValue(
          ref.claimStanding,
          [
            'WELL_SUPPORTED',
            'SCHOLARLY_INTERPRETATION',
            'DISPUTED',
            'UNCERTAIN',
          ],
          'claimStanding',
        ),
        locator: this.optional(ref.locator, 1000),
      };
    });
  }
}
