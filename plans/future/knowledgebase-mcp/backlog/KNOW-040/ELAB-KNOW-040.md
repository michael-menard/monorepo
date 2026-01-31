# Elaboration Report - KNOW-040

**Date**: 2026-01-25
**Verdict**: FAIL

## Summary

KNOW-040 (Agent Instruction Integration) failed elaboration due to critical issues with target agent file names and specification accuracy. The story references agent files that do not exist in the filesystem (`dev-implementation-leader.agent.md`, `qa-verify-leader.agent.md`, `learnings-recorder.agent.md`), which will cause immediate failure during implementation. Additionally, medium-severity issues require clarification on example syntax format, pilot story selection criteria, KB citation validation, and integration guide placement before proceeding.

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Scope matches index entry. Story modifies 5+ agent instruction files to add KB integration. No endpoints, infrastructure, or packages touched. Creates KB integration guide documentation. All work is documentation-only. |
| 2 | Internal Consistency | PASS | — | Goals align with scope (establish KB-first workflow patterns). Non-goals correctly exclude automated hooks, query logging, bulk agent updates, and KB API changes. AC1-AC10 all reference documentation/instruction file changes. Test plan focuses on file structure validation and pilot story execution. |
| 3 | Reuse-First | PASS | — | Not applicable - story modifies documentation only. No code packages affected. Agent instructions will reference existing kb_search tool from KNOW-0052. |
| 4 | Ports & Adapters | PASS | — | Not applicable - no code changes. KB integration pattern uses existing MCP tool interface (kb_search). Agent instructions act as "adapter" layer between agent reasoning and KB MCP server. |
| 5 | Local Testability | PASS | — | Test plan includes concrete validation steps: grep search for section headers, character count validation, schema validation of examples, pilot story integration test with captured logs. Test 5 (Pilot Story) provides executable evidence requirement. No .http files needed. |
| 6 | Decision Completeness | PASS | — | All key decisions documented: query timing (once at start for leaders), citation format, error handling (soft fail), fallback behavior. No blocking TBDs in Open Questions or Decision sections. |
| 7 | Risk Disclosure | PASS | — | Good risk section (5 risks with mitigations). Covers instruction length growth, over-querying, query relevance, KB unavailability, adoption inconsistency. All major operational concerns addressed. |
| 8 | Story Sizing | PASS | — | 10 AC is reasonable for documentation story. Modifies 5+ files with consistent pattern application. Creates 1 integration guide. Includes pilot story test (most complex AC). Single workflow phase (documentation updates). No backend/frontend split. No split needed. |

## Issues & Required Fixes

| # | Issue | Severity | Required Fix | Status |
|---|-------|----------|--------------|--------|
| 1 | Example query syntax inconsistency | Medium | AC3 and AC10 require examples to use "valid syntax against kb_search schema", but story shows JavaScript-style syntax (`kb_search({ query: "...", role: "dev" })`) instead of MCP tool call JSON syntax. Agent instructions are markdown docs, not executable code. **Fix**: Clarify whether examples should show JSON (MCP protocol format) or pseudo-code for readability? Recommend: pseudo-code with clear comment indicating this is not literal syntax. | OPEN |
| 2 | Target agent file names incorrect | CRITICAL | AC requires modifying `dev-implementation-leader.agent.md` and `qa-verify-leader.agent.md`, but filesystem shows these don't exist. Actual files are: `dev-implement-implementation-leader.agent.md`, `qa-verify-verification-leader.agent.md`, `qa-verify-completion-leader.agent.md`, `qa-verify-setup-leader.agent.md`. **Fix**: Update story to specify correct agent file names or choose alternative agents. Story cannot proceed with non-existent file paths. | BLOCKING |
| 3 | "learnings-recorder.agent.md" file missing | HIGH | Story lists `learnings-recorder.agent.md` as one of 5 required agents, but filesystem shows only `dev-implement-learnings.agent.md` exists. **Fix**: Either correct agent name in story or choose different 5th agent (e.g., `dev-implement-planner.agent.md`). | BLOCKING |
| 4 | Character limit per-section ambiguous | Low | AC9 enforces "≤1500 characters" per section but doesn't define what "section" means. Is it the entire "## Knowledge Base Integration" block (including all subsections), or each subsection individually? **Fix**: Clarify scope of character count in AC9. Recommend: total for entire "## Knowledge Base Integration" block including all subsections. | OPEN |
| 5 | Pilot story selection criteria vague | Medium | AC5 requires "domain has at least 3 relevant KB entries" but doesn't specify how to verify this before starting pilot. **Fix**: Add KB content verification step: query KB for entries matching pilot story domain and confirm ≥3 results exist before execution. | OPEN |
| 6 | KB citation format not validated | Medium | AC6 requires KB citations in agent output but provides no validation mechanism. Pilot story artifact could cite "KB entry 123" without verifying entry 123 exists. **Fix**: Add validation step to AC5: extract cited entry IDs from artifact, verify each ID exists via kb_get. | OPEN |
| 7 | Section placement conflicts with existing structure | Low | AC8 requires KB integration section "After Mission, Before Inputs". But agent files may vary in structure. Some have "## Role" + "## Mission", others have "## Workers", "## Mode Selection", etc. **Fix**: Inspect all 5 target agents first, document actual placement rule as relative instruction. | OPEN |
| 8 | Integration guide location not standardized | Low | AC7 suggests `docs/KB-AGENT-INTEGRATION.md` but uses parenthetical "e.g." indicating uncertainty. **Fix**: Confirm directory structure: does `docs/` already have agent-related docs? Should this be `.claude/KB-AGENT-INTEGRATION.md` for co-location? | OPEN |
| 9 | No validation for "when to query" guidance | Medium | AC1 requires "When to query KB (task triggers)" but doesn't validate that trigger patterns match agent's actual workflow. **Fix**: Template should include workflow analysis step to identify natural KB query injection points. | OPEN |
| 10 | Trigger patterns per agent type inconsistent | Low | AC2 states "Dev agents: minimum 3 patterns, QA agents: minimum 2, PM agents: minimum 2" but doesn't classify selected agents clearly. **Fix**: Clarify agent role classification or simplify to universal "minimum 3 patterns per agent". | OPEN |

