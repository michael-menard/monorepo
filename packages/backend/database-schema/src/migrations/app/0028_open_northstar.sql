CREATE TYPE "wint"."confidence_level" AS ENUM('high', 'medium', 'low', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."rule_severity" AS ENUM('error', 'warning', 'info');--> statement-breakpoint
CREATE TYPE "public"."rule_status" AS ENUM('proposed', 'active', 'deprecated');--> statement-breakpoint
CREATE TYPE "public"."rule_type" AS ENUM('gate', 'lint', 'prompt_injection');--> statement-breakpoint
CREATE TYPE "public"."worktree_status" AS ENUM('active', 'merged', 'abandoned');--> statement-breakpoint
ALTER TYPE "public"."context_pack_type" ADD VALUE 'agent_missions';--> statement-breakpoint
CREATE TABLE "wint"."agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"agent_type" text NOT NULL,
	"permission_level" text NOT NULL,
	"model" text,
	"spawned_by" jsonb,
	"triggers" jsonb,
	"skills_used" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agents_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "wint"."change_telemetry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" text NOT NULL,
	"model_id" text NOT NULL,
	"affinity_key" text NOT NULL,
	"change_type" text DEFAULT 'unknown' NOT NULL,
	"file_type" text DEFAULT 'unknown' NOT NULL,
	"outcome" text NOT NULL,
	"tokens_in" integer DEFAULT 0 NOT NULL,
	"tokens_out" integer DEFAULT 0 NOT NULL,
	"escalated_to" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"error_code" text,
	"error_message" text,
	"duration_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_change_telemetry_outcome" CHECK ("wint"."change_telemetry"."outcome" IN ('pass', 'fail', 'abort', 'budget_exhausted')),
	CONSTRAINT "chk_change_telemetry_change_type" CHECK ("wint"."change_telemetry"."change_type" IN ('unknown', 'add', 'modify', 'delete', 'rename', 'refactor')),
	CONSTRAINT "chk_change_telemetry_file_type" CHECK ("wint"."change_telemetry"."file_type" IN ('unknown', 'ts', 'tsx', 'sql', 'yaml', 'json', 'md', 'sh', 'other'))
);
--> statement-breakpoint
CREATE TABLE "wint"."commands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"triggers" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commands_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "wint"."epics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"epic_name" text NOT NULL,
	"epic_prefix" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "epics_epic_name_unique" UNIQUE("epic_name"),
	CONSTRAINT "epics_epic_prefix_unique" UNIQUE("epic_prefix")
);
--> statement-breakpoint
CREATE TABLE "wint"."model_affinity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_id" text NOT NULL,
	"change_type" text NOT NULL,
	"file_type" text NOT NULL,
	"success_rate" numeric(5, 4) DEFAULT '0' NOT NULL,
	"sample_count" integer DEFAULT 0 NOT NULL,
	"avg_tokens" numeric(10, 2) DEFAULT '0' NOT NULL,
	"avg_retry_count" numeric(6, 3) DEFAULT '0' NOT NULL,
	"confidence_level" "wint"."confidence_level" DEFAULT 'unknown' NOT NULL,
	"trend" jsonb,
	"last_aggregated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wint"."phases" (
	"id" integer PRIMARY KEY NOT NULL,
	"phase_name" text NOT NULL,
	"description" text,
	"phase_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "phases_phase_name_unique" UNIQUE("phase_name")
);
--> statement-breakpoint
CREATE TABLE "wint"."rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_text" text NOT NULL,
	"rule_type" "rule_type" NOT NULL,
	"scope" text DEFAULT 'global' NOT NULL,
	"severity" "rule_severity" NOT NULL,
	"status" "rule_status" DEFAULT 'proposed' NOT NULL,
	"source_story_id" text,
	"source_lesson_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wint"."skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"capabilities" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "skills_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "wint"."worktrees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"worktree_path" text NOT NULL,
	"branch_name" text NOT NULL,
	"status" "worktree_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"merged_at" timestamp with time zone,
	"abandoned_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
