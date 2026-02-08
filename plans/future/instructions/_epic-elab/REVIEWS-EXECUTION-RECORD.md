# INST Epic Reviews Phase - Execution Record

**Date**: 2026-02-05
**Time**: 21:15 UTC
**Feature**: MOC Instructions (INST)
**Phase**: Reviews Elaboration
**Status**: Execution Ready

---

## Execution Summary

The reviews phase has been configured and is ready to spawn 6 parallel specialist agents to analyze the INST epic from multiple stakeholder perspectives.

### Key Milestone: TEST MANDATE ENFORCEMENT

**Critical User Requirement Captured**:
The user emphasized that every story MUST require:
1. Unit tests (Vitest + React Testing Library)
2. Integration tests (Vitest + MSW)
3. Playwright + Cucumber E2E tests

This requirement has been:
- Embedded in the QA review agent instructions
- Configured as MVP-critical enforcement
- Will be flagged as blocking if any story is missing this 3-part test strategy
- Aggregator will surface all test gaps as MVP blockers

---

## Setup Completed

### 1. QA Agent Enhanced
**File**: `/Users/michaelmenard/Development/Monorepo/.claude/agents/elab-epic-qa.agent.md`

Changes made:
- Added explicit test mandate to MVP-Critical Definition section
- Added `test_strategy_complete` flag to testability output
- Emphasized enforcement: "All stories must define unit, integration, AND Playwright+Cucumber E2E tests"
- Configured to flag missing test strategies as MVP-critical blockers

**Before**:
```yaml
## MVP-Critical Definition

An issue is **MVP-critical** ONLY if it **blocks the core user journey**:
- Core happy path is untestable
- No way to verify core functionality works
- Missing test infrastructure for core flow
```

**After**:
```yaml
## MVP-Critical Definition

An issue is **MVP-critical** ONLY if it **blocks the core user journey**:
- Core happy path is untestable
- No way to verify core functionality works
- Missing test infrastructure for core flow
- **TEST MANDATE: Every story MUST have unit tests, integration tests, AND Playwright+Cucumber E2E tests**
```

### 2. Reviews Phase Documentation
**File**: `/Users/michaelmenard/Development/Monorepo/plans/future/instructions/_epic-elab/REVIEWS-PHASE-SETUP.md`

Comprehensive documentation created including:
- Full configuration (inputs, outputs, worker details)
- Test mandate policy and enforcement approach
- Success criteria and completion signals
- Monitoring and troubleshooting guidance
- Next phase (aggregation) requirements

### 3. Checkpoint Updated
**File**: `/Users/michaelmenard/Development/Monorepo/plans/future/instructions/_epic-elab/CHECKPOINT.md`

Phase progression recorded:
- `reviews: pending` → `reviews: in_progress`
- Timestamp: `2026-02-05T21:15:00Z`
- Resume point: Phase 2 (aggregation)

---

## Parallel Review Workers Configuration

| # | Perspective | Agent | Focus | Output File |
|---|-------------|-------|-------|-------------|
| 1 | Engineering | elab-epic-engineering | Architecture, feasibility, deps | REVIEW-engineering.yaml |
| 2 | Product | elab-epic-product | User value, PRD alignment, scope | REVIEW-product.yaml |
| 3 | QA ★ | elab-epic-qa | Testability, **test mandate**, MVP gaps | REVIEW-qa.yaml |
| 4 | UX | elab-epic-ux | Design, accessibility, UX flow | REVIEW-ux.yaml |
| 5 | Platform | elab-epic-platform | Infrastructure, scale, ops | REVIEW-platform.yaml |
| 6 | Security | elab-epic-security | Threats, compliance, data protection | REVIEW-security.yaml |

**Execution Model**: All 6 agents run in parallel
**Expected Duration**: 15-20 minutes
**Output Location**: `plans/future/instructions/_epic-elab/`

### QA Agent - Special Role

The QA agent has been specially configured to:
1. **Enforce test mandate** - Flag any story missing unit + integration + E2E tests
2. **Validate test strategy** - Ensure acceptance criteria include clear test requirements
3. **Surface blockers** - Mark test gaps as MVP-critical if they prevent verification of core functionality

QA verdicts will carry special weight in aggregation phase because they protect the critical user requirement.

---

## Input Configuration

