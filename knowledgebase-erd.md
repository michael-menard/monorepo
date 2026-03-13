# Knowledgebase Database ERD

> **Last Updated:** 2026-03-13
> **Note:** Database was consolidated via CDBN-2025. Stories, tasks, and work_state tables are now in the `workflow` schema. Artifact tables are consolidated in the `artifacts` schema.

## Schema Overview

| Schema      | Tables | Purpose                                                   |
| ----------- | ------ | --------------------------------------------------------- |
| `public`    | 50     | Core KB tables (knowledge_entries, plans, tasks, etc.)    |
| `workflow`  | 9      | Story/workflow tables (stories, tasks, work_state)        |
| `artifacts` | 18     | Artifact storage (all artifact type tables)               |
| `analytics` | 4      | Telemetry (change*telemetry, model*\*, story_token_usage) |
| `drizzle`   | 1      | Migration tracking (\_\_drizzle_migrations)               |

## 1. Core Knowledge Domain (public)

```mermaid
erDiagram
    knowledge_entries ||--o{ audit_log : "entry_id"
    knowledge_entries ||--o{ knowledge_entries : "canonical_id"

    knowledge_entries {
        uuid id PK
        text content
        vector embedding
        text role
        text entry_type
        text story_id
        text[] tags
        boolean verified
        timestamp verified_at
        text verified_by
        timestamp created_at
        timestamp updated_at
        boolean archived
        timestamp archived_at
        uuid canonical_id FK
        boolean is_canonical
    }

    audit_log {
        uuid id PK
        uuid entry_id FK
        text operation
        jsonb previous_value
        jsonb new_value
        timestamptz timestamp
        jsonb user_context
        timestamptz created_at
    }

    embedding_cache {
        uuid id PK
        text content_hash
        text model
        vector embedding
        timestamp created_at
    }
```

## 2. Plans Domain (public)

```mermaid
erDiagram
    plans ||--o{ plan_story_links : "plan_slug"
    plans ||--o{ plan_dependencies : "plan_slug"
    plans ||--o{ plan_revision_history : "plan_slug"
    plans ||--o{ plan_execution_log : "plan_slug"

    plans {
        uuid id PK
        text plan_slug UK
        text title
        text summary
        text plan_type
        text status
        text feature_dir
        text story_prefix
        integer estimated_stories
        jsonb phases
        text[] tags
        text raw_content
        text source_file
        text content_hash
        uuid kb_entry_id FK
        timestamptz imported_at
        timestamptz created_at
        timestamptz updated_at
        timestamptz archived_at
    }

    plan_story_links {
        uuid id PK
        text plan_slug
        text story_id
        text link_type
        timestamptz created_at
    }

    plan_dependencies {
        uuid id PK
        text plan_slug
        text[] depends_on
        timestamptz created_at
    }

    plan_revision_history {
        uuid id PK
        text plan_slug
        integer revision_number
        text raw_content
        text content_hash
        text change_reason
        timestamptz created_at
    }

    plan_execution_log {
        uuid id PK
        text plan_slug
        text event_type
        text phase
        text story_id
        text message
        jsonb metadata
        timestamptz created_at
    }

    plan_details {
        uuid id PK
        text plan_slug
        text description
        text priority
        text status
        timestamptz created_at
        timestamptz updated_at
    }
```

## 3. Stories Domain (workflow)

```mermaid
erDiagram
    workflow.stories ||--o{ workflow.story_details : "story_id"
    workflow.stories ||--o{ workflow.story_dependencies : "story_id"
    workflow.stories ||--o{ workflow.story_knowledge_links : "story_id"
    workflow.stories ||--o{ workflow.story_outcomes : "story_id"
    workflow.stories ||--o{ workflow.story_state_history : "story_id"

    workflow.stories {
        uuid id PK
        text story_id UK
        text feature
        text epic
        text title
        text story_dir
        text story_file
        text story_type
        integer points
        text priority
        text state
        text phase
        integer iteration
        boolean blocked
        text blocked_reason
        text blocked_by_story
        boolean touches_backend
        boolean touches_frontend
        boolean touches_database
        boolean touches_infra
        jsonb acceptance_criteria
        vector embedding
        timestamp created_at
        timestamp updated_at
        timestamp started_at
        timestamp completed_at
    }

    workflow.story_details {
        uuid id PK
        text story_id
        text description
        text[] non_goals
        text[] packages
        timestamp created_at
        timestamp updated_at
    }

    workflow.story_dependencies {
        uuid id PK
        text story_id
        text target_story_id
        text dependency_type
        boolean satisfied
        timestamp created_at
    }

    workflow.story_state_history {
        uuid id PK
        text story_id
        text from_state
        text to_state
        text reason
        text changed_by
        timestamp created_at
    }

    workflow.story_outcomes {
        uuid id PK
        text story_id UK
        text final_verdict
        integer quality_score
        integer total_input_tokens
        integer total_output_tokens
        integer total_cached_tokens
        text estimated_total_cost
        integer review_iterations
        integer qa_iterations
        integer duration_ms
        text primary_blocker
        jsonb metadata
        timestamp completed_at
        timestamp created_at
    }
```

