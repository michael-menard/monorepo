CREATE SCHEMA "artifacts";
--> statement-breakpoint
CREATE TYPE "public"."artifact_type_enum" AS ENUM('story', 'checkpoint', 'scope', 'plan', 'evidence', 'review', 'qa-verify');--> statement-breakpoint
CREATE TABLE "artifacts"."checkpoint_artifacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"phase" text NOT NULL,
	"substep" text,
	"completed_steps" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "artifacts"."plan_artifacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"steps" jsonb,
	"file_changes" jsonb,
	"commands" jsonb,
	"ac_mapping" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "artifacts"."scope_artifacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"packages_touched" jsonb,
	"surfaces" jsonb,
	"risk_flags" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "artifacts"."story_artifacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"title" text NOT NULL,
	"story_type" text NOT NULL,
	"state" text NOT NULL,
	"scope_summary" text,
	"acceptance_criteria" jsonb,
	"risks" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "artifacts"."checkpoint_artifacts" ADD CONSTRAINT "checkpoint_artifacts_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "wint"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifacts"."plan_artifacts" ADD CONSTRAINT "plan_artifacts_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "wint"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifacts"."scope_artifacts" ADD CONSTRAINT "scope_artifacts_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "wint"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifacts"."story_artifacts" ADD CONSTRAINT "story_artifacts_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "wint"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_checkpoint_artifacts_story_phase" ON "artifacts"."checkpoint_artifacts" USING btree ("story_id","phase");--> statement-breakpoint
CREATE INDEX "idx_checkpoint_artifacts_created_at" ON "artifacts"."checkpoint_artifacts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_plan_artifacts_story_id" ON "artifacts"."plan_artifacts" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "idx_plan_artifacts_created_at" ON "artifacts"."plan_artifacts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_scope_artifacts_story_id" ON "artifacts"."scope_artifacts" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "idx_scope_artifacts_created_at" ON "artifacts"."scope_artifacts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_story_artifacts_story_id" ON "artifacts"."story_artifacts" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "idx_story_artifacts_created_at" ON "artifacts"."story_artifacts" USING btree ("created_at");