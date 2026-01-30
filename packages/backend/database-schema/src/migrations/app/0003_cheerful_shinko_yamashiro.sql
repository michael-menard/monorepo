CREATE TABLE "upload_session_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"category" text NOT NULL,
	"name" text NOT NULL,
	"size" integer NOT NULL,
	"mime_type" text NOT NULL,
	"extension" text NOT NULL,
	"s3_key" text NOT NULL,
	"upload_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"file_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "upload_session_parts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_id" uuid NOT NULL,
	"part_number" integer NOT NULL,
	"etag" text,
	"size" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "upload_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"part_size_bytes" integer NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"finalized_at" timestamp,
	"finalizing_at" timestamp,
	"moc_instruction_id" uuid
);
--> statement-breakpoint
CREATE TABLE "user_daily_uploads" (
	"user_id" text NOT NULL,
	"day" date NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "moc_instructions" ALTER COLUMN "build_time_hours" SET DATA TYPE integer USING build_time_hours::integer;--> statement-breakpoint
ALTER TABLE "moc_instructions" ADD COLUMN "source_platform" jsonb;--> statement-breakpoint
ALTER TABLE "moc_instructions" ADD COLUMN "event_badges" jsonb;--> statement-breakpoint
ALTER TABLE "moc_instructions" ADD COLUMN "moderation" jsonb;--> statement-breakpoint
ALTER TABLE "moc_instructions" ADD COLUMN "platform_category_id" integer;--> statement-breakpoint
ALTER TABLE "moc_instructions" ADD COLUMN "finalized_at" timestamp;--> statement-breakpoint
ALTER TABLE "moc_instructions" ADD COLUMN "finalizing_at" timestamp;--> statement-breakpoint
ALTER TABLE "upload_session_files" ADD CONSTRAINT "upload_session_files_session_id_upload_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."upload_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_session_parts" ADD CONSTRAINT "upload_session_parts_file_id_upload_session_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."upload_session_files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_sessions" ADD CONSTRAINT "upload_sessions_moc_instruction_id_moc_instructions_id_fk" FOREIGN KEY ("moc_instruction_id") REFERENCES "public"."moc_instructions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_upload_session_files_session" ON "upload_session_files" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_upload_session_files_status" ON "upload_session_files" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_upload_session_parts_file" ON "upload_session_parts" USING btree ("file_id");--> statement-breakpoint
CREATE UNIQUE INDEX "upload_session_parts_file_part_unique" ON "upload_session_parts" USING btree ("file_id","part_number");--> statement-breakpoint
CREATE INDEX "idx_upload_sessions_user_id" ON "upload_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_upload_sessions_status" ON "upload_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_upload_sessions_expires_at" ON "upload_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_upload_sessions_moc_id" ON "upload_sessions" USING btree ("moc_instruction_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_daily_uploads_user_day_unique" ON "user_daily_uploads" USING btree ("user_id","day");--> statement-breakpoint
CREATE INDEX "idx_user_daily_uploads_day" ON "user_daily_uploads" USING btree ("day");--> statement-breakpoint
CREATE UNIQUE INDEX "moc_instructions_user_slug_unique" ON "moc_instructions" USING btree ("user_id","slug");