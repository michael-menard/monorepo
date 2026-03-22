# WINT-7070 Phase 0 Complete - Index & Quick Reference

**Status**: PHASE 0 COMPLETE ✓
**Date**: 2026-03-22
**Story**: WINT-7070 - Migrate Batch 5 Agents (Review)

---

## Quick Navigation

| Document | Purpose | Size | Read Time |
|----------|---------|------|-----------|
| **PHASE-0-SETUP-COMPLETE.md** | Main completion summary + implementation guide | 290 lines | 15 min |
| **SCOPE-PHASE-0.md** | Detailed scope with all 10 target files | 203 lines | 12 min |
| **CHECKPOINT-PHASE-0.yaml** | Structured checkpoint data for next phase | 91 lines | 5 min |
| **PHASE-0-INDEX.md** | This file - navigation reference | - | 2 min |

---

## What Phase 0 Accomplished

Phase 0 (setup) analyzed the entire WINT-7070 story scope and produced comprehensive documentation for implementation.

### Analysis Summary
- **10 target files** identified (3 skills, 7 agents)
- **29 filesystem references** found and categorized
- **4 migration patterns** identified with replacement strategies
- **Risk assessment** completed with mitigation strategies
- **Implementation sequence** recommended with complexity ratings

### Key Deliverables
1. **SCOPE-PHASE-0.md**: File-by-file breakdown with line numbers and patterns
2. **CHECKPOINT-PHASE-0.yaml**: Structured data for implementation phase
3. **PHASE-0-SETUP-COMPLETE.md**: Implementation guide with acceptance criteria

---

## Target Files Summary

### 3 Skills Files
```
.claude/skills/
  ├─ review/SKILL.md                 (6 refs, HIGH complexity)
  ├─ review-draft-story/SKILL.md     (3 refs, MEDIUM complexity)
  └─ qa-gate/SKILL.md                (1 ref, SIMPLE)
```

### 7 Agent Files
```
.claude/agents/
  ├─ review-aggregate-leader.agent.md        (1 ref, SIMPLE)
  ├─ architect-story-review.agent.md         (4 refs, MEDIUM)
  ├─ ui-ux-review-setup-leader.agent.md      (9 refs, VERY HIGH)
  ├─ ui-ux-review-reviewer.agent.md          (4 refs, MEDIUM)
  ├─ ui-ux-review-report-leader.agent.md     (3 refs, SIMPLE)
  ├─ code-review-security.agent.md           (2 refs, SIMPLE)
  └─ pm-dev-feasibility-review.agent.md      (1 ref, SIMPLE)
```

---

## 4 Migration Patterns

### Pattern 1: Directory Scanning (2 files)
Replace filesystem glob/directory scans with KB queries.
- Files: review skill, qa-gate skill
- Refs: 2
- Replacement: `kb_list_stories()`

### Pattern 2: Artifact File Paths (7 files)
Replace `{feature_dir}/stories/{story_id}/_implementation/{ARTIFACT}` paths.
- Files: 7 agents (all except 3 simple ones)
- Refs: 21
- Replacement: `kb_read_artifact()` / `kb_write_artifact()`

### Pattern 3: .bmad-core References (1 file)
Remove dead code references.
- File: review-draft-story skill
- Refs: 3
- Action: Delete references (marked as dead code)

### Pattern 4: Feature Directory Assumptions (2 files)
Remove implicit directory structure assumptions.
- Files: ui-ux-review-setup-leader, pm-dev-feasibility-review
- Refs: 3
- Replacement: Use KB story metadata

---

## Recommended Implementation Sequence

**Start with simpler files first** to validate KB migration patterns:

