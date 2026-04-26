-- BrickLink MOC scraper tables
-- These live in the shared `rebrickable` scraper database alongside
-- scrape_runs and scrape_step_events (which already exist).

CREATE TABLE "bricklink_designs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_model" integer NOT NULL,
	"title" text NOT NULL,
	"author" text DEFAULT '' NOT NULL,
	"author_url" text,
	"author_location" text,
	"description" text,
	"published_date" text,
	"category" text,
	"tags" jsonb,
	"views" integer DEFAULT 0 NOT NULL,
	"downloads" integer DEFAULT 0 NOT NULL,
	"likes" integer DEFAULT 0 NOT NULL,
	"comments" integer DEFAULT 0 NOT NULL,
	"lot_count" integer DEFAULT 0 NOT NULL,
	"item_count" integer DEFAULT 0 NOT NULL,
	"color_count" integer DEFAULT 0 NOT NULL,
	"main_image_url" text,
	"gallery_image_urls" jsonb,
	"main_image_s3_key" text,
	"gallery_image_s3_keys" jsonb,
	"source_url" text NOT NULL,
	"scrape_run_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bricklink_design_parts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"design_id" uuid NOT NULL,
	"part_number" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"color" text DEFAULT '' NOT NULL,
	"color_id" integer,
	"quantity" integer DEFAULT 1 NOT NULL,
	"image_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bricklink_designs" ADD CONSTRAINT "bricklink_designs_scrape_run_id_scrape_runs_id_fk" FOREIGN KEY ("scrape_run_id") REFERENCES "public"."scrape_runs"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "bricklink_design_parts" ADD CONSTRAINT "bricklink_design_parts_design_id_bricklink_designs_id_fk" FOREIGN KEY ("design_id") REFERENCES "public"."bricklink_designs"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "bricklink_designs_id_model_idx" ON "bricklink_designs" USING btree ("id_model");
--> statement-breakpoint
CREATE UNIQUE INDEX "bricklink_design_parts_design_part_color_idx" ON "bricklink_design_parts" USING btree ("design_id","part_number","color");
