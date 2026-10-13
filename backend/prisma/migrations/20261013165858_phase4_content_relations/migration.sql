-- CreateTable
CREATE TABLE "civilization_people" (
    "civilization_id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "relation" TEXT NOT NULL DEFAULT 'RELATED',

    CONSTRAINT "civilization_people_pkey" PRIMARY KEY ("civilization_id","person_id")
);

-- CreateTable
CREATE TABLE "civilization_events" (
    "civilization_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "relation" TEXT NOT NULL DEFAULT 'RELATED',

    CONSTRAINT "civilization_events_pkey" PRIMARY KEY ("civilization_id","event_id")
);

-- AddForeignKey
ALTER TABLE "civilization_people" ADD CONSTRAINT "civilization_people_civilization_id_fkey" FOREIGN KEY ("civilization_id") REFERENCES "civilizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "civilization_people" ADD CONSTRAINT "civilization_people_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "historical_people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "civilization_events" ADD CONSTRAINT "civilization_events_civilization_id_fkey" FOREIGN KEY ("civilization_id") REFERENCES "civilizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "civilization_events" ADD CONSTRAINT "civilization_events_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "historical_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "historical_events"
  ADD CONSTRAINT historical_events_category_nonempty CHECK (length(trim(category)) BETWEEN 1 AND 120),
  ADD CONSTRAINT historical_events_year_bounds CHECK (start_year IS NULL OR end_year IS NULL OR start_year <= end_year),
  ADD CONSTRAINT historical_events_published_at_required CHECK (state <> 'PUBLISHED' OR published_at IS NOT NULL);
ALTER TABLE "civilizations"
  ADD CONSTRAINT civilizations_year_bounds CHECK (start_year IS NULL OR end_year IS NULL OR start_year <= end_year),
  ADD CONSTRAINT civilizations_published_at_required CHECK (state <> 'PUBLISHED' OR published_at IS NOT NULL);
ALTER TABLE "historical_people"
  ADD CONSTRAINT historical_people_published_at_required CHECK (state <> 'PUBLISHED' OR published_at IS NOT NULL);
ALTER TABLE "history_articles"
  ADD CONSTRAINT history_articles_author_nonempty CHECK (length(trim(author_name)) BETWEEN 1 AND 300),
  ADD CONSTRAINT history_articles_published_at_required CHECK (state <> 'PUBLISHED' OR published_at IS NOT NULL);
ALTER TABLE "historical_timelines"
  ADD CONSTRAINT historical_timelines_published_at_required CHECK (state <> 'PUBLISHED' OR published_at IS NOT NULL);

ALTER TABLE "event_translations" ADD CONSTRAINT event_translations_locale_supported CHECK (locale IN ('so', 'en'));
ALTER TABLE "person_translations" ADD CONSTRAINT person_translations_locale_supported CHECK (locale IN ('so', 'en'));
ALTER TABLE "civilization_translations" ADD CONSTRAINT civilization_translations_locale_supported CHECK (locale IN ('so', 'en'));
ALTER TABLE "article_translations" ADD CONSTRAINT article_translations_locale_supported CHECK (locale IN ('so', 'en'));
ALTER TABLE "timeline_translations" ADD CONSTRAINT timeline_translations_locale_supported CHECK (locale IN ('so', 'en'));

ALTER TABLE "event_sources" ADD CONSTRAINT event_sources_claim_nonempty CHECK (length(trim(claim_note)) BETWEEN 1 AND 4000);
ALTER TABLE "person_sources" ADD CONSTRAINT person_sources_claim_nonempty CHECK (length(trim(claim_note)) BETWEEN 1 AND 4000);
ALTER TABLE "civilization_sources" ADD CONSTRAINT civilization_sources_claim_nonempty CHECK (length(trim(claim_note)) BETWEEN 1 AND 4000);
ALTER TABLE "article_sources" ADD CONSTRAINT article_sources_claim_nonempty CHECK (length(trim(claim_note)) BETWEEN 1 AND 4000);

CREATE INDEX "countries_region_slug_idx" ON "countries"("region", "slug");
