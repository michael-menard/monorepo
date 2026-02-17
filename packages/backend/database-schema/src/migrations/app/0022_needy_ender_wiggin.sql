CREATE TABLE "artifacts"."evidence_artifacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"ac_evidence" jsonb,
	"touched_files" jsonb,
	"commands_run" jsonb,
	"e2e_tests" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "artifacts"."qa_verify_artifacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"ac_verifications" jsonb,
	"test_results" jsonb,
	"qa_issues" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "artifacts"."review_artifacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"findings" jsonb,
	"worker_results" jsonb,
	"ranked_patches" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "artifacts"."evidence_artifacts" ADD CONSTRAINT "evidence_artifacts_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "wint"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifacts"."qa_verify_artifacts" ADD CONSTRAINT "qa_verify_artifacts_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "wint"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifacts"."review_artifacts" ADD CONSTRAINT "review_artifacts_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "wint"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_evidence_artifacts_story_id" ON "artifacts"."evidence_artifacts" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "idx_evidence_artifacts_created_at" ON "artifacts"."evidence_artifacts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_qa_verify_artifacts_story_id" ON "artifacts"."qa_verify_artifacts" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "idx_qa_verify_artifacts_created_at" ON "artifacts"."qa_verify_artifacts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_review_artifacts_story_id" ON "artifacts"."review_artifacts" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "idx_review_artifacts_created_at" ON "artifacts"."review_artifacts" USING btree ("created_at");