-- Migration: 0000_initial_umami_schema
-- Created: 2025-11-23
-- Description: Initial Umami analytics schema creation
-- Story: 1.2 - Aurora PostgreSQL Schema for Umami

-- Create the umami schema namespace
CREATE SCHEMA IF NOT EXISTS "umami";

-- Create _prisma_migrations table for migration tracking
CREATE TABLE IF NOT EXISTS "umami"."_prisma_migrations" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"checksum" varchar(64) NOT NULL,
	"finished_at" timestamp with time zone,
	"migration_name" varchar(255) NOT NULL,
	"logs" text,
	"rolled_back_at" timestamp with time zone,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"applied_steps_count" integer DEFAULT 0 NOT NULL
);

-- Create account table for Umami admin users
CREATE TABLE IF NOT EXISTS "umami"."account" (
	"user_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(255) NOT NULL,
	"password" varchar(60) NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create website table for website configurations
CREATE TABLE IF NOT EXISTS "umami"."website" (
	"website_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"domain" varchar(500),
	"share_id" varchar(50),
	"rev_id" integer DEFAULT 0 NOT NULL,
	"user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);

-- Create session table for user session tracking
CREATE TABLE IF NOT EXISTS "umami"."session" (
	"session_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"website_id" uuid NOT NULL,
	"hostname" varchar(100),
	"browser" varchar(20),
	"os" varchar(20),
	"device" varchar(20),
	"screen" varchar(11),
	"language" varchar(35),
	"country" char(2),
	"subdivision1" char(3),
	"subdivision2" char(3),
	"city" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create website_event table for page views and custom events
CREATE TABLE IF NOT EXISTS "umami"."website_event" (
	"event_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"website_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"url_path" varchar(500) NOT NULL,
	"url_query" varchar(1000),
	"referrer_path" varchar(500),
	"referrer_query" varchar(1000),
	"referrer_domain" varchar(500),
	"page_title" varchar(500),
	"event_type" integer DEFAULT 1 NOT NULL,
	"event_name" varchar(50)
);

-- Create event_data table for additional event metadata
CREATE TABLE IF NOT EXISTS "umami"."event_data" (
	"event_id" uuid NOT NULL,
	"website_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"url_path" varchar(500) NOT NULL,
	"event_name" varchar(50) NOT NULL,
	"data_key" varchar(500) NOT NULL,
	"string_value" varchar(500),
	"number_value" integer,
	"date_value" timestamp with time zone,
	"data_type" integer NOT NULL
);

-- Create team table for multi-user access
CREATE TABLE IF NOT EXISTS "umami"."team" (
	"team_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"access_code" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create team_user table for team membership
CREATE TABLE IF NOT EXISTS "umami"."team_user" (
	"team_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(50) DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create team_website table for team website access
CREATE TABLE IF NOT EXISTS "umami"."team_website" (
	"team_id" uuid NOT NULL,
	"website_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "umami"."website" ADD CONSTRAINT "website_user_id_account_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "umami"."account"("user_id") ON DELETE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "umami"."session" ADD CONSTRAINT "session_website_id_website_website_id_fk" FOREIGN KEY ("website_id") REFERENCES "umami"."website"("website_id") ON DELETE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "umami"."website_event" ADD CONSTRAINT "website_event_website_id_website_website_id_fk" FOREIGN KEY ("website_id") REFERENCES "umami"."website"("website_id") ON DELETE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "umami"."website_event" ADD CONSTRAINT "website_event_session_id_session_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "umami"."session"("session_id") ON DELETE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "umami"."event_data" ADD CONSTRAINT "event_data_event_id_website_event_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "umami"."website_event"("event_id") ON DELETE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "umami"."event_data" ADD CONSTRAINT "event_data_website_id_website_website_id_fk" FOREIGN KEY ("website_id") REFERENCES "umami"."website"("website_id") ON DELETE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "umami"."event_data" ADD CONSTRAINT "event_data_session_id_session_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "umami"."session"("session_id") ON DELETE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "umami"."team_user" ADD CONSTRAINT "team_user_team_id_team_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "umami"."team"("team_id") ON DELETE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "umami"."team_user" ADD CONSTRAINT "team_user_user_id_account_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "umami"."account"("user_id") ON DELETE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "umami"."team_website" ADD CONSTRAINT "team_website_team_id_team_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "umami"."team"("team_id") ON DELETE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "umami"."team_website" ADD CONSTRAINT "team_website_website_id_website_website_id_fk" FOREIGN KEY ("website_id") REFERENCES "umami"."website"("website_id") ON DELETE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "account_username_idx" ON "umami"."account" USING btree ("username");
CREATE UNIQUE INDEX IF NOT EXISTS "website_share_id_idx" ON "umami"."website" USING btree ("share_id");
CREATE UNIQUE INDEX IF NOT EXISTS "team_access_code_idx" ON "umami"."team" USING btree ("access_code");
CREATE UNIQUE INDEX IF NOT EXISTS "team_user_team_user_idx" ON "umami"."team_user" USING btree ("team_id","user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "team_website_team_website_idx" ON "umami"."team_website" USING btree ("team_id","website_id");

-- Create performance indexes for analytics queries
-- Website indexes
CREATE INDEX IF NOT EXISTS "website_user_id_idx" ON "umami"."website" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "website_created_at_idx" ON "umami"."website" USING btree ("created_at");

-- Session indexes
CREATE INDEX IF NOT EXISTS "session_website_id_idx" ON "umami"."session" USING btree ("website_id");
CREATE INDEX IF NOT EXISTS "session_created_at_idx" ON "umami"."session" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "session_website_created_idx" ON "umami"."session" USING btree ("website_id","created_at");

-- Website event indexes (critical for analytics performance)
CREATE INDEX IF NOT EXISTS "website_event_website_id_idx" ON "umami"."website_event" USING btree ("website_id");
CREATE INDEX IF NOT EXISTS "website_event_session_id_idx" ON "umami"."website_event" USING btree ("session_id");
CREATE INDEX IF NOT EXISTS "website_event_created_at_idx" ON "umami"."website_event" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "website_event_website_created_idx" ON "umami"."website_event" USING btree ("website_id","created_at");
CREATE INDEX IF NOT EXISTS "website_event_website_session_created_idx" ON "umami"."website_event" USING btree ("website_id","session_id","created_at");

-- Event data indexes
CREATE INDEX IF NOT EXISTS "event_data_event_id_idx" ON "umami"."event_data" USING btree ("event_id");
CREATE INDEX IF NOT EXISTS "event_data_website_id_idx" ON "umami"."event_data" USING btree ("website_id");
CREATE INDEX IF NOT EXISTS "event_data_created_at_idx" ON "umami"."event_data" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "event_data_website_created_idx" ON "umami"."event_data" USING btree ("website_id","created_at");

-- Team indexes
CREATE INDEX IF NOT EXISTS "team_user_team_id_idx" ON "umami"."team_user" USING btree ("team_id");
CREATE INDEX IF NOT EXISTS "team_user_user_id_idx" ON "umami"."team_user" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "team_website_team_id_idx" ON "umami"."team_website" USING btree ("team_id");
CREATE INDEX IF NOT EXISTS "team_website_website_id_idx" ON "umami"."team_website" USING btree ("website_id");

-- Insert initial migration record
INSERT INTO "umami"."_prisma_migrations" ("id", "checksum", "migration_name", "logs", "started_at", "applied_steps_count")
VALUES (
  '0000_initial_umami_schema',
  'initial_schema_checksum_' || extract(epoch from now())::text,
  '0000_initial_umami_schema',
  'Initial Umami analytics schema creation for Story 1.2',
  now(),
  1
) ON CONFLICT ("id") DO NOTHING;

-- Grant permissions to umami_user (will be created by setup script)
-- These grants will be applied after the umami_user is created
-- GRANT USAGE ON SCHEMA umami TO umami_user;
-- GRANT CREATE ON SCHEMA umami TO umami_user;
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA umami TO umami_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA umami TO umami_user;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA umami GRANT ALL ON TABLES TO umami_user;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA umami GRANT ALL ON SEQUENCES TO umami_user;
