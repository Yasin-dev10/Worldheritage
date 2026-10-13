CREATE TYPE editorial_state AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'IN_REVIEW',
  'CHANGES_REQUESTED',
  'APPROVED',
  'PUBLISHED',
  'REJECTED',
  'ARCHIVED'
);

CREATE TYPE source_kind AS ENUM (
  'PRIMARY',
  'SCHOLARLY_SECONDARY',
  'REFERENCE',
  'ORAL_HISTORY',
  'ARCHIVAL_RECORD',
  'OTHER'
);

CREATE TYPE claim_standing AS ENUM (
  'WELL_SUPPORTED',
  'SCHOLARLY_INTERPRETATION',
  'DISPUTED',
  'UNCERTAIN'
);

CREATE TABLE countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (length(slug) BETWEEN 1 AND 120),
  iso_3166_1_alpha2 char(2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT country_iso_code_format CHECK (
    iso_3166_1_alpha2 IS NULL OR iso_3166_1_alpha2 ~ '^[A-Z]{2}$'
  )
);

CREATE UNIQUE INDEX countries_iso_code_unique
  ON countries (iso_3166_1_alpha2);

CREATE TABLE country_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id uuid NOT NULL REFERENCES countries(id) ON DELETE RESTRICT,
  revision_number integer NOT NULL CHECK (revision_number > 0),
  state editorial_state NOT NULL DEFAULT 'DRAFT',
  author_subject text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  published_at timestamptz,
  UNIQUE (country_id, revision_number),
  CHECK (state <> 'PUBLISHED' OR published_at IS NOT NULL)
);

CREATE TABLE country_revision_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  revision_id uuid NOT NULL REFERENCES country_revisions(id) ON DELETE RESTRICT,
  locale text NOT NULL CHECK (locale IN ('so', 'en')),
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 300),
  summary text NOT NULL CHECK (length(trim(summary)) BETWEEN 1 AND 2000),
  body text NOT NULL CHECK (length(trim(body)) > 0),
  translation_of_locale text CHECK (translation_of_locale IN ('so', 'en')),
  translator_subject text,
  UNIQUE (revision_id, locale),
  CHECK (translation_of_locale IS NULL OR translation_of_locale <> locale)
);

CREATE TABLE sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_kind source_kind NOT NULL,
  creator text,
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 1000),
  publisher_or_collection text,
  publication_date_text text,
  stable_identifier text,
  url text,
  accessed_at timestamptz,
  rights_status text NOT NULL DEFAULT 'UNKNOWN'
    CHECK (rights_status IN ('PUBLIC_DOMAIN', 'LICENSED', 'PERMISSION_GRANTED', 'LINK_ONLY', 'UNKNOWN')),
  rights_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (url IS NULL OR url ~ '^https?://')
);

CREATE TABLE country_revision_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  revision_id uuid NOT NULL REFERENCES country_revisions(id) ON DELETE RESTRICT,
  source_id uuid NOT NULL REFERENCES sources(id) ON DELETE RESTRICT,
  locale text CHECK (locale IN ('so', 'en')),
  locator text,
  claim_note text NOT NULL CHECK (length(trim(claim_note)) BETWEEN 1 AND 4000),
  claim_standing claim_standing NOT NULL
);

CREATE INDEX sources_stable_identifier_idx ON sources (stable_identifier);

CREATE TABLE editorial_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  revision_id uuid NOT NULL REFERENCES country_revisions(id) ON DELETE RESTRICT,
  reviewer_subject text NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('APPROVED', 'CHANGES_REQUESTED', 'REJECTED')),
  rationale text NOT NULL CHECK (length(trim(rationale)) BETWEEN 1 AND 8000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_subject text,
  action text NOT NULL CHECK (length(action) BETWEEN 1 AND 120),
  target_type text NOT NULL CHECK (length(target_type) BETWEEN 1 AND 120),
  target_id uuid,
  request_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX country_revisions_state_idx ON country_revisions (state, created_at);
CREATE INDEX country_revision_sources_source_idx ON country_revision_sources (source_id);
CREATE INDEX editorial_reviews_revision_idx ON editorial_reviews (revision_id, created_at);
CREATE INDEX audit_events_target_idx ON audit_events (target_type, target_id, created_at);
