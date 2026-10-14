# Phase 6 — Historical Content & Digital Museum

## Existing foundation reused

The repository already has historical articles, events, people, civilizations, and data-driven timelines; reusable source/citation records; media metadata; editorial states; content revisions; CMS reviews; and audit events. Existing NestJS public controllers and the bilingual Next.js site remain in place. Phase 6 adds sourced historical periods and cross-links, plus museum collections, exhibitions, and historical maps.

## Added capabilities

- Museum object records support multilingual descriptions, uncertain dates, provenance, current collection location, creator attribution, rights notes, optional media assets, and source/claim links.
- Exhibitions group ordered museum objects and have localized titles and summaries.
- Historical maps support localized descriptions, approximate date ranges, geographic area, map media, provenance, rights, and cited sources. Map pages work as an accessible record and image fallback; they do not invent interactive borders or coordinates.
- Historical periods support multilingual summaries and bodies, approximate/uncertain date ranges, claim-level source notes, and links to database events. Articles connect to countries, events, figures, and civilizations; events, figures, and civilizations can also carry cross-links.
- Articles, events, figures, civilizations, and periods require sources before editorial submission/publication. Public detail pages display source references and claim standing.
- Public list and detail APIs filter unpublished records and require source-backed museum items/maps. Exhibition publication requires at least one published, source-backed item.
- Authenticated editor routes create draft records and enforce the existing Admin/Editor/Reviewer roles for the Draft → Submitted → In Review → Approved → Published workflow. Transitions and reviewer decisions are audited.
- The public site has bilingual museum item, exhibition, and historical map directories and detail pages. The admin dashboard has a museum and maps entry point.

## API routes

Public routes (published records only):

- `GET /api/v1/museum/items`, `GET /api/v1/museum/items/:slug`
- `GET /api/v1/museum/exhibitions`, `GET /api/v1/museum/exhibitions/:slug`
- `GET /api/v1/maps`, `GET /api/v1/maps/:slug`
- `GET /api/v1/periods`, `GET /api/v1/periods/:slug`

Editor routes (OIDC authentication and backend role checks required):

- `GET /api/v1/admin/museum/:kind` (`items`, `exhibitions`, or `maps`)
- `POST /api/v1/admin/museum/:kind` (creates a draft; item/map source references are required)
- `POST /api/v1/admin/museum/:kind/:id/workflow`
- `GET /api/v1/admin/periods`, `GET /api/v1/admin/periods/:id`
- `POST /api/v1/admin/periods`, `PATCH /api/v1/admin/periods/:id`, `DELETE /api/v1/admin/periods/:id` (archive)
- `POST /api/v1/admin/periods/:id/workflow`

List routes accept `locale`, `limit`, `cursor`, and `q`, using the existing public query validation conventions.

## Migration and setup

Apply the additive migrations in timestamp order, including `20261014100000_phase6_museum_maps` and `20261014120000_phase6_periods_relations`, through the existing Prisma migration deployment process. Generate the Prisma client with `npm run db:generate --workspace backend`. These migrations add tables and foreign keys without rewriting existing records. Existing media storage locations are reused. For externally hosted previews/documents, set `NEXT_PUBLIC_MEDIA_ORIGINS` to a comma-separated list of trusted HTTPS origins; same-origin safe paths are also supported. Other external origins are not rendered as media.

## Acceptance checklist

- [x] Reuse existing article, source, media, editorial, audit, event, figure, civilization, and timeline models.
- [x] Add sourced historical periods and country/event/figure/civilization article relations.
- [x] Add museum items, exhibitions, historical maps, localization, source links, media references, indexes, and foreign keys.
- [x] Keep public museum/map reads limited to published, cited records.
- [x] Enforce role-protected draft creation and reviewed publication transitions.
- [x] Add bilingual public directory and detail pages, including empty/error handling and accessible image descriptions.
- [x] Add a dashboard entry point for museum and map editors.
- [x] Add database-backed integration tests for migration presence, persisted citations and uncertain dates, publication source gates, and reviewer role enforcement (`backend/src/phase6.database.e2e-spec.ts`).
- [x] Add edit/archive operations for museum items, maps, and exhibitions. Editing is limited to drafts and returned records; archiving updates the editorial state and records a revision and audit event.

To execute the PostgreSQL integration tests, configure `PHASE6_TEST_DATABASE_URL` to a dedicated database whose name includes `test`, apply migrations with `DATABASE_URL` set to that URL (`npm run db:deploy --workspace backend`), then run `npm run test:e2e --workspace backend`. Tests intentionally skip without that explicit test-database variable and refuse URLs that do not identify a test database. The current development environment had no PostgreSQL service listening on its configured local port, so the database-backed suite still needs to be run in an environment with PostgreSQL available.

The Phase 6 implementation does not add production seed history, artificial artifacts, map coordinates, or historical borders.
