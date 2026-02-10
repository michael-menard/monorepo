---
id: WKFL-005
title: "Doc Sync Agent"
status: uat
priority: P0
phase: foundation
created_at: 2026-02-07T12:00:00-07:00
elaborated_at: 2026-02-07T12:00:00-07:00
qa_verified_at: 2026-02-07T19:30:00Z
epic: workflow-learning
prefix: WKFL
tags:
  - foundation
  - documentation
  - automation
---

# WKFL-005: Doc Sync Agent

## Context

The workflow documentation in `docs/workflow/` describes the multi-agent development process, including agent architecture, commands, and phase flows. This documentation is manually maintained and prone to drift as agents and commands evolve.

Currently, there are 90+ agents in `.claude/agents/` and 23+ commands in `.claude/commands/`, each with YAML frontmatter containing metadata like model assignments, triggers, and spawn relationships. When agents change, developers must manually update multiple documentation files to keep tables, diagrams, and references in sync.

This manual process leads to:
- **Documentation drift:** Docs lag behind code changes
- **Outdated diagrams:** Mermaid flow charts don't reflect current agent structure
- **Missing changelog entries:** Version history incomplete
- **Inconsistent metadata:** Agent tables show stale information

## Goal

Create an automated agent that keeps workflow documentation synchronized with agent and command file changes, ensuring documentation remains accurate and up-to-date.

The `doc-sync` agent will:
1. Detect changes to agent and command files (via git diff or file timestamps)
2. Parse YAML frontmatter to extract metadata
3. Update relevant sections in `docs/workflow/` files
4. Regenerate Mermaid diagrams based on spawn relationships
5. Draft changelog entries with appropriate version bumps
6. Generate a SYNC-REPORT.md showing what changed

## Non-Goals

- Full documentation generation from scratch (only updates existing docs)
- Documentation for non-workflow files (README, tech docs, etc.)
- Semantic understanding of code changes (only metadata sync)
- Automatic git commits (manual review and commit preferred)
- Multi-repository documentation sync (single repo only)

## Scope

### In Scope

**Core Capabilities:**
- File change detection for `.claude/agents/*.agent.md` and `.claude/commands/*.md`
- YAML frontmatter parsing using `.claude/agents/_shared/FRONTMATTER.md` standard
- Documentation section updates in `docs/workflow/phases.md`, `README.md`, `agent-system.md`
- Mermaid diagram regeneration based on `spawns:` field in frontmatter
- Changelog entry drafting with semver version bump logic
- SYNC-REPORT.md output summarizing all changes

**Deliverables:**
- `.claude/agents/doc-sync.agent.md` (haiku model)
- `.claude/commands/doc-sync.md` command wrapper
- SYNC-REPORT.md schema and example
- Documentation for pre-commit hook integration (optional)

**Protected Features (Must Not Modify):**
- Existing FRONTMATTER.md standard
- docs/workflow/ file structure
- Agent naming conventions
- Mermaid diagram patterns

### Out of Scope

- Other documentation files (CLAUDE.md, package README files, etc.)
- Code documentation (JSDoc, inline comments)
- Automatic pre-commit hook installation (manual only)
- Watch mode or continuous sync
- Remote documentation sync (local filesystem only)

## Acceptance Criteria

### AC-1: New Agent Detection and Documentation Update
**Given** a new agent file is created in `.claude/agents/`
**When** `/doc-sync` is run
**Then** the "Agents & Sub-Agents" section in `docs/workflow/phases.md` is updated with the new agent entry
**And** SYNC-REPORT.md lists the new file in `files_changed`
**And** the appropriate phase section includes the new agent in its table

**Verification:**
- Create `.claude/agents/test-new-agent.agent.md` with valid frontmatter
- Run `/doc-sync`
- Verify git diff shows additions to `docs/workflow/phases.md`
- Verify SYNC-REPORT.md contains new agent in files_changed array

### AC-2: Agent Frontmatter Changes Update Tables
**Given** an existing agent's frontmatter is modified (e.g., model changed from haiku to sonnet)
**When** `/doc-sync` is run
**Then** the Model Assignments table in documentation is updated
**And** SYNC-REPORT.md shows the modified agent in `files_changed`

**Verification:**
- Modify frontmatter of existing agent
- Run `/doc-sync`
- Verify table shows updated model value
- Verify SYNC-REPORT.md identifies the change

### AC-3: Mermaid Diagram Regeneration
**Given** an agent is added with a `spawns:` field listing worker agents
**When** `/doc-sync` is run
**Then** Mermaid diagrams showing agent relationships are regenerated
**And** the new spawn relationships are reflected in the diagram
**And** SYNC-REPORT.md lists regenerated diagrams in `diagrams_regenerated`

