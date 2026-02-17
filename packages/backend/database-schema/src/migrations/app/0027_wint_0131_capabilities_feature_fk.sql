-- Migration 0027: Add feature_id FK to wint.capabilities
-- Story: WINT-0131 - Add Feature-Capability Linkage to WINT Schema
-- Adds nullable foreign key from capabilities to features, enabling
-- Franken-feature detection (features with < 4 distinct CRUD lifecycle_stage values).

ALTER TABLE "wint"."capabilities"
  ADD COLUMN "feature_id" uuid NULL
    REFERENCES "wint"."features"("id") ON DELETE SET NULL;

CREATE INDEX "idx_capabilities_feature_id"
  ON "wint"."capabilities"("feature_id");
