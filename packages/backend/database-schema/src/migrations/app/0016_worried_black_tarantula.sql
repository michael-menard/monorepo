CREATE SCHEMA "kbar";
--> statement-breakpoint
CREATE TYPE "public"."kbar_artifact_type" AS ENUM('story_file', 'elaboration', 'plan', 'scope', 'evidence', 'review', 'test_plan', 'decisions', 'checkpoint', 'knowledge_context');--> statement-breakpoint
CREATE TYPE "public"."kbar_conflict_resolution" AS ENUM('filesystem_wins', 'database_wins', 'manual', 'merged', 'deferred');--> statement-breakpoint
CREATE TYPE "public"."kbar_dependency_type" AS ENUM('blocks', 'requires', 'related_to', 'enhances');--> statement-breakpoint
CREATE TYPE "public"."kbar_story_phase" AS ENUM('setup', 'plan', 'execute', 'review', 'qa', 'done');--> statement-breakpoint
CREATE TYPE "public"."kbar_story_priority" AS ENUM('P0', 'P1', 'P2', 'P3', 'P4');--> statement-breakpoint
CREATE TYPE "public"."kbar_sync_status" AS ENUM('pending', 'in_progress', 'completed', 'failed', 'conflict');--> statement-breakpoint
CREATE TABLE "kbar"."artifact_content_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artifact_id" uuid NOT NULL,
	"parsed_content" jsonb NOT NULL,
	"checksum" text NOT NULL,
	"hit_count" integer DEFAULT 0 NOT NULL,
	"last_hit_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kbar"."artifact_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artifact_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"checksum" text NOT NULL,
	"content_snapshot" text,
	"changed_by" text,
	"change_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kbar"."artifacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"artifact_type" "kbar_artifact_type" NOT NULL,
	"file_path" text NOT NULL,
	"checksum" text NOT NULL,
	"last_synced_at" timestamp with time zone,
	"sync_status" "kbar_sync_status" DEFAULT 'pending' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kbar"."index_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"index_id" uuid NOT NULL,
	"story_id" uuid NOT NULL,
	"sort_order" integer NOT NULL,
	"section_name" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kbar"."index_metadata" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"index_name" text NOT NULL,
	"index_type" text NOT NULL,
	"file_path" text NOT NULL,
	"checksum" text NOT NULL,
	"last_generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"parent_index_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "index_metadata_index_name_unique" UNIQUE("index_name")
);
--> statement-breakpoint
CREATE TABLE "kbar"."stories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" text NOT NULL,
	"epic" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"story_type" text NOT NULL,
	"priority" "kbar_story_priority" DEFAULT 'P2' NOT NULL,
	"complexity" text,
	"story_points" integer,
	"current_phase" "kbar_story_phase" DEFAULT 'setup' NOT NULL,
	"status" text DEFAULT 'backlog' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stories_story_id_unique" UNIQUE("story_id")
);
--> statement-breakpoint
CREATE TABLE "kbar"."story_dependencies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"depends_on_story_id" uuid NOT NULL,
	"dependency_type" "kbar_dependency_type" NOT NULL,
	"resolved" boolean DEFAULT false NOT NULL,
	"resolved_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kbar"."story_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"phase" "kbar_story_phase" NOT NULL,
	"status" text NOT NULL,
	"entered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"exited_at" timestamp with time zone,
	"duration_seconds" integer,
	"triggered_by" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kbar"."sync_checkpoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"checkpoint_name" text NOT NULL,
	"checkpoint_type" text NOT NULL,
	"last_processed_path" text,
	"last_processed_timestamp" timestamp with time zone,
	"total_processed" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sync_checkpoints_checkpoint_name_unique" UNIQUE("checkpoint_name")
);
--> statement-breakpoint
CREATE TABLE "kbar"."sync_conflicts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sync_event_id" uuid NOT NULL,
	"artifact_id" uuid NOT NULL,
	"conflict_type" text NOT NULL,
	"filesystem_checksum" text NOT NULL,
	"database_checksum" text NOT NULL,
	"resolution" "kbar_conflict_resolution",
	"resolved_at" timestamp with time zone,
	"resolved_by" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kbar"."sync_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text NOT NULL,
	"status" "kbar_sync_status" DEFAULT 'pending' NOT NULL,
	"story_id" text,
	"artifact_id" uuid,
	"files_scanned" integer DEFAULT 0 NOT NULL,
	"files_changed" integer DEFAULT 0 NOT NULL,
	"conflicts_detected" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"duration_ms" integer,
	"error_message" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "kbar"."artifact_content_cache" ADD CONSTRAINT "artifact_content_cache_artifact_id_artifacts_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "kbar"."artifacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kbar"."artifact_versions" ADD CONSTRAINT "artifact_versions_artifact_id_artifacts_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "kbar"."artifacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kbar"."artifacts" ADD CONSTRAINT "artifacts_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "kbar"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kbar"."index_entries" ADD CONSTRAINT "index_entries_index_id_index_metadata_id_fk" FOREIGN KEY ("index_id") REFERENCES "kbar"."index_metadata"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kbar"."index_entries" ADD CONSTRAINT "index_entries_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "kbar"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kbar"."index_metadata" ADD CONSTRAINT "index_metadata_parent_index_id_index_metadata_id_fk" FOREIGN KEY ("parent_index_id") REFERENCES "kbar"."index_metadata"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kbar"."story_dependencies" ADD CONSTRAINT "story_dependencies_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "kbar"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kbar"."story_dependencies" ADD CONSTRAINT "story_dependencies_depends_on_story_id_stories_id_fk" FOREIGN KEY ("depends_on_story_id") REFERENCES "kbar"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kbar"."story_states" ADD CONSTRAINT "story_states_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "kbar"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kbar"."sync_conflicts" ADD CONSTRAINT "sync_conflicts_sync_event_id_sync_events_id_fk" FOREIGN KEY ("sync_event_id") REFERENCES "kbar"."sync_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kbar"."sync_conflicts" ADD CONSTRAINT "sync_conflicts_artifact_id_artifacts_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "kbar"."artifacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kbar"."sync_events" ADD CONSTRAINT "sync_events_artifact_id_artifacts_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "kbar"."artifacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "artifact_content_cache_artifact_id_idx" ON "kbar"."artifact_content_cache" USING btree ("artifact_id");--> statement-breakpoint