**Verification:**
- Add agent with `spawns: [worker1, worker2]` in frontmatter
- Run `/doc-sync`
- Verify Mermaid syntax includes new nodes and edges
- Validate Mermaid syntax is parseable
- Verify SYNC-REPORT.md lists affected diagrams

### AC-4: Changelog Entry Drafting
**Given** agent or command files have changed
**When** `/doc-sync` is run
**Then** a changelog entry is drafted with the correct version bump (major/minor/patch)
**And** the entry is marked with [DRAFT] tag
**And** SYNC-REPORT.md includes the changelog_entry field

**Verification:**
- Make changes to agent files
- Run `/doc-sync`
- Verify `docs/workflow/changelog.md` has new [DRAFT] entry
- Verify version number is incremented appropriately
- Verify SYNC-REPORT.md shows proposed version

### AC-5: SYNC-REPORT.md Generation
**Given** any sync operation completes
**When** `/doc-sync` finishes
**Then** SYNC-REPORT.md is generated showing:
  - `files_changed` (list of agent/command files)
  - `sections_updated` (list of documentation sections modified)
  - `diagrams_regenerated` (list of Mermaid diagrams updated)
  - `manual_review_needed` (any edge cases requiring human review)
  - `changelog_entry` (proposed version and description)

**Verification:**
- Run `/doc-sync` with various change scenarios
- Verify SYNC-REPORT.md contains all required sections
- Verify counts and lists are accurate

### AC-6: Command and Pre-commit Hook Integration
**Given** the `/doc-sync` command exists
**When** a developer runs `/doc-sync`
**Then** the sync operation executes successfully
**And** documentation for optional pre-commit hook integration is available

**Verification:**
- Run `/doc-sync` from command line
- Verify successful execution
- Verify hook documentation exists with installation instructions
- Test `--check-only` flag for pre-commit validation

## Reuse Plan

### Must Reuse

| Component | Location | Usage |
|-----------|----------|-------|
| Frontmatter Standard | `.claude/agents/_shared/FRONTMATTER.md` | Parse agent/command metadata |
| Workflow Docs Structure | `docs/workflow/*.md` | Target files for updates |
| Mermaid Patterns | Existing diagrams in docs | Template for diagram generation |
| Git Integration | Existing git workflows | Detect changed files |

### May Create

| Component | Purpose |
|-----------|---------|
| `doc-sync.agent.md` | Main sync agent logic |
| `/doc-sync` command | CLI wrapper for agent |
| SYNC-REPORT.md schema | Standardized report format |
| Section mapping config | Map agent patterns to doc sections |

### Integration Points

- **Read:** `.claude/agents/*.agent.md`, `.claude/commands/*.md`
- **Write:** `docs/workflow/phases.md`, `docs/workflow/README.md`, `docs/workflow/changelog.md`
- **Output:** `SYNC-REPORT.md` (story or run-level artifact)

## Architecture Notes

### Agent Design

**Model:** Haiku (fast, simple text processing)

**Permissions:** Read/Write filesystem, Git operations

**Core Logic:**
1. **Discovery Phase:** Scan `.claude/agents/` and `.claude/commands/` for changes
2. **Parsing Phase:** Extract YAML frontmatter from changed files
3. **Analysis Phase:** Determine which doc sections need updates
4. **Update Phase:** Modify documentation files atomically
5. **Diagram Phase:** Regenerate Mermaid based on spawn relationships
6. **Report Phase:** Generate SYNC-REPORT.md

### Section Mapping

```yaml
section_mapping:
  pm-*.agent.md: "Phase 2: PM Story Generation"
  elab-*.agent.md: "Phase 3: QA Elaboration"
  dev-*.agent.md: "Phase 4: Dev Implementation"
  code-review-*.agent.md: "Phase 5: Code Review"
  qa-*.agent.md: "Phase 6/7: QA Verification"
  workflow-*.agent.md: "Cross-cutting concerns section"
```

### Version Bump Logic

| Change Type | Example | Version Bump |
|-------------|---------|--------------|
| New agent file | Add `workflow-retro.agent.md` | Minor (2.5.0 → 2.6.0) |
| Modify frontmatter | Change model haiku→sonnet | Patch (2.5.0 → 2.5.1) |
| Structural change | Add new phase | Major (2.5.0 → 3.0.0) |
| Delete agent | Remove deprecated agent | Minor (2.5.0 → 2.6.0) |

### Mermaid Generation Algorithm

1. Parse all agents with `spawns:` field
2. Build graph: `leader → worker` edges
3. Group by phase/domain
4. Generate Mermaid syntax:
   ```mermaid
   graph TD
       leader[Leader Agent] --> worker1[Worker 1]
       leader --> worker2[Worker 2]
       worker1 --> subagent[Sub-Agent]
   ```
