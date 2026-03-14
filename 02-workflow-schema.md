---
title: Workflow Schema
description: Story management, planning, work state, and execution tracking
schema: workflow
tables: 27
last_updated: 2026-03-13
---

# Workflow Schema

The `workflow` schema contains all story management, planning, work state tracking, and execution functionality.

## Tables Overview

| Table                 | Description                        | Primary Key            |
| --------------------- | ---------------------------------- | ---------------------- |
| stories               | Story metadata and workflow state  | text story_id          |
| story_outcomes        | Story workflow outcomes            | uuid id                |
| story_dependencies    | Story-to-story dependencies        | uuid id                |
| story_state_history   | State change history               | uuid id                |
| story_content         | Raw story content storage          | uuid id                |
| story_touches         | Story scope (backend/frontend/etc) | uuid id                |
| plans                 | Plan metadata                      | uuid id (plan_slug UK) |
| plan_story_links      | Plan-story associations            | uuid id                |
| plan_dependencies     | Plan dependencies (M:N)            | uuid id                |
| plan_revision_history | Plan version history               | uuid id                |
| plan_execution_log    | Plan execution events              | uuid id                |
| work_state            | Story work context                 | uuid id                |
| workflow_executions   | Execution records                  | uuid id                |
| workflow_checkpoints  | Execution checkpoints              | uuid id                |
| workflow_audit_log    | Execution audit trail              | uuid id                |
| agents                | Agent definitions                  | uuid id                |
| agent_invocations     | Agent execution records            | uuid id                |
| agent_outcomes        | Agent execution outcomes           | uuid id                |
| agent_decisions       | Agent decision records             | uuid id                |
| hitl_decisions        | Human-in-the-loop decisions        | uuid id                |
| context_sessions      | Agent context sessions             | uuid id                |
| context_packs         | Cached context packs               | uuid id                |
| context_cache_hits    | Context cache hit records          | uuid id                |
| ml_models             | ML model registry                  | uuid id                |
| model_metrics         | Model evaluation metrics           | uuid id                |
| model_predictions     | Model predictions                  | uuid id                |
| training_data         | Training data for ML               | uuid id                |

## Entity Relationship Diagram

```mermaid
erDiagram
    STORIES {
        text story_id PK
        text feature
        text state
        text title
    }

    STORY_DEPENDENCIES {
        uuid id PK
        text story_id
    }

    STORY_STATE_HISTORY {
        uuid id PK
        text story_id
    }

    STORY_CONTENT {
        uuid id PK
        text story_id
    }

    STORY_TOUCHES {
        uuid id PK
        text story_id
        text touch_type
    }

    PLANS {
        uuid id PK
        text plan_slug
        uuid parent_plan_id
    }

    PLAN_STORY_LINKS {
        uuid id PK
        text plan_slug
    }

    PLAN_DEPENDENCIES {
        uuid id PK
        uuid plan_id
        uuid depends_on_plan_id
    }

    PLAN_REVISION_HISTORY {
        uuid id PK
        text plan_slug
    }

    PLAN_EXECUTION_LOG {
        uuid id PK
        text plan_slug
    }

    WORKFLOW_EXECUTIONS {
        uuid id PK
        text story_id
    }

    WORKFLOW_CHECKPOINTS {
        uuid id PK
        uuid execution_id
    }

    WORKFLOW_AUDIT_LOG {
        uuid id PK
        uuid execution_id
    }

    STORIES ||--o{ STORY_DEPENDENCIES : "story_id"
    STORIES ||--o{ STORY_STATE_HISTORY : "story_id"
    STORIES ||--o{ STORY_CONTENT : "story_id"
    STORIES ||--o{ STORY_TOUCHES : "story_id"
    STORIES ||--o{ WORKFLOW_EXECUTIONS : "story_id"

    PLANS ||--o{ PLAN_STORY_LINKS : "plan_slug"
    PLANS ||--o{ PLAN_DEPENDENCIES : "plan_id"
    PLANS ||--o{ PLAN_REVISION_HISTORY : "plan_slug"
    PLANS ||--o{ PLAN_EXECUTION_LOG : "plan_slug"
    PLANS ||--o{ PLANS : "parent_plan_id"

    WORKFLOW_EXECUTIONS ||--o{ WORKFLOW_CHECKPOINTS : "execution_id"
    WORKFLOW_EXECUTIONS ||--o{ WORKFLOW_AUDIT_LOG : "execution_id"
```

