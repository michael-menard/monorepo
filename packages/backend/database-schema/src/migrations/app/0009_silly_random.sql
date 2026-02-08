CREATE TYPE "public"."build_status" AS ENUM('not_started', 'in_progress', 'completed');--> statement-breakpoint
CREATE TYPE "public"."item_status" AS ENUM('wishlist', 'owned');--> statement-breakpoint
CREATE TABLE "feature_flag_user_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"flag_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"override_type" text NOT NULL,
	"reason" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "override_type_check" CHECK (override_type IN ('include', 'exclude'))
);
--> statement-breakpoint
CREATE TABLE "user_addons" (
	"user_id" text NOT NULL,
	"addon_type" text NOT NULL,
	"purchased_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"quantity" integer DEFAULT 1 NOT NULL,
	"payment_reference" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "addon_type_check" CHECK (addon_type IN ('extra-storage', 'extra-galleries', 'extra-mocs', 'chat-history-extension')),
	CONSTRAINT "quantity_check" CHECK (quantity > 0)
);
--> statement-breakpoint
CREATE TABLE "user_quotas" (
	"user_id" text PRIMARY KEY NOT NULL,
	"tier" text DEFAULT 'free-tier' NOT NULL,
	"mocs_count" integer DEFAULT 0 NOT NULL,
	"wishlists_count" integer DEFAULT 0 NOT NULL,
	"galleries_count" integer DEFAULT 0 NOT NULL,
	"setlists_count" integer DEFAULT 0 NOT NULL,
	"storage_used_mb" integer DEFAULT 0 NOT NULL,
	"mocs_limit" integer,
	"wishlists_limit" integer,
	"galleries_limit" integer,
	"setlists_limit" integer,
	"storage_limit_mb" integer,
	"chat_history_days" integer,
	"is_adult" boolean DEFAULT false NOT NULL,
	"is_suspended" boolean DEFAULT false NOT NULL,
	"suspended_at" timestamp,
	"suspended_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tier_check" CHECK (tier IN ('admin', 'free-tier', 'pro-tier', 'power-tier')),
	CONSTRAINT "mocs_count_check" CHECK (mocs_count >= 0),
	CONSTRAINT "wishlists_count_check" CHECK (wishlists_count >= 0),
	CONSTRAINT "galleries_count_check" CHECK (galleries_count >= 0),
	CONSTRAINT "setlists_count_check" CHECK (setlists_count >= 0),
	CONSTRAINT "storage_used_check" CHECK (storage_used_mb >= 0)
);
--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD COLUMN "status" "item_status" DEFAULT 'wishlist' NOT NULL;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD COLUMN "status_changed_at" timestamp;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD COLUMN "purchase_date" timestamp;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD COLUMN "purchase_price" text;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD COLUMN "purchase_tax" text;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD COLUMN "purchase_shipping" text;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD COLUMN "build_status" "build_status";--> statement-breakpoint
ALTER TABLE "feature_flag_user_overrides" ADD CONSTRAINT "feature_flag_user_overrides_flag_id_feature_flags_id_fk" FOREIGN KEY ("flag_id") REFERENCES "public"."feature_flags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_ffu_flag_id" ON "feature_flag_user_overrides" USING btree ("flag_id");--> statement-breakpoint
CREATE INDEX "idx_ffu_user_id" ON "feature_flag_user_overrides" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ffu_flag_user_unique" ON "feature_flag_user_overrides" USING btree ("flag_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_addons_user_addon_unique" ON "user_addons" USING btree ("user_id","addon_type");--> statement-breakpoint
CREATE INDEX "idx_user_addons_user_id" ON "user_addons" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_addons_expires_at" ON "user_addons" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_user_quotas_tier" ON "user_quotas" USING btree ("tier");--> statement-breakpoint
CREATE INDEX "idx_user_quotas_suspended" ON "user_quotas" USING btree ("is_suspended");--> statement-breakpoint
CREATE INDEX "idx_wishlist_user_status_purchase_date" ON "wishlist_items" USING btree ("user_id","status","purchase_date");