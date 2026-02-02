# Flow Update - Analysis Summary

**Generated**: 2026-02-01T12:50:00Z  
**Stories Extracted**: 22  
**Critical Path**: 13 stories  
**Max Parallelization**: 4 concurrent stories

## Overall Goal

Refactor the Dev → Code Review → QA Verify cycle into a phase-leader pattern with evidence-driven artifacts to reduce token usage, minimize redundant reads, and enable deterministic resume capabilities.

## Phase Overview

### Phase 0: Audit & Analysis (2 stories)
- FLOW-001: Audit Existing Dev/Review/QA Infrastructure
- FLOW-002: Propose Refactored Command/Agent Architecture

### Phase 1: Shared Infrastructure (5 stories)
- FLOW-003: Create Knowledge Context Loader
- FLOW-004: Define Evidence Bundle Schema (EVIDENCE.yaml)
- FLOW-005: Define Checkpoint and Scope Schemas
- FLOW-006: Define Plan, Review, and QA Schemas
- FLOW-018: Implement KB Writer Agent

### Phase 2: Dev Implementation Refactor (7 stories)
- FLOW-007: Implement Dev Setup Leader
- FLOW-008: Implement Dev Plan Leader
- FLOW-009: Implement Dev Execute Leader ⚠️
- FLOW-010: Implement Dev Proof Leader
- FLOW-011: Integrate Review/Fix Loop into Dev Flow
- FLOW-019: Update Dev Command to Use New Leaders

### Phase 3: Code Review Refactor (4 stories)
- FLOW-012: Implement Review Setup Leader
- FLOW-013: Update Review Workers for Diff-Aware Operation ⚠️
- FLOW-014: Implement Review Aggregate Leader
- FLOW-020: Update Code Review Command to Use New Leaders

### Phase 4: QA Verify Refactor (4 stories)
- FLOW-015: Implement QA Verify Setup Leader
- FLOW-016: Implement QA Verify Verification Leader ⚠️
- FLOW-017: Implement QA Verify Completion Leader
- FLOW-021: Update QA Verify Command to Use New Leaders
- FLOW-022: End-to-End Integration Testing ⚠️

⚠️ = Sizing warning (potentially complex)

## Critical Path

```
FLOW-001 (Audit)
    ↓
FLOW-002 (Redesign)
    ↓
FLOW-005 (Schemas: Checkpoint/Scope)
    ↓
FLOW-007 (Dev Setup Leader)
    ↓
FLOW-008 (Dev Plan Leader)
    ↓
FLOW-009 (Dev Execute Leader)
    ↓
FLOW-010 (Dev Proof Leader)
    ↓
FLOW-014 (Review Aggregate)
    ↓
FLOW-011 (Review/Fix Loop Integration)
    ↓
FLOW-019 (Wire Dev Command)
    ↓
FLOW-020 (Wire Review Command)
    ↓
FLOW-021 (Wire QA Command)
    ↓
FLOW-022 (E2E Testing)
```

## Parallelization Groups

| Group | Stories | Prerequisites |
|-------|---------|---------------|
| 1 | FLOW-001 | None |
| 2 | FLOW-002 | Group 1 |
| 3 | FLOW-003, FLOW-004, FLOW-005, FLOW-006 | Group 2 |
| 4 | FLOW-007, FLOW-012, FLOW-018 | Group 3 |
| 5 | FLOW-008, FLOW-013 | Group 4 |
| 6 | FLOW-009, FLOW-014, FLOW-015 | Group 5 |
| 7 | FLOW-010, FLOW-016 | Group 6 |
| 8 | FLOW-011, FLOW-017 | Group 7 |
| 9 | FLOW-019, FLOW-020, FLOW-021 | Group 8 |
| 10 | FLOW-022 | Group 9 |

## Key Risks

### High Severity

1. **RISK-001**: Story context re-reading across agents consumes 30-40% of tokens
   - **Affected**: FLOW-008, FLOW-009, FLOW-016
   - **Mitigation**: Implement context passing between phase leaders

2. **RISK-002**: Evidence bundle schema verbosity could negate token savings
   - **Affected**: FLOW-004, FLOW-009, FLOW-016
   - **Mitigation**: Design concise schema with file references, not inline content

3. **RISK-007**: Migration must maintain working system during incremental refactor
   - **Affected**: FLOW-002, FLOW-019, FLOW-020, FLOW-021
   - **Mitigation**: Step-by-step migration plan in redesign proposal

### Medium Severity

4. **RISK-003**: KB dependency may fail without KB tools available
5. **RISK-004**: Diff-aware worker selection may miss required checks
6. **RISK-005**: Multiple orchestration stories increase complexity

## Stories Requiring Special Attention

### FLOW-009: Dev Execute Leader
- **Complexity**: Orchestrates multiple targeted coders
- **Risk**: High token consumption phase
- **Mitigation**: Careful worker spawning logic, artifact aggregation

### FLOW-013: Update Review Workers
- **Complexity**: Multiple existing workers to modify
- **Risk**: Must maintain check quality while adding diff-awareness
- **Mitigation**: Conservative initial selection, incremental optimization

### FLOW-016: QA Verify Verification Leader
- **Complexity**: Core QA logic with evidence-first pattern
- **Risk**: Verification quality vs token savings tradeoff
- **Mitigation**: Open detailed files only when evidence missing/suspicious

### FLOW-022: E2E Integration Testing
- **Complexity**: Full workflow validation across all phases
- **Risk**: May reveal unforeseen edge cases
- **Mitigation**: Thorough test scenarios covering artifact flow

## Next Steps

1. Review ANALYSIS.yaml for accuracy
2. Proceed to story artifact generation (if approved)
3. Begin Phase 0 implementation with FLOW-001
