-- =============================================================================
-- Knowledge Base: Full Schema Baseline (Drizzle-managed)
--
-- This is the canonical baseline migration generated from schema.ts.
-- All CREATE TABLE / CREATE INDEX / ADD CONSTRAINT statements are idempotent
-- (IF NOT EXISTS / duplicate_object guard) so this is safe to run against
-- an existing database without data loss.
--
-- For fresh databases: applies the complete schema from scratch.
-- For existing databases: all statements are no-ops; Drizzle marks it done.
-- =============================================================================

-- Enable pgvector extension (required for VECTOR columns)
CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_id" uuid,
	"operation" text NOT NULL,
	"previous_value" jsonb,
	"new_value" jsonb,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"user_context" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "embedding_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_hash" text NOT NULL,
	"model" text NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "knowledge_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"role" text NOT NULL,
	"entry_type" text DEFAULT 'note' NOT NULL,
	"story_id" text,
	"tags" text[],
	"verified" boolean DEFAULT false,
	"verified_at" timestamp,
	"verified_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp,
	"canonical_id" uuid,
	"is_canonical" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plan_story_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_slug" text NOT NULL,
	"story_id" text NOT NULL,
	"link_type" text DEFAULT 'mentioned' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_slug" text NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"plan_type" text,
	"status" text DEFAULT 'active' NOT NULL,
	"feature_dir" text,
	"story_prefix" text,
	"estimated_stories" integer,
	"phases" jsonb,
	"tags" text[],
	"raw_content" text NOT NULL,
	"source_file" text,
	"content_hash" text,
	"kb_entry_id" uuid,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "plans_plan_slug_unique" UNIQUE("plan_slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" text NOT NULL,
	"feature" text,
	"epic" text,
	"title" text NOT NULL,
	"story_dir" text,
	"story_file" text DEFAULT 'story.yaml',
	"story_type" text,
	"points" integer,
	"priority" text,
	"state" text,
	"phase" text,
	"iteration" integer DEFAULT 0,
	"blocked" boolean DEFAULT false,
	"blocked_reason" text,
	"blocked_by_story" text,
	"touches_backend" boolean DEFAULT false,
	"touches_frontend" boolean DEFAULT false,
	"touches_database" boolean DEFAULT false,
	"touches_infra" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"file_synced_at" timestamp,
	"file_hash" text,
	CONSTRAINT "stories_story_id_unique" UNIQUE("story_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "story_artifacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" text NOT NULL,
	"artifact_type" text NOT NULL,
	"artifact_name" text,
	"kb_entry_id" uuid,
	"file_path" text,
	"phase" text,
	"iteration" integer,
	"summary" jsonb,
	"content" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "story_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"operation" text NOT NULL,
	"previous_value" jsonb,
	"new_value" jsonb,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"user_context" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "story_dependencies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" text NOT NULL,
	"target_story_id" text NOT NULL,
	"dependency_type" text NOT NULL,
	"satisfied" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "story_token_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" text NOT NULL,
	"feature" text,
	"phase" text NOT NULL,
	"agent" text,
	"iteration" integer DEFAULT 0,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"logged_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "task_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"operation" text NOT NULL,
	"previous_value" jsonb,
	"new_value" jsonb,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"user_context" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"source_story_id" text,
	"source_phase" text,
	"source_agent" text,
	"task_type" text NOT NULL,
	"priority" text,
	"status" text DEFAULT 'open' NOT NULL,
	"blocked_by" uuid,
	"related_kb_entries" text[],
	"promoted_to_story" text,
	"tags" text[],
	"estimated_effort" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "work_state" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" text NOT NULL,
	"branch" text,
	"phase" text,
	"constraints" jsonb DEFAULT '[]'::jsonb,
	"recent_actions" jsonb DEFAULT '[]'::jsonb,
	"next_steps" jsonb DEFAULT '[]'::jsonb,
	"blockers" jsonb DEFAULT '[]'::jsonb,
	"kb_references" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "work_state_story_id_unique" UNIQUE("story_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "work_state_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" text NOT NULL,
	"state_snapshot" jsonb NOT NULL,
	"archived_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_entry_id_knowledge_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."knowledge_entries"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "knowledge_entries" ADD CONSTRAINT "knowledge_entries_canonical_id_knowledge_entries_id_fk" FOREIGN KEY ("canonical_id") REFERENCES "public"."knowledge_entries"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "plans" ADD CONSTRAINT "plans_kb_entry_id_knowledge_entries_id_fk" FOREIGN KEY ("kb_entry_id") REFERENCES "public"."knowledge_entries"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "story_artifacts" ADD CONSTRAINT "story_artifacts_kb_entry_id_knowledge_entries_id_fk" FOREIGN KEY ("kb_entry_id") REFERENCES "public"."knowledge_entries"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "task_audit_log" ADD CONSTRAINT "task_audit_log_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_log_entry_id_idx" ON "audit_log" USING btree ("entry_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_log_timestamp_idx" ON "audit_log" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_log_entry_timestamp_idx" ON "audit_log" USING btree ("entry_id","timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "embedding_cache_content_model_idx" ON "embedding_cache" USING btree ("content_hash","model");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "knowledge_entries_role_idx" ON "knowledge_entries" USING btree ("role");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "knowledge_entries_entry_type_idx" ON "knowledge_entries" USING btree ("entry_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "knowledge_entries_story_id_idx" ON "knowledge_entries" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "knowledge_entries_created_at_idx" ON "knowledge_entries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "knowledge_entries_archived_idx" ON "knowledge_entries" USING btree ("archived");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "knowledge_entries_is_canonical_idx" ON "knowledge_entries" USING btree ("is_canonical");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_plan_story_links_plan_slug" ON "plan_story_links" USING btree ("plan_slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_plan_story_links_story_id" ON "plan_story_links" USING btree ("story_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_plan_story_links_unique" ON "plan_story_links" USING btree ("plan_slug","story_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_plans_status" ON "plans" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_plans_plan_type" ON "plans" USING btree ("plan_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_plans_story_prefix" ON "plans" USING btree ("story_prefix");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_plans_feature_dir" ON "plans" USING btree ("feature_dir");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_plans_created_at" ON "plans" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_stories_feature" ON "stories" USING btree ("feature");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_stories_epic" ON "stories" USING btree ("epic");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_stories_state" ON "stories" USING btree ("state");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_stories_phase" ON "stories" USING btree ("phase");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_stories_created_at" ON "stories" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_stories_updated_at" ON "stories" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_stories_feature_state" ON "stories" USING btree ("feature","state");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_story_artifacts_story_id" ON "story_artifacts" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_story_artifacts_type" ON "story_artifacts" USING btree ("artifact_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_story_artifacts_kb_entry" ON "story_artifacts" USING btree ("kb_entry_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_story_artifacts_phase" ON "story_artifacts" USING btree ("phase");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_story_audit_log_story_id" ON "story_audit_log" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_story_audit_log_timestamp" ON "story_audit_log" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_story_audit_log_story_timestamp" ON "story_audit_log" USING btree ("story_id","timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_story_dependencies_story_id" ON "story_dependencies" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_story_dependencies_target" ON "story_dependencies" USING btree ("target_story_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_story_dependencies_type" ON "story_dependencies" USING btree ("dependency_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_story_token_usage_story_id" ON "story_token_usage" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_story_token_usage_feature" ON "story_token_usage" USING btree ("feature");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_story_token_usage_phase" ON "story_token_usage" USING btree ("phase");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_story_token_usage_feature_phase" ON "story_token_usage" USING btree ("feature","phase");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_story_token_usage_logged_at" ON "story_token_usage" USING btree ("logged_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_task_audit_log_task_id" ON "task_audit_log" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_task_audit_log_timestamp" ON "task_audit_log" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_task_audit_log_task_timestamp" ON "task_audit_log" USING btree ("task_id","timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tasks_status" ON "tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tasks_source_story" ON "tasks" USING btree ("source_story_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tasks_type_priority" ON "tasks" USING btree ("task_type","priority");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tasks_created_at" ON "tasks" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_work_state_phase" ON "work_state" USING btree ("phase");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_work_state_history_story" ON "work_state_history" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_work_state_history_archived_at" ON "work_state_history" USING btree ("archived_at");