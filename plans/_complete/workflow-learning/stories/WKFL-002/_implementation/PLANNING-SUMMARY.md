# WKFL-002 Planning Summary

**Story**: WKFL-002 - Confidence Calibration
**Date**: 2026-02-07
**Status**: PLANNING COMPLETE

## Deliverables Created

### 1. PLAN.yaml (503 lines)

Comprehensive implementation plan with:

- **10 sequential steps** covering:
  1. Schema extension (KnowledgeEntryTypeSchema)
  2. CalibrationEntrySchema definition
  3. Tool handler validation updates
  4. Unit tests for schema
  5. confidence-calibrator.agent.md creation
  6. /calibration-report command creation
  7. /feedback integration (blocked by WKFL-004)
  8. Integration tests
  9. Agent logic tests
  10. E2E calibration flow test

- **8 files to change/create**:
  - Backend schema: `apps/api/knowledge-base/src/__types__/index.ts`
  - Tool handlers: `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts`
  - Tests: 3 new test files
  - Agent: `confidence-calibrator.agent.md`
  - Command: `/calibration-report.md`
  - Integration: `/feedback.md` update

- **5 quality commands**:
  - build, check-types, lint, test, e2e

- **7 acceptance criteria mapped** to evidence plan

- **4 architectural decisions** documented:
  - New entry type vs tags (chose new entry type)
  - Threshold storage (deferred to WKFL-003)
  - OUTCOME.yaml integration (deferred)
  - Sample size thresholds (5 for reporting, 10 for alerts)

### 2. KNOWLEDGE-CONTEXT.yaml (403 lines)

Rich knowledge context including:

- **5 pattern categories**:
  - KB schema extensions
  - KB tool handlers
  - Agent patterns (workflow-retro)
  - Command patterns (/feedback)
  - Calibration analysis flow

- **4 lessons learned**:
  - KB integration (WKFL-001)
  - Feedback schema (WKFL-004)
  - MCP tools (KNOW-0051)
  - KB search (KNOW-0052)

- **3 ADRs referenced**:
  - Zod-first types
  - KB entry type strategy
  - Workflow learning data flow

- **Import patterns, schema references, test patterns**

- **Outcome mapping** (feedback type → calibration outcome)

- **Tag conventions** for efficient querying

- **Threshold values** (90% accuracy, 5/10 sample sizes)

- **Report format** structure

- **Reality baseline** and integration points

## Key Implementation Insights

### Phasing Strategy

The plan enables parallel work where possible:

- **Phase 1-3**: Backend schema and tests (independent)
- **Phase 4-6**: Agent and command creation (independent)
- **Phase 7**: Feedback integration (BLOCKED by WKFL-004)
- **Phase 8-10**: Integration and E2E tests (after WKFL-004)

### Dependency Management

- **WKFL-004 (Human Feedback Capture)** is MVP-blocking for full integration
- Steps 1-6 can proceed while WKFL-004 is in progress
- Step 7 (feedback integration) requires WKFL-004 completion
- E2E test requires both schema and feedback command to be complete

### Schema Design

CalibrationEntrySchema follows FeedbackContentSchema pattern:

```typescript
{
  agent_id: string (min 1)
  finding_id: string (regex: /^[A-Z]+-\d+$/)
  story_id: string (regex: /^[A-Z]+-\d+$/)
  stated_confidence: enum('high', 'medium', 'low')
  actual_outcome: enum('correct', 'false_positive', 'severity_wrong')
  timestamp: string (ISO 8601 datetime)
}
```

### Agent Architecture

confidence-calibrator.agent.md:

- **Model**: haiku (simple aggregation, no complex reasoning)
- **Type**: worker
- **KB Tools**: kb_search, kb_add_lesson
- **Phases**: Setup → Query → Analyze → Report
- **Output**: CALIBRATION-{date}.yaml

### Outcome Mapping

Feedback type → Calibration outcome:

- `false_positive` → `false_positive`
- `severity_wrong` → `severity_wrong`
- `helpful` → `correct`
- `missing` → skip (no calibration entry)

### Tag Strategy

Calibration entries tagged with:

- `calibration` (entry type)
- `agent:{agent_id}` (e.g., `agent:code-review-security`)
- `confidence:{level}` (e.g., `confidence:high`)
- `outcome:{result}` (e.g., `outcome:false_positive`)
- `date:{YYYY-MM}` (e.g., `date:2026-02`)

Enables efficient querying and time-series analysis.

### Alert Logic

Alert triggered when:

- Confidence level = `high`
- Accuracy < 0.90 (90%)
- Sample size >= 10

Recommendations generated when accuracy below target.

## Files Created

1. `/Users/michaelmenard/Development/Monorepo/plans/future/workflow-learning/in-progress/WKFL-002/_implementation/PLAN.yaml`
2. `/Users/michaelmenard/Development/Monorepo/plans/future/workflow-learning/in-progress/WKFL-002/_implementation/KNOWLEDGE-CONTEXT.yaml`

## Next Steps

1. Review PLAN.yaml and KNOWLEDGE-CONTEXT.yaml with stakeholders
2. Begin implementation with Steps 1-3 (schema updates)
3. Create confidence-calibrator.agent.md (Steps 5-6)
4. Wait for WKFL-004 completion
5. Implement feedback integration (Step 7)
6. Complete E2E testing (Step 10)

---

**Signal**: PLANNING COMPLETE
