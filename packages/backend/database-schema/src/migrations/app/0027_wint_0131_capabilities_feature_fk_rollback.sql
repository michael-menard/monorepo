-- Rollback Migration 0027: Remove feature_id FK from wint.capabilities
-- Story: WINT-0131 - Add Feature-Capability Linkage to WINT Schema

DROP INDEX IF EXISTS "wint"."idx_capabilities_feature_id";

ALTER TABLE "wint"."capabilities"
  DROP COLUMN IF EXISTS "feature_id";
