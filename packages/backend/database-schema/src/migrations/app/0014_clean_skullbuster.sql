CREATE SCHEMA "telemetry";
--> statement-breakpoint
CREATE TYPE "telemetry"."workflow_event_type" AS ENUM('item_state_changed', 'step_completed', 'story_changed', 'gap_found', 'flow_issue');--> statement-breakpoint
CREATE TABLE "telemetry"."workflow_events" (
	"event_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" "telemetry"."workflow_event_type" NOT NULL,
	"event_version" integer DEFAULT 1 NOT NULL,
	"ts" timestamp DEFAULT now() NOT NULL,
	"run_id" text,
	"item_id" text,
	"workflow_name" text,
	"agent_role" text,
	"status" text,
	"payload" jsonb
);
--> statement-breakpoint
ALTER TABLE "moc_files" ADD COLUMN "s3_key" text NOT NULL;--> statement-breakpoint
ALTER TABLE "upload_sessions" ADD COLUMN "original_filename" text;--> statement-breakpoint
ALTER TABLE "upload_sessions" ADD COLUMN "original_file_size" integer;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_workflow_events_event_id_unique" ON "telemetry"."workflow_events" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "idx_workflow_events_event_type_ts" ON "telemetry"."workflow_events" USING btree ("event_type","ts");--> statement-breakpoint
CREATE INDEX "idx_workflow_events_run_id_ts" ON "telemetry"."workflow_events" USING btree ("run_id","ts");--> statement-breakpoint
CREATE INDEX "idx_workflow_events_item_id" ON "telemetry"."workflow_events" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "idx_workflow_events_workflow_name" ON "telemetry"."workflow_events" USING btree ("workflow_name");--> statement-breakpoint
CREATE INDEX "idx_workflow_events_agent_role" ON "telemetry"."workflow_events" USING btree ("agent_role");--> statement-breakpoint
CREATE INDEX "idx_workflow_events_status" ON "telemetry"."workflow_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_workflow_events_ts" ON "telemetry"."workflow_events" USING btree ("ts");