## Issues Blocking Implementation

**Critical Issues (Story cannot proceed):**
1. **Issue #2**: Agent file names must be corrected to match filesystem
2. **Issue #3**: Fifth target agent must be clarified/corrected

**High Priority Issues (Must resolve before dev):**
1. **Issue #5**: Pilot story selection verification step needed
2. **Issue #6**: KB citation validation mechanism needed
3. **Issue #9**: Workflow integration validation needed

## Discovery Findings

### Gaps Identified

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | No template for new agent creation | Add as AC | Recommend adding AC11: Update agent creation template/scaffold to include KB integration section by default. Future agents should inherit pattern. |
| 2 | No measurement of KB integration adoption | Out-of-scope | Deferred to KNOW-041 (Query Audit Logging) and future analytics story. Accept. |
| 3 | No guidance for updating KB integration when KB evolves | Add as AC | Recommend adding AC11 (or expanding existing AC7): Document maintenance plan for agent instructions when KB API changes. Include search/replace instructions or validation test suite. |
| 4 | Query patterns don't cover all agent workflow phases | Add as AC | Recommend expanding AC2 to include multiple workflow phases: setup, planning, implementation, verification, learnings. Current scope only covers "before implementation". |
| 5 | No guidance for multi-step query refinement | Add as AC | Recommend adding to KB integration guide: "If no results, broaden query" patterns. Example: "drizzle migration" → "database migration" → "migration patterns". |
| 6 | No examples of role-specific query filtering | Add as AC | Recommend adding guidance to integration guide: "Filter by your role to reduce noise. Use role='dev' for dev agents, role='qa' for QA agents, role='all' only for cross-cutting concerns." |
| 7 | Empty KB scenario not addressed | Out-of-scope | Accept out-of-scope. Fallback behavior covers this: proceed with best judgment. No special handling needed for "KB is completely empty". |
| 8 | Over-querying budget not defined | Add as AC | Recommend clarifying AC2 or adding new AC: "Define query budget: 1-2 queries per major task, max 5 queries per story workflow. Helps agents self-regulate." |
| 9 | No KB citation linting | Add as AC | Recommend adding to integration guide: citation format validation. Consider creating linter script that checks agent output for citation format compliance. |
| 10 | Integration guide doesn't cover worker agents | Add as AC | Recommend clarifying in AC7 (or new AC11): Should worker agents also query KB? If yes, add worker-specific instructions. If no, document reasoning. |

**Impact**: 7 gaps marked "Add as AC" indicate scope expansion. Story needs restructuring: either reduce scope to address only critical issues #2-3, or accept larger story with 15+ ACs covering all gaps.

