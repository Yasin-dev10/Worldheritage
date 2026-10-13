-- CreateEnum
CREATE TYPE "HistoricalDatePrecision" AS ENUM ('EXACT_DAY', 'MONTH', 'YEAR', 'DECADE', 'CENTURY', 'RANGE', 'CIRCA', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "HistoricalDateCertainty" AS ENUM ('CERTAIN', 'PROBABLE', 'POSSIBLE', 'DISPUTED', 'UNKNOWN');

-- AlterTable
ALTER TABLE "countries" ADD COLUMN     "region" TEXT;

-- CreateTable
CREATE TABLE "historical_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "calendar" TEXT,
    "dateDisplay" TEXT,
    "start_year" INTEGER,
    "end_year" INTEGER,
    "date_precision" "HistoricalDatePrecision" NOT NULL DEFAULT 'UNKNOWN',
    "date_certainty" "HistoricalDateCertainty" NOT NULL DEFAULT 'UNKNOWN',
    "state" "editorial_state" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historical_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_translations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "body" TEXT NOT NULL,

    CONSTRAINT "event_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_countries" (
    "event_id" UUID NOT NULL,
    "country_id" UUID NOT NULL,
    "relation" TEXT NOT NULL DEFAULT 'RELATED',

    CONSTRAINT "event_countries_pkey" PRIMARY KEY ("event_id","country_id")
);

-- CreateTable
CREATE TABLE "event_people" (
    "event_id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "relation" TEXT NOT NULL DEFAULT 'RELATED',

    CONSTRAINT "event_people_pkey" PRIMARY KEY ("event_id","person_id")
);

-- CreateTable
CREATE TABLE "event_sources" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "source_id" UUID NOT NULL,
    "locator" TEXT,
    "claim_note" TEXT NOT NULL,
    "claim_standing" "claim_standing" NOT NULL,

    CONSTRAINT "event_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historical_people" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "birth_date_text" TEXT,
    "birth_year" INTEGER,
    "death_date_text" TEXT,
    "death_year" INTEGER,
    "state" "editorial_state" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historical_people_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_translations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "person_id" UUID NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "body" TEXT NOT NULL,

    CONSTRAINT "person_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_sources" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "person_id" UUID NOT NULL,
    "source_id" UUID NOT NULL,
    "locator" TEXT,
    "claim_note" TEXT NOT NULL,
    "claim_standing" "claim_standing" NOT NULL,

    CONSTRAINT "person_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "civilizations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "region" TEXT,
    "calendar" TEXT,
    "date_display" TEXT,
    "start_year" INTEGER,
    "end_year" INTEGER,
    "date_precision" "HistoricalDatePrecision" NOT NULL DEFAULT 'UNKNOWN',
    "state" "editorial_state" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "civilizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "civilization_translations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "civilization_id" UUID NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "body" TEXT NOT NULL,

    CONSTRAINT "civilization_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "civilization_countries" (
    "civilization_id" UUID NOT NULL,
    "country_id" UUID NOT NULL,

    CONSTRAINT "civilization_countries_pkey" PRIMARY KEY ("civilization_id","country_id")
);

