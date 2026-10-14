# Initial Database Model

**Status:** Prisma 6.19.3 schema and migrations implement country reads plus sourced public events, people, civilizations, articles, timelines, and their explicit relationships. Generic content revision snapshots, CMS review records, source/media metadata, and audit events are used by the protected admin APIs. No historical content is seeded.

## 1. Shared conventions

- Use UUID primary keys (`id`) generated server-side (UUIDv7 preferred if supported consistently; otherwise UUIDv4). Public slugs are readable aliases, never primary identifiers.
- Every persisted record has `created_at` and `updated_at` as UTC `timestamptz`; set/maintain them consistently in the application or database. Add `deleted_at` only for entities with an approved soft-delete policy. Preserve published revisions and audit records rather than hard-deleting history.
- Use `locale` BCP 47 tags; initial supported tags are `so` and `en`. Store canonical entity facts separately from localized fields.
- Avoid generic polymorphic foreign keys for core links. Use explicit join tables and database foreign keys.
- Model user-generated content and editorial content with explicit states, revision history, and attribution.

## 2. Core entities and relationships

| Entity               | Purpose and principal fields                                                                                                                           | Relationships                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| **Country**          | Current geographic/political reference: `id`, stable ISO code when applicable, slug, status                                                            | Many periods, events, people, places, civilizations through explicit joins; localized display text |
| **HistoricalPeriod** | Named interval and historical framing; optional uncertain start/end `HistoricalDate` values                                                            | May associate with countries, events, people, places, civilizations                                |
| **HistoricalEvent**  | Event summary, date bounds, date precision, confidence/dispute metadata, publication state                                                             | Many countries, periods, people, places, civilizations, sources, translations                      |
| **HistoricalPerson** | Person record with name variants and optional birth/death date values                                                                                  | Many events, places, civilizations, sources, translations                                          |
| **HistoricalPlace**  | Historical/geographic place with optional coordinates and modern-location reference                                                                    | Many countries, events, periods, civilizations, sources, translations                              |
| **Civilization**     | Civilization/cultural-historical grouping with scoped description                                                                                      | Many countries, periods, events, people, places, sources, translations                             |
| **Source**           | Bibliographic or archival reference: creator, title, publication/collection, date, publisher, URL/identifier, access date, rights/license, source type | Many claims/content revisions via `ContentSource` with claim note, locator, and evidentiary role   |
| **MediaAsset**       | Metadata for an authorized image/audio/video/document; storage key, media type, checksum, dimensions, rights, attribution, alt text                    | Optional links to content revisions through an explicit attachment table; binary storage deferred  |
| **Translation**      | Locale-specific fields for an entity or revision; translated-from revision, author, workflow state, reviewer                                           | Belongs to a target entity/revision and locale; enforce unique target+locale+revision key          |
| **User**             | Identity-provider subject, verified contact metadata as needed, account state                                                                          | Many scoped role assignments, submissions, reviews, audit events                                   |
| **Role**             | Controlled role key: `SUPER_ADMIN`, `COUNTRY_EDITOR`, `HISTORIAN_RESEARCHER`, `REVIEWER`, `TEACHER`, `USER`                                            | Many users through `UserRole`; assignments can scope country/editorial area                        |
| **Review**           | Decision on an immutable submission/revision: reviewer, outcome, rationale, checklist, timestamp                                                       | Belongs to submission/revision; reviewer is a user                                                 |
| **Submission**       | Proposed create/update/correction with author, entity/revision, state, submitted timestamp                                                             | Has immutable revision snapshot, sources, reviews, and audit trail                                 |

## 3. Supporting tables

Use explicit joins such as `CountryEvent`, `CountryPerson`, `CountryPlace`, `CountryCivilization`, `PeriodEvent`, `PeriodPerson`, `PeriodPlace`, `PeriodCivilization`, `EventPerson`, `EventPlace`, `EventCivilization`, `PersonPlace`, `CivilizationPerson`, and `CivilizationPlace` as real product requirements establish them. Each join may include relationship type, dates, and provenance when a bare link would imply unsupported certainty. `ContentSource` links a source to the exact claim or content revision; `UserRole` has scope and grant metadata; `AuditEvent` records actor/action/target/time/request correlation and redacted metadata. Add relationship tables incrementally rather than creating every possible join without use cases.

