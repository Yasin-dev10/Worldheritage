# Roadmap

**Current status (2026-10-13):** Phase 1 foundation has been reviewed. The Phase 2 technical foundation is implemented for local development and CI, including PostgreSQL/Prisma 6.19.3, NestJS and Next.js workspaces, and a successful production build. The initial Phase 3 public discovery slice (country browse/search/detail with source metadata) is implemented in Somali and English. Authentication, role enforcement, editorial write workflows, and a reviewed content corpus are not implemented. This is not a public product release.

## Phase 1 — Product Foundation (prepared)

Deliver product requirements, architecture, initial entities and relationships, date/localization/publication conventions, API contract, content policy, setup/security/Git conventions, and roadmap. Establish a safe environment-variable template. No production app or historical content corpus.

**Exit:** documents are reviewed for product scope, schema consistency, editorial safeguards, and unresolved decisions; owner approves implementation priorities.

## Phase 2 — Technical foundation (in progress)

**Implemented foundation:** Next.js and NestJS workspaces, root npm scripts and lockfile, PostgreSQL Compose configuration, Prisma 6.19.3 schema and country editorial migration, API liveness endpoint, CI workflow, a bilingual web discovery slice, and database-backed published-country read endpoints. Production builds, lint, typecheck, format checks, unit/e2e tests, migration status, and npm audit were run locally; the dependency audit reported zero vulnerabilities after pinning `deepmerge-ts` 8.0.2. The API production process was smoke-tested against the local PostgreSQL database.

**Still in progress:** identity provider selection and authentication, server-side roles/scopes, submission and review/publishing workflow, persistent audit-event writes, a shared API error filter, complete Somali/English editorial review coverage, accessibility/security hardening, and deployment/restore verification. shadcn/ui is not yet integrated. No historical records are seeded.

- Resolve remaining decisions: jurisdiction/privacy requirements, anonymous reading/account policy, identity provider, hosting, and editorial governance.
- Complete and review the selected web/API workspace(s), Prisma migrations, Docker-compatible local environment, CI lint/format/typecheck/unit checks, and secret-safe configuration.
- Implement server-side identity, role assignment and country scoping, audit events, and a minimal draft-to-review-to-publish workflow.
- Complete one vertical slice (country reading plus sourced submission and review) to prove the data and publishing model; published country reading is implemented, while submission and review remain outstanding.
- Add accessibility, security, backup/restore, and operational checks appropriate to the launch environment.

**Exit:** reviewed vertical slice, verified authorization boundaries, migration/backup procedures, and agreed editorial operation. No bulk historical content should be invented to populate the app.

## Phase 3 — Editorial MVP and bilingual coverage (in progress)

**Implemented first slice:** locale-specific country browsing, title/summary search, and country reading with source attribution in the web app and API. Search and reading expose published material in the requested locale without silently falling back to another language. No historical records were seeded. The web production build and production API process have both been verified locally.

**Remaining scope:** expand supported entity types and relationships; authenticated translation authoring/review and submission workflow; correction reporting and triage; stronger source/rights management; editorial dashboards; content seeding only from verified and rights-cleared material. Define and measure source completeness, locale coverage, review times, correction handling, accessibility, and reliability. Authentication, role/scope enforcement, rate limiting, and operational safeguards from Phase 2 remain prerequisites for protected editorial actions and public contribution routes.

## Phase 4 — Media and learning workflows (proposed)

Introduce authorized S3-compatible media storage, accessible media metadata, teacher-oriented collections/learning resources, improved discovery, and operational scaling based on measured need.

## Phase 5 — Mobile and historical assistant (proposed)

Build Flutter client against the stable API. Consider RAG assistant only after a reviewed, versioned, rights-cleared corpus and evaluation process exist. Responses must cite retrievable approved sources, disclose uncertainty, avoid unsupported claims, and degrade safely when evidence is insufficient. Human-reviewed content remains the authority.

## Phase 6 — Scale and partnerships (proposed)

Consider broader language coverage, institutional/community partnerships, richer archival workflows, and infrastructure changes only when product usage, editorial capacity, privacy obligations, and reliability evidence justify them.

## Dependencies and release gates

- Legal/privacy jurisdiction, user age policy, and data retention before account production launch.
- Editorial governance, correction/takedown and rights processes before public contribution/media.
- Reviewed source and translation workflows before claiming broad bilingual coverage.
- Stable authorization and API contract before Flutter or external clients.
- Rights-cleared corpus and citation-grounded evaluations before RAG.

Dates and staffing are intentionally not estimated before these decisions and capacity are known.
