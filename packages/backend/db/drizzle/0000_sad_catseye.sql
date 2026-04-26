CREATE SCHEMA "telemetry";
--> statement-breakpoint
CREATE TYPE "telemetry"."workflow_event_type" AS ENUM('item_state_changed', 'step_completed', 'story_changed', 'gap_found', 'flow_issue');--> statement-breakpoint
CREATE TABLE "build_project_parts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"part_number" text NOT NULL,
	"color" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"source" text NOT NULL,
	"explanation" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "build_projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"concept" text NOT NULL,
	"search_signals" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gallery_albums" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"cover_image_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gallery_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"image_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gallery_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"tags" jsonb,
	"image_url" text NOT NULL,
	"thumbnail_url" text,
	"album_id" uuid,
	"flagged" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text NOT NULL,
	"store_id" text,
	"store_name" text,
	"part_number" text NOT NULL,
	"color_raw" text,
	"color_canonical" text,
	"condition" text NOT NULL,
	"price_original" text NOT NULL,
	"currency_original" text NOT NULL,
	"price_usd" text NOT NULL,
	"exchange_rate" text NOT NULL,
	"quantity_available" integer NOT NULL,
	"min_buy" text,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moc_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"moc_id" uuid NOT NULL,
	"file_type" text NOT NULL,
	"s3_key" text NOT NULL,
	"original_filename" text,
	"mime_type" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "moc_gallery_albums" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"moc_id" uuid NOT NULL,
	"gallery_album_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moc_gallery_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"moc_id" uuid NOT NULL,
	"gallery_image_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moc_instructions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" text NOT NULL,
	"moc_id" text,
	"slug" text,
	"author" text,
	"parts_count" integer,
	"minifig_count" integer,
	"theme" text,
	"theme_id" integer,
	"subtheme" text,
	"uploaded_date" timestamp,
	"brand" text,
	"set_number" text,
	"release_year" integer,
	"retired" boolean,
	"designer" jsonb,
	"dimensions" jsonb,
	"instructions_metadata" jsonb,
	"alternate_build" jsonb,
	"features" jsonb,
	"source" text DEFAULT 'rebrickable',
	"source_platform" jsonb,
	"event_badges" jsonb,
	"moderation" jsonb,
	"platform_category_id" integer,
	"description_html" text,
	"short_description" text,
	"ratings" jsonb,
	"notes" text,
	"difficulty" text,
	"build_time_hours" integer,
	"age_recommendation" text,
	"status" text DEFAULT 'draft',
	"visibility" text DEFAULT 'private',
	"is_featured" boolean DEFAULT false,
	"is_verified" boolean DEFAULT false,
	"tags" jsonb,
	"thumbnail_url" text,
	"total_piece_count" integer,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"build_status" text DEFAULT 'instructions_added' NOT NULL,
	"review_skipped_at" timestamp with time zone,
	"want_to_build" boolean DEFAULT false,
	"added_by_user_id" text,
	"last_updated_by_user_id" text
);
--> statement-breakpoint
CREATE TABLE "moc_parts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parts_list_id" uuid NOT NULL,
	"part_id" text NOT NULL,
	"part_name" text NOT NULL,
	"quantity" integer NOT NULL,
	"color" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moc_parts_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"moc_id" uuid NOT NULL,
	"file_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"built" boolean DEFAULT false,
	"purchased" boolean DEFAULT false,
	"inventory_percentage" text DEFAULT '0.00',
	"total_parts_count" text,
	"acquired_parts_count" text DEFAULT '0',
	"cost_estimate" text,
	"actual_cost" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moc_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"moc_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"sections" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moc_source_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"moc_number" text NOT NULL,
	"set_number" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parts_inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"part_number" text NOT NULL,
	"color" text NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"source" text,
	"source_id" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tag_theme_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tag" text NOT NULL,
	"theme" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "tag_theme_mappings_tag_unique" UNIQUE("tag")
);
--> statement-breakpoint
CREATE TABLE "wishlist_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"product_link" text,
	"image_url" text,
	"image_width" integer,
	"image_height" integer,
	"category" text,
	"sort_order" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
	"payload" jsonb,
	"correlation_id" uuid,
	"source" text,
	"emitted_by" text
);
--> statement-breakpoint
ALTER TABLE "build_project_parts" ADD CONSTRAINT "build_project_parts_project_id_build_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."build_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_flags" ADD CONSTRAINT "gallery_flags_image_id_gallery_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."gallery_images"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moc_files" ADD CONSTRAINT "moc_files_moc_id_moc_instructions_id_fk" FOREIGN KEY ("moc_id") REFERENCES "public"."moc_instructions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moc_gallery_albums" ADD CONSTRAINT "moc_gallery_albums_moc_id_moc_instructions_id_fk" FOREIGN KEY ("moc_id") REFERENCES "public"."moc_instructions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moc_gallery_albums" ADD CONSTRAINT "moc_gallery_albums_gallery_album_id_gallery_albums_id_fk" FOREIGN KEY ("gallery_album_id") REFERENCES "public"."gallery_albums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moc_gallery_images" ADD CONSTRAINT "moc_gallery_images_moc_id_moc_instructions_id_fk" FOREIGN KEY ("moc_id") REFERENCES "public"."moc_instructions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moc_gallery_images" ADD CONSTRAINT "moc_gallery_images_gallery_image_id_gallery_images_id_fk" FOREIGN KEY ("gallery_image_id") REFERENCES "public"."gallery_images"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moc_parts" ADD CONSTRAINT "moc_parts_parts_list_id_moc_parts_lists_id_fk" FOREIGN KEY ("parts_list_id") REFERENCES "public"."moc_parts_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moc_parts_lists" ADD CONSTRAINT "moc_parts_lists_moc_id_moc_instructions_id_fk" FOREIGN KEY ("moc_id") REFERENCES "public"."moc_instructions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moc_parts_lists" ADD CONSTRAINT "moc_parts_lists_file_id_moc_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."moc_files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moc_reviews" ADD CONSTRAINT "moc_reviews_moc_id_moc_instructions_id_fk" FOREIGN KEY ("moc_id") REFERENCES "public"."moc_instructions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_build_project_parts_project" ON "build_project_parts" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_build_projects_user" ON "build_projects" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_gallery_albums_user_id_lazy" ON "gallery_albums" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_gallery_albums_user_created" ON "gallery_albums" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_gallery_flags_user_id_lazy" ON "gallery_flags" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_gallery_flags_image_id" ON "gallery_flags" USING btree ("image_id");--> statement-breakpoint
CREATE UNIQUE INDEX "gallery_flags_image_user_unique" ON "gallery_flags" USING btree ("image_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_gallery_images_user_id_lazy" ON "gallery_images" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_gallery_images_album_id_lazy" ON "gallery_images" USING btree ("album_id");--> statement-breakpoint
CREATE INDEX "idx_gallery_images_user_created" ON "gallery_images" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_gallery_images_album_created" ON "gallery_images" USING btree ("album_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_marketplace_part" ON "marketplace_listings" USING btree ("part_number","color_raw");--> statement-breakpoint
CREATE INDEX "idx_marketplace_expires" ON "marketplace_listings" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "marketplace_listings_unique" ON "marketplace_listings" USING btree ("source","store_id","part_number","color_raw","condition");--> statement-breakpoint
CREATE INDEX "idx_moc_files_moc_id_lazy" ON "moc_files" USING btree ("moc_id");--> statement-breakpoint
CREATE INDEX "idx_moc_files_moc_type" ON "moc_files" USING btree ("moc_id","file_type");--> statement-breakpoint
CREATE UNIQUE INDEX "moc_files_moc_filename_unique" ON "moc_files" USING btree ("moc_id","original_filename");--> statement-breakpoint
CREATE INDEX "idx_moc_gallery_albums_moc_id_lazy" ON "moc_gallery_albums" USING btree ("moc_id");--> statement-breakpoint
CREATE INDEX "idx_moc_gallery_albums_gallery_album_id_lazy" ON "moc_gallery_albums" USING btree ("gallery_album_id");--> statement-breakpoint
CREATE INDEX "idx_moc_gallery_images_moc_id_lazy" ON "moc_gallery_images" USING btree ("moc_id");--> statement-breakpoint
CREATE INDEX "idx_moc_gallery_images_gallery_image_id_lazy" ON "moc_gallery_images" USING btree ("gallery_image_id");--> statement-breakpoint
CREATE INDEX "idx_moc_instructions_user_id_lazy" ON "moc_instructions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_moc_instructions_user_created" ON "moc_instructions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_moc_instructions_title" ON "moc_instructions" USING btree ("title");--> statement-breakpoint
CREATE UNIQUE INDEX "moc_instructions_user_title_unique" ON "moc_instructions" USING btree ("user_id","title");--> statement-breakpoint
CREATE INDEX "idx_sets_brand_set_number" ON "moc_instructions" USING btree ("brand","set_number") WHERE type = 'set' AND brand IS NOT NULL AND set_number IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_sets_brand_theme" ON "moc_instructions" USING btree ("brand","theme") WHERE type = 'set';--> statement-breakpoint
CREATE INDEX "idx_sets_release_year" ON "moc_instructions" USING btree ("release_year") WHERE type = 'set' AND release_year IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_sets_retired" ON "moc_instructions" USING btree ("retired") WHERE type = 'set' AND retired IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_moc_parts_parts_list_id" ON "moc_parts" USING btree ("parts_list_id");--> statement-breakpoint
CREATE INDEX "idx_moc_parts_part_id" ON "moc_parts" USING btree ("part_id");--> statement-breakpoint
CREATE INDEX "idx_moc_parts_color" ON "moc_parts" USING btree ("color");--> statement-breakpoint
CREATE INDEX "idx_moc_parts_lists_moc_id" ON "moc_parts_lists" USING btree ("moc_id");--> statement-breakpoint
CREATE INDEX "idx_moc_parts_lists_file_id" ON "moc_parts_lists" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "idx_moc_parts_lists_built" ON "moc_parts_lists" USING btree ("built");--> statement-breakpoint
CREATE INDEX "idx_moc_parts_lists_purchased" ON "moc_parts_lists" USING btree ("purchased");--> statement-breakpoint
CREATE INDEX "idx_moc_parts_lists_moc_built" ON "moc_parts_lists" USING btree ("moc_id","built");--> statement-breakpoint
CREATE INDEX "idx_moc_parts_lists_moc_purchased" ON "moc_parts_lists" USING btree ("moc_id","purchased");--> statement-breakpoint
CREATE INDEX "idx_moc_reviews_moc_id" ON "moc_reviews" USING btree ("moc_id");--> statement-breakpoint
CREATE INDEX "idx_moc_reviews_user_id" ON "moc_reviews" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_moc_reviews_status" ON "moc_reviews" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "moc_reviews_moc_user_unique" ON "moc_reviews" USING btree ("moc_id","user_id");--> statement-breakpoint
CREATE INDEX "moc_source_sets_moc_number_idx" ON "moc_source_sets" USING btree ("moc_number");--> statement-breakpoint
CREATE INDEX "moc_source_sets_set_number_idx" ON "moc_source_sets" USING btree ("set_number");--> statement-breakpoint
CREATE UNIQUE INDEX "moc_source_sets_moc_number_set_number_key" ON "moc_source_sets" USING btree ("moc_number","set_number");--> statement-breakpoint
CREATE INDEX "idx_parts_inventory_user" ON "parts_inventory" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_parts_inventory_part_color" ON "parts_inventory" USING btree ("part_number","color");--> statement-breakpoint
CREATE UNIQUE INDEX "parts_inventory_unique" ON "parts_inventory" USING btree ("part_number","color","source","source_id");--> statement-breakpoint
CREATE INDEX "idx_wishlist_user_id" ON "wishlist_items" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_wishlist_sort_order" ON "wishlist_items" USING btree ("user_id","sort_order");--> statement-breakpoint
CREATE INDEX "idx_wishlist_category_sort" ON "wishlist_items" USING btree ("user_id","category","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_workflow_events_event_id_unique" ON "telemetry"."workflow_events" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "idx_workflow_events_event_type_ts" ON "telemetry"."workflow_events" USING btree ("event_type","ts");--> statement-breakpoint
CREATE INDEX "idx_workflow_events_run_id_ts" ON "telemetry"."workflow_events" USING btree ("run_id","ts");--> statement-breakpoint
CREATE INDEX "idx_workflow_events_item_id" ON "telemetry"."workflow_events" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "idx_workflow_events_workflow_name" ON "telemetry"."workflow_events" USING btree ("workflow_name");--> statement-breakpoint
CREATE INDEX "idx_workflow_events_agent_role" ON "telemetry"."workflow_events" USING btree ("agent_role");--> statement-breakpoint
CREATE INDEX "idx_workflow_events_status" ON "telemetry"."workflow_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_workflow_events_ts" ON "telemetry"."workflow_events" USING btree ("ts");