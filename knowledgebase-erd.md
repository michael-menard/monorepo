# Knowledgebase Database ERD

## 1. Stories Domain

```mermaid
erDiagram
    stories ||--o| story_details : "story_id"
    stories ||--o{ story_dependencies : "story_id"
    stories ||--o{ story_dependencies : "target_story_id"
    stories ||--o{ story_knowledge_links : "story_id"
    stories ||--o| story_outcomes : "story_id"
    knowledge_entries ||--o{ story_knowledge_links : "kb_entry_id"
    knowledge_entries ||--o{ story_artifacts : "kb_entry_id"

    stories {
        uuid id PK
        text story_id UK
        text feature
        text epic
        text title
        text description
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

    story_details {
        uuid id PK
        text story_id FK
        text story_dir
        text story_file
        text blocked_reason
        text blocked_by_story
        boolean touches_backend
        boolean touches_frontend
        boolean touches_database
        boolean touches_infra
        timestamptz started_at
        timestamptz completed_at
        text file_hash
        timestamptz updated_at
    }

    story_dependencies {
        uuid id PK
        text story_id
        text target_story_id
        text dependency_type
        boolean satisfied
        timestamp created_at
    }

    story_artifacts {
        uuid id PK
        text story_id
        text artifact_type
        text artifact_name
        uuid kb_entry_id FK
        text phase
        integer iteration
        jsonb summary
        text detail_table
        uuid detail_id
        timestamp created_at
    }

    story_knowledge_links {
        uuid id PK
        text story_id FK
        uuid kb_entry_id FK
        text link_type
        real confidence
        text created_by
        timestamptz created_at
    }

    story_audit_log {
        uuid id PK
        uuid story_id
        text operation
        jsonb previous_value
        jsonb new_value
        timestamptz timestamp
    }

    story_outcomes {
        uuid id PK
        text story_id UK
        text final_verdict
        integer quality_score
        integer total_input_tokens
        integer total_output_tokens
        integer total_cached_tokens
        numeric estimated_total_cost
        integer review_iterations
        integer qa_iterations
        integer duration_ms
        text primary_blocker
        jsonb metadata
        timestamptz completed_at
    }
```

## 2. Telemetry Domain

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
        uuid invocation_id FK
        text decision_type
        text decision_text
        jsonb context
        vector embedding
        text operator_id
        text story_id
        timestamptz created_at
    }
```

## 3. Knowledge Domain

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
        text_arr tags
        boolean verified
        text verified_by
        timestamp verified_at
        boolean archived
        timestamp archived_at
        uuid canonical_id FK
        boolean is_canonical
        timestamp created_at
        timestamp updated_at
    }

    audit_log {
        uuid id PK
        uuid entry_id FK
        text action
        text old_content
        text new_content
        text changed_by
        timestamp timestamp
    }

    embedding_cache {
        uuid id PK
        text content_hash
        text model
        vector embedding
        timestamp created_at
    }
```

## 4. Plans Domain

```mermaid
erDiagram
    plans ||--o| plan_details : "plan_id"
    plans ||--o{ plan_dependencies : "plan_slug"
    plans ||--o{ plan_story_links : "plan_slug"
    plans ||--o{ plan_revision_history : "plan_id"
    plans ||--o{ plan_execution_log : "plan_slug"
    plans ||--o| plans : "parent_plan_id"

    plans {
        uuid id PK
        text plan_slug UK
        text title
        text summary
        text plan_type
        text status
        text priority
        text feature_dir
        text story_prefix
        integer estimated_stories
        jsonb phases
        text_arr tags
        text raw_content
        text source_file
        text content_hash
        uuid kb_entry_id FK
        uuid parent_plan_id FK
        uuid superseded_by FK
        vector embedding
        timestamptz created_at
        timestamptz updated_at
    }

    plan_details {
        uuid id PK
        uuid plan_id FK
        text raw_content
        jsonb phases
        jsonb dependencies
        text source_file
        text content_hash
        uuid kb_entry_id FK
        jsonb sections
        text format_version
        timestamptz imported_at
        timestamptz updated_at
    }

    plan_dependencies {
        uuid id PK
        text plan_slug FK
        text depends_on_slug FK
        boolean satisfied
        timestamptz created_at
    }

    plan_story_links {
        uuid id PK
        text plan_slug
        text story_id
        text link_type
        timestamptz created_at
    }

    plan_revision_history {
        uuid id PK
        uuid plan_id FK
        integer revision_number
        text raw_content
        text content_hash
        jsonb sections
        text change_reason
        text changed_by
        timestamptz created_at
    }

    plan_execution_log {
        uuid id PK
        text plan_slug FK
        text entry_type
        text phase
        text story_id
        text message
        jsonb metadata
        timestamptz created_at
    }
```

