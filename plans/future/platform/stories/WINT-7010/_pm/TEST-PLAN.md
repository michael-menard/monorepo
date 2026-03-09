# Test Plan: WINT-7010

## Scope Summary

- **Endpoints touched**: None
- **UI touched**: No
- **Data/storage touched**: No (read-only filesystem scanning)
- **Type**: Audit/documentation story

---

## Verification Approach

This is an audit/documentation story, not a traditional feature implementation. Instead of executable tests, verification focuses on **completeness review** of audit artifacts.

---

## Completeness Verification Tests

### Test 1: Agent Catalog Completeness

**Setup**:
- Count total `.agent.md` files in `.claude/agents/` directory
- Expected count: 143+ files (per baseline)

**Action**:
- Review `AGENT-CATALOG.yaml` artifact
- Count entries in catalog

**Expected outcome**:
- Catalog entry count matches filesystem count
- No agent files missing from catalog

**Evidence**:
- Line count in AGENT-CATALOG.yaml
- Diff between filesystem glob and catalog entries

---

### Test 2: Frontmatter Metadata Extraction

**Setup**:
- Select 5 random agent files from catalog
- Load original `.agent.md` files

**Action**:
- Compare frontmatter fields in catalog vs. actual files
- Verify: `name`, `type`, `version`, `permission_level`, `spawned_by`

**Expected outcome**:
- All frontmatter fields accurately extracted
- No parsing errors or missing fields

**Evidence**:
- Spot-check comparison table
- Any discrepancies logged

---

### Test 3: Directory Structure Completeness

**Setup**:
- List all subdirectories in `.claude/agents/`
- Expected: `_shared/`, `_reference/`, `_archive/`, `_migration/`

**Action**:
- Review `DIRECTORY-STRUCTURE.md` artifact
- Verify all subdirectories documented

**Expected outcome**:
- All subdirectories present in documentation
- File counts match for each subdirectory

**Evidence**:
- Directory tree comparison
- File count verification per directory

---

### Test 4: Cross-Reference Scanning Exhaustiveness

**Setup**:
- Known cross-references from spot-check:
  - `.claude/commands/*.md` files reference agents
  - Agent files reference other agents in instructions
  - Shared modules referenced via includes

**Action**:
- Review `CROSS-REFERENCES.yaml` artifact
- Spot-check 10 known references are captured

**Expected outcome**:
- All spot-checked references present
- No obvious omissions from grep patterns

**Evidence**:
- Spot-check results table
- Grep pattern coverage analysis

---

### Test 5: Spawn Relationship Mapping

**Setup**:
- Select 3 known spawn chains:
  1. `pm-story-generation-leader` → `pm-draft-test-plan`
  2. `dev-implementation-leader` → `dev-setup-leader`
  3. `qa-verify-leader` → `qa-evidence-collector`

**Action**:
- Review `SPAWN-GRAPH.md` and `CROSS-REFERENCES.yaml`
- Verify spawn relationships captured

**Expected outcome**:
- All 3 spawn chains present in graph
- `spawned_by` frontmatter correctly mapped

**Evidence**:
- Mermaid graph includes verified chains
- YAML spawn relationships match frontmatter

---

### Test 6: Shared Resource Dependencies

**Setup**:
- Count files in `.claude/agents/_shared/` directory
- Expected: 17 files (per baseline)

**Action**:
- Review `SHARED-DEPENDENCIES.yaml` artifact
- Verify all shared resources cataloged

**Expected outcome**:
- All 17 shared files documented
- References to shared files mapped

**Evidence**:
- Shared file count matches
- Usage references captured

---

### Test 7: Reference Documentation Structure

**Setup**:
- Expected subdirectories in `_reference/`:
  - `patterns/`
  - `schemas/`
  - `examples/`

**Action**:
- Review `AGENT-CATALOG.yaml` or `DIRECTORY-STRUCTURE.md`
- Verify reference structure documented

**Expected outcome**:
- All `_reference/` subdirectories present
- File counts per subdirectory documented

