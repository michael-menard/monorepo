# WKFL-005 Implementation Task

## Context
You are implementing the doc-sync agent and command for WKFL-005.

## Key Files to Read
1. /Users/michaelmenard/Development/Monorepo/plans/future/workflow-learning/in-progress/WKFL-005/_implementation/PLAN.yaml
2. /Users/michaelmenard/Development/Monorepo/plans/future/workflow-learning/in-progress/WKFL-005/_implementation/KNOWLEDGE-CONTEXT.yaml
3. /Users/michaelmenard/Development/Monorepo/.claude/agents/_shared/FRONTMATTER.md

## Deliverables
1. `.claude/agents/doc-sync.agent.md` - Main agent (haiku model)
2. `.claude/commands/doc-sync.md` - Command wrapper
3. Test execution and verification

## Implementation Phases (from PLAN.yaml)
Follow phases 1-6:
- Phase 1: Setup and Context Loading
- Phase 2: Create doc-sync Agent (main work)
- Phase 3: Create /doc-sync Command Wrapper
- Phase 4: Documentation and Pre-commit Hook
- Phase 5: Testing and Verification
- Phase 6: Cleanup and Finalization

## Critical Requirements
- Model: haiku (fast text processing)
- Use git diff for change detection, timestamps as fallback
- Parse YAML frontmatter from agent/command files
- Update docs/workflow/phases.md sections
- Generate Mermaid diagrams from spawns field
- Draft changelog entries with [DRAFT] marker
- Create SYNC-REPORT.md with all sections

## Acceptance Criteria to Test
- AC-1: New agent detection → doc update
- AC-2: Frontmatter changes → table update
- AC-3: Spawn fields → Mermaid diagram regeneration
- AC-4: Changes → Changelog entry drafting
- AC-5: SYNC-REPORT.md generation
- AC-6: /doc-sync command works + pre-commit hook docs

## Output
Write implementation log to:
/Users/michaelmenard/Development/Monorepo/plans/future/workflow-learning/in-progress/WKFL-005/_implementation/IMPLEMENTATION-LOG.md

Signal when complete:
- DOC-SYNC IMPLEMENTATION COMPLETE
- DOC-SYNC IMPLEMENTATION BLOCKED: reason