## 5. Tasks and Work State Domain

```mermaid
erDiagram
    tasks ||--o{ task_audit_log : "task_id"
    tasks ||--o| tasks : "blocked_by"

    tasks {
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
        text promoted_to_story
        text_arr tags
        text estimated_effort
        timestamp created_at
        timestamp updated_at
        timestamp completed_at
    }

    task_audit_log {
        uuid id PK
        uuid task_id FK
        text operation
        jsonb previous_value
        jsonb new_value
        timestamptz timestamp
    }

    work_state {
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

    work_state_history {
        uuid id PK
        text story_id
        jsonb state_snapshot
        timestamp archived_at
    }
```

## 6. Context Cache Domain

```mermaid
erDiagram
    context_sessions ||--o{ context_cache_hits : "session_id"
    context_packs ||--o{ context_cache_hits : "pack_id"

    context_packs {
        uuid id PK
        text pack_type
        text pack_key
        jsonb content
        integer version
        timestamptz expires_at
        integer hit_count
        timestamptz last_hit_at
        integer token_count
        timestamptz created_at
        timestamptz updated_at
    }

    context_sessions {
        uuid id PK
        text session_id UK
        text agent_name
        text story_id
        text phase
        integer input_tokens
        integer output_tokens
        integer cached_tokens
        timestamptz started_at
        timestamptz ended_at
        timestamptz created_at
        timestamptz updated_at
    }

    context_cache_hits {
        uuid id PK
        uuid session_id FK
        uuid pack_id FK
        integer tokens_saved
        timestamptz created_at
    }
```

## Non-Public Schemas

### analytics

- **story_token_usage** - Token usage per story phase
- **change_telemetry** - Change tracking metrics
- **model_assignments** - Model assignment records
- **model_experiments** - A/B experiment configs

### artifacts (17 normalized detail tables)

- artifact_analyses, artifact_checkpoints, artifact_completion_reports, artifact_contexts, artifact_dev_feasibility, artifact_elaborations, artifact_evidence, artifact_fix_summaries, artifact_plans, artifact_proofs, artifact_qa_gates, artifact_reviews, artifact_scopes, artifact_story_seeds, artifact_test_plans, artifact_uiux_notes, artifact_verifications

### workflow

- **stories** - Workflow story state
- **story_dependencies** - Workflow dependency tracking
- **story_state_history** - State transition history
- **workflow_audit_log** - Workflow audit trail
- **workflow_checkpoints** - Execution checkpoints
- **workflow_executions** - Execution records
- **worktrees** - Git worktree tracking

## Foreign Key Summary

| Source                | Column          | Target               | On Delete |
| --------------------- | --------------- | -------------------- | --------- |
| agent_decisions       | invocation_id   | agent_invocations.id | CASCADE   |
| agent_outcomes        | invocation_id   | agent_invocations.id | CASCADE   |
| audit_log             | entry_id        | knowledge_entries.id | SET NULL  |
| context_cache_hits    | session_id      | context_sessions.id  | CASCADE   |
| context_cache_hits    | pack_id         | context_packs.id     | CASCADE   |
| hitl_decisions        | invocation_id   | agent_invocations.id | SET NULL  |
| knowledge_entries     | canonical_id    | knowledge_entries.id | NO ACTION |
| plan_dependencies     | plan_slug       | plans.plan_slug      | RESTRICT  |
| plan_dependencies     | depends_on_slug | plans.plan_slug      | RESTRICT  |
| plan_details          | plan_id         | plans.id             | RESTRICT  |
| plan_details          | kb_entry_id     | knowledge_entries.id | SET NULL  |
| plan_execution_log    | plan_slug       | plans.plan_slug      | RESTRICT  |
| plan_revision_history | plan_id         | plans.id             | RESTRICT  |
| plans                 | parent_plan_id  | plans.id             | SET NULL  |
| plans                 | superseded_by   | plans.id             | NO ACTION |
| plans                 | kb_entry_id     | knowledge_entries.id | SET NULL  |
| story_artifacts       | kb_entry_id     | knowledge_entries.id | SET NULL  |
| story_dependencies    | story_id        | stories.story_id     | CASCADE   |
| story_dependencies    | target_story_id | stories.story_id     | CASCADE   |
| story_details         | story_id        | stories.story_id     | RESTRICT  |
| story_knowledge_links | story_id        | stories.story_id     | RESTRICT  |
| story_knowledge_links | kb_entry_id     | knowledge_entries.id | CASCADE   |
| task_audit_log        | task_id         | tasks.id             | CASCADE   |
| tasks                 | blocked_by      | tasks.id             | SET NULL  |