## Stories Tables

### stories

Core story metadata and workflow state (consolidated from stories + story_details).

| Column           | Type             | Constraints | Description                        |
| ---------------- | ---------------- | ----------- | ---------------------------------- |
| story_id         | text             | PK          | Story identifier (e.g., WISH-2045) |
| feature          | text             | NOT NULL    | Feature prefix                     |
| state            | story_state_enum |             | Workflow state                     |
| title            | text             | NOT NULL    | Story title                        |
| priority         | priority_enum    |             | Priority (P1-P5)                   |
| description      | text             |             | Story description                  |
| created_at       | timestamptz      | NOT NULL    | Creation timestamp                 |
| updated_at       | timestamptz      | NOT NULL    | Last update                        |
| blocked_reason   | text             |             | Reason if story is blocked         |
| blocked_by_story | text             |             | Story that blocks this one         |
| started_at       | timestamptz      |             | When story was started             |
| completed_at     | timestamptz      |             | When story was completed           |
| file_hash        | text             |             | Hash of story file                 |

**Indexes:**

- Primary key (story_id)
- btree (feature, state)
- btree (state, updated_at)

**Enums:**

- **state:** backlog, ready, in_progress, ready_for_review, in_review, ready_for_qa, in_qa, uat, completed, cancelled, deferred, failed_code_review, failed_qa, blocked, elaboration, ready_to_work, needs_code_review
- **priority:** P1, P2, P3, P4, P5

**Foreign Keys:**

- Referenced by: story_dependencies, story_state_history, story_content, story_touches, workflow_executions, adrs, code_standards, lessons_learned, rules

### story_dependencies

Story-to-story dependencies (many-to-many self-referential join table).

| Column          | Type        | Constraints | Description                                           |
| --------------- | ----------- | ----------- | ----------------------------------------------------- |
| id              | uuid        | PK          | Primary key                                           |
| story_id        | text        | FK          | Source story                                          |
| depends_on_id   | text        | FK          | Target story (dependency)                             |
| dependency_type | text        | NOT NULL    | Type: depends_on, blocked_by, follow_up_from, enables |
| created_at      | timestamptz | NOT NULL    | Creation timestamp                                    |

**Unique Constraint:** (story_id, depends_on_id)

### story_state_history

State change history.

| Column     | Type      | Constraints | Description          |
| ---------- | --------- | ----------- | -------------------- |
| id         | uuid      | PK          | Primary key          |
| story_id   | text      | FK          | Reference to stories |
| event_type | text      | NOT NULL    | Event type           |
| from_state | text      |             | Previous state       |
| to_state   | text      |             | New state            |
| metadata   | jsonb     |             | Event data           |
| created_at | timestamp |             | Creation timestamp   |

### story_content

Story section content storage.

| Column       | Type        | Constraints | Description          |
| ------------ | ----------- | ----------- | -------------------- |
| id           | uuid        | PK          | Primary key          |
| story_id     | text        | FK          | Reference to stories |
| section_name | text        | NOT NULL    | Section identifier   |
| content_text | text        |             | Section content      |
| created_at   | timestamptz | NOT NULL    | Creation timestamp   |

**Unique Constraint:** (story_id, section_name)

### story_touches

Story scope lookup (replaces touches_backend, touches_frontend, etc.).

| Column     | Type        | Constraints | Description                |
| ---------- | ----------- | ----------- | -------------------------- |
| id         | uuid        | PK          | Primary key                |
| story_id   | text        | FK          | Reference to stories       |
| touch_type | text        | NOT NULL    | Type: backend, frontend... |
| created_at | timestamptz | NOT NULL    | Creation timestamp         |

**Unique Constraint:** (story_id, touch_type)

## Plans Tables

