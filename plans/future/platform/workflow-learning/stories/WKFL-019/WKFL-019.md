---
story_id: WKFL-019
title: Add story_type Field and Conditional Review Routing
status: backlog
created: 2026-02-22
updated: 2026-02-22
epic: WKFL
feature: Workflow Learning
type: feature
priority: medium
source: workflow-retro-2026-02-22
depends_on: [WKFL-017]
---

# WKFL-019: Add story_type Field and Conditional Review Routing

## Context

Batch retrospective (2026-02-22) found that 3 of 9 stories had code review waived or produced only informational findings because the deliverables were agent/schema/markdown files with no TypeScript:

| Story | Type | Review Outcome |
|-------|------|----------------|
| WKFL-001 | documentation | Review waived — no code to review |
| WKFL-006 | documentation | Review waived — docs only |
| WKFL-008 | schema/mixed | 3 info-level findings, no blocking issues |

The standard code review pipeline (lint, type-check, security scan) is designed for TypeScript. Running it against markdown and YAML agent files consumes 20,000–40,000 tokens and produces no actionable output. The review leader currently has no way to detect this and branch accordingly.

**Dependency**: WKFL-017 introduces `story_type` into the story.yaml frontmatter. This story consumes that field to route the review.

## Goal

Use the `story_type` field (introduced by WKFL-017) to route stories to the appropriate review workflow — full code review for TypeScript-delivering stories, a lightweight documentation quality check for documentation/schema-only stories.

## Non-goals

- Skipping review entirely for any story type (documentation review is still required)
- Changing the code review logic for `code_*` story types
- Defining the documentation review quality criteria (that is in scope here, but the checker itself is lightweight)

## Scope

### 1. Update `dev-code-review.md` (command)

Read `story_type` from story.yaml frontmatter:

```
story_type: code_* → run full code review pipeline (no change)
story_type: documentation | schema → run documentation quality check instead
story_type: mixed → run both pipelines
story_type: null / missing → default to full code review (safe fallback)
```

### 2. Create `dev-doc-quality-review.agent.md`

Lightweight review agent for documentation/schema stories. Checks:

```yaml
checks:
  - id: schema_validity
    description: "All YAML schemas parse correctly, no syntax errors"
  - id: cross_references
    description: "All file paths referenced in agent specs actually exist"
  - id: frontmatter_completeness
    description: "Required frontmatter fields present (created, updated, version, type)"
  - id: completion_signals
    description: "Agent files have exactly one completion signal section"
  - id: no_stale_artifact_refs
    description: "No references to eliminated artifacts (PROOF-*, ANALYSIS.md, DECISIONS.yaml, etc.)"
  - id: table_structure
    description: "Markdown tables have correct column counts and pipe alignment"
```

Output: `DOC-REVIEW.yaml` in `_implementation/` with findings and PASS/FAIL verdict.

### 3. Update `dev-documentation-leader.agent.md`

In the review gate step, branch on `story_type`:
- `code_*` or `mixed`: wait for `REVIEW.yaml` (existing code review output)
- `documentation` or `schema`: wait for `DOC-REVIEW.yaml` (new doc quality output)

### 4. Update `_shared/kb-integration.md`

Add `story_type` to the artifact reference table so agents know where to find it.

## Acceptance Criteria

- [ ] AC-1: `dev-code-review.md` reads `story_type` from story.yaml and routes to either full code review or doc quality review
- [ ] AC-2: `dev-doc-quality-review.agent.md` exists with the 6 quality checks listed above
- [ ] AC-3: Doc quality review outputs `DOC-REVIEW.yaml` with findings and PASS/FAIL verdict
- [ ] AC-4: `dev-documentation-leader` branches on `story_type` and reads the correct review output file
- [ ] AC-5: A `documentation`-type story successfully completes the review phase using `DOC-REVIEW.yaml` (not `REVIEW.yaml`)
- [ ] AC-6: A `code_*`-type story is unaffected — continues to use existing `REVIEW.yaml` pipeline

## Test Plan

- Create a minimal test story with `story_type: documentation` and verify it routes to doc quality review
- Create a minimal test story with `story_type: code_simple` and verify it routes to full code review
- Verify `DOC-REVIEW.yaml` is produced for the documentation story with all 6 checks populated
- Verify token savings: doc quality review should consume <10,000 tokens vs ~30,000 for full code review

## Evidence Source

RETRO pattern `deferred-003` from `DEFERRED-KB-WRITES.yaml` (2026-02-22 batch retro).
WORKFLOW-RECOMMENDATIONS.md Medium Priority #3.
Also supported by WKFL-007 observation (structural markdown bugs caught only by review — validates need for doc review, not elimination of it).
