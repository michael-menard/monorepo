# Bootstrap Story Workflow from Raw Plan

I have a raw plan (from Warp AI, a PRD, or a migration/feature description). I need you to convert it into the structured planning artifacts used by my multi-agent story workflow.

---

## Required Inputs

Before proceeding, I will provide:

1. **Raw Plan/PRD** - The unstructured plan, migration outline, or feature description
2. **Project Name** - Short identifier (e.g., "vercel-migration", "auth-refactor")
3. **Story Prefix** - Prefix for story IDs (e.g., "STORY", "WRKF", "AUTH", "MIGR")
   - All story files will use this prefix: `{PREFIX}-001`, `{PREFIX}-002`, etc.
   - This differentiates stories across different epics/projects
4. **Output Directory** - Where to create files (default: `plans/`)

### Prefix Examples

| Project | Prefix | Story IDs | Files Created |
|---------|--------|-----------|---------------|
| Vercel Migration | STORY | STORY-001, STORY-002 | `STORY.stories.index.md`, `STORY.plan.*.md` |
| Workflow Harness | WRKF | WRKF-000, WRKF-001 | `WRKF.stories.index.md`, `WRKF.plan.*.md` |
| Auth Refactor | AUTH | AUTH-001, AUTH-002 | `AUTH.stories.index.md`, `AUTH.plan.*.md` |
| Gallery Feature | GLRY | GLRY-001, GLRY-002 | `GLRY.stories.index.md`, `GLRY.plan.*.md` |

---

## Step 1: Analyze the Raw Plan

Read the plan and extract:

- **Overall Goal** - What is the end state?
- **Major Phases/Milestones** - Natural groupings of work
- **Individual Stories** - Discrete units of work that can be:
  - Implemented independently (with dependency tracking)
  - Verified locally
  - Completed in 1-3 dev sessions
- **Dependencies** - Which stories depend on others?
- **Risk Areas** - Technical risks, unknowns, blockers

**Pause and confirm your understanding before proceeding.**

---

## Step 2: Generate `{PREFIX}.stories.index.md`

Create the master story index at `plans/stories/{PREFIX}.stories.index.md` with this structure:

```markdown
# {PREFIX} Stories Index

All stories in this epic use the `{PREFIX}-XXX` naming convention.

## Progress Summary

| Status | Count |
|--------|-------|
| completed | 0 |
| generated | 0 |
| in-progress | 0 |
| pending | [N] |

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

**Infrastructure:** (or relevant infra notes)
- [Infrastructure requirements]

**Goal:** [One sentence goal]

**Risk Notes:** [Known risks, complexity notes]

---

## {PREFIX}-002: [Next Feature]
**Status:** pending
**Depends On:** {PREFIX}-001 (or none)
...
```

### Story Numbering Rules
- Use sequential numbers with the chosen prefix: `{PREFIX}-001`, `{PREFIX}-002`, etc.
- Group related stories together
- Order by logical implementation sequence
- Mark dependencies explicitly using the full prefixed ID

### Story Sizing Guidelines

Stories should be completable in 1-3 dev sessions. Watch for these "too large" indicators:

| Indicator | Threshold | Action |
|-----------|-----------|--------|
| Acceptance Criteria | > 8 ACs | Split into smaller stories |
| Endpoints | > 5 endpoints | Group by domain/function |
| Full-stack scope | Significant FE + BE | Split backend/frontend |
| Bundled features | Multiple independent features | One feature per story |
| Test scenarios | > 3 distinct happy paths | Indicates multiple features |
| Package touches | > 2 packages | Consider splitting by package |

If a planned story hits 2+ indicators, proactively split it during planning rather than waiting for `/elab-story` to flag it.

---

## Step 3: Generate `{PREFIX}.plan.meta.md`

Create the meta plan file at `plans/{PREFIX}.plan.meta.md`:

