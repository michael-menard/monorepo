-- Migration: 0030_apip_4020_cohesion_snapshots
-- Story: APIP-4020 - Cohesion Scanner
-- Creates the wint.cohesion_snapshots table for persisting cohesion scan results.
-- Assumes wint schema already exists (created in an earlier migration).

CREATE TABLE IF NOT EXISTS "wint"."cohesion_snapshots" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "scanned_at" timestamp with time zone NOT NULL,
  "composite_score" numeric(4, 3) NOT NULL,
  "categories_below" text[] NOT NULL DEFAULT '{}',
  "violation_summary" jsonb NOT NULL DEFAULT '{}',
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_cohesion_snapshots_scanned_at"
  ON "wint"."cohesion_snapshots" ("scanned_at");

CREATE INDEX IF NOT EXISTS "idx_cohesion_snapshots_composite_score"
  ON "wint"."cohesion_snapshots" ("composite_score");
