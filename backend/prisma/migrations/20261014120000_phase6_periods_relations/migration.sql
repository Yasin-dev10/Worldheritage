CREATE TABLE "historical_periods" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "slug" TEXT NOT NULL,
  "date_display" TEXT, "start_year" INTEGER, "end_year" INTEGER,
  "date_precision" "HistoricalDatePrecision" NOT NULL DEFAULT 'UNKNOWN',
  "date_certainty" "HistoricalDateCertainty" NOT NULL DEFAULT 'UNKNOWN',
  "state" "editorial_state" NOT NULL DEFAULT 'DRAFT', "published_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "historical_periods_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "historical_periods_slug_key" ON "historical_periods"("slug");
CREATE INDEX "historical_periods_state_start_year_slug_idx" ON "historical_periods"("state", "start_year", "slug");

CREATE TABLE "period_translations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "period_id" UUID NOT NULL,
  "locale" TEXT NOT NULL, "title" TEXT NOT NULL, "summary" TEXT NOT NULL, "body" TEXT NOT NULL,
  CONSTRAINT "period_translations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "period_translations_period_id_locale_key" ON "period_translations"("period_id", "locale");
ALTER TABLE "period_translations" ADD CONSTRAINT "period_translations_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "historical_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "period_sources" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "period_id" UUID NOT NULL, "source_id" UUID NOT NULL,
  "locator" TEXT, "claim_note" TEXT NOT NULL, "claim_standing" "claim_standing" NOT NULL,
  CONSTRAINT "period_sources_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "period_sources_period_id_source_id_key" ON "period_sources"("period_id", "source_id");
ALTER TABLE "period_sources" ADD CONSTRAINT "period_sources_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "historical_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "period_sources" ADD CONSTRAINT "period_sources_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "period_events" (
  "period_id" UUID NOT NULL, "event_id" UUID NOT NULL,
  CONSTRAINT "period_events_pkey" PRIMARY KEY ("period_id", "event_id")
);
ALTER TABLE "period_events" ADD CONSTRAINT "period_events_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "historical_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "period_events" ADD CONSTRAINT "period_events_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "historical_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "person_countries" (
  "person_id" UUID NOT NULL, "country_id" UUID NOT NULL, "relation" TEXT NOT NULL DEFAULT 'RELATED',
  CONSTRAINT "person_countries_pkey" PRIMARY KEY ("person_id", "country_id")
);
ALTER TABLE "person_countries" ADD CONSTRAINT "person_countries_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "historical_people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "person_countries" ADD CONSTRAINT "person_countries_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "article_countries" (
  "article_id" UUID NOT NULL, "country_id" UUID NOT NULL, CONSTRAINT "article_countries_pkey" PRIMARY KEY ("article_id", "country_id")
);
ALTER TABLE "article_countries" ADD CONSTRAINT "article_countries_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "history_articles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "article_countries" ADD CONSTRAINT "article_countries_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "article_events" (
  "article_id" UUID NOT NULL, "event_id" UUID NOT NULL, CONSTRAINT "article_events_pkey" PRIMARY KEY ("article_id", "event_id")
);
ALTER TABLE "article_events" ADD CONSTRAINT "article_events_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "history_articles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "article_events" ADD CONSTRAINT "article_events_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "historical_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "article_people" (
  "article_id" UUID NOT NULL, "person_id" UUID NOT NULL, CONSTRAINT "article_people_pkey" PRIMARY KEY ("article_id", "person_id")
);
ALTER TABLE "article_people" ADD CONSTRAINT "article_people_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "history_articles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "article_people" ADD CONSTRAINT "article_people_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "historical_people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "article_civilizations" (
  "article_id" UUID NOT NULL, "civilization_id" UUID NOT NULL, CONSTRAINT "article_civilizations_pkey" PRIMARY KEY ("article_id", "civilization_id")
);
ALTER TABLE "article_civilizations" ADD CONSTRAINT "article_civilizations_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "history_articles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "article_civilizations" ADD CONSTRAINT "article_civilizations_civilization_id_fkey" FOREIGN KEY ("civilization_id") REFERENCES "civilizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
