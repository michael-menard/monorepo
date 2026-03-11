---
generated: "2026-02-14"
baseline_used: "/Users/michaelmenard/Development/monorepo/plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: false
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: WINT-0150

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No lessons learned or ADRs available for this domain yet

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| doc-sync Command | `.claude/commands/doc-sync.md` | Existing command definition that needs a corresponding Skill wrapper |
| doc-sync Agent | `.claude/agents/doc-sync.agent.md` | Existing worker agent that performs the sync logic |
| Skills Pattern | `.claude/skills/review/`, `.claude/skills/qa-gate/` | Established pattern for creating reusable Skills |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| None | N/A | No conflicts detected |

### Constraints to Respect

- Skills are defined in `.claude/skills/{skill-name}/SKILL.md` format
- Skills contain YAML frontmatter with metadata (name, description, mcp_tools_available)
- Skills document execution phases, parameters, and integration patterns
- doc-sync command already exists and is functional
- doc-sync agent already exists and performs the work

---

## Retrieved Context

### Related Endpoints
- N/A (this is a documentation/CLI tooling feature, not an API feature)

### Related Components

**Existing Skills:**
- `/review` - `.claude/skills/review/SKILL.md` - Comprehensive code review with parallel specialists
- `/qa-gate` - `.claude/skills/qa-gate/SKILL.md` - Quality gate decision with persistent YAML output

**Existing Commands:**
- `/doc-sync` - `.claude/commands/doc-sync.md` - Documentation sync command definition

**Existing Agents:**
- `doc-sync.agent.md` - Worker agent for documentation synchronization

### Reuse Candidates

**Pattern to Follow:**
- Skill structure from `/review` and `/qa-gate`
- YAML frontmatter format with `name`, `description`, `mcp_tools_available`
- Section organization: Description, Usage, Parameters, Execution Instructions, Examples
- Integration documentation with other commands

**Files to Reference:**
- `.claude/skills/review/SKILL.md` - Template for multi-phase skill with sub-agents
- `.claude/skills/qa-gate/SKILL.md` - Template for simpler skill with specialist reviews
- `.claude/commands/doc-sync.md` - Existing command spec to extract requirements from

---

## Knowledge Context

### Lessons Learned
- No lessons learned records available yet for WINT epic or Skills domain
- This is a foundational story in Wave 1 with no dependencies

### Blockers to Avoid (from past stories)
- None documented yet

### Architecture Decisions (ADRs)
- No ADRs loaded (ADR-LOG.md not available or not relevant to this story)

### Patterns to Follow
- **Skills Directory Structure**: `.claude/skills/{skill-name}/SKILL.md`
- **YAML Frontmatter**: Include `name`, `description`, and `mcp_tools_available` fields
- **Documentation Completeness**: Cover all parameters, flags, phases, and examples
- **Agent Integration**: Document how the Skill invokes the corresponding Agent

### Patterns to Avoid
- Don't create the Skill without referencing existing command/agent specs
- Don't duplicate logic that already exists in the agent file
- Don't skip integration documentation

---

## Conflict Analysis

No conflicts detected.

---

## Story Seed

### Title
Create doc-sync Skill

### Description

**Context:**
The doc-sync command and agent already exist in the codebase, providing automated synchronization of workflow documentation when agent/command files change. However, there is currently no formal Skill definition that wraps this functionality and provides the user-facing interface.

**Problem:**
Users need a standardized, well-documented Skill interface to invoke the doc-sync functionality. Skills provide:
- Consistent YAML-based metadata for tooling integration
- Comprehensive execution phase documentation
- Clear parameter and flag specifications
- Integration patterns with other workflows

**Solution:**
Create a Skill definition file at `.claude/skills/doc-sync/SKILL.md` that:
1. Wraps the existing `/doc-sync` command functionality
2. Documents all execution phases (file discovery, frontmatter parsing, section mapping, documentation updates, etc.)
3. Specifies all parameters and flags (`--check-only`, `--force`)
4. Provides usage examples and integration patterns
5. Links to the underlying `doc-sync.agent.md` worker agent