ALTER TABLE "wint"."stories" ALTER COLUMN "state" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "wint"."stories" ALTER COLUMN "state" SET DEFAULT 'backlog'::text;--> statement-breakpoint
ALTER TABLE "wint"."story_states" ALTER COLUMN "state" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "wint"."story_transitions" ALTER COLUMN "from_state" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "wint"."story_transitions" ALTER COLUMN "to_state" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."story_state";--> statement-breakpoint
CREATE TYPE "public"."story_state" AS ENUM('backlog', 'ready', 'in_progress', 'ready_for_review', 'ready_for_qa', 'in_qa', 'blocked', 'completed', 'cancelled', 'failed_code_review', 'failed_qa');--> statement-breakpoint
ALTER TABLE "wint"."stories" ALTER COLUMN "state" SET DEFAULT 'backlog'::"public"."story_state";--> statement-breakpoint
ALTER TABLE "wint"."stories" ALTER COLUMN "state" SET DATA TYPE "public"."story_state" USING "state"::"public"."story_state";--> statement-breakpoint
ALTER TABLE "wint"."story_states" ALTER COLUMN "state" SET DATA TYPE "public"."story_state" USING "state"::"public"."story_state";--> statement-breakpoint
ALTER TABLE "wint"."story_transitions" ALTER COLUMN "from_state" SET DATA TYPE "public"."story_state" USING "from_state"::"public"."story_state";--> statement-breakpoint
ALTER TABLE "wint"."story_transitions" ALTER COLUMN "to_state" SET DATA TYPE "public"."story_state" USING "to_state"::"public"."story_state";--> statement-breakpoint
ALTER TABLE "telemetry"."workflow_events" ALTER COLUMN "ts" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "telemetry"."workflow_events" ALTER COLUMN "ts" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "wint"."capabilities" ADD COLUMN "feature_id" uuid;--> statement-breakpoint
ALTER TABLE "wint"."worktrees" ADD CONSTRAINT "worktrees_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "wint"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agents_name_idx" ON "wint"."agents" USING btree ("name");--> statement-breakpoint
CREATE INDEX "agents_agent_type_idx" ON "wint"."agents" USING btree ("agent_type");--> statement-breakpoint
CREATE INDEX "agents_permission_level_idx" ON "wint"."agents" USING btree ("permission_level");--> statement-breakpoint
CREATE INDEX "agents_model_idx" ON "wint"."agents" USING btree ("model");--> statement-breakpoint
CREATE INDEX "idx_change_telemetry_story_id" ON "wint"."change_telemetry" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "idx_change_telemetry_affinity" ON "wint"."change_telemetry" USING btree ("affinity_key");--> statement-breakpoint
CREATE INDEX "idx_change_telemetry_created_at" ON "wint"."change_telemetry" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "commands_name_idx" ON "wint"."commands" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "epics_epic_name_idx" ON "wint"."epics" USING btree ("epic_name");--> statement-breakpoint
CREATE UNIQUE INDEX "epics_epic_prefix_idx" ON "wint"."epics" USING btree ("epic_prefix");--> statement-breakpoint
CREATE INDEX "epics_is_active_idx" ON "wint"."epics" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_model_affinity_unique" ON "wint"."model_affinity" USING btree ("model_id","change_type","file_type");--> statement-breakpoint
CREATE INDEX "idx_model_affinity_confidence_level" ON "wint"."model_affinity" USING btree ("confidence_level");--> statement-breakpoint
CREATE INDEX "idx_model_affinity_last_aggregated_at" ON "wint"."model_affinity" USING btree ("last_aggregated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "phases_phase_name_idx" ON "wint"."phases" USING btree ("phase_name");--> statement-breakpoint
CREATE INDEX "phases_phase_order_idx" ON "wint"."phases" USING btree ("phase_order");--> statement-breakpoint
CREATE INDEX "idx_rules_status" ON "wint"."rules" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_rules_rule_type" ON "wint"."rules" USING btree ("rule_type");--> statement-breakpoint
CREATE INDEX "idx_rules_scope" ON "wint"."rules" USING btree ("scope");--> statement-breakpoint
CREATE INDEX "idx_rules_type_status" ON "wint"."rules" USING btree ("rule_type","status");--> statement-breakpoint
CREATE UNIQUE INDEX "skills_name_idx" ON "wint"."skills" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_active_worktree" ON "wint"."worktrees" USING btree ("story_id","status") WHERE "wint"."worktrees"."status" = 'active';--> statement-breakpoint
CREATE INDEX "idx_worktrees_story_id" ON "wint"."worktrees" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "idx_worktrees_status" ON "wint"."worktrees" USING btree ("status");--> statement-breakpoint
ALTER TABLE "wint"."capabilities" ADD CONSTRAINT "capabilities_feature_id_features_id_fk" FOREIGN KEY ("feature_id") REFERENCES "wint"."features"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_capabilities_feature_id" ON "wint"."capabilities" USING btree ("feature_id");