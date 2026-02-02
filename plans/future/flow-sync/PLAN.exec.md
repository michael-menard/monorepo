---
doc_type: plan_exec
title: "FLOW — Execution Plan"
status: active
story_prefix: "FLOW"
created_at: "2026-02-01T14:30:00Z"
updated_at: "2026-02-01T14:30:00Z"
tags:
  - orchestrator
  - workflow-alignment
  - database-integration
---

# FLOW — Execution Plan

## Story Prefix

All stories use the **FLOW** prefix. Commands use the full prefixed ID:

```bash
/elab-story FLOW-001
/dev-implement-story plans/future/flow-sync FLOW-001
/qa-verify-story plans/future/flow-sync FLOW-001
```

## Artifact Rules

- Each story outputs artifacts in story-specific directory
- Story directory structure:
  - `story.yaml` - Story definition (in backlog/ initially)
  - Elaboration outputs (when moved to elaboration/)
  - Implementation outputs (when moved to ready-to-work/)
  - Verification outputs (when in UAT/)
- All story docs MUST include:
  - YAML front matter with story metadata
  - A Token Budget section (phase-by-phase tracking)
  - An append-only Agent Log section

## Artifact Naming Convention

| Artifact Type | Filename Pattern | Location |
|---------------|------------------|----------|
| Story Definition | `story.yaml` | Story directory |
| Elaboration | `elaboration.yaml` | Story directory |
| Plan | `plan.yaml` | Story directory |
| Proof (Evidence) | `proof.yaml` | Story directory |
| Code Review | `code-review.yaml` | Story directory |
| Verification | `verification.yaml` | Story directory |
| QA Gate | `qa-gate.yaml` | Story directory |

All files are YAML-based, matching the Claude workflow artifact format.

## Token Budget Rule

**Every story MUST include a `## Token Budget` section.**

### Budget Template

```yaml
token_budget:
  phase_estimates:
    story_generation: ~5k
    elaboration: ~15k
    implementation: ~50k
    code_review: ~20k
    qa_verification: ~15k
    total_estimated: ~105k
  actual_measurements: []
```

### Measurement Process

1. **Before starting phase:** Record session token count with `/cost`
2. **After completing phase:** Record delta (actual - start)
3. **Document findings:** Add to story's `actual_measurements`

Example:
```yaml
actual_measurements:
  - phase: elaboration
    date: "2026-02-05"
    tokens_used: 12847
    notes: "Graph analysis added complexity"
```

## Execution Workflow

### Phase 1: Elaboration

```bash
/elab-story plans/future/flow-sync FLOW-001
```

**Produces:**
- `elaboration.yaml` - detailed requirements and acceptance criteria
- Updates story status to "elaboration"

**Gate:** PM and UX review; move to next phase if ready

### Phase 2: Implementation Plan

Once elaboration passes, PM plans the implementation:

```bash
/dev-implement-story plans/future/flow-sync FLOW-001
```

**Produces:**
- `plan.yaml` - implementation approach, dependencies, test strategy
- Updates story status to "ready-to-work"

### Phase 3: Development

Dev implements from the plan:
- Update code in `packages/backend/orchestrator/src/`
- Write unit tests alongside implementation
- Create `proof.yaml` documenting what was built
- Run linting and type checks

### Phase 4: Code Review

```bash
/dev-code-review plans/future/flow-sync FLOW-001
```

**Reviews:**
- Code quality and style
- Test coverage (minimum 45%)
- Architecture and reuse
- Security and performance

**Produces:** `code-review.yaml` with detailed findings

### Phase 5: QA Verification

```bash
/qa-verify-story plans/future/flow-sync FLOW-001
```

**Verifies:**
- Acceptance criteria met
- Tests passing (unit + integration)
- Documentation complete
- No regressions

**Produces:** `verification.yaml` and `qa-gate.yaml`

**Gate:** PASS / CONCERNS / FAIL

## Reuse Gate (Required for QA PASS)

For each story, before marking PASS:

**PM Story:** MUST include `## Reuse Plan` section documenting:
- Existing packages being reused
- Why reuse was/wasn't possible
- Any new shared packages created

**Dev Proof:** MUST include `## Reuse Verification` section documenting:
- What existing packages were used
- Code locations showing reuse
- Any shared utilities added to workspace exports

### Story Acceptance Rule

**A story may be marked "Done" only if:**
1. It reuses shared packages where applicable, OR
2. It documents why reuse was not possible and creates the shared package instead

Breaking this rule delays future stories. Reuse-first is non-negotiable.

## Database Dependencies

Several stories depend on database schema being deployed:

```sql
-- Required: packages/api/knowledge-base/src/db/migrations/002_workflow_tables.sql
-- Tables needed:
-- - workflow_stories
-- - workflow_elaborations
-- - workflow_plans
-- - workflow_verification
-- - workflow_proof
-- - workflow_token_logs
```

If schema not deployed, those stories will be blocked. Coordinate with infrastructure.

## Special Handling

### Breaking Changes

Stories with breaking changes (FLOW-002, FLOW-003, FLOW-007) require:
- Clear migration path documentation in plan.yaml
- Backward compatibility plan (if applicable)
- Testing of migration scenarios

### Integration Points

Stories touching graph structure (FLOW-014, FLOW-015) require:
- Validation against actual orchestrator graphs
- Testing with real workflow scenarios
- Coordination with workflow agents

---

## Agent Log

Append-only.

| Timestamp | Agent | Action | Outputs | Status |
|-----------|-------|--------|---------|--------|
| 2026-02-01T14:30:00Z | pm-bootstrap-generation-leader | Phase 2: Generate execution plan | PLAN.exec.md | GENERATION COMPLETE |
