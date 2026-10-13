# REST API Contract (Initial)

**Status:** public read APIs are implemented for countries, events, people, civilizations, articles, timelines, and global search. Phase 5 adds OIDC-protected dashboard reads and initial source/media metadata operations. Full content editing, reviews, and publishing remain in progress. The database currently contains no seeded historical content; public collection routes therefore return empty lists until cited content is added.

## 1. Conventions

- Base path: `/api/v1`; HTTPS outside local development; JSON UTF-8.
- UUIDs identify records. Slugs are navigation aliases and may change.
- Public `GET` endpoints return published/approved revisions only. Drafts, submissions, reviews, and admin data require authentication and explicit server-side authorization.
- Use `Accept-Language` or an explicit `?locale=so|en`; return the selected locale and translation/review state. Do not silently disguise fallback content.
- Collection responses use cursor pagination (`limit`, `cursor`) with a documented maximum page size. Apply stable sorting; do not expose arbitrary SQL sorting.
- Writes use validated DTOs, bounded lengths, allowlisted fields, and optimistic concurrency (`If-Match`/revision identifier) where edits could overwrite work.
- Mutations record actor and audit event. Approval acts on a specific submitted revision.

## 2. Initial endpoints

### Public reading

| Method and path                                  | Purpose                                                               | Access                      |
| ------------------------------------------------ | --------------------------------------------------------------------- | --------------------------- |
| `GET /health` (under `/api/v1`)                  | API liveness response; does not check PostgreSQL                      | Public                      |
| `GET /countries` / `GET /countries/{idOrSlug}`   | Browse country records and published localized detail                 | Public                      |
| `GET /countries/search?q=...&locale=...`         | Search published country titles and summaries in the requested locale | Public                      |
| `GET /periods` / `GET /periods/{id}`             | Browse periods and relations                                          | Public                      |
| `GET /events` / `GET /events/{id}`               | Browse/search published events, dates, sources, relations             | Public                      |
| `GET /people` / `GET /people/{id}`               | Browse published people                                               | Public                      |
| `GET /places` / `GET /places/{id}`               | Browse published places                                               | Public                      |
| `GET /civilizations` / `GET /civilizations/{id}` | Browse published civilizations                                        | Public                      |
| `GET /sources/{id}`                              | Read public bibliographic source metadata and rights information      | Public, if source is public |
| `GET /search?q=...&locale=...`                   | Search published content only                                         | Public                      |

### Contribution and editorial workflow

| Method and path                                     | Purpose                                                           | Access                                                                        |
| --------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `POST /submissions`                                 | Create a draft submission or correction                           | Authenticated eligible contributor                                            |
| `GET /submissions/{id}` / `PATCH /submissions/{id}` | Read/edit own draft or permitted scoped submission                | Author or scoped editor; server checks ownership/scope                        |
| `POST /submissions/{id}/submit`                     | Submit immutable revision for review                              | Author or scoped editor                                                       |
| `GET /editorial/queue`                              | List assigned pending work                                        | Reviewer / Country Editor, scope-filtered                                     |
| `POST /submissions/{id}/reviews`                    | Record approve, request-changes, or reject decision and rationale | Assigned Reviewer / Country Editor per policy; author cannot approve own work |
| `POST /submissions/{id}/publish`                    | Publish an approved revision                                      | Country Editor within scope or Super Admin                                    |
| `POST /reports`                                     | Report a correction or content concern                            | Public, rate-limited; personal information minimized                          |

### Administration

- `GET /admin/dashboard` requires a verified OIDC access token with `Admin`, `Editor`, or `Reviewer` in its `roles` claim. It returns database counts, published/draft/review counts across current content models, and recent audit events.
- `GET /admin/sources?q=&limit=&offset=` and `GET /admin/media?limit=&offset=` require `Admin`, `Editor`, or `Reviewer`. Their corresponding `POST` create routes require `Admin` or `Editor`. Source creation accepts `sourceKind`, `title`, optional bibliographic metadata, rights metadata, and an HTTP/HTTPS URL when provided. Media creation stores metadata and a storage location; binary upload/storage is not implemented. Create plus audit event share one transaction.
- User/role assignment endpoints are not implemented. Role assignment remains owned by the configured identity provider; do not treat frontend visibility as authorization.

### Implemented public read behavior

