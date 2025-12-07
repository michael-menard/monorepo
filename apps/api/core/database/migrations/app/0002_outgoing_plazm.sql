ALTER TABLE "moc_instructions" ADD COLUMN "moc_id" text;--> statement-breakpoint
ALTER TABLE "moc_instructions" ADD COLUMN "slug" text;--> statement-breakpoint
ALTER TABLE "moc_instructions" ADD COLUMN "minifig_count" integer;--> statement-breakpoint
ALTER TABLE "moc_instructions" ADD COLUMN "theme_id" integer;--> statement-breakpoint
ALTER TABLE "moc_instructions" ADD COLUMN "designer" jsonb;--> statement-breakpoint
ALTER TABLE "moc_instructions" ADD COLUMN "dimensions" jsonb;--> statement-breakpoint
ALTER TABLE "moc_instructions" ADD COLUMN "instructions_metadata" jsonb;--> statement-breakpoint
ALTER TABLE "moc_instructions" ADD COLUMN "alternate_build" jsonb;--> statement-breakpoint
ALTER TABLE "moc_instructions" ADD COLUMN "features" jsonb;--> statement-breakpoint
ALTER TABLE "moc_instructions" ADD COLUMN "description_html" text;--> statement-breakpoint
ALTER TABLE "moc_instructions" ADD COLUMN "short_description" text;--> statement-breakpoint
ALTER TABLE "moc_instructions" ADD COLUMN "difficulty" text;--> statement-breakpoint
ALTER TABLE "moc_instructions" ADD COLUMN "build_time_hours" text;--> statement-breakpoint
ALTER TABLE "moc_instructions" ADD COLUMN "age_recommendation" text;--> statement-breakpoint
ALTER TABLE "moc_instructions" ADD COLUMN "status" text DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE "moc_instructions" ADD COLUMN "visibility" text DEFAULT 'private';--> statement-breakpoint
ALTER TABLE "moc_instructions" ADD COLUMN "is_featured" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "moc_instructions" ADD COLUMN "is_verified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "moc_instructions" ADD COLUMN "published_at" timestamp;--> statement-breakpoint
ALTER TABLE "moc_instructions" ADD COLUMN "added_by_user_id" text;--> statement-breakpoint
ALTER TABLE "moc_instructions" ADD COLUMN "last_updated_by_user_id" text;