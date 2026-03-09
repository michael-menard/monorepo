# Dev Feasibility Review: WINT-7010

## Feasibility Summary

- **Feasible for MVP**: Yes
- **Confidence**: High
- **Why**: Audit is purely read-only filesystem scanning with well-defined scope. All required data exists in `.claude/agents/` directory. No code changes, no external dependencies, no breaking changes.

---

## Likely Change Surface (Core Only)

### Areas/Packages
- **None**: This is a documentation story with no code changes

### Filesystem Targets
- **Read-only**: `.claude/agents/` directory
  - 143+ `.agent.md` files (root level)
  - `_shared/` subdirectory (17 files)
  - `_reference/` subdirectory (patterns, schemas, examples)
  - `_archive/` subdirectory
  - `_migration/` subdirectory
- **Read-only**: `.claude/commands/` directory (for cross-reference scanning)

### Output Artifacts
- `WINT-7010/AGENT-CATALOG.yaml`
- `WINT-7010/DIRECTORY-STRUCTURE.md`
- `WINT-7010/CROSS-REFERENCES.yaml`
- `WINT-7010/SPAWN-GRAPH.md`
- `WINT-7010/SHARED-DEPENDENCIES.yaml`
- `WINT-7010/ORPHANED-AGENTS.yaml`
- `WINT-7010/AUDIT-SUMMARY.md`

### Critical Deploy Touchpoints
- **None**: No deployment required (documentation artifacts only)

---

## MVP-Critical Risks

### Risk 1: Incomplete Agent Discovery
**Why it blocks MVP**: If some agent files are missed, the audit is incomplete and WINT-7020 migration plan will be flawed.

**Required mitigation**:
- Use `Glob` tool with pattern `.claude/agents/**/*.agent.md`
- Validate glob results against manual `find` command
- Cross-check count against baseline expectation (143+ files)

**Verification**:
```bash
# Expected command
find .claude/agents -name "*.agent.md" -type f | wc -l
# Should match catalog entry count
```

---

### Risk 2: Cross-Reference Pattern Gaps
**Why it blocks MVP**: Incomplete cross-reference mapping will cause broken agent spawn chains during migration.

**Required mitigation**:
- Define comprehensive grep patterns:
  - `spawned_by:` (YAML frontmatter)
  - `.claude/agents/` (file path references)
  - `Read:.*agents` (agent file includes)
  - `Task.*agents` (agent spawning)
- Manual spot-check of 10+ known references
- Document grep pattern coverage in CROSS-REFERENCES.yaml

**Verification**:
- Spot-check table in verification plan (Test 4)

---

### Risk 3: Frontmatter Parsing Errors
**Why it blocks MVP**: Malformed YAML frontmatter will cause metadata extraction failures.

**Required mitigation**:
- Implement error handling for YAML parse failures
- Log parse errors with file path
- Include partial metadata for failed parses
- Document parse failures in AUDIT-SUMMARY.md

**Verification**:
- Parse error count logged
- All 143+ agents have at least partial metadata

---

## Missing Requirements for MVP

**None identified**. Story scope is well-defined with clear acceptance criteria.

---

## MVP Evidence Expectations

### Proof Needed for Core Journey

1. **Completeness Proof**:
   - Agent catalog count matches filesystem count
   - All subdirectories documented
   - All artifact files exist

2. **Accuracy Proof**:
   - Spot-check frontmatter extraction (5 agents)
   - Spot-check cross-references (10 references)
   - Spot-check spawn relationships (3 chains)

3. **Usability Proof**:
   - YAML artifacts parse successfully
   - Mermaid graph renders in viewer
   - Audit summary is readable

### Critical CI/Deploy Checkpoints

**None**: This is a documentation story with no CI/deployment requirements.

---

## Implementation Approach

### Phase 1: Scan and Catalog Agent Files
**Tools**: Glob, Read
**Actions**:
- Use `Glob` with pattern `.claude/agents/**/*.agent.md`
- For each file:
  - Read file
  - Extract YAML frontmatter
  - Parse metadata: `name`, `type`, `version`, `permission_level`, `spawned_by`
  - Add to catalog structure

