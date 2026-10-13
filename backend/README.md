# WorldHeritage API

NestJS REST API workspace. Public content reads are implemented for the Phase 4 collections. The initial protected Phase 5 endpoints and OIDC setup are documented in [Phase 5 CMS status](../docs/PHASE5.md).

Use the repository root [README](../README.md) and [architecture guide](../docs/ARCHITECTURE.md) for setup and conventions. The initial country editorial schema is in `prisma/schema.prisma`, with migrations in `prisma/migrations/`. Generate the client using `npm run db:generate --workspace backend`; apply the local migration with `npm run db:migrate --workspace backend` after starting PostgreSQL and configuring a local `.env`.
