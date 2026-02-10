ALTER TABLE "feature_flag_schedules" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "feature_flag_schedules" ADD COLUMN "cancelled_by" text;--> statement-breakpoint
ALTER TABLE "feature_flag_schedules" ADD COLUMN "cancelled_at" timestamp with time zone;