## 4. Historical dates and uncertainty

Do not force historical dates into one Gregorian timestamp. Represent a date or bound using structured fields, conceptually:

```text
HistoricalDate = {
  calendar: string,            // e.g. Gregorian, Julian, Hijri; explain custom calendars
  precision: enum,             // EXACT_DAY, MONTH, YEAR, DECADE, CENTURY, RANGE, CIRCA, UNKNOWN
  year: integer? , month: 1..12?, day: 1..31?,
  earliest: structured date?, latest: structured date?,
  display_text: string?,       // qualified form, e.g. “around 1200 CE”
  certainty: enum              // CERTAIN, PROBABLE, POSSIBLE, DISPUTED, UNKNOWN
}
```

This is illustrative, not a SQL type. Define a normalized schema and calendar conversion/display rules during implementation. For BCE/CE and calendars without a year zero, document a consistent representation. A `RANGE` has ordered bounds; `CIRCA` and `UNKNOWN` cannot be silently stored as an exact date. Event start/end bounds are separate values. Preserve the source's date wording and cite the basis for normalized values.

## 5. Content state and revisions

Use controlled states, at minimum: `DRAFT`, `SUBMITTED`, `IN_REVIEW`, `CHANGES_REQUESTED`, `APPROVED`, `PUBLISHED`, `REJECTED`, `ARCHIVED`. Keep workflow transitions explicit. A submission captures an immutable revision/snapshot and author. Approval applies to that exact revision; any subsequent change requires a new submission/review. A published record points to an approved revision. Translation review and publication are locale-specific. `ARCHIVED` hides content from ordinary public discovery but retains provenance and audit history.

## 6. Localization

Store invariant identifiers/relationships separately from localized fields. A translation record is keyed by target entity or revision plus locale and includes translated content, source revision, translator, state, reviewer, and timestamps. Mark source locale explicitly. Fallback to another locale must be visible to the reader and must not change the translation's actual locale or imply editorial review. Do not overwrite one locale when editing another.

## 7. Integrity, privacy, and indexes

Enforce foreign keys, uniqueness for stable codes/slugs within their scope, valid locale tags, valid status transitions, and date-bound constraints. Index foreign keys, status/locale/publication query paths, normalized search fields, and stable external identifiers based on query needs. Keep identity-provider secrets and raw credentials out of user records. Define PII minimization, deletion/anonymization, retention, and backup policy after jurisdiction and legal requirements are established.

## 8. Deferred schema decisions

Calendar/date encoding, geographic boundary history, additional entity tables, rights model, and retention rules need review with historians and legal/privacy owners before extending the initial migration set. The country editorial slice is the only schema currently implemented.

## 9. Implemented database slice

The initial Prisma schema at `backend/prisma/schema.prisma` and migration at `backend/prisma/migrations/20261013000000_country_editorial_foundation/migration.sql` implement country identity, country revisions, Somali/English revision translations, linked sources with claim standing and rights metadata, editorial review records, and audit events. The NestJS API uses this slice for published-country listing, search, and detail reads. The migration has been applied to the local PostgreSQL database and `npm run db:status --workspace backend` reported it up to date during verification.

Later Phase 4 migrations add event, person, civilization, article, and timeline tables and relationships. Phase 5 adds generic content snapshots, CMS review records, and media metadata. OIDC authenticates API requests and role claims come from the identity provider; role assignment remains outside this application. Editorial mutations write audit events transactionally. Use `npm run db:generate --workspace backend` to generate the client, `npm run db:migrate --workspace backend` for local development, and `npm run db:deploy --workspace backend` for reviewed migrations in deployment. Once a migration has been applied anywhere shared, add a new migration instead of editing it. Custom SQL constraints in migrations remain authoritative where Prisma schema cannot express the complete rule.
