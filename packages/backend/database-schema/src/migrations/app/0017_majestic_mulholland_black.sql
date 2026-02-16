ALTER TABLE "telemetry"."workflow_events" ADD COLUMN "correlation_id" uuid;--> statement-breakpoint
ALTER TABLE "telemetry"."workflow_events" ADD COLUMN "source" text;--> statement-breakpoint
ALTER TABLE "telemetry"."workflow_events" ADD COLUMN "emitted_by" text;