**Evidence**:
- Directory structure comparison

---

### Test 8: Agent Dependency Graph Visualization

**Setup**:
- Load `SPAWN-GRAPH.md` artifact

**Action**:
- Verify Mermaid syntax is valid
- Render graph in Mermaid Live Editor
- Check graph includes major agent chains

**Expected outcome**:
- Graph renders without syntax errors
- Major spawn chains visible
- Graph is readable and organized

**Evidence**:
- Mermaid syntax validation
- Visual inspection of rendered graph

---

### Test 9: Orphaned Agent Detection

**Setup**:
- Known orphaned candidates:
  - Agents with no `spawned_by` field
  - Agents not referenced in any `.claude/commands/*.md` file
  - Agents in `_archive/` directory

**Action**:
- Review `ORPHANED-AGENTS.yaml` artifact
- Cross-reference with catalog and commands

**Expected outcome**:
- Orphaned agents identified correctly
- Archive agents flagged separately
- No false positives (active agents marked orphaned)

**Evidence**:
- Orphaned agents list
- Validation against command references

---

### Test 10: Structured Output Validation

**Setup**:
- Expected output artifacts:
  1. `AGENT-CATALOG.yaml`
  2. `DIRECTORY-STRUCTURE.md`
  3. `CROSS-REFERENCES.yaml`
  4. `SPAWN-GRAPH.md`
  5. `SHARED-DEPENDENCIES.yaml`
  6. `ORPHANED-AGENTS.yaml`
  7. `AUDIT-SUMMARY.md`

**Action**:
- Verify all 7 artifacts exist
- Verify YAML files parse without errors
- Verify markdown files have valid syntax

**Expected outcome**:
- All 7 artifacts present
- YAML parses successfully
- Markdown renders correctly

**Evidence**:
- File existence check
- YAML parse validation
- Markdown render test

---

## Required Tooling Evidence

### Filesystem Tools
- **Glob**: Used to find all `.agent.md` files
- **Grep**: Used to scan cross-references
- **Bash**: Used for directory structure analysis

### Validation Commands
```bash
# Agent file count
find .claude/agents -name "*.agent.md" -type f | wc -l

# YAML validation
yamllint AGENT-CATALOG.yaml
yamllint CROSS-REFERENCES.yaml
yamllint SHARED-DEPENDENCIES.yaml
yamllint ORPHANED-AGENTS.yaml

# Markdown validation
markdownlint DIRECTORY-STRUCTURE.md
markdownlint SPAWN-GRAPH.md
markdownlint AUDIT-SUMMARY.md
```

---

## Risks to Call Out

### Risk 1: Incomplete Cross-Reference Patterns
**Description**: Grep patterns may miss some cross-reference formats
**Mitigation**: Manual spot-check of 10+ references
**Impact**: Low (can be iteratively improved)

### Risk 2: Frontmatter Parsing Edge Cases
**Description**: Non-standard YAML frontmatter may cause parse errors
**Mitigation**: Error handling with fallback to partial metadata
**Impact**: Low (most agents use standard frontmatter)

### Risk 3: Missing Agents from Non-Standard Locations
**Description**: Agents outside `.claude/agents/` may be missed
**Mitigation**: Scope limited to `.claude/agents/` per requirements
**Impact**: None (out of scope)

### Risk 4: Graph Visualization Readability
**Description**: 143+ agents may create overly complex graph
**Mitigation**: Group by agent type or create multiple subgraphs
**Impact**: Medium (affects WINT-7020 usability)

---

## Success Criteria

- [ ] All 10 verification tests pass
- [ ] All 7 output artifacts exist and parse correctly
- [ ] Agent catalog count matches filesystem (143+)
- [ ] No blocking issues for WINT-7020 (Create Agent Migration Plan)
- [ ] Audit findings ready for consumption by migration planning

---

## Notes

- This is a **verification plan**, not a test execution plan
- Verification is manual review, not automated testing
- Focus is on completeness and accuracy of audit artifacts
- Output feeds directly into WINT-7020 migration planning
