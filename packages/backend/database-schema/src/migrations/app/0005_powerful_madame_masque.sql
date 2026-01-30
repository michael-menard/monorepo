CREATE TABLE "set_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"set_id" uuid NOT NULL,
	"image_url" text NOT NULL,
	"thumbnail_url" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"set_number" text,
	"store" text,
	"source_url" text,
	"piece_count" integer,
	"release_date" timestamp,
	"theme" text,
	"tags" text[] DEFAULT '{}',
	"notes" text,
	"is_built" boolean DEFAULT false NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"purchase_price" numeric(10, 2),
	"tax" numeric(10, 2),
	"shipping" numeric(10, 2),
	"purchase_date" timestamp,
	"wishlist_item_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "set_images_set_id_idx" ON "set_images" USING btree ("set_id");--> statement-breakpoint
CREATE INDEX "sets_user_id_idx" ON "sets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sets_set_number_idx" ON "sets" USING btree ("set_number");--> statement-breakpoint
CREATE INDEX "sets_theme_idx" ON "sets" USING btree ("theme");