### plans

Plan metadata.

| Column         | Type             | Constraints             | Description                                 |
| -------------- | ---------------- | ----------------------- | ------------------------------------------- |
| id             | uuid             | PK                      | Primary key                                 |
| plan_slug      | text             | UNIQUE                  | Plan identifier (e.g., autonomous-pipeline) |
| title          | text             | NOT NULL                | Plan title                                  |
| summary        | text             |                         | Short summary                               |
| plan_type      | text             |                         | Type (feature, refactor, migration, etc.)   |
| status         | plan_status_enum |                         | Plan status                                 |
| story_prefix   | text             | UNIQUE (where not null) | Story ID prefix                             |
| tags           | text[]           |                         | Categorization tags                         |
| raw_content    | text             |                         | Full markdown content                       |
| content_hash   | text             |                         | Content hash                                |
| kb_entry_id    | uuid             | FK                      | Reference to knowledge_entries              |
| created_at     | timestamptz      | NOT NULL                | Creation timestamp                          |
| updated_at     | timestamptz      | NOT NULL                | Last update                                 |
| priority       | priority_enum    |                         | Priority                                    |
| parent_plan_id | uuid             | FK                      | Parent plan                                 |
| deleted_at     | timestamptz      |                         | Soft delete                                 |
| superseded_by  | uuid             | FK                      | Superseding plan                            |
| embedding      | vector(1536)     |                         | Semantic embedding                          |
| sections       | jsonb            |                         | Parsed sections from raw_content            |

**Indexes:**

- Primary key (id)
- Unique on plan_slug
- Unique on story_prefix (where not null)
- btree (created_at)
- btree (embedding) ivfflat
- btree (parent_plan_id)
- btree (status)
- btree (story_prefix)

**Enums:**

- **status:** draft, active, accepted, stories-created, in-progress, implemented, superseded, archived, blocked
- **priority:** P1, P2, P3, P4, P5

### plan_story_links

Plan-story associations.

| Column     | Type      | Constraints | Description        |
| ---------- | --------- | ----------- | ------------------ |
| id         | uuid      | PK          | Primary key        |
| plan_slug  | text      | FK          | Reference to plans |
| story_id   | text      |             | Associated story   |
| link_type  | text      |             | Type of link       |
| created_at | timestamp |             | Creation timestamp |

### plan_dependencies

Plan dependencies (many-to-many self-referential join table using UUIDs).

| Column             | Type        | Constraints   | Description                     |
| ------------------ | ----------- | ------------- | ------------------------------- |
| id                 | uuid        | PK            | Primary key                     |
| plan_id            | uuid        | FK            | The blocked plan                |
| depends_on_plan_id | uuid        | FK            | The blocking plan               |
| is_satisfied       | boolean     | DEFAULT false | Whether dependency is satisfied |
| created_at         | timestamptz | NOT NULL      | Creation timestamp              |
| updated_at         | timestamptz | NOT NULL      | Last update                     |

**Unique Constraint:** (plan_id, depends_on_plan_id)

### plan_revision_history

Plan version history.

| Column          | Type      | Constraints | Description         |
| --------------- | --------- | ----------- | ------------------- |
| id              | uuid      | PK          | Primary key         |
| plan_slug       | text      | FK          | Reference to plans  |
| revision_number | integer   |             | Version number      |
| raw_content     | text      |             | Content at revision |
| content_hash    | text      |             | Content hash        |
| change_reason   | text      |             | Why changed         |
| created_at      | timestamp |             | Creation timestamp  |

### plan_execution_log

Plan execution events.

| Column     | Type      | Constraints | Description        |
| ---------- | --------- | ----------- | ------------------ |
| id         | uuid      | PK          | Primary key        |
| plan_slug  | text      | FK          | Reference to plans |
| event_type | text      |             | Event type         |
| phase      | text      |             | Phase              |
| story_id   | text      |             | Related story      |
| message    | text      |             | Event message      |
| metadata   | jsonb     |             | Event data         |
| created_at | timestamp |             | Creation timestamp |

## Work State Tables

### work_state

Story work context for active development.

