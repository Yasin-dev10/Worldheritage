# Phase 5 CMS implementation status

## Implemented in this increment

- `/admin/login` uses OpenID Connect authorization code flow with PKCE (S256), checks the authorization `state`, and does not require a client secret in the browser.
- `/admin` displays live counts from the API, including total published content, published articles, drafts and pending reviews, plus recent persisted audit events. The page redirects to sign-in when no access token is present.
- `GET /api/v1/admin/dashboard` validates OIDC JWT signature through the provider's discovery/JWKS endpoints, issuer and audience, then requires a server-issued `Admin`, `Editor`, or `Reviewer` role claim.
- `GET`/`POST /api/v1/admin/sources` and `GET`/`POST /api/v1/admin/media` provide paginated metadata lists and transactional create-plus-audit operations. Reads require Admin/Editor/Reviewer; creates require Admin/Editor. Source URL and enumerated source type are validated. Media binaries are not uploaded; the API stores metadata and the storage location supplied by a trusted editor.
- `/admin/sources` and `/admin/media` provide browser forms, server-side validation feedback, searchable/paginated lists where supported, and API-backed saving for those resources.
- Added PostgreSQL models and a migration for generic immutable content snapshots, CMS reviews, and media metadata. Existing source, article-source, country-revision, country-revision-source, editorial-review, and audit tables were reused.
- API CORS allows the configured web origin and the authorization header.
- Admin list/create/edit pages are available for countries and articles, and list/create/edit pages are available for events, figures, timelines, and civilizations. Their API mutations are protected and audited.
- Event, figure, timeline, and civilization workflow transitions support submit, in-review, approve, request-changes, reject, and publish. The API checks the current state and the caller's role for every transition.
- Article workflow supports submit, review, approve, request-changes, reject, and publish. Revision snapshots are persisted for submissions/publications and content edits; countries retain their dedicated country revision records.
- `/admin/reviews`, `/admin/revisions`, and `/admin/audit-logs` display persisted API data with pagination.
- Published records continue to be served by the Phase 4 public API and web routes; draft and review states remain excluded by public read queries.

## Required local identity-provider setup

Configure these variables in the untracked local `.env` and configure the same redirect URL in the OIDC client:

- `AUTH_ISSUER_URL`: exact issuer URL exposed by the provider.
- `AUTH_CLIENT_ID`: public browser client ID.
- `AUTH_AUDIENCE`: API audience; defaults to `AUTH_CLIENT_ID` if the provider uses the client ID as the access-token audience.
- `NEXT_PUBLIC_AUTH_ISSUER_URL` and `NEXT_PUBLIC_AUTH_CLIENT_ID`: same issuer and public client ID for the browser.
- Optional `NEXT_PUBLIC_AUTH_AUDIENCE`: requested API audience when the provider requires one.
- `WEB_ORIGIN`: exact browser origin used by CORS.
- OIDC client redirect URI: `{web-origin}/admin/login`.
- OIDC access tokens must have a `roles` string array claim whose values include `Admin`, `Editor`, or `Reviewer` for dashboard access. Review your provider's token-claim mapping before granting those roles.

No credentials are stored in the repository. Until a real issuer and role mapping are configured, protected API calls fail closed.

### Local development OIDC provider

The repository's Docker Compose setup can run a local Keycloak provider for development. Set `KC_BOOTSTRAP_ADMIN_USERNAME`, `KC_BOOTSTRAP_ADMIN_PASSWORD`, and `WH_LOCAL_ADMIN_PASSWORD` in the ignored root `.env` before starting it. The realm import creates the `worldheritage-web` public client with PKCE S256, the `worldheritage-api` audience, and an `Admin` role claim. It also creates the `local-admin` test user using `WH_LOCAL_ADMIN_PASSWORD`.

Set the API values to `AUTH_ISSUER_URL=http://localhost:8080/realms/worldheritage`, `AUTH_CLIENT_ID=worldheritage-web`, and `AUTH_AUDIENCE=worldheritage-api`. Set the matching browser values in `web/.env.local` as `NEXT_PUBLIC_AUTH_ISSUER_URL`, `NEXT_PUBLIC_AUTH_CLIENT_ID`, and `NEXT_PUBLIC_AUTH_AUDIENCE`. The browser client has no secret. Start Keycloak with `docker compose up -d keycloak`, then restart/rebuild the web app so Next.js embeds the public settings. This local provider uses Keycloak development mode and must not be exposed or used in production.

## Remaining Phase 5 work

- Country source attachment editing, restore flows, and finer-grained conflict-of-interest controls.
- Preserve the currently published revision while a newer revision is reviewed; approval is currently recorded against the latest available content revision.
- User and role assignment UI/API. Role assignment should be managed by the selected identity provider or a separately reviewed database-backed assignment model; this increment reads trusted role claims and does not grant roles.
- Media attachment relationships, storage-provider integration, upload validation, and restoration/deletion policies.
- Richer review queue actions, filters, locale-specific review, and relationship/citation editors.
- End-to-end API/Web integration tests against a configured OIDC issuer and PostgreSQL, plus responsive browser checks. The current automated tests cover the role guard unit decisions only.

The admin feature is an editorial CMS foundation, not a complete production editorial system. Configure a real OIDC provider and database before using protected operations. Public pages display only content admitted by the Phase 4 published-state queries.
