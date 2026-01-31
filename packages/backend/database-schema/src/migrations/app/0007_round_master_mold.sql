CREATE TYPE "public"."wishlist_currency" AS ENUM('USD', 'EUR', 'GBP', 'CAD', 'AUD');--> statement-breakpoint
CREATE TYPE "public"."wishlist_store" AS ENUM('LEGO', 'Barweer', 'Cata', 'BrickLink', 'Other');--> statement-breakpoint
ALTER TABLE "wishlist_items" ALTER COLUMN "store" SET DATA TYPE "public"."wishlist_store" USING "store"::"public"."wishlist_store";--> statement-breakpoint
ALTER TABLE "wishlist_items" ALTER COLUMN "currency" SET DEFAULT 'USD'::"public"."wishlist_currency";--> statement-breakpoint
ALTER TABLE "wishlist_items" ALTER COLUMN "currency" SET DATA TYPE "public"."wishlist_currency" USING "currency"::"public"."wishlist_currency";--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD COLUMN "updated_by" text;--> statement-breakpoint
CREATE INDEX "idx_wishlist_user_store_priority" ON "wishlist_items" USING btree ("user_id","store","priority");--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD CONSTRAINT "priority_range_check" CHECK (priority >= 0 AND priority <= 5);