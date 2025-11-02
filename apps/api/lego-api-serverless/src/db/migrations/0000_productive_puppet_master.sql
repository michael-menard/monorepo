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
CREATE TABLE "moc_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"moc_id" uuid NOT NULL,
	"file_type" text NOT NULL,
	"file_url" text NOT NULL,
	"original_filename" text,
	"mime_type" text,
	"created_at" timestamp DEFAULT now() NOT NULL
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
	"author" text,
	"parts_count" integer,
	"theme" text,
	"subtheme" text,
	"uploaded_date" timestamp,
	"brand" text,
	"set_number" text,
	"release_year" integer,
	"retired" boolean,
	"tags" jsonb,
	"thumbnail_url" text,
	"total_piece_count" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
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
CREATE TABLE "wishlist_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"product_link" text,
	"image_url" text,
	"category" text,
	"sort_order" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gallery_flags" ADD CONSTRAINT "gallery_flags_image_id_gallery_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."gallery_images"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moc_files" ADD CONSTRAINT "moc_files_moc_id_moc_instructions_id_fk" FOREIGN KEY ("moc_id") REFERENCES "public"."moc_instructions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moc_gallery_albums" ADD CONSTRAINT "moc_gallery_albums_moc_id_moc_instructions_id_fk" FOREIGN KEY ("moc_id") REFERENCES "public"."moc_instructions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moc_gallery_albums" ADD CONSTRAINT "moc_gallery_albums_gallery_album_id_gallery_albums_id_fk" FOREIGN KEY ("gallery_album_id") REFERENCES "public"."gallery_albums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moc_gallery_images" ADD CONSTRAINT "moc_gallery_images_moc_id_moc_instructions_id_fk" FOREIGN KEY ("moc_id") REFERENCES "public"."moc_instructions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moc_gallery_images" ADD CONSTRAINT "moc_gallery_images_gallery_image_id_gallery_images_id_fk" FOREIGN KEY ("gallery_image_id") REFERENCES "public"."gallery_images"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moc_parts_lists" ADD CONSTRAINT "moc_parts_lists_moc_id_moc_instructions_id_fk" FOREIGN KEY ("moc_id") REFERENCES "public"."moc_instructions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moc_parts_lists" ADD CONSTRAINT "moc_parts_lists_file_id_moc_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."moc_files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_gallery_albums_user_id_lazy" ON "gallery_albums" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_gallery_albums_user_created" ON "gallery_albums" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_gallery_flags_user_id_lazy" ON "gallery_flags" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_gallery_flags_image_id" ON "gallery_flags" USING btree ("image_id");--> statement-breakpoint
CREATE UNIQUE INDEX "gallery_flags_image_user_unique" ON "gallery_flags" USING btree ("image_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_gallery_images_user_id_lazy" ON "gallery_images" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_gallery_images_album_id_lazy" ON "gallery_images" USING btree ("album_id");--> statement-breakpoint
CREATE INDEX "idx_gallery_images_user_created" ON "gallery_images" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_gallery_images_album_created" ON "gallery_images" USING btree ("album_id","created_at");--> statement-breakpoint
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
CREATE INDEX "idx_moc_parts_lists_moc_id" ON "moc_parts_lists" USING btree ("moc_id");--> statement-breakpoint
CREATE INDEX "idx_moc_parts_lists_file_id" ON "moc_parts_lists" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "idx_moc_parts_lists_built" ON "moc_parts_lists" USING btree ("built");--> statement-breakpoint
CREATE INDEX "idx_moc_parts_lists_purchased" ON "moc_parts_lists" USING btree ("purchased");--> statement-breakpoint
CREATE INDEX "idx_moc_parts_lists_moc_built" ON "moc_parts_lists" USING btree ("moc_id","built");--> statement-breakpoint
CREATE INDEX "idx_moc_parts_lists_moc_purchased" ON "moc_parts_lists" USING btree ("moc_id","purchased");--> statement-breakpoint
CREATE INDEX "idx_wishlist_user_id" ON "wishlist_items" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_wishlist_sort_order" ON "wishlist_items" USING btree ("user_id","sort_order");--> statement-breakpoint
CREATE INDEX "idx_wishlist_category_sort" ON "wishlist_items" USING btree ("user_id","category","sort_order");