5. Validate syntax using mermaid-cli or regex validator
6. On validation failure, preserve existing diagram and warn in SYNC-REPORT.md

### Error Handling

| Error | Mitigation |
|-------|-----------|
| Invalid YAML | Skip file, log to manual_review_needed |
| Missing required fields | Warn but continue processing |
| Documentation file missing | Fail fast with clear error message |
| Mermaid validation fails | Preserve existing diagram, warn in report |
| Concurrent file edits | Require clean git working directory |

## Infrastructure Notes

### File System Operations

- **Read paths:**
  - `.claude/agents/*.agent.md`
  - `.claude/commands/*.md`
  - `docs/workflow/*.md`
- **Write paths:**
  - `docs/workflow/phases.md`
  - `docs/workflow/README.md`
  - `docs/workflow/agent-system.md`
  - `docs/workflow/changelog.md`
  - `SYNC-REPORT.md`

### Git Integration

```bash
# Detect changed files
git diff --cached --name-only | grep -E '\.claude/(agents|commands)/'

# Check working directory clean
git status --porcelain | grep -E 'docs/workflow'

# Validate before sync
if [[ -n $(git status --porcelain docs/workflow/) ]]; then
  echo "ERROR: docs/workflow/ has uncommitted changes"
  exit 1
fi
```

### Pre-commit Hook (Optional)

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Check if agent/command files changed
if git diff --cached --name-only | grep -q ".claude/agents/\|.claude/commands/"; then
  echo "Agent/command files changed, checking documentation sync..."

  # Run doc-sync in check-only mode
  /doc-sync --check-only

  if [ $? -ne 0 ]; then
    echo "ERROR: Documentation out of sync with agent changes."
    echo "Run '/doc-sync' to update documentation, then stage and commit."
    exit 1
  fi
fi

