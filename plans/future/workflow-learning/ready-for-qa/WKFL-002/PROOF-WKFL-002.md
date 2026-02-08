# PROOF-WKFL-002: Confidence Calibration

**Date**: 2026-02-08
**Story**: WKFL-002
**Status**: COMPLETE

## Summary

Successfully implemented the confidence calibration system for tracking agent stated confidence vs actual outcomes. The system enables data-driven threshold adjustment recommendations per agent per confidence level.

## Deliverables

### 1. Schema Changes (Backend)

**File**: `apps/api/knowledge-base/src/__types__/index.ts`

- Added `'calibration'` to `KnowledgeEntryTypeSchema` enum
- Created `ConfidenceLevelSchema` (high/medium/low)
- Created `ActualOutcomeSchema` (correct/false_positive/severity_wrong)
- Created `CalibrationEntrySchema` with 6 fields:
  - `agent_id` - Agent that generated the finding
  - `finding_id` - Finding ID from VERIFICATION.yaml (regex: ^[A-Z]+-\d+$)
  - `story_id` - Story context (regex: ^[A-Z]+-\d+$)
  - `stated_confidence` - Confidence level from agent
  - `actual_outcome` - Outcome from feedback
  - `timestamp` - ISO 8601 datetime

### 2. Unit Tests

**File**: `apps/api/knowledge-base/src/__types__/__tests__/calibration-schema.test.ts`

- 26 test cases covering:
  - Valid entry acceptance
  - Required field validation
  - Enum value validation (confidence levels, outcomes)
  - ID format regex validation
  - Timestamp format validation
  - Edge cases

### 3. Confidence-Calibrator Agent

**File**: `.claude/agents/confidence-calibrator.agent.md`

- **Model**: haiku (simple aggregation, cost-effective)
- **Type**: worker
- **KB Tools**: kb_search, kb_add_lesson
- **5-Phase Execution**:
  1. Setup - Parse args, validate date range
  2. Query - Fetch calibration entries from KB
  3. Aggregate - Group by (agent, confidence), compute accuracy
  4. Report - Generate CALIBRATION-{date}.yaml
  5. Log - Write systemic issues to KB

**Key Logic**:
- Accuracy = correct / total per (agent, confidence_level)
- Alert threshold: 0.90 for high confidence
- Min samples: 5 for reporting, 10 for alerts
- Systemic pattern: 3+ agents with same issue

### 4. Calibration Report Command

**File**: `.claude/commands/calibration-report.md`

- **Usage**: `/calibration-report [--since=YYYY-MM-DD] [--until=YYYY-MM-DD] [--agent=NAME]`
- **Default**: Last 7 days, all agents
- **Output**: `CALIBRATION-{date}.yaml` with sections:
  - Summary (date range, agents covered, total findings)
  - Accuracy by agent by confidence level
  - Alerts (agents below threshold)
  - Recommendations (threshold adjustments)

### 5. Feedback Integration

**File**: `.claude/commands/feedback.md` (modified)

- Added Step 5.5: Create calibration entry after feedback entry
- Outcome mapping:
  - `helpful` → `correct`
  - `false_positive` → `false_positive`
  - `severity_wrong` → `severity_wrong`
  - `missing` → (skip, no calibration entry)

## Acceptance Criteria Verification

| AC | Description | Status | Evidence |
|----|-------------|--------|----------|
| AC-1 | Schema captures all required fields | PASS | CalibrationEntrySchema with 6 fields + 26 unit tests |
| AC-2 | Compute accuracy per agent per confidence level | PASS | Phase 3 in agent implements grouping and accuracy calculation |
| AC-3 | Alert when high accuracy drops below 90% | PASS | Alert logic with 0.90 threshold and 10-sample minimum |
| AC-4 | Generate threshold adjustment recommendations | PASS | Recommendations section with priority levels |
| AC-5 | Weekly report from /calibration-report | PASS | Command spawns agent, produces CALIBRATION-{date}.yaml |

## Quality Gates

| Check | Status |
|-------|--------|
| TypeScript Build | PASS |
| Type Check | PASS |
| Unit Tests | PASS (26/26) |
| Lint | PASS |
| E2E Tests | EXEMPT (infrastructure story) |

## Architectural Decisions

1. **New Entry Type**: Added 'calibration' to enum (cleaner than tags-only approach)
2. **Threshold Storage**: Deferred to WKFL-003 (MVP uses conceptual recommendations)
3. **Outcome Source**: Feedback only (OUTCOME.yaml integration deferred)
4. **Sample Sizes**: 5 for reporting, 10 for alerts (prevents noise from small samples)

## Integration Points

- **WKFL-004**: `/feedback` command now creates calibration entries
- **WKFL-003**: Will consume calibration data for threshold evolution
- **WKFL-010**: Will use calibration gaps for improvement proposals

## Files Changed

| File | Action | Lines |
|------|--------|-------|
| `apps/api/knowledge-base/src/__types__/index.ts` | Modified | +70 |
| `apps/api/knowledge-base/src/__types__/__tests__/calibration-schema.test.ts` | Created | 431 |
| `.claude/agents/confidence-calibrator.agent.md` | Created | 650 |
| `.claude/commands/calibration-report.md` | Created | 550 |
| `.claude/commands/feedback.md` | Modified | +60 |

## Next Steps

1. Move story to `ready-for-qa`
2. QA verification of agent behavior with mock calibration data
3. Integration testing when sufficient calibration entries exist

---

**Implementation Complete**: 2026-02-08
