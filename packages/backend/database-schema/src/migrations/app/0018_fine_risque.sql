CREATE TYPE "public"."artifact_type" AS ENUM('PLAN', 'SCOPE', 'EVIDENCE', 'CHECKPOINT', 'DECISIONS', 'REVIEW', 'PROOF', 'ELAB', 'OUTCOME', 'TEST_PLAN', 'UIUX_NOTES', 'DEV_FEASIBILITY');--> statement-breakpoint
CREATE TYPE "public"."assignee_type" AS ENUM('agent', 'user');--> statement-breakpoint
CREATE TYPE "public"."assignment_status" AS ENUM('active', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."blocker_type" AS ENUM('dependency', 'technical', 'resource', 'decision');--> statement-breakpoint
CREATE TYPE "public"."phase" AS ENUM('setup', 'plan', 'execute', 'review', 'qa');--> statement-breakpoint
CREATE TYPE "public"."phase_status" AS ENUM('entered', 'completed', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."severity" AS ENUM('high', 'medium', 'low');--> statement-breakpoint
CREATE TABLE "wint"."story_artifacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"artifact_type" "artifact_type" NOT NULL,
	"file_path" text NOT NULL,
	"checksum" varchar(64) NOT NULL,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wint"."story_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"assignee_type" "assignee_type" NOT NULL,
	"assignee_id" varchar(255) NOT NULL,
	"phase" "phase",
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"status" "assignment_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wint"."story_blockers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"blocker_type" "blocker_type" NOT NULL,
	"blocker_description" text NOT NULL,
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolution_notes" text,
	"severity" "severity" DEFAULT 'medium' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wint"."story_metadata_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"metadata_snapshot" jsonb NOT NULL,
	"changed_by" varchar(255),
	"change_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wint"."story_phase_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"phase" "phase" NOT NULL,
	"status" "phase_status" NOT NULL,
	"entered_at" timestamp with time zone NOT NULL,
	"exited_at" timestamp with time zone,
	"duration_seconds" integer,
	"agent_name" varchar(255),
	"iteration" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "wint"."story_artifacts" ADD CONSTRAINT "story_artifacts_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "wint"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wint"."story_assignments" ADD CONSTRAINT "story_assignments_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "wint"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wint"."story_blockers" ADD CONSTRAINT "story_blockers_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "wint"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wint"."story_metadata_versions" ADD CONSTRAINT "story_metadata_versions_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "wint"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wint"."story_phase_history" ADD CONSTRAINT "story_phase_history_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "wint"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "story_artifacts_story_id_idx" ON "wint"."story_artifacts" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "story_artifacts_artifact_type_idx" ON "wint"."story_artifacts" USING btree ("artifact_type");--> statement-breakpoint
CREATE INDEX "story_artifacts_file_path_idx" ON "wint"."story_artifacts" USING btree ("file_path");--> statement-breakpoint
CREATE UNIQUE INDEX "story_artifacts_story_id_artifact_type_idx" ON "wint"."story_artifacts" USING btree ("story_id","artifact_type");--> statement-breakpoint
CREATE INDEX "story_assignments_story_id_idx" ON "wint"."story_assignments" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "story_assignments_assignee_id_idx" ON "wint"."story_assignments" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "story_assignments_status_idx" ON "wint"."story_assignments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "story_assignments_assigned_at_idx" ON "wint"."story_assignments" USING btree ("assigned_at");--> statement-breakpoint
CREATE INDEX "story_blockers_story_id_idx" ON "wint"."story_blockers" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "story_blockers_blocker_type_idx" ON "wint"."story_blockers" USING btree ("blocker_type");--> statement-breakpoint
CREATE INDEX "story_blockers_resolved_at_idx" ON "wint"."story_blockers" USING btree ("resolved_at");--> statement-breakpoint
CREATE INDEX "story_blockers_severity_idx" ON "wint"."story_blockers" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "story_metadata_versions_story_id_idx" ON "wint"."story_metadata_versions" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "story_metadata_versions_version_idx" ON "wint"."story_metadata_versions" USING btree ("version");--> statement-breakpoint
CREATE INDEX "story_metadata_versions_created_at_idx" ON "wint"."story_metadata_versions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "story_metadata_versions_story_id_version_idx" ON "wint"."story_metadata_versions" USING btree ("story_id","version");--> statement-breakpoint
CREATE INDEX "story_phase_history_story_id_idx" ON "wint"."story_phase_history" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "story_phase_history_phase_idx" ON "wint"."story_phase_history" USING btree ("phase");--> statement-breakpoint
CREATE INDEX "story_phase_history_entered_at_idx" ON "wint"."story_phase_history" USING btree ("entered_at");--> statement-breakpoint
CREATE INDEX "story_phase_history_story_id_phase_idx" ON "wint"."story_phase_history" USING btree ("story_id","phase");