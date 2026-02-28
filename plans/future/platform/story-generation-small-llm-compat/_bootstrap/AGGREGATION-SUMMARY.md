# ST Epic Aggregation - Stakeholder Reviews Synthesis

**Aggregation Complete**: 2026-02-28
**Agent**: elab-epic-aggregation-leader (haiku)
**Feature**: plans/future/platform/story-generation-small-llm-compat
**Prefix**: ST
**Total Stories**: 7

---

## Executive Summary

Aggregated 6 stakeholder reviews (Engineering, Product, QA, UX, Platform, Security) for the ST epic covering PM story generation pipeline refactoring for small-LLM compatibility. Overall verdict: **CONCERNS** — MVP-viable but blocked on critical verification work before implementation begins.

### Key Finding

**5 of 7 stories marked as "already implemented" in agent file specs, but no production evidence.** This is the dominant blocker across all perspectives. Spec completeness (v1.2.0, v3.1.0, v3.2.0) does NOT guarantee execution—implementation stubs may exist but not be hooked into live agent flows.

### Genuine New Work (3 stories)

1. **ST-1020**: Goal/Examples/Edge Cases section enforcement in story template
2. **ST-2020**: Clarity format audit check (#10) in elaboration analyst
3. **ST-1040 (partial)**: Goal/Examples/Edge Cases enforcement portion

### Recommended Action

**DO NOT START IMPLEMENTATION** until:

1. Run gap audit: Execute each agent end-to-end with sample input
2. Verify Canonical References, Subtasks, Clarity sections appear in actual output
3. Document what is truly implemented vs. spec-only stubs
4. If gap audit confirms 5 stories are working: proceed with ST-1020, ST-2020, ST-1040 only
5. If gap audit finds gaps: schedule verification/fix work before touching new features

---

## Verdict Breakdown

| Perspective | Verdict | MVP Blockers | Recommendation |
|---|---|---|---|
| Engineering | CONCERNS | 1 (spec vs reality gap) | Mandatory gap audit before start |
| Product | CONCERNS | 2 (scope ambiguity) | Clarify Goal/Examples/Edge Cases already in output vs. missing |
| QA | CONCERNS | 1 (Check #9 vs #10 overlap) | Define audit check boundary before ST-2020 starts |
| UX | READY | 0 | No UX-specific blockers identified |
| Platform | CONCERNS | 1 (observability gap) | Add checkpoints after each generation phase |
| Security | READY | 0 | No security-specific blockers identified |

**Overall**: CONCERNS (4 perspectives with blockers; 2 READY but insufficient to unblock)

---

## Critical Path & Dependencies

```
ST-1010 → ST-1040 → ST-3010 → ST-3020  (4 stories, longest chain)
```

### Parallel Groups (Post-Gap-Audit)

If gap audit confirms ST-1010, ST-1030, ST-2010, ST-3010, ST-3020 are working:
- **Group 1** (start immediately): ST-1020, ST-2020 (new features)
- **Group 2** (after Group 1): ST-1040 partial (Goal/Examples/Edge Cases enforcement)

If gap audit finds implementations incomplete:
- **Pre-work**: Fix ST-1010 + ST-1030 + ST-2010 + ST-3010 + ST-3020 to match specs
- **Then**: Proceed with new features

---

## MVP-Critical Blockers (3)

### 1. Spec vs. Reality Gap (MVP-1 - ENGINEERING)

**Issue**: 5 of 7 stories exist as complete specs in agent files (v1.2.0, v3.1.0, v3.2.0, etc.) but no evidence of active invocation in production runs. Implementation stubs may exist but be skipped, disabled, or malformed.

**Impact**: Entire epic assumes foundation pieces work; if they don't, new features (ST-1020, ST-2020, ST-1040) will fail integration tests.

**Required Fix**:
```
Run gap audit: execute each agent end-to-end with sample input
- pm-story-seed-agent Phase 2.5 → verify ## Canonical References section exists
- pm-dev-feasibility-review → verify subtasks[] array with all fields
- pm-story-generation-leader Phase 4 → verify Subtasks and Canonical References sections
- dev-plan-leader Step 3/4 → verify schema: 2 PLAN.yaml with subtask mapping
- dev-execute-leader Step 2 → verify subtask iteration mode active
```

**Estimated Effort**: 2-4 hours (execution + tracing + documentation)

---

### 2. Scope Ambiguity on Goal/Examples/Edge Cases (MVP-2 - PRODUCT)

**Issue**: ST-1020 assumes Goal/Examples/Edge Cases are not currently enforced. However:
- pm-spawn-patterns.md section 4 lists "## Goal" as existing item
- pm-story-generation-leader Phase 4 references canonical references and subtasks but scope of Goal/Examples/Edge Cases enforcement unclear

**Risk**: Implement ST-1020 only to discover ## Goal already present; rework; or miss genuine Examples/Edge Cases gap.

**Required Fix**:
```
Audit pm-story-generation-leader Phase 4 synthesis block:
1. Does it enforce ## Goal (one sentence)?
2. Does it enforce ## Examples (2+ input/output pairs)?
3. Does it enforce ## Edge Cases (2+ scenarios)?
4. Document exact current behavior vs. ST-1020 spec
5. If any section missing, update ST-1020 scope
```

**Estimated Effort**: 1-2 hours (code audit + documentation)

---

### 3. Audit Check Overlap (MVP-3 - PRODUCT/QA)

**Issue**: ST-2020 (new Clarity format audit check) depends on ST-1020 but elab-analyst already has 9 checks. Adding Check #10 requires care to avoid overlapping scope with Check #9 (Subtask Decomposition).

**Overlap Risk**: Both checks might validate structure (Goal/Examples/Edge Cases vs. subtask structure), creating redundant or conflicting verdicts.

**Required Fix**:
```
Define clear boundary:
- Check #9 (ST-2010): Subtask count, file limits, dependencies, verification commands
- Check #10 (ST-2020): Story clarity format sections (Goal, Examples, Edge Cases)
Document in elab-analyst agent which check owns which concern.
```

**Estimated Effort**: 1 hour (documentation + agent spec update)

---

## Non-MVP Findings (High-Value Future Work)

### Enhancements (4 High-Value)

1. **FUTURE-1 (Platform)**: Add observability checkpoints after each generation phase
   - Helps debug silent section drops
   - Effort: medium
   - Impact: high

2. **FUTURE-2 (Engineering)**: E2E test harness for full story batch generation
   - Validates every required section presence
   - Catches integration gaps early
   - Effort: medium
   - Impact: high

3. **FUTURE-3 (QA)**: Story shape validation (YAML schema) for QA gate
   - Automates structural checks
   - Reduces rework
   - Effort: low
   - Impact: high

4. **FUTURE-4 (Engineering)**: Document canonical reference discovery heuristics
   - Makes ST-1010 repeatable
   - Effort: medium
   - Impact: high

### Stories to Defer

- **ST-1020**: Defer until gap audit confirms Goal format actually missing
- **ST-2020**: Defer until ST-1020 and ST-2010 working end-to-end

---

## Cross-Cutting Concerns

### 1. Spec vs. Reality Gap

**Description**: Implementation specs are thorough but no proof of active execution.
**Risk**: Features exist on paper; may not function in practice.
**Mitigation**: Mandatory gap audit + e2e test harness (FUTURE-2).

### 2. Integration Surface Area

**Description**: 3+ handoff points (seed → feasibility → synthesis) where agents must read prior outputs.
**Risk**: Sections silently disappear if reading code incomplete.
**Mitigation**: FUTURE-1 (observability) + FUTURE-2 (e2e tests) + explicit assertions.

### 3. Scope Ambiguity on Clarity Format

**Description**: Goal/Examples/Edge Cases; unclear which are missing vs. already present.
**Risk**: Rework, redundancy, or missed requirements.
**Mitigation**: Immediate audit + documentation (MVP-2 fix).

---

## Stakeholder Alignment

### Alignment Summary

**Engineering & Product**: Unified on gap audit requirement — critical blocker.
**QA & Platform**: Support new features but emphasize test coverage and observability.
**UX & Security**: No blockers; support proceeding once MVP-critical items resolved.

### Consensus

All 6 perspectives agree:
1. Epic is MVP-viable but verification-gated
2. Spec completeness ≠ execution reality
3. New features (ST-1020, ST-2020) are low-risk once foundation verified
4. Post-MVP should invest in observability and e2e testing

---

## Next Steps

### Immediate (Pre-Implementation)

1. **MVP-1 Fix**: Run gap audit (2-4 hours)
2. **MVP-2 Fix**: Audit Goal format enforcement (1-2 hours)
3. **MVP-3 Fix**: Define Check #9 vs #10 boundary (1 hour)
4. **Checkpoint**: Document findings; update story specs

### Implementation Phase (Post-Fixes)

**If gap audit confirms foundation working**:
- Start ST-1020, ST-2020, ST-1040 (partial)
- Critical path: 4 stories (ST-1010, ST-1040, ST-3010, ST-3020) — all existing, just verify

**If gap audit finds gaps**:
- Schedule ST-1010, ST-1030, ST-2010, ST-3010, ST-3020 verification/fix work first
- Then proceed with new features

### Post-MVP (Future)

1. FUTURE-2: E2E test harness
2. FUTURE-1: Observability checkpoints
3. FUTURE-4: Canonical reference docs
4. FUTURE-3: YAML schema validation

---

## Risk Assessment (Post-Aggregation)

| Risk | Pre-Fix | Post-Fix | Mitigation |
|---|---|---|---|
| Foundation pieces not working | HIGH | MEDIUM | Gap audit + e2e tests |
| Scope duplication (Goal/Examples) | MEDIUM | LOW | Audit + clear specs |
| Audit check overlap | MEDIUM | LOW | Boundary definition |
| Integration failures | MEDIUM | LOW | FUTURE-1/2 observability |

---

## Artifacts Generated

- **EPIC-REVIEW.yaml**: MVP-critical findings only
- **FUTURE-ROADMAP.yaml**: Non-MVP enhancements, suggestions, deferred work
- **AGGREGATION-SUMMARY.md**: This file — detailed cross-cutting analysis

---

## Signal

**AGGREGATION COMPLETE**

All 6 stakeholder perspectives synthesized. Epic review ready for PM decision gate: approve with pre-work (gap audit), approve with risk acceptance, or defer pending verification.

---

**Aggregated by**: elab-epic-aggregation-leader (haiku)
**Timestamp**: 2026-02-28T00:00:00Z
**Reference**: .claude/agents/elab-epic-aggregation-leader.agent.md v3.0.0
