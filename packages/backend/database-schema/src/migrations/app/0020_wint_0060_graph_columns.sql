-- WINT-0060: Complete Graph Relational Tables (features, capabilities, featureRelationships, cohesionRules)
-- AC-002: Features table - Add metadata column
ALTER TABLE "wint"."features" ADD COLUMN "metadata" jsonb;--> statement-breakpoint

-- AC-003: Capabilities table - Add metadata and lifecycle_stage columns
ALTER TABLE "wint"."capabilities" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "wint"."capabilities" ADD COLUMN "lifecycle_stage" text;--> statement-breakpoint

-- AC-007: Composite indexes for graph query optimization (high cardinality first per WINT-0010 pattern)
CREATE INDEX "features_package_feature_type_idx" ON "wint"."features" USING btree ("package_name","feature_type");--> statement-breakpoint
CREATE INDEX "features_active_feature_type_idx" ON "wint"."features" USING btree ("is_active","feature_type");--> statement-breakpoint
CREATE INDEX "feature_relationships_source_type_idx" ON "wint"."feature_relationships" USING btree ("source_feature_id","relationship_type");--> statement-breakpoint
CREATE INDEX "feature_relationships_target_type_idx" ON "wint"."feature_relationships" USING btree ("target_feature_id","relationship_type");--> statement-breakpoint
CREATE INDEX "cohesion_rules_type_active_idx" ON "wint"."cohesion_rules" USING btree ("rule_type","is_active");
