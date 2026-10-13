# Architecture

**Status:** Phase 1 architecture baseline; the modular-monolith direction is in place. Several security and editorial services remain design/implementation work and require review before production.

## 1. System shape

Start with a modular monolith: one Next.js web application, one NestJS REST API, and one PostgreSQL database. Keep domain modules separated in code without introducing independently deployed services. A generic Flutter starter is present in `app/`, but product work there, object storage, and retrieval-augmented generation (RAG) are later additions.

```text
Browser ── HTTPS ──> Next.js web ── HTTPS/JSON ──> NestJS API ──> PostgreSQL
                                                  └─> object storage (later)
```

The API owns authorization, validation, workflow, and persistence. The web application must not connect to PostgreSQL directly. The target rule is to expose only approved, published revisions. The current country reader filters to `PUBLISHED`; the approval/publication workflow and protected API operations are not implemented yet. Admin and contributor screens are not security boundaries: every protected operation must be authorized in the API.

## 2. Proposed repository structure

```text
web/                      Next.js App Router, TypeScript, Tailwind, shadcn/ui
backend/                  NestJS modules, REST controllers, services, persistence
app/                      Flutter client (later phase)
packages/contracts/       Shared request/response schemas (only when useful)
packages/config/           Shared lint and formatting config (only when useful)
docs/                     Product and engineering decisions
```

The Flutter starter in `app/` is preserved; product implementation there remains deferred. The Next.js and NestJS workspaces are implemented in `web/` and `backend/`. Prisma ORM 6.19.3 and its PostgreSQL driver adapter provide database access; migrations live in `backend/prisma/migrations/`. The implemented public country routes are an initial slice, not a complete domain API.

## 3. Backend module boundaries

Initial NestJS modules: Identity and Access; Countries; Historical Periods; Events; People; Places; Civilizations; Sources; Media Metadata; Localizations; Submissions and Reviews; Audit. Keep publication workflow and domain rules in application/domain services, not in controllers. Use PostgreSQL foreign keys and transactions for approval/publication changes.

## 4. Identity and security

Use a maintained identity provider or a reviewed standards-based authentication library; choose one in Phase 2 after jurisdiction, account flows, and operational requirements are known. Do not build password cryptography or token protocols from scratch. Require verified identity for contributor/admin actions; public reading may be anonymous. Prefer secure, HttpOnly, SameSite cookies for a browser session when compatible with the chosen deployment and CSRF strategy. If bearer tokens are used for mobile/API clients, define rotation, expiry, revocation, and storage before launch.

Authorization uses server-side role and scope checks (e.g. Country Editor assigned country IDs), deny by default, and least privilege. Super Admin actions require stronger authentication and are audited. Protect mutations against CSRF where cookie authentication is used; apply rate limits to login, submissions, and public reporting. Validate and normalize inputs at the API boundary, use parameterized database access, encode output, and avoid logging credentials or sensitive tokens.

## 5. Data and content integrity

PostgreSQL is authoritative for structured content. Stable UUID identifiers, foreign keys, unique constraints, transactions, and migrations protect integrity. Store system timestamps as `timestamptz` in UTC. Historical dates use a structured value with precision, calendar, and uncertainty rather than a fabricated exact timestamp. Localized text is separated from canonical entities and carries locale and review status. Sources attach to claims/content revisions through explicit relationships.

Publication is revision-aware. A submitted revision is immutable once reviewed; edits produce a new revision. Only an approved revision can be made public. Rejection/request-changes decisions retain reviewer, time, and rationale. Audit events are append-only at application level; stronger tamper-evident retention is a launch hardening decision.

## 6. API and validation

Expose `/api/v1` REST endpoints as specified in [API.md](API.md). Validate DTOs on every write, reject unknown or malformed values where appropriate, enforce length/range constraints, and validate relationship permissions in the service layer. Return a consistent error envelope; never expose stack traces, SQL, secrets, or internal tokens.

## 7. Operations, deployment, and recovery

The current Compose file runs PostgreSQL only; the web and API run through npm workspaces during local development. Production deployment of web, API, and PostgreSQL remains to be designed. Use managed PostgreSQL where possible, TLS in transit, encrypted backups, tested restore procedures, health/readiness checks, structured redacted logs, and error/availability monitoring. Keep web/API stateless where practical. Apply schema migrations as an explicit, reviewed release step. Define retention, recovery objectives, and data residency before launch.

