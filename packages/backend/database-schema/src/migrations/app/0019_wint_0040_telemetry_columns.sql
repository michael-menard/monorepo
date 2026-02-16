-- WINT-0040: Extend Telemetry Tables with Token Tracking, Quality Metrics, and Audit Enhancements
-- AC-1: Agent Invocations - Token tracking columns
ALTER TABLE "wint"."agent_invocations" ADD COLUMN "cached_tokens" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "wint"."agent_invocations" ADD COLUMN "total_tokens" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "wint"."agent_invocations" ADD COLUMN "estimated_cost" numeric(10, 4) DEFAULT '0.0000' NOT NULL;--> statement-breakpoint
ALTER TABLE "wint"."agent_invocations" ADD COLUMN "model_name" text;--> statement-breakpoint

-- AC-2: Agent Decisions - Outcome tracking columns
ALTER TABLE "wint"."agent_decisions" ADD COLUMN "evaluated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "wint"."agent_decisions" ADD COLUMN "evaluated_by" text;--> statement-breakpoint
ALTER TABLE "wint"."agent_decisions" ADD COLUMN "correctness_score" integer;--> statement-breakpoint
ALTER TABLE "wint"."agent_decisions" ADD COLUMN "alternatives_considered" integer DEFAULT 0 NOT NULL;--> statement-breakpoint

-- AC-3: Agent Outcomes - Quality metrics columns
ALTER TABLE "wint"."agent_outcomes" ADD COLUMN "lint_errors" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "wint"."agent_outcomes" ADD COLUMN "type_errors" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "wint"."agent_outcomes" ADD COLUMN "security_issues" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "wint"."agent_outcomes" ADD COLUMN "performance_metrics" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "wint"."agent_outcomes" ADD COLUMN "artifacts_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint

-- AC-4: State Transitions - Audit enhancement columns
ALTER TABLE "wint"."state_transitions" ADD COLUMN "previous_metadata" jsonb;--> statement-breakpoint
ALTER TABLE "wint"."state_transitions" ADD COLUMN "new_metadata" jsonb;--> statement-breakpoint
ALTER TABLE "wint"."state_transitions" ADD COLUMN "validation_errors" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "wint"."state_transitions" ADD COLUMN "rollback_allowed" boolean DEFAULT true NOT NULL;--> statement-breakpoint

-- AC-5: Composite indexes for telemetry query optimization (high cardinality first per WINT-0010 pattern)
CREATE INDEX "idx_agent_invocations_agent_name_started_at" ON "wint"."agent_invocations" USING btree ("agent_name","started_at");--> statement-breakpoint
CREATE INDEX "idx_agent_decisions_decision_type_evaluated_at" ON "wint"."agent_decisions" USING btree ("decision_type","evaluated_at");--> statement-breakpoint
CREATE INDEX "idx_agent_outcomes_outcome_type_created_at" ON "wint"."agent_outcomes" USING btree ("outcome_type","created_at");--> statement-breakpoint
CREATE INDEX "idx_state_transitions_entity_type_transitioned_at" ON "wint"."state_transitions" USING btree ("entity_type","transitioned_at");--> statement-breakpoint

-- AC-2: CHECK constraint for correctnessScore (0-100 range)
ALTER TABLE "wint"."agent_decisions" ADD CONSTRAINT "correctness_score_range" CHECK ("wint"."agent_decisions"."correctness_score" >= 0 AND "wint"."agent_decisions"."correctness_score" <= 100);
