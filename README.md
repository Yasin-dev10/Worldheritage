# WorldHeritage

WorldHeritage is a founder-owned multilingual history and digital heritage platform. It is built around traceable historical sources, visible uncertainty, editorial accountability, accessibility, and Somali (`so`) and English (`en`) localization.

## Current status

The public web platform includes discovery routes and API reads for countries, events, people, civilizations, articles, timelines, and global search. Phase 5 includes an OIDC-protected admin dashboard, country/article editors, admin CRUD screens for events, figures, timelines and civilizations, source/media metadata forms, workflow actions, revision history, and audit logs. API writes enforce roles and record audit events. See [Phase 5 CMS status](docs/PHASE5.md) for supported workflows and identity-provider setup. No historical records are seeded, so public directories remain empty until reviewed content is published.

## Repository layout

```text
web/                   Next.js, TypeScript, Tailwind CSS (public discovery platform)
backend/               NestJS REST API, Prisma schema and migrations (public read endpoints)
app/                   Flutter starter (later phase)
docs/                  Product, architecture, data, API, policy, and roadmap
compose.yaml           Local PostgreSQL service
```

The existing Flutter starter is preserved; mobile product work remains deferred. The web and API are npm workspaces managed by the root lockfile.

## Documentation

- [Product requirements](docs/PRD.md)
- [Architecture and local setup](docs/ARCHITECTURE.md)
- [Database model](docs/DATABASE.md)
- [REST API contract](docs/API.md)
- [Content policy](docs/CONTENT_POLICY.md)
- [Roadmap and implementation status](docs/ROADMAP.md)

## Quick start

Prerequisites: Git, Node.js 24 and npm 11 (minimum Node 20.19 and npm 10), and Docker Desktop with Compose. Start Docker Desktop before running Compose.

From the repository root, create `.env` only if you do not already have one. Keep real credentials in the ignored `.env` file, never in `.env.example` or source control. Set `DATABASE_URL` to the same host port as `POSTGRES_PORT`.

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
# Edit .env: set local POSTGRES_USER/POSTGRES_PASSWORD and match DATABASE_URL's port to POSTGRES_PORT.
docker compose up -d postgres
npm.cmd ci
npm.cmd run db:generate --workspace backend
npm.cmd run db:migrate --workspace backend
```

Run the API and web app in separate terminals:

```powershell
npm.cmd run dev:api
npm.cmd run dev:web
```

The API defaults to `http://localhost:4001/api/v1`. Next.js starts on port 3000 and automatically selects another available port if 3000 is occupied. Set `NEXT_PUBLIC_API_URL` in `.env` if the API runs somewhere else. The database container defaults to host port 5432; set `POSTGRES_PORT` and update `DATABASE_URL` together if that port is occupied.

See [Architecture: development setup](docs/ARCHITECTURE.md#8-development-prerequisites-and-setup) for Windows and shell commands, environment details, verification, and deployment guidance.

## Verification

From the repository root:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run format:check
npm.cmd test
npm.cmd run test:e2e --workspace backend
npm.cmd run build
npm.cmd audit
```

These commands verify code and dependencies; they do not establish historical accuracy. No historical records are seeded. Add claims only with traceable sources and editorial review.

## Project conventions

- Keep material historical claims linked to sources; distinguish well-supported evidence, interpretation, disputed claims, and uncertainty.
- Treat Somali and English as independently authored and reviewed locales.
- Store system timestamps in UTC; represent historical dates with explicit precision and calendar context.
- Enforce access on the server. Admin-only UI is never an authorization boundary.
- Keep secrets out of source control; `.env.example` contains placeholders only.
- Use small, reviewable changes with linting, formatting, type checking, and meaningful tests.
- Do not scrape or republish copyrighted material without authorization.

## Scope boundary

Phase 1 has been reviewed and the technical foundation is underway. Do not begin additional product phases or broaden the content scope without reviewing the roadmap and agreeing on the next implementation slice. This repository is not approved for public launch.
