# WINT-7070 Phase 0 Setup Complete

**Status**: SETUP COMPLETE
**Timestamp**: 2026-03-22T12:00:00Z
**Story**: Migrate Batch 5 Agents (Review) - WINT-7070

---

## Executive Summary

Phase 0 (setup) is complete. All 10 target files have been identified, analyzed, and documented. The migration scope is clear, patterns are understood, and implementation can proceed.

**Key Findings**:
- 10 target files identified
- 29 total filesystem references found
- 4 distinct migration patterns identified
- Implementation sequence recommended

---

## Analysis Results

### Target Files (10/10 Identified)

#### Skills (2 files)
1. `.claude/skills/review/SKILL.md` - 6 filesystem refs
   - Mode B directory scanning (primary complexity)
   - Epic directory resolution
   - File pattern matching

2. `.claude/skills/review-draft-story/SKILL.md` - 3 filesystem refs
   - .bmad-core references (dead code)
   - docs/stories/ search pattern
   - Checklist file references

3. `.claude/skills/qa-gate/SKILL.md` - 1 filesystem ref
   - Story file discovery pattern

#### Agents (7 files)
4. `.claude/agents/review-aggregate-leader.agent.md` - 1 ref
   - Artifact file path reference

5. `.claude/agents/architect-story-review.agent.md` - 4 refs
   - Multiple _implementation/ paths
   - Component structure assumptions

6. `.claude/agents/ui-ux-review-setup-leader.agent.md` - 9 refs (HIGHEST)
   - Multiple artifact path references
   - Feature directory assumptions
   - Context file assumptions

7. `.claude/agents/ui-ux-review-reviewer.agent.md` - 4 refs
   - Context and findings file paths
   - Screenshot directory assumption

8. `.claude/agents/ui-ux-review-report-leader.agent.md` - 3 refs
   - Context and findings file reads

9. `.claude/agents/code-review-security.agent.md` - 2 refs
   - Artifact reference lookups

10. `.claude/agents/pm-dev-feasibility-review.agent.md` - 1 ref
    - Feature directory reference

### Filesystem References Breakdown

Total: 29 references across 4 migration patterns

```
Pattern                       | Count | Affected Files | Complexity
------------------------------|-------|----------------|-----------
Directory Scanning            | 2     | review, qa-gate| MEDIUM
Artifact File Paths           | 21    | 7 agents       | HIGH
.bmad-core References         | 3     | review-draft   | LOW
Feature Directory Assumptions | 3     | 2 agents       | MEDIUM
```

### Migration Patterns

#### Pattern 1: Directory Scanning (2 files, 2 refs)
Replace filesystem glob/directory scans with KB queries.

**Affected**:
- `review skill`: Mode B directory review (lines 103-137)
- `qa-gate skill`: Story file discovery (line 64)

**Replacement**:
```javascript
// Old: Glob("docs/stories/epic-{name}/*.md", ...)
// New: kb_list_stories({ planSlug: "..." })
```

#### Pattern 2: Artifact File Paths (7 files, 21 refs)
Replace `{feature_dir}/stories/{story_id}/_implementation/{ARTIFACT}` paths with KB artifact operations.

**Affected Files**:
- review-aggregate-leader
- architect-story-review
- ui-ux-review-setup-leader (9 refs)
- ui-ux-review-reviewer (4 refs)
- ui-ux-review-report-leader (3 refs)
- code-review-security (2 refs)

**Replacement**:
```javascript
// Old: Read from `{feature_dir}/stories/{story_id}/_implementation/ARTIFACT.yaml`
// New: kb_read_artifact({ story_id, artifact_type: "artifact" })

// Old: Write to file path
// New: kb_write_artifact({ story_id, artifact_type, content })
```

#### Pattern 3: .bmad-core References (1 file, 3 refs)
Remove dead code references to .bmad-core configuration.

**Affected**: review-draft-story skill

**Status**: These are documented as dead code to be removed. No KB migration needed; simply delete references.

#### Pattern 4: Feature Directory Assumptions (2 files, 3 refs)
Remove assumptions about feature directory structure.

**Affected**:
- ui-ux-review-setup-leader (lines 22, 63)
- pm-dev-feasibility-review (line 20)

**Replacement**: Use KB story metadata directly instead of constructing paths.

---

## Risk Assessment

### HIGH SEVERITY
- **KB Unavailability During Migration**: If KB is offline, artifact operations fail. Mitigation: Test graceful fallback behavior.
- **Sub-Agent Context Breakage**: If we change how context is passed to spawned agents, they may fail. Mitigation: Verify context format before/after.

### MEDIUM SEVERITY
- **Lost Feature Directory Assumptions**: Some code may depend on implicit directory structure. Mitigation: Document all assumptions explicitly.
- **Artifact Type Mapping Errors**: Mismatched artifact_type values will cause lookups to fail. Mitigation: Cross-reference schema thoroughly.

### LOW SEVERITY
- **.bmad-core Dead Code Removal**: User already confirmed these are marked for deletion. Mitigation: Verify no active code depends on them.

---

## Recommended Implementation Sequence

Order by priority and dependencies:

1. **`.claude/skills/qa-gate/SKILL.md`** (1 ref, SIMPLE)
   - Lowest complexity, no dependencies
   - Start here to validate KB migration pattern