CREATE INDEX "artifact_content_cache_checksum_idx" ON "kbar"."artifact_content_cache" USING btree ("checksum");--> statement-breakpoint
CREATE INDEX "artifact_content_cache_expires_at_idx" ON "kbar"."artifact_content_cache" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "artifact_versions_artifact_id_idx" ON "kbar"."artifact_versions" USING btree ("artifact_id");--> statement-breakpoint
CREATE INDEX "artifact_versions_version_idx" ON "kbar"."artifact_versions" USING btree ("version");--> statement-breakpoint
CREATE INDEX "artifact_versions_created_at_idx" ON "kbar"."artifact_versions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "artifact_versions_artifact_version_idx" ON "kbar"."artifact_versions" USING btree ("artifact_id","version");--> statement-breakpoint
CREATE INDEX "artifacts_story_id_idx" ON "kbar"."artifacts" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "artifacts_artifact_type_idx" ON "kbar"."artifacts" USING btree ("artifact_type");--> statement-breakpoint
CREATE INDEX "artifacts_file_path_idx" ON "kbar"."artifacts" USING btree ("file_path");--> statement-breakpoint
CREATE INDEX "artifacts_sync_status_idx" ON "kbar"."artifacts" USING btree ("sync_status");--> statement-breakpoint
CREATE INDEX "artifacts_story_artifact_type_idx" ON "kbar"."artifacts" USING btree ("story_id","artifact_type");--> statement-breakpoint
CREATE INDEX "index_entries_index_id_idx" ON "kbar"."index_entries" USING btree ("index_id");--> statement-breakpoint
CREATE INDEX "index_entries_story_id_idx" ON "kbar"."index_entries" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "index_entries_sort_order_idx" ON "kbar"."index_entries" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "index_entries_index_sort_idx" ON "kbar"."index_entries" USING btree ("index_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "index_entries_unique" ON "kbar"."index_entries" USING btree ("index_id","story_id");--> statement-breakpoint
CREATE UNIQUE INDEX "index_metadata_index_name_idx" ON "kbar"."index_metadata" USING btree ("index_name");--> statement-breakpoint
CREATE INDEX "index_metadata_index_type_idx" ON "kbar"."index_metadata" USING btree ("index_type");--> statement-breakpoint
CREATE INDEX "index_metadata_parent_index_id_idx" ON "kbar"."index_metadata" USING btree ("parent_index_id");--> statement-breakpoint
CREATE INDEX "index_metadata_file_path_idx" ON "kbar"."index_metadata" USING btree ("file_path");--> statement-breakpoint
CREATE UNIQUE INDEX "stories_story_id_idx" ON "kbar"."stories" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "stories_epic_idx" ON "kbar"."stories" USING btree ("epic");--> statement-breakpoint
CREATE INDEX "stories_current_phase_idx" ON "kbar"."stories" USING btree ("current_phase");--> statement-breakpoint
CREATE INDEX "stories_status_idx" ON "kbar"."stories" USING btree ("status");--> statement-breakpoint
CREATE INDEX "stories_epic_phase_idx" ON "kbar"."stories" USING btree ("epic","current_phase");--> statement-breakpoint
CREATE INDEX "story_dependencies_story_id_idx" ON "kbar"."story_dependencies" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "story_dependencies_depends_on_idx" ON "kbar"."story_dependencies" USING btree ("depends_on_story_id");--> statement-breakpoint
CREATE UNIQUE INDEX "story_dependencies_unique" ON "kbar"."story_dependencies" USING btree ("story_id","depends_on_story_id","dependency_type");--> statement-breakpoint
CREATE INDEX "story_states_story_id_idx" ON "kbar"."story_states" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "story_states_phase_idx" ON "kbar"."story_states" USING btree ("phase");--> statement-breakpoint
CREATE INDEX "story_states_entered_at_idx" ON "kbar"."story_states" USING btree ("entered_at");--> statement-breakpoint
CREATE INDEX "story_states_story_phase_idx" ON "kbar"."story_states" USING btree ("story_id","phase");--> statement-breakpoint
CREATE UNIQUE INDEX "sync_checkpoints_checkpoint_name_idx" ON "kbar"."sync_checkpoints" USING btree ("checkpoint_name");--> statement-breakpoint
CREATE INDEX "sync_checkpoints_checkpoint_type_idx" ON "kbar"."sync_checkpoints" USING btree ("checkpoint_type");--> statement-breakpoint
CREATE INDEX "sync_checkpoints_is_active_idx" ON "kbar"."sync_checkpoints" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "sync_conflicts_sync_event_id_idx" ON "kbar"."sync_conflicts" USING btree ("sync_event_id");--> statement-breakpoint
CREATE INDEX "sync_conflicts_artifact_id_idx" ON "kbar"."sync_conflicts" USING btree ("artifact_id");--> statement-breakpoint
CREATE INDEX "sync_conflicts_resolution_idx" ON "kbar"."sync_conflicts" USING btree ("resolution");--> statement-breakpoint
CREATE INDEX "sync_conflicts_created_at_idx" ON "kbar"."sync_conflicts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sync_events_event_type_idx" ON "kbar"."sync_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "sync_events_status_idx" ON "kbar"."sync_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sync_events_story_id_idx" ON "kbar"."sync_events" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "sync_events_started_at_idx" ON "kbar"."sync_events" USING btree ("started_at");