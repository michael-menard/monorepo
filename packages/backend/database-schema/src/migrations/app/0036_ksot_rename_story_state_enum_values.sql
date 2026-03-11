-- KSOT-1010: Rename story_state enum values to match StoryStateSchema
-- 'ready_to_work' → 'ready' (was never used consistently, the API schema already had 'ready')
-- 'done' → 'completed' (align with StoryStateSchema which uses 'completed')
--
-- PostgreSQL ALTER TYPE ... RENAME VALUE requires PG 10+
-- These are safe renames — no data loss, only label change

ALTER TYPE "public"."story_state" RENAME VALUE 'ready_to_work' TO 'ready';--> statement-breakpoint
ALTER TYPE "public"."story_state" RENAME VALUE 'done' TO 'completed';