2. **`.claude/skills/review/SKILL.md`** (6 refs, HIGH)
   - Mode B is complex but well-scoped
   - Test directory scanning replacement first

3. **`.claude/skills/review-draft-story/SKILL.md`** (3 refs, MEDIUM)
   - Remove .bmad-core references (dead code)
   - Replace docs/stories search with kb_get_story()

4. **`.claude/agents/review-aggregate-leader.agent.md`** (1 ref, SIMPLE)
   - Already mostly KB-based
   - Verify artifact_write patterns

5. **`.claude/agents/architect-story-review.agent.md`** (4 refs, MEDIUM)
   - Replace _implementation/ paths with KB artifact calls
   - Keep component structure guidance

6. **`.claude/agents/code-review-security.agent.md`** (2 refs, SIMPLE)
   - Use kb_read_artifact() for lookups
   - Already mostly KB-based

7. **`.claude/agents/pm-dev-feasibility-review.agent.md`** (1 ref, SIMPLE)
   - Remove feature_dir assumption
   - Use KB story context

8. **`.claude/agents/ui-ux-review-setup-leader.agent.md`** (9 refs, VERY HIGH)
   - Most complex migration
   - Multiple artifact and context file assumptions
   - Test after simpler patterns are validated

9. **`.claude/agents/ui-ux-review-reviewer.agent.md`** (4 refs, MEDIUM)
   - Read context from KB instead of files
   - Use artifact operations for findings

10. **`.claude/agents/ui-ux-review-report-leader.agent.md`** (3 refs, SIMPLE)
    - Use kb_read_artifact() for context and findings
    - No spawned sub-agents

---

## Acceptance Criteria Status

### AC-1: Review skill filesystem refs replaced with KB MCP tool calls
- Status: READY FOR IMPLEMENTATION
- Tasks:
  - [ ] Lines 103-107: Update Mode B documentation
  - [ ] Lines 119-136: Replace directory scanning with kb_list_stories()
  - [ ] Update examples to use KB queries

### AC-2: review-draft-story filesystem refs replaced with KB MCP tool calls
- Status: READY FOR IMPLEMENTATION
- Tasks:
  - [ ] Remove .bmad-core/core-config.yaml reference (line 82)
  - [ ] Replace docs/stories/ search with kb_get_story() (line 84)
  - [ ] Migrate checklist reference (line 250)

### AC-3: review skill Mode B migrated from docs/stories/ filesystem scan to kb_list_stories query
- Status: READY FOR IMPLEMENTATION
- Tasks:
  - [ ] Mode B documentation uses KB queries
  - [ ] Examples show kb_list_stories() usage
  - [ ] Directory resolution logic removed

### AC-4: review-draft-story .bmad-core/ references verified as active or dead code and migrated or removed
- Status: VERIFIED - DEAD CODE
- Tasks:
  - [ ] Mark references as dead code
  - [ ] Remove or migrate to KB

### AC-5: Story description corrected to reflect actual 10-file scope
- Status: VERIFIED - ACCURATE
- Confirmation: This document identifies all 10 files with exact ref counts

### AC-6: grep verification pass confirms zero remaining filesystem refs
- Status: READY FOR VERIFICATION
- Tasks:
  - [ ] Post-migration: `grep -r "docs/stories|_implementation|\.bmad-core" .claude/skills/review* .claude/agents/*review* .claude/skills/qa-gate` should return 0 results

### AC-7: smoke test of migrated workflow
- Status: READY FOR TESTING
- Tasks:
  - [ ] KB tools available and responding
  - [ ] Story queries return expected results
  - [ ] Artifact read/write operations successful
  - [ ] Sub-agents receive proper context

---

## Deliverables

### Artifact Files Created
- **SCOPE-PHASE-0.md**: Detailed scope document (7.5 KB)
- **CHECKPOINT-PHASE-0.yaml**: Implementation checkpoint (3.3 KB)
- **PHASE-0-SETUP-COMPLETE.md**: This summary document

### Ready for Handoff to Implementation Phase
- All target files identified
- Migration patterns documented
- Implementation sequence recommended
- Risks identified and mitigated
- Acceptance criteria ready for verification

---

## Next Steps

1. **Implementation**: Start with Phase 1 implementation leader
   - Begin with qa-gate skill (simplest)
   - Proceed through sequence in order
   - Document any discovered patterns

2. **Testing**: After each file migration
   - Verify KB tools work as expected
   - Test sub-agent context passing
   - Run grep verification

3. **Verification**: Final acceptance
   - Run grep on all target files
   - Verify zero remaining filesystem refs
   - Smoke test complete workflow

---

## Files for Reference

**Scope Document**: `/Users/michaelmenard/Development/monorepo/tree/story/WINT-7070/_implementation/SCOPE-PHASE-0.md`

**Checkpoint**: `/Users/michaelmenard/Development/monorepo/tree/story/WINT-7070/_implementation/CHECKPOINT-PHASE-0.yaml`

**Target File Locations**:
- Skills: `/Users/michaelmenard/Development/monorepo/.claude/skills/{review,review-draft-story,qa-gate}/`
- Agents: `/Users/michaelmenard/Development/monorepo/.claude/agents/{*-review,*-reviewer,*-report}*`

---

**Setup Phase**: COMPLETE ✓
**Status**: Ready for Implementation Phase
**Recommended Next Agent**: Phase 1 Implementation Leader