1. **qa-gate/SKILL.md** (1 ref, SIMPLE) ← Start here
2. **review/SKILL.md** (6 refs, HIGH)
3. **review-draft-story/SKILL.md** (3 refs, MEDIUM)
4. **review-aggregate-leader** (1 ref, SIMPLE)
5. **architect-story-review** (4 refs, MEDIUM)
6. **code-review-security** (2 refs, SIMPLE)
7. **pm-dev-feasibility-review** (1 ref, SIMPLE)
8. **ui-ux-review-setup-leader** (9 refs, VERY HIGH) ← Most complex
9. **ui-ux-review-reviewer** (4 refs, MEDIUM)
10. **ui-ux-review-report-leader** (3 refs, SIMPLE)

---

## Acceptance Criteria Status

| AC | Description | Status |
|----|-------------|--------|
| AC-1 | Review skill filesystem refs → KB | ✓ READY |
| AC-2 | review-draft-story refs → KB | ✓ READY |
| AC-3 | Mode B dir scan → kb_list_stories | ✓ READY |
| AC-4 | .bmad-core refs verified & migrated | ✓ VERIFIED |
| AC-5 | Story description (10-file scope) | ✓ VERIFIED |
| AC-6 | Grep verification (zero refs) | ✓ READY |
| AC-7 | Smoke test of migrated workflow | ✓ READY |

---

## Quick Facts

- **Total Filesystem Refs**: 29
- **Affected Files**: 10
- **Migration Patterns**: 4
- **High-Risk Files**: 1 (ui-ux-review-setup-leader with 9 refs)
- **Dead Code to Remove**: .bmad-core references (3 refs)
- **KB Operations to Add**: 28 (kb_read_artifact + kb_write_artifact)

---

## Risk Flags

**HIGH**: KB unavailability, sub-agent context breakage
**MEDIUM**: Feature directory assumptions, artifact type mapping
**LOW**: .bmad-core dead code removal

See PHASE-0-SETUP-COMPLETE.md section "Risk Assessment" for mitigations.

---

## Files for Implementation Phase

**Artifact Files** (in this _implementation directory):
- `PHASE-0-SETUP-COMPLETE.md` ← Main reference for implementation
- `SCOPE-PHASE-0.md` ← Detailed file-by-file breakdown
- `CHECKPOINT-PHASE-0.yaml` ← Structured data format

**Target Source Files** (to be migrated):
- `/Users/michaelmenard/Development/monorepo/.claude/skills/review/SKILL.md`
- `/Users/michaelmenard/Development/monorepo/.claude/skills/review-draft-story/SKILL.md`
- `/Users/michaelmenard/Development/monorepo/.claude/skills/qa-gate/SKILL.md`
- `/Users/michaelmenard/Development/monorepo/.claude/agents/review-aggregate-leader.agent.md`
- `/Users/michaelmenard/Development/monorepo/.claude/agents/architect-story-review.agent.md`
- `/Users/michaelmenard/Development/monorepo/.claude/agents/ui-ux-review-setup-leader.agent.md`
- `/Users/michaelmenard/Development/monorepo/.claude/agents/ui-ux-review-reviewer.agent.md`
- `/Users/michaelmenard/Development/monorepo/.claude/agents/ui-ux-review-report-leader.agent.md`
- `/Users/michaelmenard/Development/monorepo/.claude/agents/code-review-security.agent.md`
- `/Users/michaelmenard/Development/monorepo/.claude/agents/pm-dev-feasibility-review.agent.md`

---

## Next Steps

1. **Read**: PHASE-0-SETUP-COMPLETE.md (main implementation guide)
2. **Review**: SCOPE-PHASE-0.md (detailed patterns and line numbers)
3. **Start Implementation**: Begin with qa-gate/SKILL.md (simplest first)
4. **Test After Each File**: Verify KB tools, test sub-agents
5. **Final Verification**: Grep check + smoke test

---

**Phase 0 Status**: COMPLETE ✓
**Ready for**: Implementation Phase (Phase 1)

For detailed guidance, see **PHASE-0-SETUP-COMPLETE.md** (next section: "Recommended Implementation Sequence")