- `GET /api/v1/countries?locale=so|en&limit=20&cursor={uuid}` returns published country revisions with a translation in the requested locale. `limit` is 1–50; ordering is by country slug and `nextCursor` is an opaque country UUID.
- `GET /api/v1/countries/{idOrSlug}?locale=so|en` returns the latest published revision, its requested translation, and public source metadata. A record without that locale is returned as `404`; locale is never silently substituted.
- Both routes exclude drafts and other non-published states. Source outputs include bibliographic and rights fields, but no internal author or review data.
- `GET /api/v1/countries/search?q=...&locale=so|en&limit=20` searches published translation titles and summaries only. `q` must contain 2–100 characters; `limit` is 1–50. Results are ordered by slug and include only records with the requested locale; there is no silent fallback.
- List and search return `{ "data": [...] }`; list also returns `nextCursor`, and search returns the selected `locale`. Detail returns the country fields directly, including `sources`.
- The database must be available to serve these routes. `GET /api/v1/health` remains a liveness check and does not claim database readiness.

The following routes are also implemented under `/api/v1`: `GET /events` and `/events/{slug}`, `/people` and `/people/{slug}`, `/civilizations` and `/civilizations/{slug}`, `/articles` and `/articles/{slug}`, and `/timelines` and `/timelines/{slug}`. Collection routes accept `locale`, `limit`, and `cursor`; applicable filters include `q`, `region`, `category`, `fromYear`, and `toYear`. Global `GET /search?q=...` searches published, localized, sourced public records and accepts `types`, year filters, and cursor pagination. Invalid filters produce `400`; missing or unpublished detail records produce `404`.

The protected routes use OIDC discovery and JWKS from `AUTH_ISSUER_URL`. The API validates exact issuer, signature, expiry, and `AUTH_AUDIENCE` (or `AUTH_CLIENT_ID` when no audience is set). Role claims must be a string array in `roles`. Missing or placeholder OIDC configuration fails closed. Browser login uses the authorization-code flow with PKCE; configure `{web-origin}/admin/login` as a redirect URI and set matching `WEB_ORIGIN`/`NEXT_PUBLIC_AUTH_*` values.

Historical public responses are limited to published localized records with at least one source citation. No historical records or citations are generated as demo data. The public web presents empty states when the database has no matching content.

## 3. Role and scope summary

- **Super Admin:** platform-wide access, user/role management, audited.
- **Country Editor:** editorial workflow and publication for assigned countries only.
- **Historian/Researcher:** create and maintain sourced submissions; cannot self-approve.
- **Reviewer:** review assigned submissions; cannot approve own authorship.
- **Teacher:** use educational features when defined; no editorial privilege by virtue of this role.
- **User:** ordinary account; public read access and permitted reports.

Roles can be combined only where conflict-of-interest rules allow. Deny access unless a role and resource scope explicitly permit it. A user-provided country ID, role, status, or author ID never grants permission.

## 4. Error response

The target API contract uses a stable envelope, e.g.:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "One or more fields are invalid.",
    "requestId": "server-generated-correlation-id",
    "details": [{ "field": "locale", "issue": "Unsupported locale." }]
  }
}
```

Do not include secrets, stack traces, SQL, internal hostnames, or private record contents in errors. `details` is optional and must be safe to disclose. Validation field paths should be stable enough for clients to map to forms.

**Implementation status:** the current NestJS controllers still use Nest's default exception response shape for bad requests and not-found responses. The envelope above is a target convention and is not yet installed globally; clients should not assume it is live until a shared exception filter is implemented.

## 5. Status codes

Use `200` for successful reads/updates; `201` for created resources; `202` only for genuinely asynchronous work; `204` for successful no-body actions; `400` malformed request; `401` missing/invalid authentication; `403` authenticated but not authorized; `404` missing or intentionally undisclosed resource; `409` workflow/state conflict; `412` stale `If-Match`/revision; `422` semantically invalid content; `429` rate limit; `500` generic unexpected server error; `503` temporary unavailability. Never reveal whether a protected object exists where that would leak sensitive information.

## 6. Validation, security, and versioning

Validate path/query/body data, locale, dates, enums, pagination bounds, source identifiers, and relationships. Verify permission for both the requested action and every linked entity. Use CSRF protections for cookie-authenticated mutations, rate limiting, request size caps, safe CORS allowlists, and redacted logs. Do not accept client-supplied publication state or reviewer identity. Breaking changes require a new API version; additive fields should remain backward compatible and documented.

## 7. Deferred endpoints

Authentication/session endpoints depend on the identity provider. Media upload, bulk import, mobile push, AI/RAG, and advanced analytics are out of scope until separately designed. Do not create placeholder endpoints that expose unimplemented privileges.