| Column         | Type      | Constraints | Description          |
| -------------- | --------- | ----------- | -------------------- |
| id             | uuid      | PK          | Primary key          |
| story_id       | text      | UNIQUE      | Reference to stories |
| branch         | text      |             | Git branch           |
| phase          | text      |             | Current phase        |
| constraints    | jsonb     |             | Active constraints   |
| recent_actions | jsonb     |             | Recent actions       |
| next_steps     | jsonb     |             | Planned next steps   |
| blockers       | jsonb     |             | Active blockers      |
| kb_references  | jsonb     |             | KB references        |
| created_at     | timestamp |             | Creation timestamp   |
| updated_at     | timestamp |             | Last update          |

**Phases:**

- setup, analysis, planning, implementation, code_review, qa_verification, completion

## Workflow Execution Tables

### workflow_executions

Execution records.

| Column        | Type      | Constraints | Description          |
| ------------- | --------- | ----------- | -------------------- |
| id            | uuid      | PK          | Primary key          |
| story_id      | text      | FK          | Reference to stories |
| status        | text      |             | Execution status     |
| current_phase | text      |             | Current phase        |
| error_message | text      |             | Error if failed      |
| started_at    | timestamp |             | Start timestamp      |
| completed_at  | timestamp |             | End timestamp        |

### workflow_checkpoints

Execution checkpoints for recovery.

| Column         | Type      | Constraints | Description                      |
| -------------- | --------- | ----------- | -------------------------------- |
| id             | uuid      | PK          | Primary key                      |
| execution_id   | uuid      | FK          | Reference to workflow_executions |
| phase          | text      |             | Phase at checkpoint              |
| state_snapshot | jsonb     |             | State at checkpoint              |
| created_at     | timestamp |             | Creation timestamp               |

### workflow_audit_log

Execution audit trail.

| Column       | Type      | Constraints | Description                      |
| ------------ | --------- | ----------- | -------------------------------- |
| id           | uuid      | PK          | Primary key                      |
| execution_id | uuid      | FK          | Reference to workflow_executions |
| event_type   | text      |             | Event type                       |
| event_data   | jsonb     |             | Event data                       |
| occurred_at  | timestamp |             | When occurred                    |

## Telemetry Tables

### story_outcomes

Final outcome of story workflow execution.

| Column               | Type        | Constraints | Description              |
| -------------------- | ----------- | ----------- | ------------------------ |
| id                   | uuid        | PK          | Primary key              |
| story_id             | text        | FK          | Reference to stories     |
| final_verdict        | text        | NOT NULL    | pass, fail, blocked...   |
| quality_score        | integer     | NOT NULL    | 0-100                    |
| total_input_tokens   | integer     | NOT NULL    | Cumulative input tokens  |
| total_output_tokens  | integer     | NOT NULL    | Cumulative output tokens |
| total_cached_tokens  | integer     | NOT NULL    | Cached tokens            |
| estimated_total_cost | numeric     | NOT NULL    | Cost in USD              |
| review_iterations    | integer     | NOT NULL    | Review cycles            |
| qa_iterations        | integer     | NOT NULL    | QA cycles                |
| duration_ms          | integer     | NOT NULL    | Execution time in ms     |
| primary_blocker      | text        |             | Primary failure reason   |
| metadata             | jsonb       |             | Additional data          |
| completed_at         | timestamptz |             | Completion timestamp     |
| created_at           | timestamptz | NOT NULL    | Creation timestamp       |

### agents

Agent definitions.

| Column           | Type        | Constraints | Description         |
| ---------------- | ----------- | ----------- | ------------------- |
| id               | uuid        | PK          | Primary key         |
| name             | text        | UNIQUE      | Agent name          |
| agent_type       | text        | NOT NULL    | Type of agent       |
| permission_level | text        | NOT NULL    | Permission tier     |
| model            | text        |             | Model used          |
| spawned_by       | jsonb       |             | Spawn configuration |
| triggers         | jsonb       |             | Trigger rules       |
| skills_used      | jsonb       |             | Skills available    |
| metadata         | jsonb       |             | Additional config   |
| created_at       | timestamptz | NOT NULL    | Creation timestamp  |
| updated_at       | timestamptz | NOT NULL    | Last update         |

