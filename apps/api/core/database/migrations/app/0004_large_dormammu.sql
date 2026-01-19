DROP INDEX "idx_wishlist_sort_order";--> statement-breakpoint
DROP INDEX "idx_wishlist_category_sort";--> statement-breakpoint
ALTER TABLE "wishlist_items" ALTER COLUMN "sort_order" SET DATA TYPE integer USING sort_order::integer;--> statement-breakpoint
ALTER TABLE "moc_files" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "moc_files" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD COLUMN "store" text NOT NULL;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD COLUMN "set_number" text;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD COLUMN "source_url" text;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD COLUMN "price" text;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD COLUMN "currency" text DEFAULT 'USD';--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD COLUMN "piece_count" integer;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD COLUMN "release_date" timestamp;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD COLUMN "tags" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD COLUMN "priority" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD COLUMN "notes" text;--> statement-breakpoint
CREATE INDEX "idx_wishlist_user_sort" ON "wishlist_items" USING btree ("user_id","sort_order");--> statement-breakpoint
CREATE INDEX "idx_wishlist_user_store" ON "wishlist_items" USING btree ("user_id","store");--> statement-breakpoint
CREATE INDEX "idx_wishlist_user_priority" ON "wishlist_items" USING btree ("user_id","priority");--> statement-breakpoint
ALTER TABLE "wishlist_items" DROP COLUMN "description";--> statement-breakpoint
ALTER TABLE "wishlist_items" DROP COLUMN "product_link";--> statement-breakpoint
ALTER TABLE "wishlist_items" DROP COLUMN "image_width";--> statement-breakpoint
ALTER TABLE "wishlist_items" DROP COLUMN "image_height";--> statement-breakpoint
ALTER TABLE "wishlist_items" DROP COLUMN "category";