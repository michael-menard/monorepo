---
doc_type: plan_exec
title: "KBAR — Execution Plan"
status: active
story_prefix: "KBAR"
created_at: "2026-02-05T06:30:00Z"
updated_at: "2026-02-05T06:30:00Z"
tags:
  - database
  - mcp
  - agents
  - knowledge-base
---

# KBAR — Execution Plan

## Story Prefix

All stories use the **KBAR** prefix. Commands use the full prefixed ID:
- `/pm-generate-story KBAR-001`
- `/elab-story KBAR-001`
- `/dev-implement-story KBAR-001`
- `/qa-verify-story KBAR-001`

## Story Workflow

Each story progresses through these phases:
1. **Generation** — Initial story document created
2. **Elaboration** — Acceptance criteria, design decisions, test plan
3. **Implementation** — Code changes, artifact generation
4. **Code Review** — Peer review via specialists
5. **QA Verification** — Test execution and sign-off

## Artifact Rules

- Each story outputs artifacts under: `plans/stories/KBAR-XXX/`
- A story folder is the source of truth for all related documentation
- Story docs MUST include:
  - YAML front matter with `status` field (pending, in-progress, completed, blocked)
  - A `## Token Budget` section tracking costs
  - An append-only `## Agent Log` section

## Artifact Naming Convention

| Artifact | Filename | Purpose |
|----------|----------|---------|
| Story file | `story.yaml` | Single source of truth for story metadata |
| Elaboration | `ELAB-KBAR-XXX.md` | Acceptance criteria, design decisions, test plan |
| Proof | `PROOF-KBAR-XXX.md` | Implementation evidence, merged PRs, test results |
| Code Review | `CODE-REVIEW-KBAR-XXX.md` | Specialist reviews (security, perf, accessibility, etc.) |
| QA Verify | `QA-VERIFY-KBAR-XXX.md` | Test execution results and sign-off |
| QA Gate | `QA-GATE-KBAR-XXX.yaml` | Final pass/concerns/fail decision with findings |

### Additional Artifacts (_implementation/ directory)

| Artifact | Filename | Purpose |
|----------|----------|---------|
| Checkpoint | `CHECKPOINT.md` | Resume state between sessions |
| Setup | `SETUP-COMPLETE.md` | Evidence of environment validation |
| Backend Log | `BACKEND-LOG.md` | Backend implementation details and errors |
| Frontend Log | `FRONTEND-LOG.md` | Frontend implementation details and errors |
| Fix Context | `FIX-CONTEXT.md` | Root cause and resolution for defects |
| Analysis | `ANALYSIS.md` | Technical analysis and design decisions |
| Scope | `SCOPE.md` | Detailed scope and acceptance criteria |
| Verification | `VERIFICATION.yaml` | Test results and coverage metrics |

## Token Budget Rule

- Each story MUST include a `## Token Budget` section
- Before starting a phase, record `/cost` session total
- After completing a phase, record delta
- Format:

```markdown
## Token Budget

### Phase Summary

| Phase | Estimated | Actual | Delta | Notes |
|-------|-----------|--------|-------|-------|
| Story Gen | ~10k | — | — | — |
| Elaboration | ~15k | — | — | — |
| Implementation | ~50k | — | — | — |
| Code Review | ~20k | — | — | — |
| QA Verify | ~15k | — | — | — |
| **Total** | ~110k | — | — | — |
```

## Step 0 — Harness Validation (if applicable)

For epic harnesses:
- Produce Story 000 as a structural harness to validate the workflow
- Commit outputs to: `plans/stories/KBAR-000/`

For this epic: Not applicable (KBAR is a direct epic).

## Subsequent Steps

- Each phase generates a new story directory under `plans/stories/KBAR-XXX/`
- No loose story markdown files at root of `plans/future/kb-artifact-migration/`

## Reuse Gate (Required for QA PASS)