**Feature**: MOC Instructions (INST)
**Directory**: `plans/future/instructions`
**Prefix**: `INST`
**Story Count**: 18 total
  - Phase 0 (Foundation): 6 stories
  - Phase 1 (Edit Backend): 3 stories
  - Phase 2 (Edit Frontend): 7 stories
  - Phase 3 (Testing & Validation): 2 stories

**Stories Status Distribution**:
- Ready for Review: 4 (INST-1000, INST-1003, INST-1005, INST-1010)
- In Progress: 1 (INST-1002)
- Draft: 12
- Approved: 1 (INST-1029)

---

## Expected Outputs

### Individual Review Files
Each agent produces YAML file: `REVIEW-<perspective>.yaml`

**Structure**:
```yaml
perspective: <name>
verdict: READY | CONCERNS | BLOCKED

testability:
  core_journey_testable: true|false
  test_strategy_complete: true|false  # QA-specific

mvp_blockers:
  - id: <perspective>-001
    issue: "description"
    stories: [INST-XXX, ...]
    action: "fix required"

missing_mvp_stories:
  - title: "story needed"
    reason: "why blocking"

future:
  suggestions: [...]
  recommendations: [...]
```

### Aggregated Summary
**File**: `REVIEWS-SUMMARY.yaml` (created after all 6 complete)

Contents:
- Roll-up of all verdicts
- Cross-perspective blockers identified
- Top MVP-critical issues prioritized
- Recommendations for refinement

---

## Success Criteria

### Reviews Phase Complete When
- [ ] All 6 agents return YAML outputs to `_epic-elab/`
- [ ] All 6 completion signals received
- [ ] No critical parsing errors in YAML
- [ ] CHECKPOINT.md updated to mark reviews complete

### Test Mandate Verification
- [ ] QA agent flags stories missing unit tests
- [ ] QA agent flags stories missing integration tests
- [ ] QA agent flags stories missing E2E tests
- [ ] All test gaps appear in QA blockers section
- [ ] Aggregator surfaces test gaps prominently

### Verdict Consolidation
- [ ] Engineering verdict recorded
- [ ] Product verdict recorded
- [ ] QA verdict recorded (with test emphasis)
- [ ] UX verdict recorded
- [ ] Platform verdict recorded
- [ ] Security verdict recorded
- [ ] Cross-perspective conflicts identified

---

## Phase Workflow

```
┌─────────────────────────────────────────────────────────────┐
│ SETUP COMPLETE (current)                                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ REVIEWS PHASE (starting)                                    │
│                                                             │
│ Spawn 6 parallel agents:                                    │
│  ✓ Engineering    → REVIEW-engineering.yaml               │
│  ✓ Product        → REVIEW-product.yaml                   │
│  ✓ QA (test mode) → REVIEW-qa.yaml (with test mandate)    │
│  ✓ UX             → REVIEW-ux.yaml                        │
│  ✓ Platform       → REVIEW-platform.yaml                  │
│  ✓ Security       → REVIEW-security.yaml                  │
│                                                             │
│ Wait for all 6 completion signals                          │
│ Duration: ~15-20 minutes                                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ AGGREGATION PHASE (after reviews)                          │
│                                                             │
│ elab-epic-aggregation-leader:                              │
│  - Read all 6 REVIEW-*.yaml files                          │
│  - Identify cross-perspective conflicts                    │
│  - Prioritize MVP-critical issues                          │
│  - Create REVIEWS-SUMMARY.yaml                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ INTERACTIVE REFINEMENT (if needed)                         │
│ UPDATES (final artifacts)                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Monitoring Instructions

### Monitor Reviews Progress
```bash
# Check if reviews output files exist
ls -la plans/future/instructions/_epic-elab/REVIEW-*.yaml

