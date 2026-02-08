# INST Epic Reviews Phase Setup

**Timestamp**: 2026-02-05T21:10:00Z
**Status**: Ready for Parallel Execution
**Feature**: MOC Instructions (INST)
**Story Count**: 18
**Review Perspectives**: 6

---

## Overview

The reviews phase spawns 6 parallel specialist agents to analyze the INST epic from multiple perspectives. This document captures the setup, configuration, and critical requirements for this phase.

## Phase Sequence

```
Setup (COMPLETE)
    ↓
Reviews (STARTING) ← YOU ARE HERE
    ↓
Aggregation
    ↓
Interactive Refinement
    ↓
Updates
```

## Configuration

### Inputs
- **Feature Directory**: `plans/future/instructions`
- **Prefix**: `INST`
- **Stories Index**: `plans/future/instructions/stories.index.md`
- **AGENT-CONTEXT**: `plans/future/instructions/_epic-elab/AGENT-CONTEXT.md`

### Story Scope
- **Phase 0**: Foundation (6 stories: INST-1000-1004, INST-1008)
- **Phase 1**: Edit Backend (3 stories: INST-1005-1007)
- **Phase 2**: Edit Frontend (7 stories: INST-1009-1015)
- **Phase 3**: Testing & Validation (2 stories: INST-1028-1029)

### Quality Metrics
- **Total stories**: 18
- **Ready for Review**: 4 (INST-1000, INST-1003, INST-1005, INST-1010)
- **In Progress**: 1 (INST-1002)
- **Draft**: 12
- **Approved**: 1 (INST-1029)

---

## Review Workers (Parallel Execution)

### 1. Engineering Review
**Agent**: `elab-epic-engineering.agent.md`
**Focus**: Architecture, feasibility, blocking technical dependencies
**MVP-Critical Criteria**:
- Architecture prevents core functionality
- Core feature not feasible as designed
- Blocking technical dependency missing

**Expected Output**: `REVIEW-engineering.yaml`
**Completion Signal**: `ENGINEERING REVIEW COMPLETE`

---

### 2. Product Review
**Agent**: `elab-epic-product.agent.md`
**Focus**: User value, PRD alignment, scope validity
**MVP-Critical Criteria**:
- User journey blocked by missing capability
- PRD requirements not met
- Scope creep threatens MVP delivery

**Expected Output**: `REVIEW-product.yaml`
**Completion Signal**: `PRODUCT REVIEW COMPLETE`

---

### 3. QA Review
**Agent**: `elab-epic-qa.agent.md`
**Focus**: Testability, MVP-critical test gaps, **TEST MANDATE ENFORCEMENT**
**MVP-Critical Criteria**:
- Core happy path is untestable
- No way to verify core functionality works
- Missing test infrastructure for core flow
- **CRITICAL: Any story missing unit + integration + E2E tests is a blocker**

**Test Mandate** (User Requirement):
Every story MUST specify:
1. Unit tests (Vitest/RTL)
2. Integration tests (Vitest)
3. Playwright + Cucumber E2E tests

**Expected Output**: `REVIEW-qa.yaml`
**Completion Signal**: `QA REVIEW COMPLETE`

---

### 4. UX Review
**Agent**: `elab-epic-ux.agent.md`
**Focus**: Design consistency, accessibility, user journey flow
**MVP-Critical Criteria**:
- User flow has critical usability gaps
- Accessibility blocks legal compliance
- Design inconsistencies break brand

**Expected Output**: `REVIEW-ux.yaml`
**Completion Signal**: `UX REVIEW COMPLETE`

---

### 5. Platform Review
**Agent**: `elab-epic-platform.agent.md`
**Focus**: Infrastructure, scalability, operational readiness
**MVP-Critical Criteria**:
- Infrastructure cannot support expected load
- Operational burden blocks deployment
- Scaling bottleneck in core flow

**Expected Output**: `REVIEW-platform.yaml`
**Completion Signal**: `PLATFORM REVIEW COMPLETE`

---

### 6. Security Review
**Agent**: `elab-epic-security.agent.md`
**Focus**: Threat analysis, compliance, data protection
**MVP-Critical Criteria**:
- Critical vulnerability prevents safe deployment
- Auth/authz broken for core flow
- Data exposure in core functionality

**Expected Output**: `REVIEW-security.yaml`
**Completion Signal**: `SECURITY REVIEW COMPLETE`

---

## Critical Mandate: Testing Requirements

**SOURCE**: User directive (highest priority for this feature)

### Policy
Every story in INST epic MUST require:
1. **Unit Tests** - Component/function level (Vitest + React Testing Library)
2. **Integration Tests** - Feature/API integration (Vitest + MSW)
3. **Playwright + Cucumber E2E Tests** - Full user journey validation

### Enforcement
- QA agent will flag ANY story missing this three-part test strategy as **MVP-CRITICAL BLOCKER**
- Stories without clear test requirements in acceptance criteria are incomplete
- Test strategy must be captured in story's "Testing" section before elaboration sign-off

