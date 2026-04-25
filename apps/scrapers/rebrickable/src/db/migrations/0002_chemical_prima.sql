CREATE TABLE "scrape_step_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" text,
	"scrape_run_id" uuid,
	"moc_number" text,
	"scraper_type" text NOT NULL,
	"event_type" text NOT NULL,
	"step_id" text,
	"status" text,
	"seq" integer NOT NULL,
	"detail" jsonb,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scrape_step_events" ADD CONSTRAINT "scrape_step_events_scrape_run_id_scrape_runs_id_fk" FOREIGN KEY ("scrape_run_id") REFERENCES "public"."scrape_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_scrape_step_events_job_id" ON "scrape_step_events" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_scrape_step_events_scrape_run" ON "scrape_step_events" USING btree ("scrape_run_id");--> statement-breakpoint
CREATE INDEX "idx_scrape_step_events_created" ON "scrape_step_events" USING btree ("created_at");