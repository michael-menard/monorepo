CREATE TABLE "admin_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_user_id" text NOT NULL,
	"action_type" text NOT NULL,
	"target_user_id" text,
	"reason" text,
	"details" jsonb,
	"result" text NOT NULL,
	"error_message" text,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "album_mocs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"album_id" uuid NOT NULL,
	"moc_id" uuid NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "album_parents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"album_id" uuid NOT NULL,
	"parent_album_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inspiration_album_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inspiration_id" uuid NOT NULL,
	"album_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inspiration_albums" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"cover_image_id" uuid,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inspiration_mocs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inspiration_id" uuid NOT NULL,
	"moc_id" uuid NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inspirations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"image_url" text NOT NULL,
	"thumbnail_url" text,
	"source_url" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "album_mocs" ADD CONSTRAINT "album_mocs_album_id_inspiration_albums_id_fk" FOREIGN KEY ("album_id") REFERENCES "public"."inspiration_albums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "album_mocs" ADD CONSTRAINT "album_mocs_moc_id_moc_instructions_id_fk" FOREIGN KEY ("moc_id") REFERENCES "public"."moc_instructions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "album_parents" ADD CONSTRAINT "album_parents_album_id_inspiration_albums_id_fk" FOREIGN KEY ("album_id") REFERENCES "public"."inspiration_albums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "album_parents" ADD CONSTRAINT "album_parents_parent_album_id_inspiration_albums_id_fk" FOREIGN KEY ("parent_album_id") REFERENCES "public"."inspiration_albums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspiration_album_items" ADD CONSTRAINT "inspiration_album_items_inspiration_id_inspirations_id_fk" FOREIGN KEY ("inspiration_id") REFERENCES "public"."inspirations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspiration_album_items" ADD CONSTRAINT "inspiration_album_items_album_id_inspiration_albums_id_fk" FOREIGN KEY ("album_id") REFERENCES "public"."inspiration_albums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspiration_mocs" ADD CONSTRAINT "inspiration_mocs_inspiration_id_inspirations_id_fk" FOREIGN KEY ("inspiration_id") REFERENCES "public"."inspirations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspiration_mocs" ADD CONSTRAINT "inspiration_mocs_moc_id_moc_instructions_id_fk" FOREIGN KEY ("moc_id") REFERENCES "public"."moc_instructions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_admin_audit_log_admin" ON "admin_audit_log" USING btree ("admin_user_id");--> statement-breakpoint
CREATE INDEX "idx_admin_audit_log_target" ON "admin_audit_log" USING btree ("target_user_id");--> statement-breakpoint
CREATE INDEX "idx_admin_audit_log_action" ON "admin_audit_log" USING btree ("action_type");--> statement-breakpoint
CREATE INDEX "idx_admin_audit_log_created" ON "admin_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_album_mocs_album" ON "album_mocs" USING btree ("album_id");--> statement-breakpoint
CREATE INDEX "idx_album_mocs_moc" ON "album_mocs" USING btree ("moc_id");--> statement-breakpoint
CREATE UNIQUE INDEX "album_mocs_unique" ON "album_mocs" USING btree ("album_id","moc_id");--> statement-breakpoint
CREATE INDEX "idx_album_parents_album" ON "album_parents" USING btree ("album_id");--> statement-breakpoint
CREATE INDEX "idx_album_parents_parent" ON "album_parents" USING btree ("parent_album_id");--> statement-breakpoint
CREATE UNIQUE INDEX "album_parents_unique" ON "album_parents" USING btree ("album_id","parent_album_id");--> statement-breakpoint
CREATE INDEX "idx_inspiration_album_items_inspiration" ON "inspiration_album_items" USING btree ("inspiration_id");--> statement-breakpoint
CREATE INDEX "idx_inspiration_album_items_album" ON "inspiration_album_items" USING btree ("album_id");--> statement-breakpoint
CREATE INDEX "idx_inspiration_album_items_album_sort" ON "inspiration_album_items" USING btree ("album_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "inspiration_album_items_unique" ON "inspiration_album_items" USING btree ("inspiration_id","album_id");--> statement-breakpoint
CREATE INDEX "idx_inspiration_albums_user_id" ON "inspiration_albums" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_inspiration_albums_user_sort" ON "inspiration_albums" USING btree ("user_id","sort_order");--> statement-breakpoint
CREATE INDEX "idx_inspiration_albums_user_created" ON "inspiration_albums" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "inspiration_albums_user_title_unique" ON "inspiration_albums" USING btree ("user_id","title");--> statement-breakpoint
CREATE INDEX "idx_inspiration_mocs_inspiration" ON "inspiration_mocs" USING btree ("inspiration_id");--> statement-breakpoint
CREATE INDEX "idx_inspiration_mocs_moc" ON "inspiration_mocs" USING btree ("moc_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inspiration_mocs_unique" ON "inspiration_mocs" USING btree ("inspiration_id","moc_id");--> statement-breakpoint
CREATE INDEX "idx_inspirations_user_id" ON "inspirations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_inspirations_user_sort" ON "inspirations" USING btree ("user_id","sort_order");--> statement-breakpoint
CREATE INDEX "idx_inspirations_user_created" ON "inspirations" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_inspirations_title" ON "inspirations" USING btree ("title");