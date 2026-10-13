CREATE TABLE "content_revisions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "content_type" TEXT NOT NULL,
    "content_id" UUID NOT NULL,
    "revision_number" INTEGER NOT NULL,
    "state" "editorial_state" NOT NULL,
    "editor_subject" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "content_revisions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "content_revisions_content_type_content_id_revision_number_key"
    ON "content_revisions"("content_type", "content_id", "revision_number");
CREATE INDEX "content_revisions_content_type_content_id_created_at_idx"
    ON "content_revisions"("content_type", "content_id", "created_at");
CREATE INDEX "content_revisions_state_created_at_idx"
    ON "content_revisions"("state", "created_at");

CREATE TABLE "cms_reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "revision_id" UUID NOT NULL,
    "reviewer_subject" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cms_reviews_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "cms_reviews_revision_id_fkey" FOREIGN KEY ("revision_id") REFERENCES "content_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "cms_reviews_revision_id_created_at_idx" ON "cms_reviews"("revision_id", "created_at");

CREATE TABLE "media_assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "storage_location" TEXT NOT NULL,
    "media_type" TEXT NOT NULL,
    "alt_text" TEXT,
    "attribution" TEXT,
    "provenance" TEXT,
    "license" TEXT,
    "rights_notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "media_assets_created_at_idx" ON "media_assets"("created_at");