# Expected files after completion:
# - REVIEW-engineering.yaml
# - REVIEW-product.yaml
# - REVIEW-qa.yaml
# - REVIEW-ux.yaml
# - REVIEW-platform.yaml
# - REVIEW-security.yaml
```

### Verify Test Mandate Enforcement
Look for in `REVIEW-qa.yaml`:
- `mvp_blockers` section contains test-related issues
- `test_strategy_complete: false` for any stories lacking 3-part tests
- Stories without unit/integration/E2E tests flagged explicitly

### Trigger Next Phase
Once all 6 REVIEW-*.yaml files exist:
- Aggregation phase automatically runs
- Creates `REVIEWS-SUMMARY.yaml`
- Updates `CHECKPOINT.md` to next phase

---

## Files Modified/Created

### Modified Files
1. `.claude/agents/elab-epic-qa.agent.md`
   - Added test mandate to MVP-Critical Definition
   - Added test_strategy_complete flag
   - Emphasized enforcement in output format

2. `plans/future/instructions/_epic-elab/CHECKPOINT.md`
   - Updated phase: reviews → in_progress
   - Added timestamp and resume point

### Created Files
1. `plans/future/instructions/_epic-elab/REVIEWS-PHASE-SETUP.md`
   - Comprehensive phase configuration (8.6KB)
   - Test mandate policy documented
   - Success criteria and monitoring guidance

2. `plans/future/instructions/_epic-elab/REVIEWS-EXECUTION-RECORD.md` (this file)
   - Execution summary and setup verification
   - Configuration details
   - Monitoring instructions

### Files to be Created (by review agents)
1. `REVIEW-engineering.yaml` - Engineering perspective
2. `REVIEW-product.yaml` - Product perspective
3. `REVIEW-qa.yaml` - QA perspective (with test mandate)
4. `REVIEW-ux.yaml` - UX perspective
5. `REVIEW-platform.yaml` - Platform perspective
6. `REVIEW-security.yaml` - Security perspective
7. `REVIEWS-SUMMARY.yaml` - Aggregated results

---

## Critical Dependencies

### Stories with Dependencies
- INST-1000: Blocked by INST-1002 (In Progress)
- INST-1003: No blockers (Ready for Review)
- INST-1004: Blocked by INST-1003
- INST-1005: Blocked by INST-1003, INST-1004
- INST-1010: Blocked by INST-1009
- Others: Mostly draft, dependencies TBD

### Critical Path (13 stories)
```
INST-1003 → INST-1004 → INST-1005 → INST-1008 → INST-1009 → INST-1010
  → INST-1011 → INST-1012 → INST-1013 → INST-1014 → INST-1015 → INST-1028 → INST-1029
```

### Parallel Work Streams
- **Stream A**: Edit flow (INST-1008-1015)
- **Stream B**: Delete flow (INST-1016-1027)
- Can execute after Phase 0 foundation completes

---

## Important Notes

### Test Mandate Enforcement
This is the most critical feature for this epic. The user explicitly stated that EVERY story must have unit, integration, AND Playwright+Cucumber E2E tests. This requirement:
- Has been encoded into the QA agent
- Will be actively enforced during review
- Will surface as MVP blockers if missing
- Protects against inadequate test coverage

### Why Test Enforcement Matters
- Instructions feature is core to platform
- Users can lose work (interrupted uploads, unsaved changes)
- Requires comprehensive test coverage (unit → integration → E2E)
- Cucumber feature files provide executable specification
- Missing any layer (unit/integration/E2E) is a gap

### Aggregator Role
The aggregation phase will:
1. Read all 6 perspective reviews
2. Identify conflicts (e.g., QA blocker vs Engineering READY)
3. Weight test mandate violations heavily
4. Recommend story refinements based on review findings
5. Create consolidated REVIEWS-SUMMARY.yaml

---

## Task Tracking

**Task #1**: Execute reviews phase for INST epic elaboration
- **Status**: IN_PROGRESS
- **Owner**: elab-epic-reviews-leader (haiku model)
- **Expected Duration**: 15-20 minutes
- **Completion**: When all 6 REVIEW-*.yaml files exist + signals received

---

## Next Actions

1. **Monitor** for REVIEW-*.yaml file creation
2. **Verify** all 6 agents complete successfully
3. **Check** QA output specifically for test mandate enforcement
4. **Trigger aggregation** once all reviews complete
5. **Review REVIEWS-SUMMARY.yaml** for consolidated findings
6. **Act on MVP blockers** identified in aggregated review

---

## Execution Status

**SETUP**: ✓ COMPLETE
**READY TO SPAWN**: Yes
**TEST MANDATE ENFORCEMENT**: ✓ ACTIVE
**EXPECTED TIMELINE**: ~40-60 minutes total (reviews + aggregation)

Next: Monitor for review agent completion signals.

---

**Document**: REVIEWS-EXECUTION-RECORD.md
**Created**: 2026-02-05 21:15 UTC
**Status**: Execution Ready
