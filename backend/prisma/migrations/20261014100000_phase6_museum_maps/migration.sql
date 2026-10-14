CREATE TABLE "museum_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "date_display" TEXT,
    "date_precision" "HistoricalDatePrecision" NOT NULL DEFAULT 'UNKNOWN',
    "provenance" TEXT,
    "current_location" TEXT,
    "creator_attribution" TEXT,
    "rights_notes" TEXT,
    "state" "editorial_state" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMPTZ(6),
    "media_asset_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "museum_items_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "museum_items_slug_key" ON "museum_items"("slug");
CREATE INDEX "museum_items_state_slug_idx" ON "museum_items"("state", "slug");
ALTER TABLE "museum_items" ADD CONSTRAINT "museum_items_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "museum_item_translations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(), "item_id" UUID NOT NULL,
    "locale" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT NOT NULL,
    CONSTRAINT "museum_item_translations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "museum_item_translations_item_id_locale_key" ON "museum_item_translations"("item_id", "locale");
ALTER TABLE "museum_item_translations" ADD CONSTRAINT "museum_item_translations_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "museum_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "museum_item_sources" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(), "item_id" UUID NOT NULL, "source_id" UUID NOT NULL,
    "locator" TEXT, "claim_note" TEXT NOT NULL, "claim_standing" "claim_standing" NOT NULL,
    CONSTRAINT "museum_item_sources_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "museum_item_sources_item_id_source_id_key" ON "museum_item_sources"("item_id", "source_id");
ALTER TABLE "museum_item_sources" ADD CONSTRAINT "museum_item_sources_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "museum_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "museum_item_sources" ADD CONSTRAINT "museum_item_sources_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "museum_exhibitions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(), "slug" TEXT NOT NULL, "topic" TEXT,
    "state" "editorial_state" NOT NULL DEFAULT 'DRAFT', "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "museum_exhibitions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "museum_exhibitions_slug_key" ON "museum_exhibitions"("slug");
CREATE INDEX "museum_exhibitions_state_slug_idx" ON "museum_exhibitions"("state", "slug");

CREATE TABLE "exhibition_translations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(), "exhibition_id" UUID NOT NULL,
    "locale" TEXT NOT NULL, "title" TEXT NOT NULL, "summary" TEXT NOT NULL,
    CONSTRAINT "exhibition_translations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "exhibition_translations_exhibition_id_locale_key" ON "exhibition_translations"("exhibition_id", "locale");
ALTER TABLE "exhibition_translations" ADD CONSTRAINT "exhibition_translations_exhibition_id_fkey" FOREIGN KEY ("exhibition_id") REFERENCES "museum_exhibitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "exhibition_items" (
    "exhibition_id" UUID NOT NULL, "item_id" UUID NOT NULL, "position" INTEGER NOT NULL,
    CONSTRAINT "exhibition_items_pkey" PRIMARY KEY ("exhibition_id", "item_id")
);
CREATE UNIQUE INDEX "exhibition_items_exhibition_id_position_key" ON "exhibition_items"("exhibition_id", "position");
ALTER TABLE "exhibition_items" ADD CONSTRAINT "exhibition_items_exhibition_id_fkey" FOREIGN KEY ("exhibition_id") REFERENCES "museum_exhibitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "exhibition_items" ADD CONSTRAINT "exhibition_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "museum_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "historical_maps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(), "slug" TEXT NOT NULL, "date_display" TEXT,
    "start_year" INTEGER, "end_year" INTEGER, "date_precision" "HistoricalDatePrecision" NOT NULL DEFAULT 'UNKNOWN',
    "geographic_area" TEXT, "provenance" TEXT, "rights_notes" TEXT,
    "state" "editorial_state" NOT NULL DEFAULT 'DRAFT', "published_at" TIMESTAMPTZ(6),
    "media_asset_id" UUID, "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "historical_maps_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "historical_maps_slug_key" ON "historical_maps"("slug");
CREATE INDEX "historical_maps_state_start_year_slug_idx" ON "historical_maps"("state", "start_year", "slug");
ALTER TABLE "historical_maps" ADD CONSTRAINT "historical_maps_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "historical_map_translations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(), "map_id" UUID NOT NULL,
    "locale" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT NOT NULL,
    CONSTRAINT "historical_map_translations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "historical_map_translations_map_id_locale_key" ON "historical_map_translations"("map_id", "locale");
ALTER TABLE "historical_map_translations" ADD CONSTRAINT "historical_map_translations_map_id_fkey" FOREIGN KEY ("map_id") REFERENCES "historical_maps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "historical_map_sources" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(), "map_id" UUID NOT NULL, "source_id" UUID NOT NULL,
    "claim_note" TEXT NOT NULL, "claim_standing" "claim_standing" NOT NULL,
    CONSTRAINT "historical_map_sources_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "historical_map_sources_map_id_source_id_key" ON "historical_map_sources"("map_id", "source_id");
ALTER TABLE "historical_map_sources" ADD CONSTRAINT "historical_map_sources_map_id_fkey" FOREIGN KEY ("map_id") REFERENCES "historical_maps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "historical_map_sources" ADD CONSTRAINT "historical_map_sources_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
