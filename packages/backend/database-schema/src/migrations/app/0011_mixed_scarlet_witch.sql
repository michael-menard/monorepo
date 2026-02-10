CREATE TABLE "feature_flag_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"flag_id" uuid NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"updates" jsonb NOT NULL,
	"applied_at" timestamp with time zone,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "schedule_status_check" CHECK (status IN ('pending', 'applied', 'failed', 'cancelled'))
);
--> statement-breakpoint
ALTER TABLE "feature_flag_schedules" ADD CONSTRAINT "feature_flag_schedules_flag_id_feature_flags_id_fk" FOREIGN KEY ("flag_id") REFERENCES "public"."feature_flags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_schedules_flag_id" ON "feature_flag_schedules" USING btree ("flag_id");--> statement-breakpoint
CREATE INDEX "idx_schedules_scheduled_at" ON "feature_flag_schedules" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "idx_schedules_status" ON "feature_flag_schedules" USING btree ("status");