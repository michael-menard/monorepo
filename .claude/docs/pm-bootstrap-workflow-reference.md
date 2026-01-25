---
created: 2026-01-24
updated: 2026-01-24
version: 1.0.0
type: reference
command: /pm-bootstrap-workflow
---

# PM Bootstrap Workflow - Reference

## Architecture

```
/pm-bootstrap-workflow
    │
    ├─→ Phase 0: pm-bootstrap-setup-leader.agent.md (haiku)
    │       └─→ Validates inputs, creates AGENT-CONTEXT.md
    │
    ├─→ Phase 1: pm-bootstrap-analysis-leader.agent.md (sonnet)
    │       └─→ Analyzes plan, creates ANALYSIS.yaml
    │
    └─→ Phase 2: pm-bootstrap-generation-leader.agent.md (haiku)
            └─→ Generates all artifact files
```

## Output Format

All agents follow `.claude/agents/_shared/lean-docs.md`:
- YAML over markdown prose
- Skip empty sections
- Structured data (tables/lists, not paragraphs)

## Artifacts

| File | Created By | Purpose |
|------|------------|---------|
| `{PREFIX}.bootstrap/AGENT-CONTEXT.md` | Setup | Bootstrap context |
| `{PREFIX}.bootstrap/CHECKPOINT.md` | All phases | Resume state |
| `{PREFIX}.bootstrap/ANALYSIS.yaml` | Analysis | Structured story data |
| `{PREFIX}.bootstrap/SUMMARY.yaml` | Generation | Final summary |
| `stories/{PREFIX}.stories.index.md` | Generation | Master story index |
| `{PREFIX}.plan.meta.md` | Generation | Documentation principles |
| `{PREFIX}.plan.exec.md` | Generation | Execution rules |
| `{PREFIX}.roadmap.md` | Generation | Visual dependency graphs |

## Signals

See: `.claude/agents/_shared/completion-signals.md`

| Phase | Signal |
|-------|--------|
| Setup | `SETUP COMPLETE` / `SETUP BLOCKED: <reason>` |
| Analysis | `ANALYSIS COMPLETE` / `ANALYSIS BLOCKED: <reason>` |
| Generation | `GENERATION COMPLETE` / `GENERATION BLOCKED: <reason>` |

## Token Tracking

See: `.claude/agents/_shared/token-tracking.md`

## Retry Policy

| Phase | Error | Retries |
|-------|-------|---------|
| Setup | Missing input | User prompt, no retry |
| Setup | Prefix collision | User prompt, no retry |
| Analysis | Unparseable plan | 0 - requires new input |
| Generation | Write failed | 1 - retry with permission fix |

## Troubleshooting

| Issue | Check |
|-------|-------|
| "Prefix already exists" | Look for existing `{PREFIX}.stories.index.md` |
| "Cannot extract stories" | Ensure raw plan has actionable items |
| "Circular dependency" | Review story dependencies in ANALYSIS.yaml |
| Phase stuck | Check CHECKPOINT.md for resume state |

---

## Template: Stories Index

```markdown
---
doc_type: stories_index
title: "{PREFIX} Stories Index"
status: active
story_prefix: "{PREFIX}"
created_at: "{TIMESTAMP}"
updated_at: "{TIMESTAMP}"
---

# {PREFIX} Stories Index

All stories in this epic use the `{PREFIX}-XXX` naming convention (starting at 001).

## Progress Summary

| Status | Count |
|--------|-------|
| completed | 0 |
| generated | 0 |
| in-progress | 0 |
| pending | {N} |

---

## Ready to Start

Stories with all dependencies satisfied (can be worked in parallel):

| Story | Feature | Blocked By |
|-------|---------|------------|
| {PREFIX}-001 | [Feature Name] | — |

---

## {PREFIX}-001: [Feature Name]

**Status:** pending
**Depends On:** none
**Feature:** [Brief description]
**Endpoints:** (if applicable)
- `path/to/handler.ts`

**Infrastructure:** (if applicable)
- [Infrastructure requirements]

**Goal:** [One sentence goal]

**Risk Notes:** [Known risks, complexity notes]

---

## {PREFIX}-002: [Next Feature]

**Status:** pending
**Depends On:** {PREFIX}-001

...
```

---

## Template: Meta Plan