Media binaries are out of scope now. When introduced, use private-by-default S3-compatible storage, authorization-aware signed URLs, content type/size validation, malware scanning where appropriate, licensing metadata, and lifecycle/retention policy. Never assume a source URL grants republication rights.

## 8. Development prerequisites and setup

Prerequisites: Git; Node.js 24 and npm 11 (minimum Node 20.19 and npm 10); Docker Desktop with Compose; PostgreSQL only for non-container local work. Flutter SDK is needed only for Flutter work. Root npm workspaces manage `web/` and `backend/` with a single lockfile. Prisma 6.19.3 uses `backend/prisma.config.ts` for its datasource URL and `backend/prisma/schema.prisma` for the data model. The API uses Prisma's PostgreSQL driver adapter with the `pg` connection pool. The generated Prisma client is copied into `backend/dist/generated/prisma` during the backend production build.

From the repository root, create `.env` from `.env.example` only if you do not already have one. Do not overwrite an existing local `.env`. Replace placeholders with local-only credentials. `POSTGRES_PORT` must match the port in `DATABASE_URL`; the example uses 5432. If 5432 is occupied, choose another local port (for example 5434) in both variables. If an `npm ci` on Windows fails with `EPERM` while unlinking Next.js SWC, close the process using the web workspace and retry; do not remove user files or stop unrelated containers.

```sh
test -e .env || cp .env.example .env # Windows PowerShell: if (-not (Test-Path .env)) { Copy-Item .env.example .env }
docker compose up -d postgres
npm ci
npm run db:generate --workspace backend
npm run db:migrate --workspace backend
npm run dev:api                      # separate terminal: NestJS API
npm run dev:web                      # separate terminal: Next.js web
npm run lint
npm run typecheck
npm run format:check
npm test
npm run test:e2e --workspace backend
npm run build
npm audit
```

If Docker reports that its engine pipe/API is unavailable, start Docker Desktop and wait for the engine before running Compose. Do not run `npm ci` concurrently with an active Next.js build/dev process that has locked native files. Do not commit `.env`. Use `.env.example` as a variable-name inventory. Generate local secrets with an approved password manager or cryptographic generator; inject production values from the deployment secret manager. The Prisma configuration and API load the root `.env` first and use `backend/.env` only as a fallback.

## 9. Environment variable inventory

`.env.example` contains placeholders only. Variables: `NODE_ENV`, `API_PORT`, `WEB_ORIGIN`, `API_BASE_URL`, `NEXT_PUBLIC_API_URL`, `DATABASE_URL`, `POSTGRES_DB`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `AUTH_ISSUER_URL`, `AUTH_CLIENT_ID`, `AUTH_CLIENT_SECRET`, `SESSION_SECRET`, and `LOG_LEVEL`. Set `POSTGRES_PORT` when host port 5432 is occupied and keep it consistent with `DATABASE_URL`. The API defaults to port 4001; Next.js uses port 3000 and automatically selects the next available port when it is occupied. The API reads `DATABASE_URL` and serves health plus published-country read routes; identity-provider variables and `WEB_ORIGIN` are not yet consumed. `NEXT_PUBLIC_API_URL` configures browser-side country discovery, while `API_BASE_URL` configures server-side country detail requests. Do not use example values in production.

## 10. Quality and Git hygiene

- Use feature branches and focused commits; do not commit secrets, local env files, build output, or dependency directories.
- Enforce TypeScript strictness, Oxlint, Prettier, type checking, and lockfile consistency in CI.
- Add unit tests for domain rules and permission decisions; integration tests for API/database workflow; end-to-end tests for critical publish and access flows.
- Require review for migrations, authorization, publication workflow, and content-policy changes.
- Record architecture decisions that materially change the proposed boundaries or security model.

## 11. Decisions deferred

Phase 2 has selected npm workspaces, Node 24 for local development, PostgreSQL 17 in local Compose, and Prisma ORM 6.19.3 with the PostgreSQL driver adapter. `deepmerge-ts` is overridden to 8.0.2 to use the patched release required by the current dependency audit. Migrations are managed by Prisma; migration SQL retains database constraints that the ORM schema cannot fully represent. The API serves health and published-country read routes through Prisma. Authentication, server-side role enforcement, submission/review/publishing write routes, and audit-event persistence remain unimplemented.

Identity provider and login methods; hosting/vendor; production database hosting/version; privacy/legal jurisdiction; observability stack; backup objectives; and accessibility audit process remain deferred. Resolve these before implementing accounts, privileged content routes, or production deployment.
