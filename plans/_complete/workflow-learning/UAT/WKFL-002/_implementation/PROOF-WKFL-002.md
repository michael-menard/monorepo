# Proof of Implementation: WKFL-002 (Confidence Calibration)

## Summary

WKFL-002 implements a confidence calibration tracking system that links agent stated confidence levels to actual outcomes, computes accuracy metrics, and generates threshold adjustment recommendations.

## Deliverables

### 1. Calibration Entry Schema (AC-1)

**File:** `apps/api/knowledge-base/src/__types__/index.ts`

- Added `'calibration'` to `KnowledgeEntryTypeSchema` enum
- Created `ConfidenceLevelSchema`: `z.enum(['high', 'medium', 'low'])`
- Created `ActualOutcomeSchema`: `z.enum(['correct', 'false_positive', 'severity_wrong'])`
- Created `CalibrationEntrySchema` with fields: agent_id, finding_id, story_id, stated_confidence, actual_outcome, timestamp
- All schemas exported with inferred TypeScript types

### 2. Calibration Schema Unit Tests (AC-1)

**File:** `apps/api/knowledge-base/src/__types__/__tests__/calibration-schema.test.ts`

- 25 tests passing covering:
  - Valid entry validation (high/medium/low confidence, all outcomes)
  - Required field validation (8 tests for missing/empty fields)
  - Enum validation (confidence levels and actual outcomes)
  - Edge cases (special characters, long IDs, non-standard formats)
  - Independent schema tests (ConfidenceLevelSchema, ActualOutcomeSchema)

### 3. Confidence-Calibrator Agent (AC-3, AC-4, AC-5, AC-7)

**File:** `.claude/agents/confidence-calibrator.agent.md`

- Model: haiku (simple aggregation, no complex reasoning)
- Type: worker
- KB tools: kb_search, kb_add_lesson
- 4-phase execution: Setup → Query → Analyze → Report
- Accuracy computation: correct / total per (agent_id, stated_confidence)
- Alert generation: high confidence < 90% with 10+ samples
- Recommendation generation: conceptual threshold adjustments
- Systemic issue detection: patterns across 3+ agents

### 4. Calibration Report Command (AC-6)

**File:** `.claude/commands/calibration-report.md`

- Command: `/calibration-report [--since=YYYY-MM-DD] [--agent=NAME]`
- Default: last 7 days, all agents
- Spawns confidence-calibrator agent
- Output: `CALIBRATION-{date}.yaml` with summary, accuracy, alerts, recommendations

### 5. Feedback Integration (AC-2)

**File:** `.claude/commands/feedback.md`

- Added Step 5b: calibration entry creation after feedback capture
- Outcome mapping: false_positive → false_positive, severity_wrong → severity_wrong, helpful → correct, missing → skip
- Validates with CalibrationEntrySchema before writing to KB
- Tags: calibration, agent:{name}, confidence:{level}, outcome:{type}, date:{YYYY-MM}

## Test Results

| Suite | Pass | Fail | Notes |
|-------|------|------|-------|
| Calibration Schema Unit Tests | 25 | 0 | Full coverage of schema validation |
| Existing Schema Tests | 122 | 0 | No regressions from calibration changes |
| Pre-existing Failures | - | 3 | Zod v4 compat in story-schemas (unrelated) |

## Architectural Decisions

1. **New entry type** over tag-based approach: cleaner separation, explicit validation
2. **Conceptual recommendations** over explicit thresholds: deferred to WKFL-003
3. **Feedback-only** outcome source: cleaner signal than OUTCOME.yaml for MVP
4. **5/10 sample thresholds**: 5 for reporting, 10 for alerts/recommendations

## AC Verification Matrix

| AC | Status | Evidence |
|----|--------|----------|
| AC-1: Schema captures all fields | PASS | Schema + 25 unit tests |
| AC-2: Feedback integration | PASS | feedback.md Step 5b with outcome mapping |
| AC-3: Agent analyzes accuracy | PASS | confidence-calibrator.agent.md Phase 3 |
| AC-4: Alert below 90% | PASS | Agent alert logic with 10-sample minimum |
| AC-5: Threshold recommendations | PASS | Agent recommendation generation logic |
| AC-6: /calibration-report command | PASS | calibration-report.md with args |
| AC-7: Haiku model | PASS | Agent frontmatter: model: haiku |