### agent_invocations

Agent execution records.

| Column         | Type        | Constraints | Description          |
| -------------- | ----------- | ----------- | -------------------- |
| id             | uuid        | PK          | Primary key          |
| invocation_id  | text        | NOT NULL    | Unique invocation ID |
| agent_name     | text        | NOT NULL    | Agent identifier     |
| story_id       | text        | FK          | Associated story     |
| phase          | text        |             | Current phase        |
| input_payload  | jsonb       |             | Input data           |
| output_payload | jsonb       |             | Output data          |
| duration_ms    | integer     |             | Execution time       |
| input_tokens   | integer     |             | Input token count    |
| output_tokens  | integer     |             | Output token count   |
| status         | text        | NOT NULL    | Execution status     |
| error_message  | text        |             | Error if failed      |
| started_at     | timestamptz | NOT NULL    | Start timestamp      |
| completed_at   | timestamptz |             | End timestamp        |
| cached_tokens  | integer     | NOT NULL    | Cached tokens        |
| total_tokens   | integer     | NOT NULL    | Total tokens         |
| estimated_cost | numeric     | NOT NULL    | Cost estimate        |
| model_name     | text        |             | Model used           |

### agent_outcomes

Agent execution outcomes.

| Column              | Type        | Constraints | Description              |
| ------------------- | ----------- | ----------- | ------------------------ |
| id                  | uuid        | PK          | Primary key              |
| invocation_id       | uuid        | FK          | Reference to invocations |
| outcome_type        | text        | NOT NULL    | Outcome category         |
| artifacts_produced  | jsonb       |             | Files created            |
| tests_written       | integer     | NOT NULL    | Tests written            |
| tests_passed        | integer     | NOT NULL    | Tests passing            |
| tests_failed        | integer     | NOT NULL    | Tests failing            |
| code_quality        | integer     |             | Quality score            |
| test_coverage       | integer     |             | Coverage percentage      |
| review_score        | integer     |             | Review score             |
| lint_errors         | integer     | NOT NULL    | Linting errors           |
| type_errors         | integer     | NOT NULL    | Type errors              |
| security_issues     | jsonb       | NOT NULL    | Security findings        |
| performance_metrics | jsonb       | NOT NULL    | Performance data         |
| created_at          | timestamptz | NOT NULL    | Creation timestamp       |
| updated_at          | timestamptz | NOT NULL    | Last update              |

### agent_decisions

Agent decision records.

| Column                  | Type                | Constraints | Description              |
| ----------------------- | ------------------- | ----------- | ------------------------ |
| id                      | uuid                | PK          | Primary key              |
| invocation_id           | uuid                | FK          | Reference to invocations |
| decision_type           | agent_decision_type | NOT NULL    | Type of decision         |
| decision_text           | text                | NOT NULL    | Decision description     |
| context                 | jsonb               |             | Decision context         |
| confidence              | integer             |             | Confidence score         |
| was_correct             | boolean             |             | If evaluated correct     |
| correctness_score       | integer             |             | 0-100 score              |
| alternatives_considered | integer             | NOT NULL    | Options evaluated        |
| created_at              | timestamptz         | NOT NULL    | Creation timestamp       |
| evaluated_at            | timestamptz         |             | Evaluation timestamp     |
| evaluated_by            | text                |             | Evaluator                |

**Decision Types:** strategy_selection, pattern_choice, risk_assessment, scope_determination, test_approach, architecture_decision

### hitl_decisions

Human-in-the-loop decisions.

| Column        | Type        | Constraints | Description              |
| ------------- | ----------- | ----------- | ------------------------ |
| id            | uuid        | PK          | Primary key              |
| invocation_id | uuid        | FK          | Reference to invocations |
| decision_type | text        | NOT NULL    | Type of decision         |
| decision_text | text        | NOT NULL    | Decision description     |
| context       | jsonb       |             | Decision context         |
| operator_id   | text        | NOT NULL    | Who made decision        |
| story_id      | text        | FK          | Associated story         |
| created_at    | timestamptz | NOT NULL    | Creation timestamp       |