```markdown
---
doc_type: plan_meta
title: "{PREFIX} — Meta Plan"
status: active
story_prefix: "{PREFIX}"
created_at: "{TIMESTAMP}"
updated_at: "{TIMESTAMP}"
tags:
  - {relevant tags}
---

# {PREFIX} — Meta Plan

## Story Prefix

All stories in this project use the **{PREFIX}** prefix.
- Story IDs: `{PREFIX}-001`, `{PREFIX}-002`, etc.
- Story folders: `plans/stories/{PREFIX}-XXX/`
- Artifact files: `ELAB-{PREFIX}-XXX.md`, `PROOF-{PREFIX}-XXX.md`, etc.

## Documentation Structure

- `plans/` contains cross-cutting strategy and execution docs
- `plans/stories/{PREFIX}-XXX/` contains all per-story artifacts

## Naming Rule

All docs MUST include a timestamp in the filename:
- Format: `YYYYMMDD-HHMM` (America/Denver)

## Principles

- Story folders are atomic and self-contained
- Documentation structure must be automation-friendly
- Stories represent units of intent, validation, and evidence

### Reuse First (Non-Negotiable)

- Prefer reusing existing workspace packages under `packages/**`
- No per-story one-off utilities
- If capability missing: extend existing package or create new shared package

### Package Boundary Rules

- Core logic in `packages/core/*`
- Backend utilities in `packages/backend/*`
- Frontend components in `packages/core/app-component-library`

### Import Policy

- Shared code MUST be imported via workspace package names
- No deep relative imports across package boundaries

---

## Agent Log

Append-only.

| Timestamp (America/Denver) | Agent | Action | Outputs |
|---|---|---|---|
| {TIMESTAMP} | bootstrap | Initial plan creation | {PREFIX}.stories.index.md, {PREFIX}.plan.meta.md, {PREFIX}.plan.exec.md, {PREFIX}.roadmap.md |
```

---

## Template: Exec Plan

```markdown
---
doc_type: plan_exec
title: "{PREFIX} — Execution Plan"
status: active
story_prefix: "{PREFIX}"
created_at: "{TIMESTAMP}"
updated_at: "{TIMESTAMP}"
tags:
  - {relevant tags}
---

# {PREFIX} — Execution Plan

## Story Prefix

All stories use the **{PREFIX}** prefix. Commands use the full prefixed ID:
- `/pm-generate-story {PREFIX}-001`
- `/elab-story {PREFIX}-001`
- `/dev-implement-story {PREFIX}-001`

## Artifact Rules

- Each story outputs artifacts under: `plans/stories/{PREFIX}-XXX/`
- A story folder is the source of truth for all related documentation
- Story docs MUST include:
  - YAML front matter with status
  - A Token Budget section
  - An append-only Agent Log section

## Artifact Naming Convention

| Artifact | Filename |
|----------|----------|
| Story file | `{PREFIX}-XXX.md` |
| Elaboration | `ELAB-{PREFIX}-XXX.md` |
| Proof | `PROOF-{PREFIX}-XXX.md` |
| Code Review | `CODE-REVIEW-{PREFIX}-XXX.md` |
| QA Verify | `QA-VERIFY-{PREFIX}-XXX.md` |
| QA Gate | `QA-GATE-{PREFIX}-XXX.yaml` |

## Token Budget Rule

- Each story MUST include a `## Token Budget` section
- Before starting a phase, record `/cost` session total
- After completing a phase, record delta

## Step 0 — Harness Validation (if applicable)

- Produce Story 000 as a structural harness to validate the workflow
- Commit outputs to: `plans/stories/{PREFIX}-000/`

## Subsequent Steps

- Each phase generates a new story directory
- No loose story markdown files at root of `plans/`

### Reuse Gate (Required for QA PASS)

For each story:
- PM story doc MUST include: `## Reuse Plan`
- Dev proof MUST include: `## Reuse Verification`

### Story Acceptance Rule

A story may be marked "Done" only if:
- It reuses shared packages where applicable, OR
- It documents why reuse was not possible and creates the shared package instead

---

## Agent Log

Append-only.

| Timestamp (America/Denver) | Agent | Action | Outputs |
|---|---|---|---|
| {TIMESTAMP} | bootstrap | Initial execution plan | {PREFIX}.plan.exec.md |
```

---

## Template: Roadmap

```markdown
---
doc_type: roadmap
title: "{PREFIX} — Story Roadmap"
status: active
story_prefix: "{PREFIX}"
created_at: "{TIMESTAMP}"
updated_at: "{TIMESTAMP}"
---

# {PREFIX} — Story Roadmap

Visual representation of story dependencies and execution order.

---

## Dependency Graph

Shows which stories block downstream work.

```mermaid
flowchart LR
    subgraph Phase1["Phase 1: Foundation"]
        S001["{PREFIX}-001<br/>Title"]
        S002["{PREFIX}-002<br/>Title"]
    end

    subgraph Phase2["Phase 2: Core Features"]
        S003["{PREFIX}-003<br/>Title"]
        S004["{PREFIX}-004<br/>Title"]
    end

    subgraph Phase3["Phase 3: Integration"]
        S005["{PREFIX}-005<br/>Title"]
    end

    %% Dependencies
    S001 --> S003
    S001 --> S004
    S002 --> S004
    S003 --> S005
    S004 --> S005

    %% Styling
    classDef ready fill:#90EE90,stroke:#228B22
    classDef blocked fill:#FFE4B5,stroke:#FFA500
    classDef done fill:#87CEEB,stroke:#4682B4

    class S001,S002 ready
    class S003,S004 blocked
    class S005 blocked
```

**Legend:** Green = Ready | Yellow = Blocked | Blue = Done

---

## Completion Order (Gantt View)

```mermaid
gantt
    title {PREFIX} Story Execution Order
    dateFormat X
    axisFormat %s

    section Phase 1
    {PREFIX}-001 Title    :s001, 0, 1
    {PREFIX}-002 Title    :s002, 0, 1

    section Phase 2
    {PREFIX}-003 Title    :s003, after s001, 1
    {PREFIX}-004 Title    :s004, after s001 s002, 1

    section Phase 3
    {PREFIX}-005 Title    :s005, after s003 s004, 1
```

---

## Critical Path

The longest chain of dependent stories:

```
{PREFIX}-001 → {PREFIX}-003 → {PREFIX}-005
```

**Critical path length:** N stories

---

## Parallel Opportunities

| Parallel Group | Stories | After |
|----------------|---------|-------|
| Group 1 | {PREFIX}-001, {PREFIX}-002 | — (start) |
| Group 2 | {PREFIX}-003, {PREFIX}-004 | Group 1 |
| Group 3 | {PREFIX}-005 | Group 2 |

**Maximum parallelization:** N stories at once

---

## Risk Indicators

| Story | Risk Level | Reason |
|-------|------------|--------|
| {PREFIX}-003 | High | [risk reason] |
| {PREFIX}-001 | Medium | [risk reason] |
| {PREFIX}-002 | Low | Straightforward |

---

## Quick Reference

| Metric | Value |
|--------|-------|
| Total Stories | N |
| Ready to Start | N |
| Critical Path Length | N stories |
| Max Parallel | N stories |
| Phases | N |

---

## Update Log

| Date | Change | Stories Affected |
|------|--------|------------------|
| {DATE} | Initial roadmap | All |
```

---

## Template: Lessons Learned

```markdown
# Lessons Learned

This file captures implementation learnings from completed stories.

---

## Token Usage Summary

### Story Token Costs (Cumulative)

| Story | Total Tokens | Input | Output | Most Expensive Phase | Notes |
|-------|--------------|-------|--------|---------------------|-------|

### High-Cost Operations Registry

Operations that consistently consume >10k tokens. Avoid or optimize these.

| Operation | Typical Tokens | Stories Affected | Mitigation |
|-----------|----------------|------------------|------------|

---

(Story entries appended by Learnings agent after each story)
```

---

## Template: Token Budget

```markdown
# Token Budget Template

Copy this section to each story's `## Token Budget` section.

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

### Actual Measurements

| Date | Phase | Before | After | Delta | Notes |
|------|-------|--------|-------|-------|-------|
```

---

## Prefix Examples

| Project | Prefix | Story IDs | Files Created |
|---------|--------|-----------|---------------|
| Vercel Migration | STORY | STORY-001, STORY-002 | `STORY.stories.index.md` |
| Workflow Harness | WRKF | WRKF-000, WRKF-001 | `WRKF.stories.index.md` |
| Auth Refactor | AUTH | AUTH-001, AUTH-002 | `AUTH.stories.index.md` |
| Gallery Feature | GLRY | GLRY-001, GLRY-002 | `GLRY.stories.index.md` |

## Story Sizing Guidelines

Stories should be completable in 1-3 dev sessions. Watch for these "too large" indicators:

| Indicator | Threshold | Action |
|-----------|-----------|--------|
| Acceptance Criteria | > 8 ACs | Split into smaller stories |
| Endpoints | > 5 endpoints | Group by domain/function |
| Full-stack scope | Significant FE + BE | Split backend/frontend |
| Bundled features | Multiple independent features | One feature per story |
| Test scenarios | > 3 distinct happy paths | Indicates multiple features |
| Package touches | > 2 packages | Consider splitting by package |

If 2+ indicators, flag for splitting during elaboration.