For each story:
- **PM story doc** MUST include: `## Reuse Plan` section identifying which packages are leveraged
- **Dev proof** MUST include: `## Reuse Verification` section documenting what packages were used

Example:

```markdown
## Reuse Plan

- Leverage existing `apps/api/knowledge-base` for schema and migrations
- Extend `packages/backend/knowledge-base` for sync utilities
- Reuse `apps/api/knowledge-base/src/mcp-server` for MCP tool registration

## Reuse Verification

- Verified sync functions in `packages/backend/knowledge-base/src/sync/`
- MCP tools registered in `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts`
- No one-off utilities created
```

## Story Acceptance Rule

A story may be marked "Done" only if:
- It reuses shared packages where applicable, OR
- It documents why reuse was not possible and creates the shared package instead

## Parallel Execution

Stories can be worked in parallel when dependencies are satisfied:

| Group | Stories | After | Notes |
|-------|---------|-------|-------|
| 1 | KBAR-001 | — | Start immediately |
| 2 | KBAR-002 | Group 1 | Schema validation |
| 3 | KBAR-003 | Group 2 | Story sync foundation |
| 4 | KBAR-004 | Group 3 | Artifact sync |
| 5 | KBAR-005 | Group 4 | CLI commands |
| 6 | KBAR-006 | Group 5 | Sync validation |
| 7 | KBAR-007 | Group 6 | story_get tool |
| 8 | KBAR-008 | Group 7 | story_list/update tools |
| 9 | KBAR-009 | Group 8 | story_ready_to_start tool |
| 10 | KBAR-010 | Group 9 | Story tools validation |
| 11 | KBAR-011 | Group 10 | artifact_write tool |
| 12 | KBAR-012, KBAR-013 | Group 11 | artifact_read and search tools (parallel) |
| 13 | KBAR-014 | Group 12 | Artifact summary extraction |
| 14 | KBAR-015 | Group 13 | Artifact tools validation |
| 15 | KBAR-016 | Group 14 | Update setup/plan agents |
| 16 | KBAR-017, KBAR-018 | Group 15 | Update execution and code review agents (parallel) |
| 17 | KBAR-019 | Group 16 | Update QA/fix agents |
| 18 | KBAR-020 | Group 17 | Update knowledge context loader |
| 19 | KBAR-021 | Group 18 | Update orchestrator commands |
| 20 | KBAR-022 | Group 19 | Agent migration E2E testing |
| 21 | KBAR-023 | Group 20 | DB-driven index generation |
| 22 | KBAR-024 | Group 21 | Regenerate index CLI |
| 23 | KBAR-025 | Group 22 | Lesson extraction from evidence |
| 24 | KBAR-026 | Group 23 | Architectural decision extraction |
| 25 | KBAR-027 | Group 24 | Lesson extraction integration |

**Max parallel at any time:** 2 stories

## Error Handling & Recovery

| Error | Action |
|-------|--------|
| Schema migration fails | Rollback, document failure, retry with adjusted schema |
| Sync drift detected | Run full re-sync with logging, validate consistency |
| MCP tool registration fails | Check tool schema, verify handler exists, retry |
| Agent update causes regression | Revert agent change, create follow-up fix story |
| KB write fails | Log error, continue (non-blocking), retry async |

## Quality Gates

All stories must pass before promotion to "Done":
1. **Functional** — Story feature works as intended
2. **Testing** — Unit, integration, and E2E tests pass
3. **Code Review** — Passes all specialist reviews
4. **Reuse** — Reuse plan documented and verified
5. **Documentation** — All artifacts complete and linked
6. **QA Sign-off** — QA-GATE-KBAR-XXX.yaml shows PASS

---

## Agent Log

Append-only. Records all execution activities.

| Timestamp (America/Denver) | Agent | Action | Outputs |
|---|---|---|---|
| 2026-02-05T06:30:00Z | pm-bootstrap-generation-leader | Initial execution plan | PLAN.exec.md |
