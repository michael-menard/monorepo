ALTER TABLE "feature_flag_schedules" ADD COLUMN "retry_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "feature_flag_schedules" ADD COLUMN "max_retries" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "feature_flag_schedules" ADD COLUMN "next_retry_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "feature_flag_schedules" ADD COLUMN "last_error" text;--> statement-breakpoint
CREATE INDEX "idx_schedules_next_retry_at" ON "feature_flag_schedules" USING btree ("next_retry_at");--> statement-breakpoint
ALTER TABLE "feature_flag_schedules" ADD CONSTRAINT "max_retries_check" CHECK (max_retries >= 0 AND max_retries <= 10);