## 4. Tasks and Work State (workflow)

```mermaid
erDiagram
    workflow.tasks ||--o{ workflow.task_audit_log : "task_id"

    workflow.tasks {
        uuid id PK
        text title
        text description
        text source_story_id
        text source_phase
        text source_agent
        text task_type
        text priority
        text status
        uuid blocked_by FK
        text[] related_kb_entries
        text promoted_to_story
        text[] tags
        text estimated_effort
        timestamp created_at
        timestamp updated_at
        timestamp completed_at
    }

    workflow.task_audit_log {
        uuid id PK
        uuid task_id FK
        text operation
        jsonb previous_value
        jsonb new_value
        timestamptz timestamp
        jsonb user_context
        timestamptz created_at
    }

    workflow.work_state {
        uuid id PK
        text story_id UK
        text branch
        text phase
        jsonb constraints
        jsonb recent_actions
        jsonb next_steps
        jsonb blockers
        jsonb kb_references
        timestamp created_at
        timestamp updated_at
    }

    workflow.work_state_history {
        uuid id PK
        text story_id
        jsonb state_snapshot
        timestamp archived_at
    }
```

## 5. Workflow Executions (workflow)

```mermaid
erDiagram
    workflow.workflow_executions ||--o{ workflow.workflow_checkpoints : "execution_id"
    workflow.workflow_executions ||--o{ workflow.workflow_audit_log : "execution_id"

    workflow.workflow_executions {
        uuid id PK
        text story_id
        text status
        text current_phase
        text error_message
        timestamp started_at
        timestamp completed_at
    }

    workflow.workflow_checkpoints {
        uuid id PK
        uuid execution_id FK
        text phase
        jsonb state_snapshot
        timestamp created_at
    }

    workflow.workflow_audit_log {
        uuid id PK
        uuid execution_id FK
        text event_type
        jsonb event_data
        timestamp occurred_at
    }

    workflow.worktrees {
        uuid id PK
        text story_id
        text worktree_path
        text branch_name
        text status
        integer pr_number
        timestamp merged_at
        timestamp abandoned_at
        jsonb metadata
        timestamp created_at
        timestamp updated_at
    }

    workflow.plan_content {
        uuid id PK
        text plan_slug UK
        jsonb content
        timestamp created_at
        timestamp updated_at
    }

    workflow.story_content {
        uuid id PK
        text story_id UK
        jsonb content
        timestamp created_at
        timestamp updated_at
    }
```

## 6. Telemetry (analytics)

```mermaid
erDiagram
    analytics.story_token_usage {
        uuid id PK
        text story_id
        text feature
        text phase
        text agent
        integer iteration
        integer input_tokens
        integer output_tokens
        integer total_tokens
        timestamptz logged_at
        timestamptz created_at
    }

    analytics.change_telemetry {
        uuid id PK
        text story_id
        text feature
        text change_type
        text outcome
        text agent
        integer iteration
        integer input_tokens
        integer output_tokens
        integer total_tokens
        integer duration_ms
        integer quality_score
        text budget_type
        numeric budget_amount
        numeric budget_used
        timestamp created_at
    }

    analytics.model_experiments {
        uuid id PK
        text experiment_name
        text model
        text provider
        text status
        jsonb config
        jsonb results
        timestamp started_at
        timestamp completed_at
    }

    analytics.model_assignments {
        uuid id PK
        text agent_pattern
        text provider
        text model
        integer tier
        timestamp effective_from
        timestamp created_at
    }
```

## 7. Artifacts (artifacts)

```mermaid
erDiagram
    artifacts.story_artifacts ||--o{ knowledge_entries : "kb_entry_id"

    artifacts.story_artifacts {
        uuid id PK
        text story_id
        text artifact_type
        text artifact_name
        uuid kb_entry_id FK
        text file_path
        text phase
        integer iteration
        jsonb summary
        jsonb content
        timestamp created_at
        timestamp updated_at
    }
```

### Artifact Type Tables (artifacts)

