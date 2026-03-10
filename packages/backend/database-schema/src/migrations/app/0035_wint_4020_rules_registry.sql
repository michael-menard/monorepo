-- Migration: WINT-4020 - Create rules registry table
-- Description: Creates wint.rules table for storing enforceable rules
--   with a propose/promote lifecycle (proposed -> active -> deprecated).
--
-- Schema: wint (reuses existing wint schema namespace)
-- New enums: rule_type, rule_severity, rule_status
-- New table: wint.rules
--
-- Architecture Notes:
--   - All enum types defined in public schema for cross-namespace reusability
--   - Table lives in wint schema, isolated from application data
--   - Conflict detection is application-level (case-insensitive text match on non-deprecated rules)
--   - status defaults to 'proposed' on INSERT
--   - scope defaults to 'global'
--
-- Pre-migration Checks:
-- 1. Verify wint schema exists (WINT-0010)
-- 2. Verify no existing 'rule_type', 'rule_severity', 'rule_status' enums
--
-- Required Privileges: CREATE on wint schema, CREATE TYPE
-- Depends on: wint schema (WINT-0010)

-- Create rule_type enum
CREATE TYPE "rule_type" AS ENUM('gate', 'lint', 'prompt_injection');--> statement-breakpoint

-- Create rule_severity enum
CREATE TYPE "rule_severity" AS ENUM('error', 'warning', 'info');--> statement-breakpoint

-- Create rule_status enum
CREATE TYPE "rule_status" AS ENUM('proposed', 'active', 'deprecated');--> statement-breakpoint

-- Create wint.rules table
CREATE TABLE "wint"."rules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "rule_text" text NOT NULL,
  "rule_type" "rule_type" NOT NULL,
  "scope" text DEFAULT 'global' NOT NULL,
  "severity" "rule_severity" NOT NULL,
  "status" "rule_status" DEFAULT 'proposed' NOT NULL,
  "source_story_id" text,
  "source_lesson_id" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Indexes for common query patterns
CREATE INDEX "idx_rules_status" ON "wint"."rules" ("status");--> statement-breakpoint
CREATE INDEX "idx_rules_rule_type" ON "wint"."rules" ("rule_type");--> statement-breakpoint
CREATE INDEX "idx_rules_scope" ON "wint"."rules" ("scope");--> statement-breakpoint
CREATE INDEX "idx_rules_type_status" ON "wint"."rules" ("rule_type", "status");

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Changes: Creates rule_type/rule_severity/rule_status enums and wint.rules table
-- Rollback: DROP TABLE "wint"."rules"; DROP TYPE "rule_status"; DROP TYPE "rule_severity"; DROP TYPE "rule_type";
-- Story: WINT-4020
