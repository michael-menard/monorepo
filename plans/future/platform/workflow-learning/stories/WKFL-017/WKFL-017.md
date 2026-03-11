---
story_id: WKFL-017
title: Token Estimation Calibration by Story Type
status: backlog
created: 2026-02-22
updated: 2026-02-22
epic: WKFL
feature: Workflow Learning
type: feature
priority: high
source: workflow-retro-2026-02-22
---

# WKFL-017: Token Estimation Calibration by Story Type

## Context

Batch retrospective (2026-02-22) across 9 completed WKFL stories revealed that token estimates are systematically wrong for code-delivering stories:

| Story | Estimated | Actual | Variance |
|-------|-----------|--------|----------|
| WKFL-004 (Human Feedback Capture) | 30,000 | ~280,234 | +834% |
| WKFL-007 (Story Risk Predictor) | 45,000 | 111,638 | +148% |
| WKFL-010 (Improvement Proposal Generator) | 55,000 | ~156,300 | +184% |

Root cause: current estimates only capture a subset of phases. Elaboration alone frequently exceeds the full story estimate before implementation starts. Documentation-only stories (WKFL-001, WKFL-006) were accurate — the problem is isolated to stories that deliver executable TypeScript code.

## Goal

Create a token estimation calibration guide that provides story-type-specific multipliers, and update the PM story generation workflow to apply them automatically when sizing a story.

## Non-goals

- Building an automated token predictor (that is WKFL-002 / WKFL-007)
- Changing how tokens are logged (already fixed by P1-TOKEN)
- Retroactively correcting past OUTCOME.yaml estimates

## Scope

### 1. Create `.claude/docs/token-estimation.md`

A calibration reference read by PM workers during story sizing. Content:

```yaml
story_types:
  documentation:
    description: "Agent specs, schemas, markdown, config files — no TypeScript"
    examples: ["WKFL-001", "WKFL-006"]
    multiplier: 1.0
    typical_range: "20,000–60,000 tokens"

  schema:
    description: "Zod schemas, YAML schemas, type definitions only"
    multiplier: 1.2
    typical_range: "25,000–75,000 tokens"

  mixed:
    description: "Agent specs + supporting TypeScript utilities"
    examples: ["WKFL-008"]
    multiplier: 2.0
    typical_range: "50,000–120,000 tokens"

  code_simple:
    description: "CLI commands or single-module TypeScript, 1–3 ACs"
    multiplier: 4.0
    typical_range: "80,000–200,000 tokens"

  code_complex:
    description: "Agent + schema + CLI command + tests, 4–7 ACs"
    examples: ["WKFL-004", "WKFL-010"]
    multiplier: 6.0
    typical_range: "150,000–350,000 tokens"

  code_algorithmic:
    description: "Multi-phase algorithms, statistical models, integration pipelines"
    examples: ["WKFL-007"]
    multiplier: 8.0
    typical_range: "200,000–500,000 tokens"
```

### 2. Add `story_type` field to story.yaml schema

Extend `.claude/schemas/story-schema.md` with:

```yaml
story_type: documentation | schema | mixed | code_simple | code_complex | code_algorithmic
```

### 3. Update `pm-dev-feasibility-review.agent.md`

In the `dev_feasibility.yaml` output, have the agent:
- Classify the story into one of the 6 story types based on deliverables
- Read `.claude/docs/token-estimation.md` for the matching multiplier
- Output `estimated_tokens_calibrated` = base_estimate × multiplier

### 4. Update `pm-story-generation-leader.agent.md`

In Phase 4 synthesis, include calibrated token estimate in story frontmatter:

```yaml
estimated_tokens: 45000          # raw estimate
story_type: code_algorithmic     # classification
estimated_tokens_calibrated: 360000  # after multiplier
```

## Acceptance Criteria

- [ ] AC-1: `.claude/docs/token-estimation.md` exists with 6 story types, multipliers, examples, and typical ranges
- [ ] AC-2: `story_type` field added to story schema with valid enum values documented
- [ ] AC-3: `pm-dev-feasibility-review` classifies story type and outputs `estimated_tokens_calibrated` in dev-feasibility.yaml
- [ ] AC-4: `pm-story-generation-leader` includes `story_type` and `estimated_tokens_calibrated` in synthesized story frontmatter
- [ ] AC-5: At least one existing WKFL story (WKFL-011 or later) gets retroactively classified correctly when the guide is consulted manually

## Test Plan

- Manually run `/pm-story generate` for a new story and verify `story_type` and `estimated_tokens_calibrated` appear in frontmatter
- Verify the classification heuristic correctly identifies WKFL-004 as `code_complex` and WKFL-001 as `documentation`
- Verify `token-estimation.md` is readable and well-structured

## Evidence Source

RETRO pattern `deferred-001` from `DEFERRED-KB-WRITES.yaml` (2026-02-22 batch retro).
WORKFLOW-RECOMMENDATIONS.md High Priority #1.
