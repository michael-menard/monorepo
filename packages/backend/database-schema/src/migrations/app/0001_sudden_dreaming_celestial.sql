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
ALTER TABLE "wishlist_items" ADD COLUMN "image_width" integer;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD COLUMN "image_height" integer;--> statement-breakpoint
ALTER TABLE "moc_parts" ADD CONSTRAINT "moc_parts_parts_list_id_moc_parts_lists_id_fk" FOREIGN KEY ("parts_list_id") REFERENCES "public"."moc_parts_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_moc_parts_parts_list_id" ON "moc_parts" USING btree ("parts_list_id");--> statement-breakpoint
CREATE INDEX "idx_moc_parts_part_id" ON "moc_parts" USING btree ("part_id");--> statement-breakpoint
CREATE INDEX "idx_moc_parts_color" ON "moc_parts" USING btree ("color");