### Enhancement Opportunities

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | KB query result caching in agent context | Add as AC | High-value: leader agents query KB once, cache results in `_implementation/KB-CONTEXT.md`. Workers read from file instead of re-querying. Reduces API calls and improves consistency. Effort: Medium. |
| 2 | KB-driven decision trees | Add as AC | Power feature: KB entries include decision trees ("If authentication story, consider: OAuth vs JWT vs session-based"). Requires structured KB content and parsing logic. Effort: High. Defer to future story. |
| 3 | Automatic KB result relevance scoring | Add as AC | Medium-value: agents rate each KB result 1-5 for relevance, explain why. Improves reasoning transparency and helps refine KB content. Effort: Medium. |
| 4 | KB query templates per agent type | Add as AC | Reduce duplication: shared query template library `.claude/kb-query-templates.yaml` instead of examples in each agent file. Agents reference templates by type. Effort: Low. High ROI for maintenance. |
| 5 | Integration test automation | Add as AC | High-value: automate AC5 (pilot story test). Create test suite that spawns agent, validates KB query count (1-3), validates citations. Prevents regression. Effort: Medium. |
| 6 | KB result excerpting in citations | Add as AC | Low-value UX enhancement: include relevant excerpt from KB entry in citations. "Per KB entry 123 'Title': 'Use db.transaction()' (excerpt)". Improves traceability. Effort: Low. |
| 7 | KB query suggestions in agent prompts | Add as AC | Low-value UX delight: when agent receives task, suggest KB queries based on task keywords. Requires keyword extraction. Effort: Low. |
| 8 | KB integration verification script | Add as AC | High-value: CI check for all agent files. Validates KB integration sections exist, example syntax, character limits. Script: `scripts/verify-kb-integration.ts`. Prevents drift. Effort: Low. |
| 9 | KB-first workflow metrics dashboard | Add as AC | Medium-value: post-implementation. Requires KNOW-041 query logging. Identifies under-utilized agents, poor queries, KB content gaps. Effort: High. Defer. |
| 10 | Contextual KB query expansion | Add as AC | Low-value research: embedding-based KB query expansion. Returns results matching related concepts. Effort: High. Defer to future. |

**Impact**: 10 enhancements marked "Add as AC" indicate aggressive feature expansion. Story could absorb 3-5 high-ROI enhancements (e.g., #4 query templates, #5 test automation, #8 verification script) without significant effort increase. Others should defer to follow-up stories.

### Follow-up Stories Suggested

- [ ] **KNOW-040-FIX**: Fix agent file names and fifth agent target before dev phase
- [ ] **KNOW-042-EXPANDED**: Extend scope to include gap fixes + high-ROI enhancements (query templates, test automation, verification script)
- [ ] **KNOW-040-WORKER-AGENTS**: Define KB integration pattern for worker agents (backend-coder, frontend-coder, etc.)
- [ ] **KNOW-041-ANALYTICS**: After query logging implemented, create KB-first workflow metrics dashboard
- [ ] **KNOW-043**: KB-driven decision trees and advanced query expansion (future research)

### Items Marked Out-of-Scope

- **Gap #2 (KB Integration Adoption Measurement)**: Deferred to KNOW-041 (Query Audit Logging). Measurement/analytics handled separately.
- **Gap #7 (Empty KB Scenario)**: Covered by fallback behavior ("proceed with best judgment"). No special handling needed.

## Proceed to Implementation?

**NO** - Story blocked by critical issues.

**Blockers:**
1. **Issue #2 (CRITICAL)**: Incorrect agent file names. Story must specify actual filesystem paths or be updated with correct agent selection.
2. **Issue #3 (HIGH)**: Fifth agent missing. Must select alternative agent from filesystem or clarify mapping.
3. **Scope uncertainty**: 7 gaps + 10 enhancements require PM decision on scope expansion vs. phased approach.

**Recommended Actions for PM:**
1. Fix Issues #2 and #3 (critical blockers)
2. Review gap/enhancement decisions: accept all as ACs, defer to follow-up stories, or phase implementation
3. If scope expands: re-estimate story points (currently 5, likely 8-13 with all additions)
4. Consider phased approach:
   - **Phase 1 (KNOW-040)**: Core scope - fix agent files, add KB integration to 5 agents, create integration guide
   - **Phase 2 (KNOW-042)**: Query templates, test automation, verification script
   - **Phase 3 (KNOW-040-WORKER)**: Worker agent integration and guidance

## QA Elaboration Notes

**Elaboration Conducted**: 2026-01-25
**QA Agent**: elab-analyst
**Verdict**: FAIL - Implementation blocked by critical issues

**Key Findings**:
- Story scope is sound but agent file references are incorrect
- Gaps and enhancements represent legitimate future work but shouldn't block current story
- Recommend PM triage: phase into KNOW-040 (core) and follow-ups (enhancements)
- Integration guide should become reusable template for all future agent creations

**Next Steps**:
1. PM to fix Issues #2 and #3
2. PM to decide on gap/enhancement scope
3. Story ready for dev phase after corrections
