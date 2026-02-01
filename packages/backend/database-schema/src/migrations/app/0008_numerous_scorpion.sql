CREATE TABLE "feature_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"flag_key" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"rollout_percentage" integer DEFAULT 0 NOT NULL,
	"description" text,
	"environment" text DEFAULT 'production' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rollout_percentage_check" CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100)
);
--> statement-breakpoint
CREATE INDEX "idx_feature_flags_flag_key" ON "feature_flags" USING btree ("flag_key");--> statement-breakpoint
CREATE INDEX "idx_feature_flags_environment" ON "feature_flags" USING btree ("environment");--> statement-breakpoint
CREATE UNIQUE INDEX "feature_flags_flag_key_environment_unique" ON "feature_flags" USING btree ("flag_key","environment");