# WINT-7070 Migration Scope - Batch 5 Review Agents

## Story Summary
Migrate the fifth batch of agents responsible for code review, architectural review, and UI/UX review to eliminate all filesystem directory references and use the KB as the sole source of truth.

## Target Files (10 total)

### 1. review skill (.claude/skills/review/SKILL.md)
**Filesystem Refs Found**: 6
- Mode B directory scanning (lines 103-137): `docs/stories/` directory scan
- Epic directory resolution: `epic-{name}` → `docs/stories/epic-{name}/`
- File pattern matching: `*.md` glob in directory
- Directory listing logic (lines 119-136)

**Migration Pattern**:
- Replace `docs/stories/` filesystem scan with `kb_list_stories()` query
- Remove directory resolution logic - use KB query instead
- Update examples to use story IDs instead of file paths

### 2. review-draft-story skill (.claude/skills/review-draft-story/SKILL.md)
**Filesystem Refs Found**: 3
- `.bmad-core/core-config.yaml` reference (line 82)
- Story number search in `docs/stories/` (line 84)
- `.bmad-core/checklists/story-draft-checklist.md` reference (line 250)

**Migration Pattern**:
- Remove `.bmad-core/` references entirely (dead code)
- Replace story search with `kb_get_story()` call
- Embed checklist items directly or reference from KB

### 3. review-aggregate-leader agent (.claude/agents/review-aggregate-leader.agent.md)
**Filesystem Refs Found**: 1
- `{feature_dir}/stories/{story_id}/_implementation/REVIEW.yaml` file path reference (line 67)

**Migration Pattern**:
- Use `artifact_write()` KB-first pattern (already doing this, just verify)
- Ensure no fallback to filesystem directory structure

### 4. architect-story-review agent (.claude/agents/architect-story-review.agent.md)
**Filesystem Refs Found**: 4
- `{feature_dir}/stories/{story_id}/_implementation/ARCHITECT-NOTES.md` (line 380)
- `{feature_dir}/stories/{story_id}/_implementation/ELAB.yaml` (line 331)
- Reference to `_implementation/REVIEW.yaml` (line 306)
- Component directory structure assumptions (lines 427-468)

**Migration Pattern**:
- Replace artifact file paths with `artifact_write()` calls
- Use `kb_read_artifact()` for ELAB.yaml lookups
- Keep component structure guidance but don't assume files exist

### 5. ui-ux-review-setup-leader agent (.claude/agents/ui-ux-review-setup-leader.agent.md)
**Filesystem Refs Found**: 9
- Multiple `{FEATURE_DIR}/stories/{STORY_ID}/_implementation/` references (lines 32, 59, 63, 66, 68)
- Artifact path assumptions throughout initialization phase
- Feature directory structure assumptions

**Migration Pattern**:
- Replace all `_implementation/` paths with `artifact_write()` calls
- Use `kb_read_artifact()` to check for EVIDENCE.yaml existence
- Store context in KB instead of files

### 6. ui-ux-review-reviewer agent (.claude/agents/ui-ux-review-reviewer.agent.md)
**Filesystem Refs Found**: 4
- `{FEATURE_DIR}/stories/{STORY_ID}/_implementation/AGENT-CONTEXT.md` (lines 21-22)
- Screenshot directory assumption `_implementation/screenshots/` (line 89)
- `UI-UX-FINDINGS.yaml` file path (line 94)

**Migration Pattern**:
- Read context from KB instead of files
- Store screenshots in KB artifact references
- Use `artifact_write()` for findings

### 7. ui-ux-review-report-leader agent (.claude/agents/ui-ux-review-report-leader.agent.md)
**Filesystem Refs Found**: 3
- `{FEATURE_DIR}/stories/{STORY_ID}/_implementation/AGENT-CONTEXT.md` read (lines 23-24)
- `UI-UX-FINDINGS.yaml` read reference (line 26)

**Migration Pattern**:
- Use `kb_read_artifact()` for context and findings
- No filesystem dependencies

### 8. code-review-security agent (.claude/agents/code-review-security.agent.md)
**Filesystem Refs Found**: 2
- `_implementation/ARCHITECT-NOTES.md` reference (line 289)
- `_implementation/VERIFICATION.yaml` reference (line 290)