### context_sessions

Agent context sessions.

| Column        | Type        | Constraints | Description        |
| ------------- | ----------- | ----------- | ------------------ |
| id            | uuid        | PK          | Primary key        |
| session_id    | text        | UNIQUE      | Session identifier |
| agent_name    | text        | NOT NULL    | Agent identifier   |
| story_id      | text        | FK          | Associated story   |
| phase         | text        |             | Current phase      |
| input_tokens  | integer     | NOT NULL    | Input token count  |
| output_tokens | integer     | NOT NULL    | Output token count |
| cached_tokens | integer     | NOT NULL    | Cached tokens      |
| started_at    | timestamptz | NOT NULL    | Start timestamp    |
| ended_at      | timestamptz |             | End timestamp      |
| created_at    | timestamptz | NOT NULL    | Creation timestamp |
| updated_at    | timestamptz | NOT NULL    | Last update        |

### context_packs

Cached context packs.

| Column      | Type              | Constraints | Description        |
| ----------- | ----------------- | ----------- | ------------------ |
| id          | uuid              | PK          | Primary key        |
| pack_type   | context_pack_type | NOT NULL    | Type of pack       |
| pack_key    | text              | NOT NULL    | Unique pack key    |
| content     | jsonb             | NOT NULL    | Pack content       |
| version     | integer           | NOT NULL    | Version number     |
| expires_at  | timestamptz       |             | Expiration         |
| hit_count   | integer           | NOT NULL    | Cache hits         |
| last_hit_at | timestamptz       |             | Last cache hit     |
| token_count | integer           |             | Token count        |
| created_at  | timestamptz       | NOT NULL    | Creation timestamp |
| updated_at  | timestamptz       | NOT NULL    | Last update        |

**Pack Types:** codebase, story, feature, epic, architecture, lessons_learned, test_patterns, agent_missions

### context_cache_hits

Context cache hit records.

| Column       | Type        | Constraints | Description           |
| ------------ | ----------- | ----------- | --------------------- |
| id           | uuid        | PK          | Primary key           |
| session_id   | uuid        | FK          | Reference to sessions |
| pack_id      | uuid        | FK          | Reference to packs    |
| tokens_saved | integer     |             | Tokens saved          |
| created_at   | timestamptz | NOT NULL    | Creation timestamp    |

### ml_models

ML model registry.

| Column              | Type        | Constraints | Description        |
| ------------------- | ----------- | ----------- | ------------------ |
| id                  | uuid        | PK          | Primary key        |
| model_name          | text        | NOT NULL    | Model identifier   |
| model_type          | model_type  | NOT NULL    | Type of model      |
| version             | text        | NOT NULL    | Model version      |
| model_path          | text        |             | Path to model      |
| hyperparameters     | jsonb       |             | Model config       |
| training_data_count | integer     | NOT NULL    | Training samples   |
| trained_at          | timestamptz | NOT NULL    | Training timestamp |
| trained_by          | text        |             | Who trained        |
| is_active           | boolean     | NOT NULL    | Currently active   |
| activated_at        | timestamptz |             | Activation time    |
| deactivated_at      | timestamptz |             | Deactivation time  |
| created_at          | timestamptz | NOT NULL    | Creation timestamp |
| updated_at          | timestamptz | NOT NULL    | Last update        |

**Model Types:** quality_predictor, effort_estimator, risk_classifier, pattern_recommender

### model_metrics

Model evaluation metrics.

| Column             | Type        | Constraints | Description          |
| ------------------ | ----------- | ----------- | -------------------- |
| id                 | uuid        | PK          | Primary key          |
| model_id           | uuid        | FK          | Reference to models  |
| metric_type        | text        | NOT NULL    | Metric name          |
| metric_value       | integer     | NOT NULL    | Metric value         |
| evaluation_dataset | text        |             | Test dataset         |
| sample_size        | integer     |             | Samples evaluated    |
| metadata           | jsonb       |             | Additional data      |
| evaluated_at       | timestamptz | NOT NULL    | Evaluation timestamp |
| created_at         | timestamptz | NOT NULL    | Creation timestamp   |

