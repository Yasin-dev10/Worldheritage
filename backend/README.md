# WorldHeritage API

NestJS REST API workspace. Public content reads are implemented for the Phase 4 collections. Protected Phase 5 admin endpoints provide CRUD, role-checked workflow transitions, revision snapshots, source/media metadata, and audit logs. OIDC setup and endpoint coverage are documented in [Phase 5 CMS status](../docs/PHASE5.md).

Use the repository root [README](../README.md) and [architecture guide](../docs/ARCHITECTURE.md) for setup and conventions. The initial country editorial schema is in `prisma/schema.prisma`, with migrations in `prisma/migrations/`. Generate the client using `npm run db:generate --workspace backend`; apply the local migration with `npm run db:migrate --workspace backend` after starting PostgreSQL and configuring a local `.env`.

## Somali history batch importer

`npm run import:somali-history --workspace backend` runs a read-only dry run against the JSON, record CSV, source catalogue CSV, and current database. It writes a detailed report to `docs/import-reports/somali-history-batch1.json`. To create missing records, run `node scripts/import-somali-history-batch.mjs --apply` from `backend/`. The importer checks JSON/CSV consistency, maps topics/events/figures to the existing article/event/person models, reuses sources by URL, and skips matching slugs or Somali titles. It never updates existing content or publishes imported content. Claim/source links are marked `UNCERTAIN`; source URLs are not treated as historical verification.
