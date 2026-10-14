import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const databaseUrl = process.env.PHASE6_TEST_DATABASE_URL;
if (
  databaseUrl &&
  !new URL(databaseUrl).pathname.toLowerCase().includes('test')
) {
  throw new Error(
    'PHASE6_TEST_DATABASE_URL must point to a database with "test" in its name.',
  );
}
if (databaseUrl) process.env.DATABASE_URL = databaseUrl;

describe('Phase 6 PostgreSQL integration', () => {
  const configured = Boolean(databaseUrl);
  it.skipIf(!configured)(
    'uses an explicitly configured isolated test database',
    () => {
      expect(databaseUrl).toMatch(/(?:_test|test\b)/i);
    },
  );

  describe.skipIf(!configured)(
    'migrated schema and published-content filtering',
    () => {
      let prisma: import('./prisma.service.js').PrismaService;
      let MuseumController: typeof import('./museum.controller.js').MuseumController;
      let PeriodsController: typeof import('./periods.controller.js').PeriodsController;
      let sourceId: string;
      let itemId: string;
      let draftItemId: string;
      let periodId: string;
      const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      beforeAll(async () => {
        const [{ PrismaService }, museum, periods] = await Promise.all([
          import('./prisma.service.js'),
          import('./museum.controller.js'),
          import('./periods.controller.js'),
        ]);
        prisma = new PrismaService();
        MuseumController = museum.MuseumController;
        PeriodsController = periods.PeriodsController;
        await prisma.$connect();
        const migrationRows = await prisma.$queryRaw<
          Array<{ migration_name: string }>
        >`SELECT migration_name FROM _prisma_migrations WHERE migration_name IN ('20261014100000_phase6_museum_maps', '20261014120000_phase6_periods_relations') AND finished_at IS NOT NULL AND rolled_back_at IS NULL`;
        expect(migrationRows.map((row) => row.migration_name)).toEqual(
          expect.arrayContaining([
            '20261014100000_phase6_museum_maps',
            '20261014120000_phase6_periods_relations',
          ]),
        );
        const tableRows = await prisma.$queryRaw<
          Array<{ table_name: string }>
        >`SELECT table_name::text AS table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('museum_items', 'historical_maps', 'historical_periods', 'period_sources', 'article_events')`;
        expect(tableRows.map((row) => row.table_name)).toEqual(
          expect.arrayContaining([
            'museum_items',
            'historical_maps',
            'historical_periods',
            'period_sources',
            'article_events',
          ]),
        );
        const source = await prisma.source.create({
          data: { sourceKind: 'OTHER', title: `Phase6 test source ${suffix}` },
        });
        sourceId = source.id;
        const item = await prisma.museumItem.create({
          data: {
            slug: `phase6-db-item-${suffix}`,
            state: 'PUBLISHED',
            publishedAt: new Date(),
            translations: {
              create: {
                locale: 'en',
                title: 'Integration artifact',
                description: 'Database-backed test fixture.',
              },
            },
            sources: {
              create: {
                sourceId,
                claimNote: 'Test fixture source link',
                claimStanding: 'WELL_SUPPORTED',
              },
            },
          },
        });
        itemId = item.id;
        const draft = await prisma.museumItem.create({
          data: {
            slug: `phase6-db-draft-${suffix}`,
            translations: {
              create: {
                locale: 'en',
                title: 'Uncited test artifact',
                description: 'Must not publish.',
              },
            },
          },
        });
        draftItemId = draft.id;
        const period = await prisma.historicalPeriod.create({
          data: {
            slug: `phase6-db-period-${suffix}`,
            state: 'PUBLISHED',
            publishedAt: new Date(),
            dateDisplay: 'approximately 1200–1300',
            datePrecision: 'CIRCA',
            dateCertainty: 'PROBABLE',
            startYear: 1200,
            endYear: 1300,
            translations: {
              create: {
                locale: 'en',
                title: 'Approximate period',
                summary: 'Test summary',
                body: 'Test body',
              },
            },
            sources: {
              create: {
                sourceId,
                claimNote: 'Approximate dates are preserved',
                claimStanding: 'UNCERTAIN',
              },
            },
          },
        });
        periodId = period.id;
      });

      afterAll(async () => {
        if (!prisma) return;
        if (periodId) {
          await prisma.periodEvent.deleteMany({ where: { periodId } });
          await prisma.periodSource.deleteMany({ where: { periodId } });
          await prisma.periodTranslation.deleteMany({ where: { periodId } });
          await prisma.historicalPeriod.delete({ where: { id: periodId } });
        }
        if (itemId) {
          await prisma.exhibitionItem.deleteMany({ where: { itemId } });
          await prisma.museumItemSource.deleteMany({ where: { itemId } });
          await prisma.museumItemTranslation.deleteMany({ where: { itemId } });
          await prisma.museumItem.delete({ where: { id: itemId } });
        }
        if (draftItemId) {
          await prisma.museumItemTranslation.deleteMany({
            where: { itemId: draftItemId },
          });
          await prisma.museumItem.delete({ where: { id: draftItemId } });
        }
        if (sourceId) await prisma.source.delete({ where: { id: sourceId } });
        await prisma.$disconnect();
      });

      it('persists citations and uncertain dates and returns the migrated published records', async () => {
        const museum = new MuseumController(prisma);
        const periods = new PeriodsController(prisma);
        const [items, period] = await Promise.all([
          museum.items('en', '50', undefined, 'Integration artifact'),
          periods.detail(`phase6-db-period-${suffix}`, 'en'),
        ]);
        expect(
          items.data.map((item) => item.id),
          `itemId=${itemId}; items=${JSON.stringify(items.data.map(({ id, slug, title }) => ({ id, slug, title })))}`,
        ).toContain(itemId);
        expect(period.datePrecision).toBe('CIRCA');
        expect(period.dateCertainty).toBe('PROBABLE');
        expect(period.sources).toHaveLength(1);
        expect(period.sources[0]?.claimStanding).toBe('UNCERTAIN');
      });

      it('enforces reviewer roles and rejects publication without database citations', async () => {
        const { MuseumAdminController } =
          await import('./museum-admin.controller.js');
        const admin = new MuseumAdminController(prisma);
        await expect(
          admin.workflow('items', draftItemId, { action: 'approve' }, {
            user: { sub: `editor-${suffix}`, roles: ['Editor'] },
          } as never),
        ).rejects.toMatchObject({ status: 403 });
        await admin.workflow('items', draftItemId, { action: 'submit' }, {
          user: { sub: `editor-${suffix}`, roles: ['Editor'] },
        } as never);
        await admin.workflow('items', draftItemId, { action: 'review' }, {
          user: { sub: `reviewer-${suffix}`, roles: ['Reviewer'] },
        } as never);
        await admin.workflow('items', draftItemId, { action: 'approve' }, {
          user: { sub: `reviewer-${suffix}`, roles: ['Reviewer'] },
        } as never);
        await expect(
          admin.workflow('items', draftItemId, { action: 'publish' }, {
            user: { sub: `admin-${suffix}`, roles: ['Admin'] },
          } as never),
        ).rejects.toMatchObject({ status: 400 });
        expect(
          (
            await prisma.museumItem.findUniqueOrThrow({
              where: { id: draftItemId },
            })
          ).state,
        ).toBe('APPROVED');
      });
    },
  );
});
