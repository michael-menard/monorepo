ALTER TABLE "instructions" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "instructions" ADD COLUMN "description_html" text;--> statement-breakpoint
ALTER TABLE "instructions" ADD COLUMN "date_added" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "instructions" ADD COLUMN "author_profile_url" text;--> statement-breakpoint
ALTER TABLE "instructions" ADD COLUMN "tags" jsonb;