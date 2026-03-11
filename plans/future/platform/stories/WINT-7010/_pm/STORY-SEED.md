---
generated: "2026-02-14"
baseline_used: "/Users/michaelmenard/Development/monorepo/plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: WINT-7010

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Knowledge base lessons not available (acceptable for audit story)

### Relevant Existing Features

| Feature | Location | Status | Relevance |
|---------|----------|--------|-----------|
| Agent directory | `.claude/agents/` | Active | Primary audit target |
| Agent files | 143 `.agent.md` files | Active | Files to be cataloged |
| Shared resources | `.claude/agents/_shared/` | Active | Cross-references to map |
| Reference directory | `.claude/agents/_reference/` | Active | Documentation structure |
| Archive directory | `.claude/agents/_archive/` | Active | Historical agents |
| Migration directory | `.claude/agents/_migration/` | Active | Migration tracking |

### Active In-Progress Work

| Story ID | Title | Status | Potential Overlap |
|----------|-------|--------|-------------------|
| None | N/A | N/A | No overlapping work detected |

### Constraints to Respect

- **Protected Features**: Agent directory structure is in active use by all workflows
- **Read-Only Operation**: This is an audit story - no modifications to agents allowed
- **Comprehensive Scope**: Must catalog ALL agent files and cross-references
- **Documentation Focus**: Output is documentation/analysis, not code changes

---

## Retrieved Context

### Related Endpoints
N/A - This is a documentation/audit story with no API endpoints.

### Related Components

| Component | Location | Purpose |
|-----------|----------|---------|
| Agent files | `.claude/agents/*.agent.md` | Core agent definitions (143 files) |
| Shared modules | `.claude/agents/_shared/*.md` | Cross-agent shared resources (17 files) |
| Reference patterns | `.claude/agents/_reference/patterns/*.md` | Spawn and workflow patterns |
| Reference schemas | `.claude/agents/_reference/schemas/*.md` | YAML schema documentation |
| Reference examples | `.claude/agents/_reference/examples/*.md` | Code examples and patterns |
| Commands | `.claude/commands/*.md` | Command files that reference agents |

### Reuse Candidates

- **Grep tool**: Use for scanning agent cross-references
- **Glob tool**: Use for finding all agent files by pattern
- **Bash tools**: Use for directory structure analysis
- **Graph visualization**: Consider mermaid/graphviz for agent dependency graph

---

## Knowledge Context

### Lessons Learned
No lessons loaded (KB query skipped for audit story). No past audit stories to learn from.

### Blockers to Avoid (from past stories)
- None identified - this is a foundational audit story

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-001 | API Path Schema | Not applicable (no API work) |
| ADR-005 | Testing Strategy | Not applicable (audit work) |
| ADR-006 | E2E Tests Required | Not applicable (no code changes) |

### Patterns to Follow
- **Lazy loading**: Reference content loaded on-demand (per `_reference/README.md`)
- **Frontmatter metadata**: Agent files use YAML frontmatter for metadata
- **Spawned-by tracking**: `spawned_by` field tracks agent hierarchy
- **Version tracking**: Semantic versioning for agent definitions
- **Permission levels**: `permission_level` field defines agent capabilities

### Patterns to Avoid
- **Modifying agents**: This is audit-only, no agent modifications
- **Incomplete scanning**: Must catalog all files, not just a sample
- **Missing cross-references**: Must track all `.claude/agents/` path references

---

## Conflict Analysis

No conflicts detected.

---

## Story Seed

### Title
Audit Agent Directory References

### Description

This story is the foundation for WINT Phase 7 (Migration), which will ultimately migrate agents to a new database-driven structure. Before any migration can occur, we need a complete understanding of the current agent directory structure, all agent files, their relationships, and all cross-references throughout the codebase.

**Context**: The `.claude/agents/` directory contains 143+ agent definition files organized into:
- Root-level agent files (143 `.agent.md` files)
- Shared resources (`_shared/` - 17 files)
- Reference documentation (`_reference/` with patterns, schemas, examples)
- Archive and migration subdirectories

These agents reference each other through:
- `spawned_by` frontmatter metadata
- Direct file path references in agent instructions
- Shared module includes
- Command files that orchestrate multi-agent workflows

**Problem**: Without a comprehensive catalog of all agents and their interconnections, any migration effort risks:
- Breaking agent spawn chains
- Missing critical cross-references
- Losing shared resource dependencies
- Creating orphaned or unreachable agents

