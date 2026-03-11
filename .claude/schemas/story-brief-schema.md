---
created: 2026-03-08
updated: 2026-03-08
version: 1.0.0
doc_type: schema
story_id: WINT-4150
---

# story-brief.md Schema

Golden reference schema for story brief artifacts produced during elaboration. Story briefs distill a story's intent, scope, and acceptance criteria into a structured markdown document that agents can consume without reading the full story file.

---

## Overview

`story-brief.md` is an optional elaboration artifact written to `{FEATURE_DIR}/elaboration/{STORY_ID}/_implementation/story-brief.md`. It provides a compressed, structured summary of the story for use by agents that need key facts without the full narrative context.

This document complements `ELAB.yaml` by providing human-readable summary alongside the machine-readable elaboration record.

---

## Schema Definition

```markdown
# Story Brief: {STORY_ID}

## Title
{story title — single line}

## Goal
{1-3 sentence description of what this story achieves and why}

## Acceptance Criteria
- AC-1: {description}
- AC-2: {description}
...

## Scope
- **Surfaces touched**: backend | frontend | packages | db | contracts | ui | infra
- **Risk flags**: auth | payments | migrations | external_apis | security | performance (list applicable)
- **Story type**: feature | bug | infra | docs | refactor

## Key Constraints
{Bullet list of non-negotiable constraints, limits, or invariants}

## Out of Scope
{Explicit list of what this story does NOT do — prevents scope creep}

## Dependencies
- **Blocks**: {list story IDs this story blocks, or "none"}
- **Blocked by**: {list story IDs blocking this story, or "none"}

## Notes
{Optional — any additional context, architectural decisions, or warnings}
```

---

## Field Descriptions

### Required Fields

| Field | Description |
|-------|-------------|
| `Title` | The story title, matching the story file frontmatter `title` field |
| `Goal` | 1-3 sentences explaining the user/system value delivered |
| `Acceptance Criteria` | Numbered list matching the story file's AC list |
| `Scope` | Surfaces touched and risk flags — maps to SCOPE.yaml fields |
| `Key Constraints` | Hard limits enforced by the story (e.g., max array sizes, literal schema versions) |
| `Out of Scope` | Explicit exclusions to prevent agent scope creep |

### Optional Fields

| Field | Description |
|-------|-------------|
| `Dependencies` | Story dependency chain — only needed when blocking relationships exist |
| `Notes` | Architectural decisions, warnings, or context that doesn't fit other sections |

---

## Lifecycle

```
elab-analyst (or elab-completion-leader)
  → writes story-brief.md alongside ELAB.yaml
  → distills story content into structured brief

dev-setup-leader
  → reads story-brief.md instead of full story file (token optimization)

dev-plan-leader
  → reads story-brief.md for AC list and constraints

dev-execute-leader
  → reads story-brief.md for AC-to-evidence mapping context
```

---

## Example

```markdown
# Story Brief: WINT-4150

## Title
Standardize Elab Output Artifacts — Define Schemas and Enforce at Elab-Complete Gate

## Goal
Define Zod schemas for the 7 elab output artifacts (gaps, cohesion-findings, scope-challenges,
mvp-slice, final-scope, evidence-expectations, user-flows re-export) so agents have a validated
contract for what elaboration produces. Add a soft validation gate to elab-completion-leader
that warns (does not block) when artifacts are missing.

## Acceptance Criteria
- AC-1: GapsSchema defined in gaps.ts with blocking/non-blocking split
- AC-2: CohesionFindingsSchema defined with max(5) findings, max(2) blocking
- AC-3: UserFlowsSchema re-exported from artifacts/index.ts
- AC-4: ScopeChallengesSchema defined with max(5) challenges and recommendation enum
- AC-5: MvpSliceSchema defined with included_acs, excluded_acs, rationale
- AC-6: FinalScopeSchema defined using z.literal('1.0') schema_version
- AC-7: EvidenceExpectationsSchema defined with expectations array
- AC-8: story-brief-schema.md documentation written
- AC-9: All 7 schemas exported from artifacts/index.ts
- AC-10: elab-completion-leader updated with soft artifact gate (warn, do not block)
- AC-11: All schema files have unit test coverage (valid parse, constraint violation, factory output)

## Scope
- **Surfaces touched**: packages
- **Risk flags**: none
- **Story type**: feature

## Key Constraints
- CohesionFindingsSchema: max 5 findings, max 2 blocking_findings
- ScopeChallengesSchema: max 5 challenges
- FinalScopeSchema: schema_version must be z.literal('1.0') — not z.string()
- All index.ts exports must use .js extension (ESM)
- elab-completion-leader gate must warn, never block (graceful degradation for pre-WINT-4150 elabs)

## Out of Scope
- Implementing the agents that produce these artifacts (separate stories)
- Migrating existing ELAB.yaml files to include new artifact fields
- E2E tests (pure schema definitions — unit tests only)
- Modifying the ELAB.yaml schema itself

## Dependencies
- **Blocks**: WINT-4160 (agents that consume these schemas)
- **Blocked by**: none

## Notes
UserFlowsSchema already exists in packages/backend/orchestrator/src/artifacts/__types__/user-flows.ts —
AC-3 is a re-export only, no new schema file needed.
```

---

## Validation Rules

1. `Title` must match the story file frontmatter `title` field exactly
2. `Acceptance Criteria` list must include all ACs from the story file (no omissions)
3. `Scope.Surfaces touched` values must match SCOPE.yaml `touches` field names
4. `Key Constraints` must include any hard limits mentioned in ACs (max sizes, literal values, etc.)
5. `Out of Scope` must list at least one explicit exclusion

---

## Integration Points

### Producers

| Agent | Action |
|-------|--------|
| `elab-analyst.agent.md` | Optionally creates story-brief.md during analysis phase |
| `elab-completion-leader.agent.md` | Creates story-brief.md if not present before finalization |

### Consumers

| Agent | Usage |
|-------|-------|
| `dev-setup-leader.agent.md` | Reads story-brief.md to understand story scope without full file |
| `dev-plan-leader.agent.md` | Reads story-brief.md for AC list and constraint extraction |
| `dev-execute-leader.agent.md` | Reads story-brief.md for AC-to-evidence mapping context |

---

## Changelog

### Version 1.0.0 (2026-03-08 — WINT-4150)
- Initial golden reference schema
- Defines required and optional sections
- Provides lifecycle documentation and example