exit 0
```

## Test Plan

**See:** `_pm/TEST-PLAN.md`

### Summary

**Happy Path Tests:**
- Add new agent file → doc updated
- Modify agent frontmatter → tables updated
- Add agent with spawns → diagrams regenerated
- Add new command → command tables updated
- No changes detected → report shows empty changes

**Error Cases:**
- Invalid YAML frontmatter → graceful skip with error log
- Missing required fields → warning, continue processing
- Documentation file missing → fail with clear error

**Edge Cases:**
- Multiple simultaneous changes → all processed correctly
- Agent deletion → removed from docs and diagrams
- Large frontmatter blocks → no performance issues
- Special characters in descriptions → proper escaping
- Pre-commit hook integration → blocks commit if out of sync

**Evidence Required:**
- SYNC-REPORT.md with accurate change summary
- Git diff showing documentation updates
- Valid Mermaid syntax in generated diagrams
- Proper version bumps in changelog

## Reality Baseline

### Existing Documentation Structure

**Primary Files:**
- `docs/FULL_WORKFLOW.md` - Redirects to split docs
- `docs/workflow/README.md` - Overview and state diagrams
- `docs/workflow/phases.md` - Detailed phase documentation
- `docs/workflow/agent-system.md` - Agent architecture
- `docs/workflow/changelog.md` - Version history

**Current State:**
- Documentation split across 8 focused files
- Heavy use of Mermaid diagrams for visualization
- Table-based agent and command listings
- Manual update process (prone to drift)

### Agent Ecosystem

**Agent Files:** 90+ agents in `.claude/agents/`

**Naming Patterns:**
- `{domain}-{purpose}-{type}.agent.md`
- Examples: `pm-story-generation-leader.agent.md`, `dev-implement-backend-coder.agent.md`

**Frontmatter Standard:** `.claude/agents/_shared/FRONTMATTER.md`

**Required Fields:** `created`, `updated`, `version`

**Optional Fields:** `type`, `triggers`, `name`, `description`, `model`, `tools`, `spawns`

### Command Ecosystem

**Command Files:** 23+ commands in `.claude/commands/`

**Naming Pattern:** `{command-name}.md`

**Examples:** `pm-story.md`, `dev-implement-story.md`, `elab-story.md`

### Section Mapping (Current)

| Agent Pattern | Documentation Section |
|---------------|-----------------------|
| pm-*.agent.md | Phase 2: PM Story Generation |
| elab-*.agent.md | Phase 3: QA Elaboration |
| dev-*.agent.md | Phase 4: Dev Implementation |
| code-review-*.agent.md | Phase 5: Code Review |
| qa-*.agent.md | Phase 6/7: QA Verification |

### Known Gaps

**Gap 1:** No automated sync mechanism exists today

**Gap 2:** Documentation updates often lag agent changes by days/weeks

**Gap 3:** Mermaid diagrams become outdated as agent spawn relationships change

**Gap 4:** Changelog entries are manually written and sometimes missed

## Estimated Effort

**Story Points:** 3 (approximately 1-2 days)

**Breakdown:**
- Agent logic (file scanning, parsing): 0.5 days
- Documentation update logic: 0.5 days
- Mermaid generation: 0.5 days
- Testing and refinement: 0.5 days

**Token Budget:** 40,000 tokens

**Risk Level:** Low (straightforward file operations, no complex dependencies)

---

## QA Discovery Notes

**Elaboration Date:** 2026-02-07
**Elaboration Verdict:** PASS (Unconditional)
**Elaborator:** QA Elaboration Agent (Autonomous Mode)

### Summary

This story was elaborated in autonomous mode and found to be **exceptionally well-formed** with zero MVP-critical gaps. All 8 audit checks passed, and the story is ready for immediate implementation without modifications.

### 8-Point Audit Results

| Criterion | Status | Key Finding |
|-----------|--------|-------------|
| Scope Alignment | PASS | Index and story fully aligned |
| Internal Consistency | PASS | No goal/non-goal contradictions |
| Reuse-First | PASS | Reuse plan identifies existing components |
| Ports & Adapters | PASS | Core logic transport-agnostic |
| Local Testability | PASS | All 6 ACs testable locally with verification steps |
| Decision Completeness | PASS | Zero blocking TBDs |
| Risk Disclosure | PASS | Risk level stated with mitigations |
| Story Sizing | PASS | 6 ACs, 3 story points, well-scoped |

### MVP-Critical Gaps

**Count:** 0

No gaps identified that would block the core user journey or AC completion.

### Non-Blocking Findings

**Count:** 6 (detailed in `_implementation/FUTURE-OPPORTUNITIES.md`)

All findings are quality enhancements or implementation details:

1. **Formal SYNC-REPORT Schema** - Zod schema definition for report format (quality enhancement)
2. **Change Detection Strategy** - Smart fallback for git diff vs timestamps (implementation detail)
3. **Mermaid Validation** - Regex vs mermaid-cli choice (implementation detail)
4. **Hook Documentation Location** - Where to write installation instructions (documentation detail)
5. **Section Mapping Format** - Config file vs hardcoded (architecture detail)
6. **Concurrent Run Protection** - Lock file vs git check (edge case handling)

**Why Non-Blocking:** The story provides sufficient guidance for implementation. These findings are suggestions for the developer, not requirements. Each includes rationale for why it's non-blocking.

### Strengths

This story exemplifies exceptional PM work:

1. **Complete Verification Steps** - Each AC includes specific commands and expected outputs
2. **Comprehensive Architecture** - Algorithms, decision tables, error handling matrices provided
3. **Reality Baseline** - Current system state documented (90+ agents, doc structure)
4. **Thorough Test Plan** - Happy path, error cases, edge cases with evidence requirements

### Recommendations for Implementation

1. **Proceed Immediately** - No story modifications needed
2. **Reference Architecture Notes** - Use as implementation guide (phases, algorithms, error handling)
3. **Consider Future Opportunities** - Review opportunities 1-3 (low effort, high value)
4. **Test Incrementally** - Use verification steps in each AC as you complete them

### Token Budget Status

- **Analysis Phase:** ~10,000 tokens
- **Documentation Phase:** ~8,000 tokens
- **Total Elaboration:** ~18,000 tokens
- **Remaining for Implementation:** ~22,000 tokens
- **Status:** Well within 40,000 token budget

### Autonomous Decisions Made

1. **Proceed without story modifications** - Zero MVP-critical gaps justify immediate implementation
2. **Document findings as future opportunities** - All 6 findings are non-blocking enhancements
3. **Defer KB writes** - No general-purpose lessons identified during elaboration
4. **Mark as unconditional PASS** - All audit checks passed with no conditions

### Reference for Future Stories

This story should be referenced as an example of well-formed stories that:
- Minimize elaboration overhead
- Maximize implementation velocity
- Include verification steps in ACs
- Provide architecture details without over-constraining
- Document reality baseline to reduce unknowns

### Files Created During Elaboration

- `_implementation/ANALYSIS.md` - Detailed 8-point audit
- `_implementation/FUTURE-OPPORTUNITIES.md` - 8 enhancement opportunities
- `_implementation/DECISIONS.yaml` - Autonomous decisions log
- `ELAB-WKFL-005.md` - Full elaboration report

**Next Steps:**
1. Move to `ready-to-work/` directory
2. Update story status to `ready-to-work`
3. Update `stories.index.md`
4. Assign to developer

**Elaboration Outcome:** PASS - Ready for implementation