**Migration Pattern**:
- Use `kb_read_artifact()` for these lookups
- Already mostly KB-based

### 9. pm-dev-feasibility-review agent (.claude/agents/pm-dev-feasibility-review.agent.md)
**Filesystem Refs Found**: 1
- Feature directory reference (line 20)

**Migration Pattern**:
- Remove feature directory assumption
- Use KB story context directly

### 10. qa-gate skill (.claude/skills/qa-gate/SKILL.md)
**Filesystem Refs Found**: 1
- Story file pattern: `docs/stories/{STORY_NUM}.*.md` (line 64)

**Migration Pattern**:
- Use `kb_get_story()` to find story by ID
- Remove filesystem glob pattern

---

## Migration Patterns Summary

### Pattern 1: Directory Scanning (3 files affected)
- **review skill**: Mode B directory review (lines 103-137)
- **qa-gate skill**: Story file discovery (line 64)

Replace:
```
Glob("docs/stories/epic-{name}/*.md")
```
With:
```
kb_list_stories({ planSlug or filter criteria })
```

### Pattern 2: Artifact File Paths (7 files affected)
Replace all:
```
{feature_dir}/stories/{story_id}/_implementation/{ARTIFACT}.yaml
```
With:
```
kb_read_artifact({ story_id, artifact_type: "{type}" })
kb_write_artifact({ story_id, artifact_type: "{type}", ... })
```

### Pattern 3: .bmad-core References (1 file affected)
Remove:
```
.bmad-core/core-config.yaml
.bmad-core/checklists/story-draft-checklist.md
```
These are dead code; embed logic directly.

### Pattern 4: Feature Directory Assumptions (2 files affected)
Remove assumptions about `{feature_dir}` structure.
Use KB story metadata instead.

---

## Acceptance Criteria Verification Plan

### AC-1: Review skill filesystem refs replaced with KB MCP tool calls
- [ ] Line 103-107: Mode B reference documentation updated
- [ ] Lines 119-136: Directory scanning logic replaced with `kb_list_stories()`
- [ ] Examples updated to use KB queries

### AC-2: review-draft-story filesystem refs replaced with KB MCP tool calls
- [ ] Line 82: `.bmad-core/core-config.yaml` removed
- [ ] Line 84: Story search replaced with `kb_get_story()`
- [ ] Line 250: Checklist reference migrated to KB

### AC-3: review skill Mode B migrated from docs/stories/ filesystem scan to kb_list_stories query
- [ ] Documented Mode B now uses KB queries exclusively
- [ ] Examples show kb_list_stories usage
- [ ] Directory resolution logic removed

### AC-4: review-draft-story .bmad-core/ references verified as active or dead code and migrated or removed
- [ ] All `.bmad-core/` references marked as dead code
- [ ] Checklist items either embedded or referenced from KB

### AC-5: Story description corrected to reflect actual 10-file scope
- [ ] This document confirms 10 target files
- [ ] All files and ref counts match story description

### AC-6: grep verification pass confirms zero remaining filesystem refs
- [ ] Post-migration grep for `docs/stories|_implementation|\.bmad-core` yields no results
- [ ] Target files: review skill, review-draft-story, all 4 UI-UX agents, 3 review agents, qa-gate

### AC-7: smoke test of migrated workflow
- [ ] KB tools available and responding
- [ ] Story queries return expected results
- [ ] Artifact read/write operations successful

---

## Risk Flags

| Risk | Severity | Mitigation |
|------|----------|-----------|
| KB unavailability during migration | HIGH | Test with KB offline, ensure graceful fallback |
| Breaking sub-agent spawning code | HIGH | Verify sub-agents still receive proper context |
| Lost feature directory assumptions | MEDIUM | Document any assumptions explicitly |
| .bmad-core dead code migration | LOW | Already marked for removal per user MEMORY |
| Artifact type mapping errors | MEDIUM | Cross-reference schema before/after |

---

## Next Steps (Implementation Phase)

1. Create a migration branch per agent
2. Replace filesystem refs with KB tool calls
3. Test with actual KB responses
4. Run grep verification
5. Smoke test workflow end-to-end