### model_predictions

Model predictions.

| Column          | Type        | Constraints | Description          |
| --------------- | ----------- | ----------- | -------------------- |
| id              | uuid        | PK          | Primary key          |
| model_id        | uuid        | FK          | Reference to models  |
| prediction_type | text        | NOT NULL    | Type of prediction   |
| entity_type     | text        | NOT NULL    | What was predicted   |
| entity_id       | text        | NOT NULL    | Entity identifier    |
| features        | jsonb       | NOT NULL    | Input features       |
| prediction      | jsonb       | NOT NULL    | Prediction result    |
| actual_value    | jsonb       |             | Actual outcome       |
| error           | integer     |             | Prediction error     |
| predicted_at    | timestamptz | NOT NULL    | Prediction timestamp |
| created_at      | timestamptz | NOT NULL    | Creation timestamp   |

### training_data

Training data for ML models.

| Column       | Type        | Constraints | Description          |
| ------------ | ----------- | ----------- | -------------------- |
| id           | uuid        | PK          | Primary key          |
| data_type    | text        | NOT NULL    | Type of data         |
| features     | jsonb       | NOT NULL    | Input features       |
| labels       | jsonb       | NOT NULL    | Expected outputs     |
| story_id     | text        | FK          | Associated story     |
| collected_at | timestamptz | NOT NULL    | Collection timestamp |
| validated    | boolean     | NOT NULL    | Is validated         |
| validated_at | timestamptz |             | Validation timestamp |
| created_at   | timestamptz | NOT NULL    | Creation timestamp   |

## Foreign Key Summary

| Source                | Column             | Target                 | On Delete |
| --------------------- | ------------------ | ---------------------- | --------- |
| story_outcomes        | story_id           | stories.story_id       | CASCADE   |
| story_dependencies    | story_id           | stories.story_id       | CASCADE   |
| story_dependencies    | depends_on_id      | stories.story_id       | CASCADE   |
| story_state_history   | story_id           | stories.story_id       | RESTRICT  |
| story_content         | story_id           | stories.story_id       | CASCADE   |
| story_touches         | story_id           | stories.story_id       | CASCADE   |
| workflow_executions   | story_id           | stories.story_id       | RESTRICT  |
| workflow_checkpoints  | execution_id       | workflow_executions.id | CASCADE   |
| workflow_audit_log    | execution_id       | workflow_executions.id | CASCADE   |
| plan_story_links      | plan_slug          | plans.plan_slug        | CASCADE   |
| plan_dependencies     | plan_id            | plans.id               | CASCADE   |
| plan_dependencies     | depends_on_plan_id | plans.id               | CASCADE   |
| plan_revision_history | plan_slug          | plans.plan_slug        | CASCADE   |
| plan_execution_log    | plan_slug          | plans.plan_slug        | CASCADE   |
| plans                 | kb_entry_id        | knowledge_entries.id   | SET NULL  |
| plans                 | parent_plan_id     | plans.id               | SET NULL  |
| plans                 | superseded_by      | plans.id               | SET NULL  |
| agent_invocations     | story_id           | stories.story_id       | SET NULL  |
| agent_outcomes        | invocation_id      | agent_invocations.id   | CASCADE   |
| agent_decisions       | invocation_id      | agent_invocations.id   | CASCADE   |
| hitl_decisions        | invocation_id      | agent_invocations.id   | SET NULL  |
| hitl_decisions        | story_id           | stories.story_id       | CASCADE   |
| context_sessions      | story_id           | stories.story_id       | SET NULL  |
| context_cache_hits    | session_id         | context_sessions.id    | CASCADE   |
| context_cache_hits    | pack_id            | context_packs.id       | CASCADE   |
| model_metrics         | model_id           | ml_models.id           | CASCADE   |
| model_predictions     | model_id           | ml_models.id           | CASCADE   |
| training_data         | story_id           | stories.story_id       | SET NULL  |