| Table                       | Description                 |
| --------------------------- | --------------------------- |
| artifact_analyses           | Code analysis artifacts     |
| artifact_checkpoints        | Phase checkpoint artifacts  |
| artifact_completion_reports | Story completion reports    |
| artifact_contexts           | Context artifacts           |
| artifact_dev_feasibility    | Dev feasibility studies     |
| artifact_elaborations       | Story elaboration artifacts |
| artifact_evidence           | Implementation evidence     |
| artifact_fix_summaries      | Fix cycle summaries         |
| artifact_plans              | Implementation plans        |
| artifact_proofs             | Proof artifacts             |
| artifact_qa_gates           | QA gate decisions           |
| artifact_reviews            | Code review artifacts       |
| artifact_scopes             | Scope definition artifacts  |
| artifact_story_seeds        | Story seed artifacts        |
| artifact_test_plans         | Test plan artifacts         |
| artifact_uiux_notes         | UI/UX notes                 |
| artifact_verifications      | QA verification artifacts   |

## 8. Agent Telemetry (public)

```mermaid
erDiagram
    agent_invocations ||--o{ agent_decisions : "invocation_id"
    agent_invocations ||--o{ agent_outcomes : "invocation_id"
    agent_invocations ||--o{ hitl_decisions : "invocation_id"

    agent_invocations {
        uuid id PK
        text invocation_id UK
        text agent_name
        text story_id
        text phase
        jsonb input_payload
        jsonb output_payload
        integer duration_ms
        integer input_tokens
        integer output_tokens
        integer cached_tokens
        integer total_tokens
        numeric estimated_cost
        text model_name
        text status
        text error_message
        timestamptz started_at
        timestamptz completed_at
        timestamptz created_at
    }

    agent_decisions {
        uuid id PK
        uuid invocation_id FK
        text decision_type
        text decision_text
        jsonb context
        integer confidence
        boolean was_correct
        timestamptz evaluated_at
        text evaluated_by
        integer correctness_score
        integer alternatives_considered
        timestamptz created_at
    }

    agent_outcomes {
        uuid id PK
        uuid invocation_id FK
        text outcome_type
        jsonb artifacts_produced
        integer tests_written
        integer tests_passed
        integer tests_failed
        integer code_quality
        integer test_coverage
        integer review_score
        text review_notes
        integer lint_errors
        integer type_errors
        jsonb security_issues
        jsonb performance_metrics
        jsonb artifacts_metadata
        timestamptz created_at
        timestamptz updated_at
    }

    hitl_decisions {
        uuid id PK
        text story_id
        text decision_type
        text decision_text
        text operator_id
        uuid invocation_id FK
        jsonb context
        vector embedding
        timestamptz created_at
    }
```

## 9. Context Cache (public)

```mermaid
erDiagram
    context_sessions ||--o{ context_cache_hits : "session_id"

    context_packs {
        uuid id PK
        text story_id
        text node_type
        text role
        jsonb story_brief
        jsonb kb_facts
        jsonb kb_rules
        jsonb kb_links
        jsonb repo_snippets
        integer token_count
        timestamp expires_at
        timestamp created_at
    }

    context_sessions {
        uuid id PK
        text story_id
        text agent_name
        text phase
        timestamp started_at
        timestamp completed_at
        integer input_tokens
        integer output_tokens
    }

    context_cache_hits {
        uuid id PK
        text story_id
        text node_type
        text role
        boolean hit
        integer token_count
        timestamp created_at
    }
```

## 10. Legacy Tables (public)

These tables exist but may be deprecated or have unclear purposes:

| Table           | Description                   |
| --------------- | ----------------------------- |
| adrs            | Architecture Decision Records |
| code_standards  | Code standards entries        |
| cohesion_rules  | Cohesion rules                |
| lessons_learned | Lessons learned entries       |
| rules           | General rules                 |

## Foreign Key Summary

| Source                        | Column        | Target                          | On Delete |
| ----------------------------- | ------------- | ------------------------------- | --------- |
| audit_log                     | entry_id      | knowledge_entries.id            | SET NULL  |
| knowledge_entries             | canonical_id  | knowledge_entries.id            | NO ACTION |
| plans                         | kb_entry_id   | knowledge_entries.id            | SET NULL  |
| plan_story_links              | plan_slug     | plans.plan_slug                 | CASCADE   |
| artifacts.story_artifacts     | kb_entry_id   | knowledge_entries.id            | SET NULL  |
| workflow.task_audit_log       | task_id       | workflow.tasks.id               | CASCADE   |
| workflow.workflow_checkpoints | execution_id  | workflow.workflow_executions.id | CASCADE   |
| workflow.workflow_audit_log   | execution_id  | workflow.workflow_executions.id | CASCADE   |
| agent_decisions               | invocation_id | agent_invocations.id            | CASCADE   |
| agent_outcomes                | invocation_id | agent_invocations.id            | CASCADE   |
