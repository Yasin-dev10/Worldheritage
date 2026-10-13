# WorldHeritage API

NestJS REST API workspace. The only HTTP route currently implemented is `GET /api/v1/health`; content and administrative routes are not implemented.

Use the repository root [README](../README.md) and [architecture guide](../docs/ARCHITECTURE.md) for setup and conventions. The initial country editorial schema is in `prisma/schema.prisma`, with migrations in `prisma/migrations/`. Generate the client using `npm run db:generate --workspace backend`; apply the local migration with `npm run db:migrate --workspace backend` after starting PostgreSQL and configuring a local `.env`.