-- CreateTable
CREATE TABLE "civilization_sources" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "civilization_id" UUID NOT NULL,
    "source_id" UUID NOT NULL,
    "locator" TEXT,
    "claim_note" TEXT NOT NULL,
    "claim_standing" "claim_standing" NOT NULL,

    CONSTRAINT "civilization_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "history_articles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "author_name" TEXT NOT NULL,
    "editor_name" TEXT,
    "published_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "state" "editorial_state" NOT NULL DEFAULT 'DRAFT',

    CONSTRAINT "history_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article_translations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "article_id" UUID NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "body" TEXT NOT NULL,

    CONSTRAINT "article_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article_sources" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "article_id" UUID NOT NULL,
    "source_id" UUID NOT NULL,
    "locator" TEXT,
    "claim_note" TEXT NOT NULL,
    "claim_standing" "claim_standing" NOT NULL,

    CONSTRAINT "article_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historical_timelines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "state" "editorial_state" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMPTZ(6),

    CONSTRAINT "historical_timelines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timeline_translations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "timeline_id" UUID NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,

    CONSTRAINT "timeline_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timeline_events" (
    "timeline_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "timeline_events_pkey" PRIMARY KEY ("timeline_id","event_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "historical_events_slug_key" ON "historical_events"("slug");

-- CreateIndex
CREATE INDEX "historical_events_state_start_year_slug_idx" ON "historical_events"("state", "start_year", "slug");

-- CreateIndex
CREATE INDEX "historical_events_category_state_start_year_idx" ON "historical_events"("category", "state", "start_year");

-- CreateIndex
CREATE UNIQUE INDEX "event_translations_event_id_locale_key" ON "event_translations"("event_id", "locale");

-- CreateIndex
CREATE INDEX "event_sources_event_id_idx" ON "event_sources"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "historical_people_slug_key" ON "historical_people"("slug");

-- CreateIndex
CREATE INDEX "historical_people_state_slug_idx" ON "historical_people"("state", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "person_translations_person_id_locale_key" ON "person_translations"("person_id", "locale");

-- CreateIndex
CREATE INDEX "person_sources_person_id_idx" ON "person_sources"("person_id");

-- CreateIndex
CREATE UNIQUE INDEX "civilizations_slug_key" ON "civilizations"("slug");

-- CreateIndex
CREATE INDEX "civilizations_state_region_slug_idx" ON "civilizations"("state", "region", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "civilization_translations_civilization_id_locale_key" ON "civilization_translations"("civilization_id", "locale");

-- CreateIndex
CREATE INDEX "civilization_sources_civilization_id_idx" ON "civilization_sources"("civilization_id");

-- CreateIndex
CREATE UNIQUE INDEX "history_articles_slug_key" ON "history_articles"("slug");

-- CreateIndex
CREATE INDEX "history_articles_state_published_at_slug_idx" ON "history_articles"("state", "published_at", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "article_translations_article_id_locale_key" ON "article_translations"("article_id", "locale");

-- CreateIndex
CREATE INDEX "article_sources_article_id_idx" ON "article_sources"("article_id");

-- CreateIndex
CREATE UNIQUE INDEX "historical_timelines_slug_key" ON "historical_timelines"("slug");

-- CreateIndex
CREATE INDEX "historical_timelines_state_slug_idx" ON "historical_timelines"("state", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "timeline_translations_timeline_id_locale_key" ON "timeline_translations"("timeline_id", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "timeline_events_timeline_id_position_key" ON "timeline_events"("timeline_id", "position");

-- AddForeignKey
ALTER TABLE "event_translations" ADD CONSTRAINT "event_translations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "historical_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_countries" ADD CONSTRAINT "event_countries_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "historical_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_countries" ADD CONSTRAINT "event_countries_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_people" ADD CONSTRAINT "event_people_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "historical_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_people" ADD CONSTRAINT "event_people_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "historical_people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_sources" ADD CONSTRAINT "event_sources_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "historical_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_sources" ADD CONSTRAINT "event_sources_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_translations" ADD CONSTRAINT "person_translations_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "historical_people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_sources" ADD CONSTRAINT "person_sources_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "historical_people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_sources" ADD CONSTRAINT "person_sources_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "civilization_translations" ADD CONSTRAINT "civilization_translations_civilization_id_fkey" FOREIGN KEY ("civilization_id") REFERENCES "civilizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "civilization_countries" ADD CONSTRAINT "civilization_countries_civilization_id_fkey" FOREIGN KEY ("civilization_id") REFERENCES "civilizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "civilization_countries" ADD CONSTRAINT "civilization_countries_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "civilization_sources" ADD CONSTRAINT "civilization_sources_civilization_id_fkey" FOREIGN KEY ("civilization_id") REFERENCES "civilizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "civilization_sources" ADD CONSTRAINT "civilization_sources_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_translations" ADD CONSTRAINT "article_translations_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "history_articles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_sources" ADD CONSTRAINT "article_sources_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "history_articles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_sources" ADD CONSTRAINT "article_sources_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_translations" ADD CONSTRAINT "timeline_translations_timeline_id_fkey" FOREIGN KEY ("timeline_id") REFERENCES "historical_timelines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_timeline_id_fkey" FOREIGN KEY ("timeline_id") REFERENCES "historical_timelines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "historical_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