```markdown
---
doc_type: plan_meta
title: "{PREFIX} — Meta Plan"
status: active
story_prefix: "{PREFIX}"
created_at: "[timestamp]"
updated_at: "[timestamp]"
tags:
  - [relevant tags]
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

## Naming Rule (timestamps in filenames)
All docs MUST include a timestamp in the filename:
- Format: `YYYYMMDD-HHMM` (America/Denver)

## Principles
- Story folders are atomic and self-contained
- Documentation structure must be automation-friendly
- Stories represent units of intent, validation, and evidence

## Principles (Project-Specific)

### Reuse First (Non-Negotiable)
- Prefer reusing existing workspace packages under `packages/**`
- No per-story one-off utilities
- If capability missing: extend existing package or create new shared package

### Package Boundary Rules
- [Project-specific package rules]

### Import Policy
- Shared code MUST be imported via workspace package names

---

## Agent Log
Append-only.

| Timestamp (America/Denver) | Agent | Action | Outputs |
|---|---|---|---|
| [timestamp] | bootstrap | Initial plan creation | {PREFIX}.stories.index.md, {PREFIX}.plan.meta.md, {PREFIX}.plan.exec.md |
```

---

## Step 4: Generate `{PREFIX}.plan.exec.md`

Create the execution plan file at `plans/{PREFIX}.plan.exec.md`:

```markdown
---
doc_type: plan_exec
title: "{PREFIX} — Execution Plan"
status: active
story_prefix: "{PREFIX}"
created_at: "[timestamp]"
updated_at: "[timestamp]"
tags:
  - [relevant tags]
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

All artifacts use the story prefix:

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

## Naming Rule (timestamps in filenames)
All docs MUST include a timestamp in the filename:
- Format: `YYYYMMDD-HHMM` (America/Denver)

## Step 0 — Harness Validation (if applicable)
- Produce Story 000 as a structural harness to validate the workflow
- Commit outputs to: `plans/stories/{PREFIX}-000/`

## Subsequent Steps
- Each phase generates a new story directory
- No loose story markdown files at root of `plans/`

## Artifact Rules (Project-Specific)

### Reuse Gate (Required for QA PASS)
For each story:
- PM story doc MUST include: `## Reuse Plan`
- Dev proof MUST include: `## Reuse Verification`

### Prohibited Patterns
- [List project-specific anti-patterns]

### Story Acceptance Rule
A story may be marked "Done" only if:
- It reuses shared packages where applicable, OR
- It documents why reuse was not possible and creates the shared package instead

---

## Agent Log
Append-only.

| Timestamp (America/Denver) | Agent | Action | Outputs |
|---|---|---|---|
| [timestamp] | bootstrap | Initial execution plan | {PREFIX}.plan.exec.md |
```

---

## Step 5: Output Summary

After generating all files, provide:

1. **Files Created** - List all files with full paths:
   - `plans/stories/{PREFIX}.stories.index.md`
   - `plans/{PREFIX}.plan.meta.md`
   - `plans/{PREFIX}.plan.exec.md`
   - `plans/stories/LESSONS-LEARNED.md` (if not exists)
   - `plans/stories/TOKEN-BUDGET-TEMPLATE.md` (if not exists)
2. **Story Count** - Total stories identified
3. **Story Prefix** - The prefix used for this project
4. **Dependency Graph** - Visual representation of story dependencies
5. **Ready to Start** - Which stories can begin immediately
6. **Risk Summary** - High-risk stories or unknowns

---

## Notes

- This prompt generates the **bootstrapping artifacts** only
- Individual stories are generated later via `/pm-generate-story {PREFIX}-XXX`
- The workflow commands (`/elab-story`, `/dev-implement-story`, etc.) operate on these artifacts
- See `docs/FULL_WORKFLOW.md` for the complete workflow documentation

---

## Templates Reference

Reusable templates are available from the WRKF-000 harness story:

| Template | Location | Purpose |
|----------|----------|---------|
| `PROOF-TEMPLATE.md` | `plans/stories/WRKF-000/_templates/` | Dev proof document structure |
| `QA-VERIFY-TEMPLATE.md` | `plans/stories/WRKF-000/_templates/` | QA verification structure |
| `ELAB-TEMPLATE.md` | `plans/stories/WRKF-000/_templates/` | Elaboration/audit structure |

When generating story artifacts, reference these templates for consistent structure.

---

## Related Files to Create

In addition to the main planning artifacts, ensure these supporting files exist:

### Token Budget Template
Copy `plans/stories/TOKEN-BUDGET-TEMPLATE.md` to use in each story for tracking token usage.

### Lessons Learned
Create `plans/stories/LESSONS-LEARNED.md` (empty template) for accumulating learnings:

```markdown
# Lessons Learned

This file captures implementation learnings from completed stories to improve future planning and execution.

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

(Story entries will be appended here by the Learnings agent after each story)
```

---

## Ready?

Paste your raw plan below, along with:
1. **Project Name:** (e.g., "vercel-migration")
2. **Story Prefix:** (e.g., "STORY", "WRKF", "AUTH")

I'll begin the analysis.