### Rationale
- Instructions feature is core to platform
- User can lose work (upload interruption, unsaved changes)
- Must have complete test coverage (unit → integration → E2E)
- Cucumber feature files provide executable specification

---

## Expected Outputs

### Individual Review Files
Each worker writes YAML to: `plans/future/instructions/_epic-elab/REVIEW-<perspective>.yaml`

#### File Structure
```yaml
perspective: <perspective-name>
verdict: READY | CONCERNS | BLOCKED

# Section 1: MVP-Critical Items (main findings)
mvp_blockers:
  - id: <perspective>-NNN
    issue: "description"
    stories: [INST-XXX, ...]
    action: "required fix"

missing_mvp_stories:
  - title: "story title"
    reason: "why it blocks MVP"

# Section 2: Future Improvements (tracked separately)
future:
  suggestions:
    - area: "category"
      stories: [INST-XXX]
      description: "what to improve"
```

### Aggregation Output
After all 6 reviews complete, aggregator will create:
- **File**: `REVIEWS-SUMMARY.yaml`
- **Contents**:
  - Roll-up of all 6 verdicts
  - Cross-perspective blockers identified
  - Top MVP-critical issues prioritized
  - Execution recommendations

---

## Success Criteria

### All 6 Reviews Complete
- [ ] Engineering: REVIEW-engineering.yaml + completion signal
- [ ] Product: REVIEW-product.yaml + completion signal
- [ ] QA: REVIEW-qa.yaml + completion signal (with test mandate verification)
- [ ] UX: REVIEW-ux.yaml + completion signal
- [ ] Platform: REVIEW-platform.yaml + completion signal
- [ ] Security: REVIEW-security.yaml + completion signal

### Verdict Summary
- **READY**: 0 MVP blockers, minor future improvements
- **CONCERNS**: MVP blockers identified, but fixable within scope
- **BLOCKED**: Cannot proceed without external work

### Test Mandate Verification (QA)
- [x] Unit tests required: All stories
- [x] Integration tests required: All stories
- [x] E2E (Playwright+Cucumber) required: All stories
- [x] Any gaps flagged as blockers: Yes

---

## Timeline

| Step | Owner | Duration | Status |
|------|-------|----------|--------|
| Setup | elab-epic-setup-leader | ~5 min | ✓ Complete |
| Reviews (Parallel) | 6 specialist agents | ~15-20 min | → Starting |
| Aggregation | elab-epic-aggregation-leader | ~10 min | Pending |
| Interactive (if needed) | elab-epic-interactive-leader | ~20 min | Pending |
| Updates | elab-epic-updates-leader | ~15 min | Pending |

---

## Dependency Notes

### Stories with Dependencies
- INST-1000: Blocked by INST-1002
- INST-1002: In Progress
- INST-1003: No blockers (ready)
- INST-1004: Blocked by INST-1003
- INST-1005: Blocked by INST-1003, INST-1004
- INST-1010: Blocked by INST-1009
- INST-1012: Blocked by INST-1011, INST-1002
- Others: Mostly draft, future blockers TBD

### Critical Path
```
INST-1003 → INST-1004 → INST-1005 → INST-1008 → INST-1009 → INST-1010
  → INST-1011 → INST-1012 → INST-1013 → INST-1014 → INST-1015 → INST-1028 → INST-1029
```

---

## Next Phase: Aggregation

After all 6 reviews complete, the **elab-epic-aggregation-leader** will:

1. **Read all 6 REVIEW-*.yaml files**
2. **Identify cross-perspective conflicts** (e.g., QA blocker vs. Engineering READY)
3. **Prioritize MVP-critical items** by impact
4. **Recommend refinements** for next phase
5. **Create REVIEWS-SUMMARY.yaml** with consolidated verdict

### Aggregation Outputs
- `REVIEWS-SUMMARY.yaml` - Consolidated findings
- Recommendations for interactive refinement (if needed)
- Updated `CHECKPOINT.md` marking reviews complete

---

## Monitoring & Troubleshooting

### How to Monitor
- Each agent runs in background
- Check task output periodically
- Look for completion signals in output
- Verify REVIEW-*.yaml files exist

### If Agent Fails
- Check agent logs for errors
- Verify input files exist and are readable
- Confirm YAML formatting in output
- Re-run single agent if needed

### If Test Mandate Not Enforced
- QA agent has been updated with explicit test requirements
- Any story lacking 3-part test strategy will be flagged
- Aggregator will surface these as blockers

---

## Document History

| Timestamp | Agent | Action |
|-----------|-------|--------|
| 2026-02-05 21:10 | Claude Haiku | Setup reviews phase, enhanced QA agent with test mandate |

---

## Phase Checkpoint

**REVIEWS PHASE: SETUP COMPLETE**

Ready to spawn 6 parallel review agents.

Next: Wait for completion signals from all 6 workers.
