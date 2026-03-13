CREATE TYPE "telemetry"."agent_decision_type" AS ENUM('strategy_selection', 'pattern_choice', 'risk_assessment', 'scope_determination', 'test_approach', 'architecture_decision');--> statement-breakpoint
CREATE TYPE "telemetry"."workflow_status" AS ENUM('pending', 'in_progress', 'completed', 'failed', 'cancelled', 'blocked');--> statement-breakpoint
CREATE TABLE "telemetry"."agent_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invocation_id" uuid NOT NULL,
	"decision_type" "telemetry"."agent_decision_type" NOT NULL,
	"decision_text" text NOT NULL,
	"context" jsonb,
	"confidence" integer,
	"was_correct" boolean,
	"evaluated_at" timestamp with time zone,
	"evaluated_by" text,
	"correctness_score" integer,
	"alternatives_considered" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "telemetry_correctness_score_range" CHECK ("telemetry"."agent_decisions"."correctness_score" >= 0 AND "telemetry"."agent_decisions"."correctness_score" <= 100)
);
--> statement-breakpoint
CREATE TABLE "telemetry"."agent_invocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invocation_id" text NOT NULL,
	"agent_name" text NOT NULL,
	"story_id" text,
	"phase" text,
	"input_payload" jsonb,
	"output_payload" jsonb,
	"duration_ms" integer,
	"input_tokens" integer,
	"output_tokens" integer,
	"cached_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"estimated_cost" numeric(10, 4) DEFAULT '0.0000' NOT NULL,
	"model_name" text,
	"status" text NOT NULL,
	"error_message" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agent_invocations_invocation_id_unique" UNIQUE("invocation_id")
);
--> statement-breakpoint
CREATE TABLE "telemetry"."agent_outcomes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invocation_id" uuid NOT NULL,
	"outcome_type" text NOT NULL,
	"artifacts_produced" jsonb,
	"tests_written" integer DEFAULT 0 NOT NULL,
	"tests_passed" integer DEFAULT 0 NOT NULL,
	"tests_failed" integer DEFAULT 0 NOT NULL,
	"code_quality" integer,
	"test_coverage" integer,
	"review_score" integer,
	"review_notes" text,
	"lint_errors" integer DEFAULT 0 NOT NULL,
	"type_errors" integer DEFAULT 0 NOT NULL,
	"security_issues" jsonb DEFAULT '[]' NOT NULL,
	"performance_metrics" jsonb DEFAULT '{}' NOT NULL,
	"artifacts_metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telemetry"."change_telemetry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" text NOT NULL,
	"model_id" text NOT NULL,
	"affinity_key" text NOT NULL,
	"change_type" text DEFAULT 'unknown' NOT NULL,
	"file_type" text DEFAULT 'unknown' NOT NULL,
	"outcome" text NOT NULL,
	"tokens_in" integer DEFAULT 0 NOT NULL,
	"tokens_out" integer DEFAULT 0 NOT NULL,
	"escalated_to" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"error_code" text,
	"error_message" text,
	"duration_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "telemetry_change_telemetry_outcome_check" CHECK ("telemetry"."change_telemetry"."outcome" IN ('pass', 'fail', 'abort', 'budget_exhausted')),
	CONSTRAINT "telemetry_change_telemetry_change_type_check" CHECK ("telemetry"."change_telemetry"."change_type" IN ('unknown', 'add', 'modify', 'delete', 'rename', 'refactor')),
	CONSTRAINT "telemetry_change_telemetry_file_type_check" CHECK ("telemetry"."change_telemetry"."file_type" IN ('unknown', 'ts', 'tsx', 'sql', 'yaml', 'json', 'md', 'sh', 'other'))
);
--> statement-breakpoint
CREATE TABLE "telemetry"."dep_audit_findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"package_name" varchar(255) NOT NULL,
	"finding_type" varchar(32) NOT NULL,
	"severity" varchar(16) NOT NULL,
	"details" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "telemetry_dep_audit_findings_type_check" CHECK ("telemetry"."dep_audit_findings"."finding_type" IN ('vulnerability', 'overlap', 'bundle_bloat', 'unmaintained')),
	CONSTRAINT "telemetry_dep_audit_findings_severity_check" CHECK ("telemetry"."dep_audit_findings"."severity" IN ('critical', 'high', 'medium', 'low', 'info'))
);
--> statement-breakpoint
CREATE TABLE "telemetry"."dep_audit_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" varchar(255) NOT NULL,
	"commit_sha" varchar(64),
	"triggered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"packages_added" jsonb DEFAULT '[]' NOT NULL,
	"packages_updated" jsonb DEFAULT '[]' NOT NULL,
	"packages_removed" jsonb DEFAULT '[]' NOT NULL,
	"overall_risk" varchar(16) DEFAULT 'none' NOT NULL,
	"findings_count" integer DEFAULT 0 NOT NULL,
	"blocked_queue_items_created" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "telemetry_dep_audit_runs_risk_check" CHECK ("telemetry"."dep_audit_runs"."overall_risk" IN ('none', 'low', 'medium', 'high', 'critical'))
);
--> statement-breakpoint
CREATE TABLE "telemetry"."ml_models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_name" text NOT NULL,
	"model_type" text NOT NULL,
	"version" text NOT NULL,
	"model_path" text,
	"hyperparameters" jsonb,
	"training_data_count" integer DEFAULT 0 NOT NULL,
	"trained_at" timestamp with time zone DEFAULT now() NOT NULL,
	"trained_by" text,
	"is_active" boolean DEFAULT false NOT NULL,
	"activated_at" timestamp with time zone,
	"deactivated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telemetry"."model_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_id" uuid NOT NULL,
	"metric_type" text NOT NULL,
	"metric_value" integer NOT NULL,
	"evaluation_dataset" text,
	"sample_size" integer,
	"metadata" jsonb,
	"evaluated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telemetry"."model_predictions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_id" uuid NOT NULL,
	"prediction_type" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"features" jsonb NOT NULL,
	"prediction" jsonb NOT NULL,
	"actual_value" jsonb,
	"error" integer,
	"predicted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telemetry"."story_outcomes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" text NOT NULL,
	"final_verdict" text NOT NULL,
	"quality_score" integer DEFAULT 0 NOT NULL,
	"total_input_tokens" integer DEFAULT 0 NOT NULL,
	"total_output_tokens" integer DEFAULT 0 NOT NULL,
	"total_cached_tokens" integer DEFAULT 0 NOT NULL,
	"estimated_total_cost" numeric(10, 4) DEFAULT '0.0000' NOT NULL,
	"review_iterations" integer DEFAULT 0 NOT NULL,
	"qa_iterations" integer DEFAULT 0 NOT NULL,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"primary_blocker" text,
	"metadata" jsonb,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "story_outcomes_story_id_unique" UNIQUE("story_id")
);
--> statement-breakpoint
CREATE TABLE "telemetry"."token_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" text,
	"invocation_id" text,
	"phase" text NOT NULL,
	"tokens_input" integer DEFAULT 0 NOT NULL,
	"tokens_output" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer,
	"model" text,
	"agent_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telemetry"."training_data" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"data_type" text NOT NULL,
	"features" jsonb NOT NULL,
	"labels" jsonb NOT NULL,
	"story_id" text,
	"collected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"validated" boolean DEFAULT false NOT NULL,
	"validated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telemetry"."workflow_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"execution_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"event_data" jsonb NOT NULL,
	"triggered_by" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telemetry"."workflow_checkpoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"execution_id" uuid NOT NULL,
	"checkpoint_name" text NOT NULL,
	"phase" text NOT NULL,
	"state" jsonb NOT NULL,
	"status" text NOT NULL,
	"reached_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telemetry"."workflow_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"execution_id" text NOT NULL,
	"workflow_name" text NOT NULL,
	"workflow_version" text NOT NULL,
	"story_id" text,
	"triggered_by" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"input_payload" jsonb,
	"output_payload" jsonb,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"duration_ms" integer,
	"error_message" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workflow_executions_execution_id_unique" UNIQUE("execution_id")
);
--> statement-breakpoint
ALTER TABLE "telemetry"."agent_decisions" ADD CONSTRAINT "agent_decisions_invocation_id_agent_invocations_id_fk" FOREIGN KEY ("invocation_id") REFERENCES "telemetry"."agent_invocations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telemetry"."agent_outcomes" ADD CONSTRAINT "agent_outcomes_invocation_id_agent_invocations_id_fk" FOREIGN KEY ("invocation_id") REFERENCES "telemetry"."agent_invocations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telemetry"."dep_audit_findings" ADD CONSTRAINT "dep_audit_findings_run_id_dep_audit_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "telemetry"."dep_audit_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telemetry"."model_metrics" ADD CONSTRAINT "model_metrics_model_id_ml_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "telemetry"."ml_models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telemetry"."model_predictions" ADD CONSTRAINT "model_predictions_model_id_ml_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "telemetry"."ml_models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telemetry"."workflow_audit_log" ADD CONSTRAINT "workflow_audit_log_execution_id_workflow_executions_id_fk" FOREIGN KEY ("execution_id") REFERENCES "telemetry"."workflow_executions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telemetry"."workflow_checkpoints" ADD CONSTRAINT "workflow_checkpoints_execution_id_workflow_executions_id_fk" FOREIGN KEY ("execution_id") REFERENCES "telemetry"."workflow_executions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "telemetry_agent_decisions_invocation_id_idx" ON "telemetry"."agent_decisions" USING btree ("invocation_id");--> statement-breakpoint
CREATE INDEX "telemetry_agent_decisions_decision_type_idx" ON "telemetry"."agent_decisions" USING btree ("decision_type");--> statement-breakpoint
CREATE INDEX "telemetry_agent_decisions_created_at_idx" ON "telemetry"."agent_decisions" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "telemetry_agent_invocations_invocation_id_idx" ON "telemetry"."agent_invocations" USING btree ("invocation_id");--> statement-breakpoint
CREATE INDEX "telemetry_agent_invocations_agent_name_idx" ON "telemetry"."agent_invocations" USING btree ("agent_name");--> statement-breakpoint
CREATE INDEX "telemetry_agent_invocations_story_id_idx" ON "telemetry"."agent_invocations" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "telemetry_agent_invocations_started_at_idx" ON "telemetry"."agent_invocations" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "telemetry_agent_invocations_status_idx" ON "telemetry"."agent_invocations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "telemetry_agent_invocations_agent_story_idx" ON "telemetry"."agent_invocations" USING btree ("agent_name","story_id");--> statement-breakpoint
CREATE INDEX "telemetry_agent_outcomes_invocation_id_idx" ON "telemetry"."agent_outcomes" USING btree ("invocation_id");--> statement-breakpoint
CREATE INDEX "telemetry_agent_outcomes_outcome_type_idx" ON "telemetry"."agent_outcomes" USING btree ("outcome_type");--> statement-breakpoint
CREATE INDEX "telemetry_agent_outcomes_created_at_idx" ON "telemetry"."agent_outcomes" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "telemetry_change_telemetry_story_id_idx" ON "telemetry"."change_telemetry" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "telemetry_change_telemetry_affinity_idx" ON "telemetry"."change_telemetry" USING btree ("affinity_key");--> statement-breakpoint
CREATE INDEX "telemetry_change_telemetry_created_at_idx" ON "telemetry"."change_telemetry" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "telemetry_dep_audit_findings_run_id_idx" ON "telemetry"."dep_audit_findings" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "telemetry_dep_audit_findings_severity_idx" ON "telemetry"."dep_audit_findings" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "telemetry_dep_audit_findings_run_severity_idx" ON "telemetry"."dep_audit_findings" USING btree ("run_id","severity");--> statement-breakpoint
CREATE INDEX "telemetry_dep_audit_runs_story_id_idx" ON "telemetry"."dep_audit_runs" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "telemetry_dep_audit_runs_triggered_at_idx" ON "telemetry"."dep_audit_runs" USING btree ("triggered_at");--> statement-breakpoint
CREATE UNIQUE INDEX "telemetry_ml_models_name_version_idx" ON "telemetry"."ml_models" USING btree ("model_name","version");--> statement-breakpoint
CREATE INDEX "telemetry_ml_models_model_type_idx" ON "telemetry"."ml_models" USING btree ("model_type");--> statement-breakpoint
CREATE INDEX "telemetry_ml_models_is_active_idx" ON "telemetry"."ml_models" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "telemetry_ml_models_trained_at_idx" ON "telemetry"."ml_models" USING btree ("trained_at");--> statement-breakpoint
CREATE INDEX "telemetry_model_metrics_model_id_idx" ON "telemetry"."model_metrics" USING btree ("model_id");--> statement-breakpoint
CREATE INDEX "telemetry_model_metrics_metric_type_idx" ON "telemetry"."model_metrics" USING btree ("metric_type");--> statement-breakpoint
CREATE INDEX "telemetry_model_metrics_evaluated_at_idx" ON "telemetry"."model_metrics" USING btree ("evaluated_at");--> statement-breakpoint
CREATE INDEX "telemetry_model_predictions_model_id_idx" ON "telemetry"."model_predictions" USING btree ("model_id");--> statement-breakpoint
CREATE INDEX "telemetry_model_predictions_entity_idx" ON "telemetry"."model_predictions" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "telemetry_model_predictions_prediction_type_idx" ON "telemetry"."model_predictions" USING btree ("prediction_type");--> statement-breakpoint
CREATE INDEX "telemetry_model_predictions_predicted_at_idx" ON "telemetry"."model_predictions" USING btree ("predicted_at");--> statement-breakpoint
CREATE INDEX "telemetry_story_outcomes_story_id_idx" ON "telemetry"."story_outcomes" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "telemetry_story_outcomes_final_verdict_idx" ON "telemetry"."story_outcomes" USING btree ("final_verdict");--> statement-breakpoint
CREATE INDEX "telemetry_story_outcomes_completed_at_idx" ON "telemetry"."story_outcomes" USING btree ("completed_at");--> statement-breakpoint
CREATE INDEX "telemetry_token_usage_story_id_idx" ON "telemetry"."token_usage" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "telemetry_token_usage_invocation_id_idx" ON "telemetry"."token_usage" USING btree ("invocation_id");--> statement-breakpoint
CREATE INDEX "telemetry_token_usage_phase_idx" ON "telemetry"."token_usage" USING btree ("phase");--> statement-breakpoint
CREATE INDEX "telemetry_token_usage_created_at_idx" ON "telemetry"."token_usage" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "telemetry_token_usage_agent_name_idx" ON "telemetry"."token_usage" USING btree ("agent_name");--> statement-breakpoint
CREATE INDEX "telemetry_training_data_data_type_idx" ON "telemetry"."training_data" USING btree ("data_type");--> statement-breakpoint
CREATE INDEX "telemetry_training_data_story_id_idx" ON "telemetry"."training_data" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "telemetry_training_data_collected_at_idx" ON "telemetry"."training_data" USING btree ("collected_at");--> statement-breakpoint
CREATE INDEX "telemetry_training_data_validated_idx" ON "telemetry"."training_data" USING btree ("validated");--> statement-breakpoint
CREATE INDEX "telemetry_workflow_audit_log_execution_id_idx" ON "telemetry"."workflow_audit_log" USING btree ("execution_id");--> statement-breakpoint
CREATE INDEX "telemetry_workflow_audit_log_event_type_idx" ON "telemetry"."workflow_audit_log" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "telemetry_workflow_audit_log_occurred_at_idx" ON "telemetry"."workflow_audit_log" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "telemetry_workflow_checkpoints_execution_id_idx" ON "telemetry"."workflow_checkpoints" USING btree ("execution_id");--> statement-breakpoint
CREATE INDEX "telemetry_workflow_checkpoints_phase_idx" ON "telemetry"."workflow_checkpoints" USING btree ("phase");--> statement-breakpoint
CREATE INDEX "telemetry_workflow_checkpoints_reached_at_idx" ON "telemetry"."workflow_checkpoints" USING btree ("reached_at");--> statement-breakpoint
CREATE UNIQUE INDEX "telemetry_workflow_executions_execution_id_idx" ON "telemetry"."workflow_executions" USING btree ("execution_id");--> statement-breakpoint
CREATE INDEX "telemetry_workflow_executions_story_id_idx" ON "telemetry"."workflow_executions" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "telemetry_workflow_executions_status_idx" ON "telemetry"."workflow_executions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "telemetry_workflow_executions_started_at_idx" ON "telemetry"."workflow_executions" USING btree ("started_at");