This Skill will serve as the user-facing interface and complete documentation for the doc-sync capability, enabling it to be invoked consistently and integrated into larger workflows.

### Initial Acceptance Criteria

- [ ] **AC-1**: Create `.claude/skills/doc-sync/SKILL.md` file with proper YAML frontmatter
  - Include `name: doc-sync`
  - Include `description` field summarizing the Skill's purpose
  - Include `mcp_tools_available` (if any MCP tools are used)

- [ ] **AC-2**: Document all parameters and flags
  - `--check-only` flag for dry-run mode
  - `--force` flag to process all files regardless of git status
  - Clear explanation of when each flag should be used

- [ ] **AC-3**: Document execution phases matching agent implementation
  - Phase 1: File Discovery (git diff vs timestamp fallback)
  - Phase 2: Frontmatter Parsing (YAML extraction)
  - Phase 3: Section Mapping (agent patterns to documentation sections)
  - Phase 4: Documentation Updates (tables, diagrams)
  - Phase 5: Mermaid Diagram Regeneration
  - Phase 6: Changelog Entry Drafting
  - Phase 7: SYNC-REPORT.md Generation

- [ ] **AC-4**: Provide comprehensive usage examples
  - Full sync after creating new agent
  - Pre-commit hook workflow
  - Check-only mode for validation
  - Force mode for complete rebuild

- [ ] **AC-5**: Document integration patterns
  - Pre-commit hook integration
  - Integration with `/pm-story`, `/dev-implement-story`, `/elab-story`
  - Relationship to `doc-sync.agent.md`

- [ ] **AC-6**: Document output artifacts
  - `SYNC-REPORT.md` structure
  - Modified documentation files in `docs/workflow/`
  - Exit codes for `--check-only` mode

- [ ] **AC-7**: Include troubleshooting section
  - Common issues and resolutions
  - Invalid YAML frontmatter handling
  - Mermaid diagram validation failures
  - Out-of-sync detection problems

### Non-Goals

- **Do not modify the existing `doc-sync.agent.md`** - this story is only about creating the Skill wrapper
- **Do not change the existing `/doc-sync` command implementation** - only document it
- **Do not implement new features** - this is documentation and standardization only
- **Do not modify other Skills** - this is a standalone Skill creation
- **Do not create unit tests** - Skills are documentation artifacts, not code

### Reuse Plan

**Components to Reference:**
- `.claude/skills/review/SKILL.md` - Structure and formatting template
- `.claude/skills/qa-gate/SKILL.md` - Simpler skill pattern
- `.claude/commands/doc-sync.md` - Existing command specification
- `.claude/agents/doc-sync.agent.md` - Implementation details for execution phases

**Patterns to Follow:**
- YAML frontmatter structure from existing Skills
- Section organization: Description → Usage → Parameters → Execution → Examples
- Phase-based execution documentation
- Integration patterns documentation

**Packages/Tools:**
- No packages required (this is a documentation task)
- Tools: Read (for examining existing files), Write (for creating the Skill file)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer
- **No traditional testing needed** - this is a documentation artifact
- **Validation approach**: Manually verify that the Skill documentation accurately reflects the command and agent behavior
- **Completeness check**: Ensure all flags, phases, and examples from the command are documented in the Skill
- **Cross-reference check**: Verify alignment between command spec, agent spec, and Skill spec

### For UI/UX Advisor
- **Documentation UX**: Ensure the Skill documentation is clear, scannable, and easy to navigate
- **Examples quality**: Verify examples are realistic and cover common use cases
- **Error handling**: Ensure troubleshooting section addresses common user pain points
- **Discoverability**: Consider how users will find and understand when to use this Skill vs the command directly

### For Dev Feasibility
- **Implementation scope**: This is purely documentation - no code changes required
- **File location**: Create `.claude/skills/doc-sync/` directory and `SKILL.md` file
- **Content extraction**: Extract execution phases from `doc-sync.agent.md` (lines 40-307)
- **Cross-reference**: Ensure consistency with `doc-sync.md` command spec (lines 1-308)
- **Estimated effort**: XS (1-2 hours to extract, organize, and format existing documentation)
- **Risk**: Low - no code changes, no dependencies, straightforward documentation task
