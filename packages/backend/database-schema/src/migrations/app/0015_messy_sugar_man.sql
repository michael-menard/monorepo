CREATE SCHEMA "wint";
--> statement-breakpoint
CREATE TYPE "public"."agent_decision_type" AS ENUM('strategy_selection', 'pattern_choice', 'risk_assessment', 'scope_determination', 'test_approach', 'architecture_decision');--> statement-breakpoint
CREATE TYPE "public"."context_pack_type" AS ENUM('codebase', 'story', 'feature', 'epic', 'architecture', 'lessons_learned', 'test_patterns');--> statement-breakpoint
CREATE TYPE "public"."feature_relationship_type" AS ENUM('depends_on', 'enhances', 'conflicts_with', 'related_to', 'supersedes');--> statement-breakpoint
CREATE TYPE "public"."model_type" AS ENUM('quality_predictor', 'effort_estimator', 'risk_classifier', 'pattern_recommender');--> statement-breakpoint
CREATE TYPE "public"."story_priority" AS ENUM('P0', 'P1', 'P2', 'P3', 'P4');--> statement-breakpoint
CREATE TYPE "public"."story_state" AS ENUM('backlog', 'ready_to_work', 'in_progress', 'ready_for_qa', 'in_qa', 'blocked', 'done', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."workflow_status" AS ENUM('pending', 'in_progress', 'completed', 'failed', 'cancelled', 'blocked');--> statement-breakpoint
CREATE TABLE "wint"."agent_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invocation_id" uuid NOT NULL,
	"decision_type" "agent_decision_type" NOT NULL,
	"decision_text" text NOT NULL,
	"context" jsonb,
	"confidence" integer,
	"was_correct" boolean,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wint"."agent_invocations" (
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
	"status" text NOT NULL,
	"error_message" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agent_invocations_invocation_id_unique" UNIQUE("invocation_id")
);
--> statement-breakpoint
CREATE TABLE "wint"."agent_outcomes" (
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
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wint"."capabilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"capability_name" text NOT NULL,
	"capability_type" text NOT NULL,
	"description" text,
	"owner" text,
	"maturity_level" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "capabilities_capability_name_unique" UNIQUE("capability_name")
);
--> statement-breakpoint
CREATE TABLE "wint"."cohesion_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_name" text NOT NULL,
	"rule_type" text NOT NULL,
	"conditions" jsonb NOT NULL,
	"max_violations" integer DEFAULT 0 NOT NULL,
	"severity" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cohesion_rules_rule_name_unique" UNIQUE("rule_name")
);
--> statement-breakpoint
CREATE TABLE "wint"."context_cache_hits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"pack_id" uuid NOT NULL,
	"tokens_saved" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wint"."context_packs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pack_type" "context_pack_type" NOT NULL,
	"pack_key" text NOT NULL,
	"content" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"expires_at" timestamp with time zone,
	"hit_count" integer DEFAULT 0 NOT NULL,
	"last_hit_at" timestamp with time zone,
	"token_count" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wint"."context_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" text NOT NULL,
	"agent_name" text NOT NULL,
	"story_id" text,
	"phase" text,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cached_tokens" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "context_sessions_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "wint"."feature_relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_feature_id" uuid NOT NULL,
	"target_feature_id" uuid NOT NULL,
	"relationship_type" "feature_relationship_type" NOT NULL,
	"strength" integer DEFAULT 50 NOT NULL,
	"description" text,
	"detected_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wint"."features" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feature_name" text NOT NULL,
	"feature_type" text NOT NULL,
	"package_name" text,
	"file_path" text,
	"description" text,
	"tags" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"deprecated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "features_feature_name_unique" UNIQUE("feature_name")
);
--> statement-breakpoint
CREATE TABLE "wint"."ml_models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_name" text NOT NULL,
	"model_type" "model_type" NOT NULL,
	"version" text NOT NULL,
	"model_path" text,
	"hyperparameters" jsonb,
	"training_data_count" integer NOT NULL,
	"trained_at" timestamp with time zone DEFAULT now() NOT NULL,
	"trained_by" text,
	"is_active" boolean DEFAULT false NOT NULL,
	"activated_at" timestamp with time zone,
	"deactivated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wint"."model_metrics" (
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
CREATE TABLE "wint"."model_predictions" (
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
CREATE TABLE "wint"."state_transitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"from_state" text NOT NULL,
	"to_state" text NOT NULL,
	"triggered_by" text NOT NULL,
	"reason" text,
	"metadata" jsonb,
	"transitioned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wint"."stories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"story_type" text NOT NULL,
	"epic" text,
	"wave" integer,
	"priority" "story_priority" DEFAULT 'P2' NOT NULL,
	"complexity" text,
	"story_points" integer,
	"state" "story_state" DEFAULT 'backlog' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stories_story_id_unique" UNIQUE("story_id")
);
--> statement-breakpoint
CREATE TABLE "wint"."story_dependencies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"depends_on_story_id" uuid NOT NULL,
	"dependency_type" text NOT NULL,
	"resolved" boolean DEFAULT false NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wint"."story_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"state" "story_state" NOT NULL,
	"entered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"exited_at" timestamp with time zone,
	"duration_seconds" integer,
	"reason" text,
	"triggered_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wint"."story_transitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"from_state" "story_state" NOT NULL,
	"to_state" "story_state" NOT NULL,
	"transitioned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"triggered_by" text NOT NULL,
	"reason" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wint"."training_data" (
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
CREATE TABLE "wint"."workflow_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"execution_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"event_data" jsonb NOT NULL,
	"triggered_by" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wint"."workflow_checkpoints" (
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
CREATE TABLE "wint"."workflow_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"execution_id" text NOT NULL,
	"workflow_name" text NOT NULL,
	"workflow_version" text NOT NULL,
	"story_id" text,
	"triggered_by" text NOT NULL,
	"status" "workflow_status" DEFAULT 'pending' NOT NULL,
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
ALTER TABLE "wint"."agent_decisions" ADD CONSTRAINT "agent_decisions_invocation_id_agent_invocations_id_fk" FOREIGN KEY ("invocation_id") REFERENCES "wint"."agent_invocations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wint"."agent_outcomes" ADD CONSTRAINT "agent_outcomes_invocation_id_agent_invocations_id_fk" FOREIGN KEY ("invocation_id") REFERENCES "wint"."agent_invocations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wint"."context_cache_hits" ADD CONSTRAINT "context_cache_hits_session_id_context_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "wint"."context_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wint"."context_cache_hits" ADD CONSTRAINT "context_cache_hits_pack_id_context_packs_id_fk" FOREIGN KEY ("pack_id") REFERENCES "wint"."context_packs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wint"."feature_relationships" ADD CONSTRAINT "feature_relationships_source_feature_id_features_id_fk" FOREIGN KEY ("source_feature_id") REFERENCES "wint"."features"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wint"."feature_relationships" ADD CONSTRAINT "feature_relationships_target_feature_id_features_id_fk" FOREIGN KEY ("target_feature_id") REFERENCES "wint"."features"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wint"."model_metrics" ADD CONSTRAINT "model_metrics_model_id_ml_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "wint"."ml_models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wint"."model_predictions" ADD CONSTRAINT "model_predictions_model_id_ml_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "wint"."ml_models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wint"."story_dependencies" ADD CONSTRAINT "story_dependencies_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "wint"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wint"."story_dependencies" ADD CONSTRAINT "story_dependencies_depends_on_story_id_stories_id_fk" FOREIGN KEY ("depends_on_story_id") REFERENCES "wint"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wint"."story_states" ADD CONSTRAINT "story_states_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "wint"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wint"."story_transitions" ADD CONSTRAINT "story_transitions_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "wint"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wint"."workflow_audit_log" ADD CONSTRAINT "workflow_audit_log_execution_id_workflow_executions_id_fk" FOREIGN KEY ("execution_id") REFERENCES "wint"."workflow_executions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wint"."workflow_checkpoints" ADD CONSTRAINT "workflow_checkpoints_execution_id_workflow_executions_id_fk" FOREIGN KEY ("execution_id") REFERENCES "wint"."workflow_executions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_decisions_invocation_id_idx" ON "wint"."agent_decisions" USING btree ("invocation_id");--> statement-breakpoint
CREATE INDEX "agent_decisions_decision_type_idx" ON "wint"."agent_decisions" USING btree ("decision_type");--> statement-breakpoint
CREATE INDEX "agent_decisions_created_at_idx" ON "wint"."agent_decisions" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_invocations_invocation_id_idx" ON "wint"."agent_invocations" USING btree ("invocation_id");--> statement-breakpoint
CREATE INDEX "agent_invocations_agent_name_idx" ON "wint"."agent_invocations" USING btree ("agent_name");--> statement-breakpoint
CREATE INDEX "agent_invocations_story_id_idx" ON "wint"."agent_invocations" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "agent_invocations_started_at_idx" ON "wint"."agent_invocations" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "agent_invocations_status_idx" ON "wint"."agent_invocations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "agent_invocations_agent_story_idx" ON "wint"."agent_invocations" USING btree ("agent_name","story_id");--> statement-breakpoint
CREATE INDEX "agent_outcomes_invocation_id_idx" ON "wint"."agent_outcomes" USING btree ("invocation_id");--> statement-breakpoint
CREATE INDEX "agent_outcomes_outcome_type_idx" ON "wint"."agent_outcomes" USING btree ("outcome_type");--> statement-breakpoint
CREATE INDEX "agent_outcomes_created_at_idx" ON "wint"."agent_outcomes" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "capabilities_capability_name_idx" ON "wint"."capabilities" USING btree ("capability_name");--> statement-breakpoint
CREATE INDEX "capabilities_capability_type_idx" ON "wint"."capabilities" USING btree ("capability_type");--> statement-breakpoint
CREATE INDEX "capabilities_maturity_level_idx" ON "wint"."capabilities" USING btree ("maturity_level");--> statement-breakpoint
CREATE UNIQUE INDEX "cohesion_rules_rule_name_idx" ON "wint"."cohesion_rules" USING btree ("rule_name");--> statement-breakpoint
CREATE INDEX "cohesion_rules_rule_type_idx" ON "wint"."cohesion_rules" USING btree ("rule_type");--> statement-breakpoint
CREATE INDEX "cohesion_rules_is_active_idx" ON "wint"."cohesion_rules" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "context_cache_hits_session_id_idx" ON "wint"."context_cache_hits" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "context_cache_hits_pack_id_idx" ON "wint"."context_cache_hits" USING btree ("pack_id");--> statement-breakpoint
CREATE INDEX "context_cache_hits_created_at_idx" ON "wint"."context_cache_hits" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "context_packs_type_key_idx" ON "wint"."context_packs" USING btree ("pack_type","pack_key");--> statement-breakpoint
CREATE INDEX "context_packs_expires_at_idx" ON "wint"."context_packs" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "context_packs_last_hit_at_idx" ON "wint"."context_packs" USING btree ("last_hit_at");--> statement-breakpoint
CREATE INDEX "context_packs_pack_type_idx" ON "wint"."context_packs" USING btree ("pack_type");--> statement-breakpoint
CREATE UNIQUE INDEX "context_sessions_session_id_idx" ON "wint"."context_sessions" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "context_sessions_agent_name_idx" ON "wint"."context_sessions" USING btree ("agent_name");--> statement-breakpoint
CREATE INDEX "context_sessions_story_id_idx" ON "wint"."context_sessions" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "context_sessions_started_at_idx" ON "wint"."context_sessions" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "context_sessions_agent_story_idx" ON "wint"."context_sessions" USING btree ("agent_name","story_id");--> statement-breakpoint
CREATE INDEX "feature_relationships_source_idx" ON "wint"."feature_relationships" USING btree ("source_feature_id");--> statement-breakpoint
CREATE INDEX "feature_relationships_target_idx" ON "wint"."feature_relationships" USING btree ("target_feature_id");--> statement-breakpoint
CREATE INDEX "feature_relationships_type_idx" ON "wint"."feature_relationships" USING btree ("relationship_type");--> statement-breakpoint
CREATE UNIQUE INDEX "feature_relationships_unique" ON "wint"."feature_relationships" USING btree ("source_feature_id","target_feature_id","relationship_type");--> statement-breakpoint
CREATE UNIQUE INDEX "features_feature_name_idx" ON "wint"."features" USING btree ("feature_name");--> statement-breakpoint
CREATE INDEX "features_feature_type_idx" ON "wint"."features" USING btree ("feature_type");--> statement-breakpoint
CREATE INDEX "features_package_name_idx" ON "wint"."features" USING btree ("package_name");--> statement-breakpoint
CREATE INDEX "features_is_active_idx" ON "wint"."features" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "ml_models_name_version_idx" ON "wint"."ml_models" USING btree ("model_name","version");--> statement-breakpoint
CREATE INDEX "ml_models_model_type_idx" ON "wint"."ml_models" USING btree ("model_type");--> statement-breakpoint
CREATE INDEX "ml_models_is_active_idx" ON "wint"."ml_models" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "ml_models_trained_at_idx" ON "wint"."ml_models" USING btree ("trained_at");--> statement-breakpoint
CREATE INDEX "model_metrics_model_id_idx" ON "wint"."model_metrics" USING btree ("model_id");--> statement-breakpoint
CREATE INDEX "model_metrics_metric_type_idx" ON "wint"."model_metrics" USING btree ("metric_type");--> statement-breakpoint
CREATE INDEX "model_metrics_evaluated_at_idx" ON "wint"."model_metrics" USING btree ("evaluated_at");--> statement-breakpoint
CREATE INDEX "model_predictions_model_id_idx" ON "wint"."model_predictions" USING btree ("model_id");--> statement-breakpoint
CREATE INDEX "model_predictions_entity_idx" ON "wint"."model_predictions" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "model_predictions_prediction_type_idx" ON "wint"."model_predictions" USING btree ("prediction_type");--> statement-breakpoint
CREATE INDEX "model_predictions_predicted_at_idx" ON "wint"."model_predictions" USING btree ("predicted_at");--> statement-breakpoint
CREATE INDEX "state_transitions_entity_idx" ON "wint"."state_transitions" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "state_transitions_transitioned_at_idx" ON "wint"."state_transitions" USING btree ("transitioned_at");--> statement-breakpoint
CREATE INDEX "state_transitions_from_state_idx" ON "wint"."state_transitions" USING btree ("from_state");--> statement-breakpoint
CREATE INDEX "state_transitions_to_state_idx" ON "wint"."state_transitions" USING btree ("to_state");--> statement-breakpoint
CREATE UNIQUE INDEX "stories_story_id_idx" ON "wint"."stories" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "stories_state_idx" ON "wint"."stories" USING btree ("state");--> statement-breakpoint
CREATE INDEX "stories_created_at_idx" ON "wint"."stories" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "stories_epic_wave_idx" ON "wint"."stories" USING btree ("epic","wave");--> statement-breakpoint
CREATE INDEX "stories_priority_state_idx" ON "wint"."stories" USING btree ("priority","state");--> statement-breakpoint
CREATE INDEX "story_dependencies_story_id_idx" ON "wint"."story_dependencies" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "story_dependencies_depends_on_idx" ON "wint"."story_dependencies" USING btree ("depends_on_story_id");--> statement-breakpoint
CREATE UNIQUE INDEX "story_dependencies_unique" ON "wint"."story_dependencies" USING btree ("story_id","depends_on_story_id","dependency_type");--> statement-breakpoint
CREATE INDEX "story_states_story_id_idx" ON "wint"."story_states" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "story_states_state_idx" ON "wint"."story_states" USING btree ("state");--> statement-breakpoint
CREATE INDEX "story_states_entered_at_idx" ON "wint"."story_states" USING btree ("entered_at");--> statement-breakpoint
CREATE INDEX "story_states_story_state_idx" ON "wint"."story_states" USING btree ("story_id","state");--> statement-breakpoint
CREATE INDEX "story_transitions_story_id_idx" ON "wint"."story_transitions" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "story_transitions_transitioned_at_idx" ON "wint"."story_transitions" USING btree ("transitioned_at");--> statement-breakpoint
CREATE INDEX "story_transitions_from_state_idx" ON "wint"."story_transitions" USING btree ("from_state");--> statement-breakpoint
CREATE INDEX "story_transitions_to_state_idx" ON "wint"."story_transitions" USING btree ("to_state");--> statement-breakpoint
CREATE INDEX "story_transitions_story_transitioned_idx" ON "wint"."story_transitions" USING btree ("story_id","transitioned_at");--> statement-breakpoint
CREATE INDEX "training_data_data_type_idx" ON "wint"."training_data" USING btree ("data_type");--> statement-breakpoint
CREATE INDEX "training_data_story_id_idx" ON "wint"."training_data" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "training_data_collected_at_idx" ON "wint"."training_data" USING btree ("collected_at");--> statement-breakpoint
CREATE INDEX "training_data_validated_idx" ON "wint"."training_data" USING btree ("validated");--> statement-breakpoint
CREATE INDEX "workflow_audit_log_execution_id_idx" ON "wint"."workflow_audit_log" USING btree ("execution_id");--> statement-breakpoint
CREATE INDEX "workflow_audit_log_event_type_idx" ON "wint"."workflow_audit_log" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "workflow_audit_log_occurred_at_idx" ON "wint"."workflow_audit_log" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "workflow_audit_log_execution_occurred_idx" ON "wint"."workflow_audit_log" USING btree ("execution_id","occurred_at");--> statement-breakpoint
CREATE INDEX "workflow_checkpoints_execution_id_idx" ON "wint"."workflow_checkpoints" USING btree ("execution_id");--> statement-breakpoint
CREATE INDEX "workflow_checkpoints_phase_idx" ON "wint"."workflow_checkpoints" USING btree ("phase");--> statement-breakpoint
CREATE INDEX "workflow_checkpoints_reached_at_idx" ON "wint"."workflow_checkpoints" USING btree ("reached_at");--> statement-breakpoint
CREATE INDEX "workflow_checkpoints_execution_phase_idx" ON "wint"."workflow_checkpoints" USING btree ("execution_id","phase");--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_executions_execution_id_idx" ON "wint"."workflow_executions" USING btree ("execution_id");--> statement-breakpoint
CREATE INDEX "workflow_executions_workflow_name_idx" ON "wint"."workflow_executions" USING btree ("workflow_name");--> statement-breakpoint
CREATE INDEX "workflow_executions_story_id_idx" ON "wint"."workflow_executions" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "workflow_executions_status_idx" ON "wint"."workflow_executions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "workflow_executions_started_at_idx" ON "wint"."workflow_executions" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "workflow_executions_workflow_status_idx" ON "wint"."workflow_executions" USING btree ("workflow_name","status");