**Output**: In-memory catalog array

---

### Phase 2: Extract Directory Structure
**Tools**: Bash
**Actions**:
- Run `tree .claude/agents` or equivalent
- Count files per subdirectory
- Document organization patterns

**Output**: `DIRECTORY-STRUCTURE.md`

---

### Phase 3: Map Spawn Relationships
**Tools**: In-memory catalog from Phase 1
**Actions**:
- Extract `spawned_by` field from each agent
- Build spawn relationship map
- Identify root agents (no `spawned_by`)
- Identify leaf agents (not spawned by others)

**Output**: Spawn relationship data for graph

---

### Phase 4: Scan Cross-References
**Tools**: Grep
**Actions**:
- Scan `.claude/commands/*.md` for agent references
- Scan `.claude/agents/*.agent.md` for agent-to-agent references
- Scan for shared module includes
- Aggregate all references

**Output**: `CROSS-REFERENCES.yaml`

---

### Phase 5: Identify Shared Dependencies
**Tools**: Grep, catalog
**Actions**:
- List all files in `.claude/agents/_shared/`
- Grep for references to each shared file
- Map which agents use which shared resources

**Output**: `SHARED-DEPENDENCIES.yaml`

---

### Phase 6: Generate Dependency Graph
**Tools**: Mermaid markdown
**Actions**:
- Use spawn relationship data from Phase 3
- Generate Mermaid flowchart syntax
- Group by agent type if graph too complex
- Include legend

**Output**: `SPAWN-GRAPH.md`

---

### Phase 7: Identify Orphaned Agents
**Tools**: Cross-references from Phase 4, catalog
**Actions**:
- Find agents with no `spawned_by` field
- Find agents not referenced in any command file
- Find agents not in any spawn chain
- Separate archive agents from active orphans

**Output**: `ORPHANED-AGENTS.yaml`

---

### Phase 8: Write Findings
**Tools**: Write
**Actions**:
- Write `AGENT-CATALOG.yaml`
- Write `DIRECTORY-STRUCTURE.md`
- Write `CROSS-REFERENCES.yaml`
- Write `SPAWN-GRAPH.md`
- Write `SHARED-DEPENDENCIES.yaml`
- Write `ORPHANED-AGENTS.yaml`
- Write `AUDIT-SUMMARY.md` (executive summary)

**Output**: All 7 artifacts

---

## Estimated Effort

**Story Points**: 2-3
- **Complexity**: Low (systematic scanning and cataloging)
- **Scope**: Medium (143+ files, 7 output artifacts)
- **Risk**: Low (read-only, no code changes)
- **Unknowns**: Minimal (data structure is known)

**Time Estimate**: 2-4 hours
- Phase 1: 30-60 min (glob + frontmatter parsing)
- Phase 2: 15-30 min (directory structure)
- Phase 3: 15-30 min (spawn relationships)
- Phase 4: 30-60 min (cross-reference scanning)
- Phase 5: 15-30 min (shared dependencies)
- Phase 6: 30-45 min (graph generation)
- Phase 7: 15-30 min (orphaned agents)
- Phase 8: 30-60 min (write all artifacts)

---

## Blocking Issues

**None**. All data is available in filesystem. No external dependencies.

---

## Reuse Opportunities

### Tools
- **Glob**: Standard pattern matching for `.agent.md` files
- **Grep**: Standard regex scanning for cross-references
- **Bash**: Standard directory tree analysis

### Patterns
- **Frontmatter Parsing**: Similar to story YAML parsing in other workflows
- **Graph Visualization**: Mermaid syntax (widely used in documentation)
- **YAML Structure**: Consistent with other workflow artifacts

### Future Reuse
- Agent catalog structure can be adapted for database schema (WINT-7020)
- Frontmatter parsing logic reusable for story file migrations
- Cross-reference scanning patterns reusable for dependency analysis

---

## Non-MVP Considerations

Documented in `FUTURE-RISKS.md` (if needed):
- Agent versioning strategy
- Agent deprecation process
- Dynamic agent loading from database
- Agent health monitoring
- Agent performance profiling

**These are out of scope for WINT-7010** and addressed in later WINT-7000 stories.
