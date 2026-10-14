import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Patch,
  Delete,
  NotFoundException,
  Param,
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

const { EditorialState, ClaimStanding } = prismaClientModule;
type ManagedKind = 'items' | 'maps' | 'exhibitions';
const SLUG = /^[a-z0-9-]{1,200}$/;

@Controller('admin/museum')
@UseGuards(OidcAuthGuard, RolesGuard)
@RequireRoles('Admin', 'Editor', 'Reviewer')
export class MuseumAdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':kind')
  async list(
    @Param('kind') kind: ManagedKind,
    @Query('limit') limit = '30',
    @Query('offset') offset = '0',
  ) {
    this.assertKind(kind);
    const take = this.page(limit, 1, 100);
    const skip = this.page(offset, 0, 100_000);
    if (kind === 'items') {
      const [data, total] = await this.prisma.$transaction([
        this.prisma.museumItem.findMany({
          orderBy: { updatedAt: 'desc' },
          take,
          skip,
          include: { translations: { where: { locale: 'so' } } },
        }),
        this.prisma.museumItem.count(),
      ]);
      return { data, total, limit: take, offset: skip };
    }
    if (kind === 'maps') {
      const [data, total] = await this.prisma.$transaction([
        this.prisma.historicalMap.findMany({
          orderBy: { updatedAt: 'desc' },
          take,
          skip,
          include: { translations: { where: { locale: 'so' } } },
        }),
        this.prisma.historicalMap.count(),
      ]);
      return { data, total, limit: take, offset: skip };
    }
    const [data, total] = await this.prisma.$transaction([
      this.prisma.museumExhibition.findMany({
        orderBy: { updatedAt: 'desc' },
        take,
        skip,
        include: { translations: { where: { locale: 'so' } } },
      }),
      this.prisma.museumExhibition.count(),
    ]);
    return { data, total, limit: take, offset: skip };
  }

  @Get(':kind/:id')
  async detail(@Param('kind') kind: ManagedKind, @Param('id') id: string) {
    this.assertKind(kind);
    const include =
      kind === 'items'
        ? { translations: true, sources: true }
        : kind === 'maps'
          ? { translations: true, sources: true }
          : { translations: true, items: true };
    const record =
      kind === 'items'
        ? await this.prisma.museumItem.findUnique({ where: { id }, include })
        : kind === 'maps'
          ? await this.prisma.historicalMap.findUnique({
              where: { id },
              include,
            })
          : await this.prisma.museumExhibition.findUnique({
              where: { id },
              include,
            });
    if (!record) throw new NotFoundException('Museum record not found.');
    return {
      ...record,
      ...(kind === 'exhibitions'
        ? {
            itemIds: (record as { items: Array<{ itemId: string }> }).items.map(
              ({ itemId }) => itemId,
            ),
          }
        : {}),
    };
  }

  @Post(':kind')
  @RequireRoles('Admin', 'Editor')
  async create(
    @Param('kind') kind: ManagedKind,
    @Body() body: Record<string, unknown>,
    @Req() request: AuthenticatedRequest,
  ) {
    this.assertKind(kind);
    if (!body || typeof body !== 'object' || Array.isArray(body))
      throw new BadRequestException('Request body must be a JSON object.');
    const slug = this.text(body.slug, 'slug', 200);
    if (!SLUG.test(slug))
      throw new BadRequestException(
        'slug must use lowercase letters, numbers, and hyphens.',
      );
    const locale = body.locale === 'en' ? 'en' : 'so';
    const title = this.text(body.title, 'title', 500);
    const description = this.text(body.description, 'description', 100_000);
    const sources = kind === 'exhibitions' ? [] : this.sourceRefs(body.sources);
    if (kind !== 'exhibitions' && !sources.length)
      throw new BadRequestException(
        'At least one traceable source is required.',
      );
    const row = await this.prisma.$transaction(async (tx) => {
      let record: { id: string; state: string };
      if (kind === 'items') {
        record = await tx.museumItem.create({
          data: {
            slug,
            dateDisplay: this.optional(body.dateDisplay, 200),
            datePrecision: this.enumValue(
              body.datePrecision,
              [
                'EXACT_DAY',
                'MONTH',
                'YEAR',
                'DECADE',
                'CENTURY',
                'RANGE',
                'CIRCA',
                'UNKNOWN',
              ],
              'datePrecision',
            ) as never,
            provenance: this.optional(body.provenance, 4000),
            currentLocation: this.optional(body.currentLocation, 1000),
            creatorAttribution: this.optional(body.creatorAttribution, 1000),
            rightsNotes: this.optional(body.rightsNotes, 4000),
            mediaAssetId: this.optionalUuid(body.mediaAssetId, 'mediaAssetId'),
            translations: { create: { locale, title, description } },
            sources: {
              create: sources.map((source) => ({
                sourceId: source.sourceId,
                claimNote: source.claimNote,
                claimStanding: source.claimStanding as never,
                locator: source.locator,
              })),
            },
          },
        });
      } else if (kind === 'maps') {
        record = await tx.historicalMap.create({
          data: {
            slug,
            dateDisplay: this.optional(body.dateDisplay, 200),
            startYear: this.optionalInt(body.startYear, 'startYear'),
            endYear: this.optionalInt(body.endYear, 'endYear'),
            datePrecision: this.enumValue(
              body.datePrecision,
              [
                'EXACT_DAY',
                'MONTH',
                'YEAR',
                'DECADE',
                'CENTURY',
                'RANGE',
                'CIRCA',
                'UNKNOWN',
              ],
              'datePrecision',
            ) as never,
            geographicArea: this.optional(body.geographicArea, 1000),
            provenance: this.optional(body.provenance, 4000),
            rightsNotes: this.optional(body.rightsNotes, 4000),
            mediaAssetId: this.optionalUuid(body.mediaAssetId, 'mediaAssetId'),
            translations: { create: { locale, title, description } },
            sources: {
              create: sources.map((source) => ({
                sourceId: source.sourceId,
                claimNote: source.claimNote,
                claimStanding: source.claimStanding as never,
              })),
            },
          },
        });
      } else {
        const itemIds = Array.isArray(body.itemIds)
          ? body.itemIds.filter((id): id is string => typeof id === 'string')
          : [];
        record = await tx.museumExhibition.create({
          data: {
            slug,
            topic: this.optional(body.topic, 500),
            translations: { create: { locale, title, summary: description } },
            items: itemIds.length
              ? {
                  create: itemIds.map((itemId, position) => ({
                    itemId,
                    position,
                  })),
                }
              : undefined,
          },
        });
      }
      await tx.contentRevision.create({
        data: {
          contentType: `Museum${kind}`,
          contentId: record.id,
          revisionNumber: 1,
          state: EditorialState.DRAFT,
          editorSubject: request.user.sub,
          snapshot: { slug, title, description },
        },
      });
      await tx.auditEvent.create({
        data: {
          actorSubject: request.user.sub,
          action: `MUSEUM_${kind.toUpperCase()}_CREATED`,
          targetType: `Museum${kind}`,
          targetId: record.id,
        },
      });
      return record;
    });
    return row;
  }

  @Patch(':kind/:id')
  @RequireRoles('Admin', 'Editor')
  async update(
    @Param('kind') kind: ManagedKind,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @Req() request: AuthenticatedRequest,
  ) {
    this.assertKind(kind);
    if (!body || typeof body !== 'object' || Array.isArray(body))
      throw new BadRequestException('Request body must be a JSON object.');
    const existing =
      kind === 'items'
        ? await this.prisma.museumItem.findUnique({
            where: { id },
            include: { translations: true, sources: true },
          })
        : kind === 'maps'
          ? await this.prisma.historicalMap.findUnique({
              where: { id },
              include: { translations: true, sources: true },
            })
          : await this.prisma.museumExhibition.findUnique({
              where: { id },
              include: { translations: true, items: true },
            });
    if (!existing) throw new NotFoundException('Museum record not found.');
    if (!['DRAFT', 'CHANGES_REQUESTED'].includes(existing.state))
      throw new BadRequestException(
        'Only drafts and returned records can be edited.',
      );
    const slug =
      body.slug === undefined
        ? existing.slug
        : this.text(body.slug, 'slug', 200);
    if (!SLUG.test(slug))
      throw new BadRequestException(
        'slug must use lowercase letters, numbers, and hyphens.',
      );
    const locale = body.locale === 'en' ? 'en' : 'so';
    const translations = (
      existing as { translations: Array<Record<string, unknown>> }
    ).translations;
    const oldTranslation = translations.find(
      (entry) => entry.locale === locale,
    );
    const title =
      body.title === undefined
        ? (oldTranslation?.title as string | undefined)
        : this.text(body.title, 'title', 500);
    const description =
      body.description === undefined
        ? ((oldTranslation?.description ?? oldTranslation?.summary) as
            string | undefined)
        : this.text(body.description, 'description', 100_000);
    if (!title || !description)
      throw new BadRequestException(
        `A ${locale} title and description are required.`,
      );
    const sourceRefs =
      body.sources === undefined
        ? undefined
        : kind === 'exhibitions'
          ? []
          : this.sourceRefs(body.sources);
    if (sourceRefs && sourceRefs.length === 0 && kind !== 'exhibitions')
      throw new BadRequestException(
        'At least one traceable source is required.',
      );
    const ids =
      body.itemIds === undefined ? undefined : this.uuidArray(body.itemIds);
    const result = await this.prisma.$transaction(async (tx) => {
      const data =
        kind === 'items'
          ? {
              slug,
              dateDisplay:
                body.dateDisplay === undefined
                  ? undefined
                  : this.optional(body.dateDisplay, 200),
              datePrecision:
                body.datePrecision === undefined
                  ? undefined
                  : (this.enumValue(
                      body.datePrecision,
                      [
                        'EXACT_DAY',
                        'MONTH',
                        'YEAR',
                        'DECADE',
                        'CENTURY',
                        'RANGE',
                        'CIRCA',
                        'UNKNOWN',
                      ],
                      'datePrecision',
                    ) as never),
              provenance:
                body.provenance === undefined
                  ? undefined
                  : this.optional(body.provenance, 4000),
              currentLocation:
                body.currentLocation === undefined
                  ? undefined
                  : this.optional(body.currentLocation, 1000),
              creatorAttribution:
                body.creatorAttribution === undefined
                  ? undefined
                  : this.optional(body.creatorAttribution, 1000),
              rightsNotes:
                body.rightsNotes === undefined
                  ? undefined
                  : this.optional(body.rightsNotes, 4000),
              mediaAssetId:
                body.mediaAssetId === undefined
                  ? undefined
                  : this.optionalUuid(body.mediaAssetId, 'mediaAssetId'),
              translations: {
                upsert: {
                  where: { itemId_locale: { itemId: id, locale } },
                  create: { locale, title, description },
                  update: { title, description },
                },
              },
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
            }
          : kind === 'maps'
            ? {
                slug,
                dateDisplay:
                  body.dateDisplay === undefined
                    ? undefined
                    : this.optional(body.dateDisplay, 200),
                startYear:
                  body.startYear === undefined
                    ? undefined
                    : this.optionalInt(body.startYear, 'startYear'),
                endYear:
                  body.endYear === undefined
                    ? undefined
                    : this.optionalInt(body.endYear, 'endYear'),
                datePrecision:
                  body.datePrecision === undefined
                    ? undefined
                    : (this.enumValue(
                        body.datePrecision,
                        [
                          'EXACT_DAY',
                          'MONTH',
                          'YEAR',
                          'DECADE',
                          'CENTURY',
                          'RANGE',
                          'CIRCA',
                          'UNKNOWN',
                        ],
                        'datePrecision',
                      ) as never),
                geographicArea:
                  body.geographicArea === undefined
                    ? undefined
                    : this.optional(body.geographicArea, 1000),
                provenance:
                  body.provenance === undefined
                    ? undefined
                    : this.optional(body.provenance, 4000),
                rightsNotes:
                  body.rightsNotes === undefined
                    ? undefined
                    : this.optional(body.rightsNotes, 4000),
                mediaAssetId:
                  body.mediaAssetId === undefined
                    ? undefined
                    : this.optionalUuid(body.mediaAssetId, 'mediaAssetId'),
                translations: {
                  upsert: {
                    where: { mapId_locale: { mapId: id, locale } },
                    create: { locale, title, description },
                    update: { title, description },
                  },
                },
                ...(sourceRefs
                  ? {
                      sources: {
                        deleteMany: {},
                        create: sourceRefs.map(
                          ({ sourceId, claimNote, claimStanding }) => ({
                            sourceId,
                            claimNote,
                            claimStanding: claimStanding as never,
                          }),
                        ),
                      },
                    }
                  : {}),
              }
            : {
                slug,
                topic:
                  body.topic === undefined
                    ? undefined
                    : this.optional(body.topic, 500),
                translations: {
                  upsert: {
                    where: {
                      exhibitionId_locale: { exhibitionId: id, locale },
                    },
                    create: { locale, title, summary: description },
                    update: { title, summary: description },
                  },
                },
                ...(ids
                  ? {
                      items: {
                        deleteMany: {},
                        create: ids.map((itemId, position) => ({
                          itemId,
                          position,
                        })),
                      },
                    }
                  : {}),
              };
      const updated =
        kind === 'items'
          ? await tx.museumItem.update({ where: { id }, data: data as never })
          : kind === 'maps'
            ? await tx.historicalMap.update({
                where: { id },
                data: data as never,
              })
            : await tx.museumExhibition.update({
                where: { id },
                data: data as never,
              });
      const oldRevision = await tx.contentRevision.findFirst({
        where: { contentType: `Museum${kind}`, contentId: id },
        orderBy: { revisionNumber: 'desc' },
      });
      const revision = await tx.contentRevision.create({
        data: {
          contentType: `Museum${kind}`,
          contentId: id,
          revisionNumber: (oldRevision?.revisionNumber ?? 0) + 1,
          state: updated.state,
          editorSubject: request.user.sub,
          snapshot: JSON.parse(JSON.stringify(updated)),
        },
      });
      await tx.auditEvent.create({
        data: {
          actorSubject: request.user.sub,
          action: `MUSEUM_${kind.toUpperCase()}_UPDATED`,
          targetType: `Museum${kind}`,
          targetId: id,
          metadata: { revisionId: revision.id },
        },
      });
      return updated;
    });
    return result;
  }

  @Delete(':kind/:id')
  @RequireRoles('Admin', 'Editor')
  async archive(
    @Param('kind') kind: ManagedKind,
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    this.assertKind(kind);
    return this.prisma.$transaction(async (tx) => {
      const existing =
        kind === 'items'
          ? await tx.museumItem.findUnique({ where: { id } })
          : kind === 'maps'
            ? await tx.historicalMap.findUnique({ where: { id } })
            : await tx.museumExhibition.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Museum record not found.');
      if (existing.state === EditorialState.ARCHIVED) return existing;
      const data = { state: EditorialState.ARCHIVED };
      const updated =
        kind === 'items'
          ? await tx.museumItem.update({ where: { id }, data })
          : kind === 'maps'
            ? await tx.historicalMap.update({ where: { id }, data })
            : await tx.museumExhibition.update({ where: { id }, data });
      const oldRevision = await tx.contentRevision.findFirst({
        where: { contentType: `Museum${kind}`, contentId: id },
        orderBy: { revisionNumber: 'desc' },
      });
      await tx.contentRevision.create({
        data: {
          contentType: `Museum${kind}`,
          contentId: id,
          revisionNumber: (oldRevision?.revisionNumber ?? 0) + 1,
          state: EditorialState.ARCHIVED,
          editorSubject: request.user.sub,
          snapshot: JSON.parse(JSON.stringify({ ...existing, ...updated })),
        },
      });
      await tx.auditEvent.create({
        data: {
          actorSubject: request.user.sub,
          action: `MUSEUM_${kind.toUpperCase()}_ARCHIVED`,
          targetType: `Museum${kind}`,
          targetId: id,
        },
      });
      return updated;
    });
  }

  @Post(':kind/:id/workflow')
  async workflow(
    @Param('kind') kind: ManagedKind,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @Req() request: AuthenticatedRequest,
  ) {
    this.assertKind(kind);
    const action = this.text(body?.action, 'action', 30);
    const reviewer = ['review', 'approve', 'return', 'reject'].includes(action);
    if (
      !(reviewer ? ['Admin', 'Reviewer'] : ['Admin', 'Editor']).some((role) =>
        request.user.roles?.includes(role),
      )
    )
      throw new ForbiddenException(
        'Your account cannot perform this workflow action.',
      );
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
    const rationale =
      action === 'return' || action === 'reject'
        ? this.text(body.rationale, 'rationale', 4000)
        : '';
    return this.prisma.$transaction(async (tx) => {
      const existing =
        kind === 'items'
          ? await tx.museumItem.findUnique({
              where: { id },
              select: { state: true },
            })
          : kind === 'maps'
            ? await tx.historicalMap.findUnique({
                where: { id },
                select: { state: true },
              })
            : await tx.museumExhibition.findUnique({
                where: { id },
                select: { state: true },
              });
      if (!existing) throw new NotFoundException('Museum record not found.');
      if (existing.state !== transition.from)
        throw new BadRequestException(
          `Cannot ${action} a record in ${existing.state}.`,
        );
      if (action === 'publish') {
        if (kind === 'items') {
          if (!(await tx.museumItemSource.count({ where: { itemId: id } })))
            throw new BadRequestException(
              'Records need at least one source before publication.',
            );
        } else if (kind === 'maps') {
          if (!(await tx.historicalMapSource.count({ where: { mapId: id } })))
            throw new BadRequestException(
              'Records need at least one source before publication.',
            );
        } else if (
          !(await tx.exhibitionItem.count({
            where: {
              exhibitionId: id,
              item: { state: EditorialState.PUBLISHED, sources: { some: {} } },
            },
          }))
        ) {
          throw new BadRequestException(
            'Exhibitions need a published, source-backed item before publication.',
          );
        }
      }
      const updateData = {
        state: transition.to as never,
        ...(action === 'publish' ? { publishedAt: new Date() } : {}),
      };
      const updated =
        kind === 'items'
          ? await tx.museumItem.update({ where: { id }, data: updateData })
          : kind === 'maps'
            ? await tx.historicalMap.update({ where: { id }, data: updateData })
            : await tx.museumExhibition.update({
                where: { id },
                data: updateData,
              });
      const previousRevision = await tx.contentRevision.findFirst({
        where: { contentType: `Museum${kind}`, contentId: id },
        orderBy: { revisionNumber: 'desc' },
      });
      const revision = await tx.contentRevision.create({
        data: {
          contentType: `Museum${kind}`,
          contentId: id,
          revisionNumber: (previousRevision?.revisionNumber ?? 0) + 1,
          state: transition.to as never,
          editorSubject: request.user.sub,
          snapshot: JSON.parse(JSON.stringify({ ...existing, ...updated })),
        },
      });
      if (reviewer && action !== 'review') {
        await tx.cmsReview.create({
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
          action: `MUSEUM_${kind.toUpperCase()}_${action.toUpperCase()}`,
          targetType: `Museum${kind}`,
          targetId: id,
          metadata: {
            from: existing.state,
            to: transition.to,
            ...(rationale ? { rationale } : {}),
          },
        },
      });
      return updated;
    });
  }

  private assertKind(kind: string): asserts kind is ManagedKind {
    if (!['items', 'maps', 'exhibitions'].includes(kind))
      throw new NotFoundException('Unknown museum collection.');
  }
  private page(value: string, minimum: number, maximum: number) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum)
      throw new BadRequestException('Pagination value is invalid.');
    return parsed;
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
    const n = Number(value);
    if (!Number.isInteger(n))
      throw new BadRequestException(`${field} must be an integer.`);
    return n;
  }
  private optionalUuid(value: unknown, field: string) {
    if (value === undefined || value === null || value === '') return null;
    if (
      typeof value !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      )
    )
      throw new BadRequestException(`${field} must be a UUID.`);
    return value;
  }
  private uuidArray(value: unknown) {
    if (
      !Array.isArray(value) ||
      value.some(
        (id) =>
          typeof id !== 'string' ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            id,
          ),
      )
    )
      throw new BadRequestException('itemIds must be an array of UUIDs.');
    return [...new Set(value as string[])];
  }
  private enumValue(value: unknown, choices: string[], field: string) {
    const candidate = value ?? 'UNKNOWN';
    if (typeof candidate !== 'string' || !choices.includes(candidate))
      throw new BadRequestException(`${field} is invalid.`);
    return candidate;
  }
  private sourceRefs(value: unknown) {
    if (!Array.isArray(value))
      throw new BadRequestException(
        'sources must be an array of source references.',
      );
    return value.map((entry) => {
      if (!entry || typeof entry !== 'object')
        throw new BadRequestException(
          'Each source requires sourceId and claimNote.',
        );
      const source = entry as Record<string, unknown>;
      return {
        sourceId:
          this.optionalUuid(source.sourceId, 'sourceId') ??
          (() => {
            throw new BadRequestException('sourceId is required.');
          })(),
        claimNote: this.text(source.claimNote, 'claimNote', 4000),
        claimStanding: this.enumValue(
          source.claimStanding,
          Object.keys(ClaimStanding),
          'claimStanding',
        ),
        locator: this.optional(source.locator, 1000),
      };
    });
  }
}
