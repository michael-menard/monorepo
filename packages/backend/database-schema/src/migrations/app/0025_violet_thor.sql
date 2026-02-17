CREATE TABLE "wint"."agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"agent_type" text NOT NULL,
	"permission_level" text NOT NULL,
	"model" text,
	"spawned_by" jsonb,
	"triggers" jsonb,
	"skills_used" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agents_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "wint"."commands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"triggers" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commands_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "wint"."phases" (
	"id" integer PRIMARY KEY NOT NULL,
	"phase_name" text NOT NULL,
	"description" text,
	"phase_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "phases_phase_name_unique" UNIQUE("phase_name")
);
--> statement-breakpoint
CREATE TABLE "wint"."skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"capabilities" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "skills_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "agents_name_idx" ON "wint"."agents" USING btree ("name");--> statement-breakpoint
CREATE INDEX "agents_agent_type_idx" ON "wint"."agents" USING btree ("agent_type");--> statement-breakpoint
CREATE INDEX "agents_permission_level_idx" ON "wint"."agents" USING btree ("permission_level");--> statement-breakpoint
CREATE INDEX "agents_model_idx" ON "wint"."agents" USING btree ("model");--> statement-breakpoint
CREATE UNIQUE INDEX "commands_name_idx" ON "wint"."commands" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "phases_phase_name_idx" ON "wint"."phases" USING btree ("phase_name");--> statement-breakpoint
CREATE INDEX "phases_phase_order_idx" ON "wint"."phases" USING btree ("phase_order");--> statement-breakpoint
CREATE UNIQUE INDEX "skills_name_idx" ON "wint"."skills" USING btree ("name");