**Solution**: Conduct a thorough audit to create a complete map of:
1. All agent files and their metadata (type, version, permissions, spawned-by)
2. Directory structure and organization patterns
3. Cross-references between agents (spawned-by relationships)
4. References to agents from commands and other documentation
5. Shared resource dependencies
6. Reference documentation structure

This audit will produce documentation artifacts that inform WINT-7020 (Create Agent Migration Plan).

### Initial Acceptance Criteria

- [ ] AC-1: Catalog all agent files in `.claude/agents/` with frontmatter metadata (name, type, version, permission_level, spawned_by)
- [ ] AC-2: Document directory structure including `_shared/`, `_reference/`, `_archive/`, `_migration/` subdirectories
- [ ] AC-3: Map agent spawn relationships from `spawned_by` frontmatter fields
- [ ] AC-4: Identify all cross-references to `.claude/agents/` paths from command files
- [ ] AC-5: Identify all cross-references between agents (agent-to-agent references)
- [ ] AC-6: Document shared resource dependencies (`_shared/*.md` includes)
- [ ] AC-7: Catalog reference documentation structure (`_reference/patterns/`, `_reference/schemas/`, `_reference/examples/`)
- [ ] AC-8: Create agent dependency graph visualization (agent spawn hierarchy)
- [ ] AC-9: Identify any orphaned agents (not referenced by any command or spawned_by chain)
- [ ] AC-10: Document findings in structured format (YAML + markdown) for consumption by WINT-7020

### Non-Goals

- **Agent modifications**: This story does NOT modify any agent files
- **Migration execution**: This story does NOT perform the migration (that's WINT-7030-7090)
- **New agent creation**: This story does NOT create new agents
- **Schema design**: This story does NOT design the new database schema (that's WINT-7020)
- **Code refactoring**: This story does NOT refactor agent logic
- **Testing**: This story does NOT test agent functionality
- **Workflow changes**: This story does NOT change how agents are invoked

### Reuse Plan

- **Components**:
  - Grep tool for scanning cross-references
  - Glob tool for finding all `.agent.md` files
  - Bash tools for directory structure analysis

- **Patterns**:
  - Frontmatter parsing (YAML frontmatter in agent files)
  - Graph visualization (mermaid diagrams for agent relationships)
  - Documentation structure (follow existing WINT artifact patterns)

- **Packages**:
  - N/A (documentation work, no package dependencies)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer
- **Test plan not applicable**: This is an audit/documentation story
- **Verification approach**: Manual review of completeness
  - Verify all 143+ agent files are cataloged
  - Verify all subdirectories are documented
  - Verify cross-reference scanning is exhaustive
  - Spot-check agent metadata extraction accuracy

### For UI/UX Advisor
- **UI/UX not applicable**: No user interface work
- **Documentation UX**: Consider readability and structure of audit findings
  - Use tables for agent catalogs
  - Use mermaid diagrams for visualizations
  - Use YAML for structured data (parseable by WINT-7020)

### For Dev Feasibility
- **Implementation approach**: Use filesystem scanning + grep pattern matching
  - Phase 1: Scan and catalog all `.agent.md` files with frontmatter
  - Phase 2: Extract directory structure
  - Phase 3: Map spawn relationships from `spawned_by` metadata
  - Phase 4: Scan for cross-references in commands and agents
  - Phase 5: Identify shared resource dependencies
  - Phase 6: Generate dependency graph
  - Phase 7: Identify orphaned agents
  - Phase 8: Write findings to structured artifacts

- **Tools needed**:
  - Glob: `**/*.agent.md` pattern
  - Grep: `spawned_by:`, `\.claude/agents/`, `include.*agents`
  - Bash: Directory tree, file counts, metadata extraction

- **Output artifacts**:
  - `AGENT-CATALOG.yaml` - Structured catalog of all agents
  - `DIRECTORY-STRUCTURE.md` - Directory organization
  - `CROSS-REFERENCES.yaml` - All agent cross-references
  - `SPAWN-GRAPH.md` - Mermaid diagram of spawn relationships
  - `SHARED-DEPENDENCIES.yaml` - Shared resource usage
  - `ORPHANED-AGENTS.yaml` - Agents not in spawn chain or command references
  - `AUDIT-SUMMARY.md` - Executive summary of findings

- **Estimated effort**: Low complexity, high thoroughness requirement
  - Most work is systematic scanning and cataloging
  - Graph visualization is straightforward with mermaid
  - Main risk is missing cross-references (requires exhaustive grep patterns)

- **Blocking issues**: None - all data is available in filesystem
