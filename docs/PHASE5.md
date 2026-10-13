# Phase 5 CMS implementation status

## Implemented in this increment

- `/admin/login` uses OpenID Connect authorization code flow with PKCE (S256), checks the authorization `state`, and does not require a client secret in the browser.
- `/admin` displays live counts from the API, including total published content, published articles, drafts and pending reviews, plus recent persisted audit events. The page redirects to sign-in when no access token is present.
- `GET /api/v1/admin/dashboard` validates OIDC JWT signature through the provider's discovery/JWKS endpoints, issuer and audience, then requires a server-issued `Admin`, `Editor`, or `Reviewer` role claim.
- `GET`/`POST /api/v1/admin/sources` and `GET`/`POST /api/v1/admin/media` provide paginated metadata lists and transactional create-plus-audit operations. Reads require Admin/Editor/Reviewer; creates require Admin/Editor. Source URL and enumerated source type are validated. Media binaries are not uploaded; the API stores metadata and the storage location supplied by a trusted editor.
- `/admin/sources` and `/admin/media` provide browser forms, server-side validation feedback, searchable/paginated lists where supported, and API-backed saving for those resources.
- Added PostgreSQL models and a migration for generic immutable content snapshots, CMS reviews, and media metadata. Existing source, article-source, country-revision, country-revision-source, editorial-review, and audit tables were reused.
- API CORS allows the configured web origin and the authorization header.

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

## Remaining Phase 5 work

- Full create/read/update/archive/restore flows and editors for countries, articles, events, figures, timelines, civilizations, relationships, and citations.
- Immutable snapshot creation on every content edit; transitions for draft, submitted, in review, changes requested, approved, published, rejected, and archived; reviewer rationale; publish authorization; preservation of the live published revision while a newer edit is reviewed.
- User and role assignment UI/API. Role assignment should be managed by the selected identity provider or a separately reviewed database-backed assignment model; this increment reads trusted role claims and does not grant roles.
- Media attachment relationships, storage-provider integration, upload validation, and restoration/deletion policies.
- Admin list/detail/editor pages and review queue; pagination/search/filter coverage beyond Sources and Media metadata.
- End-to-end API/Web integration tests against a configured OIDC issuer and PostgreSQL, plus responsive browser checks. The current automated tests cover the role guard unit decisions only.

Do not treat the current dashboard as the complete CMS. Public read APIs remain the existing Phase 4 implementation.
