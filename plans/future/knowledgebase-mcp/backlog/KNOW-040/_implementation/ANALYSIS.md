# Elaboration Analysis - KNOW-040

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

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | Example query syntax inconsistency | Medium | AC3 and AC10 require examples to use "valid syntax against kb_search schema", but story shows JavaScript-style syntax (`kb_search({ query: "...", role: "dev" })`) instead of MCP tool call JSON syntax (`{"query": "...", "role": "dev"}`). Agent instructions are markdown docs, not executable code. Clarify: should examples show JSON (MCP protocol format) or pseudo-code for readability? |
| 2 | Target agent file names incorrect | Critical | AC requires modifying `dev-implementation-leader.agent.md` and `qa-verify-leader.agent.md`, but filesystem shows these don't exist. Actual files are: `dev-implement-implementation-leader.agent.md`, `qa-verify-verification-leader.agent.md`, `qa-verify-completion-leader.agent.md`, `qa-verify-setup-leader.agent.md`. Story must specify correct agent file names or will fail during implementation. |
| 3 | "learnings-recorder.agent.md" file missing | High | Story lists `learnings-recorder.agent.md` as one of 5 required agents, but filesystem shows only `dev-implement-learnings.agent.md` exists. Either fix agent name in story or choose different 5th agent (e.g., dev-implement-planner.agent.md). |
| 4 | Character limit per-section ambiguous | Low | AC9 enforces "≤1500 characters" per section but doesn't define what "section" means. Is it the entire "## Knowledge Base Integration" block (including all subsections), or each subsection individually (When to Query, How to Query, etc.)? Recommend: clarify scope of character count. |
| 5 | Pilot story selection criteria vague | Medium | AC5 requires "domain has at least 3 relevant KB entries" but doesn't specify how to verify this before starting pilot. Should story include KB content verification step: query KB for entries matching pilot story domain (e.g., `kb_search({query: "drizzle migration", role: "dev", limit: 10})`) and confirm ≥3 results exist? |
| 6 | KB citation format not validated | Medium | AC6 requires KB citations in agent output but provides no validation mechanism. Pilot story artifact could cite "KB entry 123" without verifying entry 123 exists in KB. Should include validation step: extract cited entry IDs from artifact, verify each ID exists via kb_get. |
| 7 | Section placement conflicts with existing structure | Low | AC8 requires KB integration section "After Mission, Before Inputs". But agent files may vary in structure. Some have "## Role" + "## Mission" (2 sections), others have "## Workers", "## Mode Selection", etc. Recommend: inspect all 5 target agents first, document actual placement rule (e.g., "After Mission/Role, before first workflow section"). |
| 8 | Integration guide location not standardized | Low | AC7 suggests `docs/KB-AGENT-INTEGRATION.md` but uses parenthetical "e.g." indicating uncertainty. Should confirm: does `docs/` directory already have agent-related docs? Should this be `docs/agents/KB-INTEGRATION.md` or `.claude/KB-AGENT-INTEGRATION.md` for co-location with agent files? |
| 9 | No validation for "when to query" guidance | Medium | AC1 requires "When to query KB (task triggers)" but doesn't validate that trigger patterns match agent's actual workflow. Example: if dev-implement-planner.agent.md already has Step 1: "Read story", Step 2: "Analyze scope", KB query should be documented between Steps 1-2. Should template include workflow analysis step. |
| 10 | Trigger patterns per agent type inconsistent | Low | AC2 states "Dev agents: minimum 3 patterns, QA agents: minimum 2, PM agents: minimum 2" but doesn't classify dev-implement-learnings.agent.md (is it dev or learnings?). Recommend: clarify agent role classification or remove per-type requirements in favor of "minimum 3 patterns per agent" universally. |

## Split Recommendation

**Not Applicable** - Story passes sizing check. No split required.

## Preliminary Verdict

**FAIL**: Critical and High severity issues block implementation. Issues #2 and #3 will cause immediate failure during file modification phase.

Issues requiring fixes before implementation:
- **Issue #2 (Critical)**: Agent file names must be corrected to match filesystem or story cannot proceed
- **Issue #3 (High)**: Fifth target agent must be clarified
- **Issue #1 (Medium)**: Example syntax format must be decided to validate AC10
- **Issue #5 (Medium)**: Pilot story selection needs KB content verification step
- **Issue #6 (Medium)**: KB citation validation missing from test plan
- **Issue #9 (Medium)**: Workflow integration validation missing

**Verdict**: FAIL

---

## Discovery Findings

### Gaps & Blind Spots

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No template for new agent creation | Medium | Low | Story creates integration guide for existing agents but doesn't update agent template/scaffold. If new agents are created without KB integration, adoption goal fails. Should update `.claude/agents/TEMPLATE.agent.md` (if exists) or add note to agent creation checklist. |
| 2 | No measurement of KB integration adoption | High | Low | After implementing KB integration, how do we measure success? No tracking of: which agents actually call kb_search, how often, query result relevance. Consider adding follow-up story for KB usage analytics (KNOW-041 covers query logging but not analysis). |
| 3 | No guidance for updating KB integration when KB evolves | Medium | Low | KB schema may change (KNOW-007 adds entry types, KNOW-039 adds access control). Agent instructions become stale. Should document maintenance plan: "When KB API changes, update all agent examples via search/replace" or create validation test suite. |
| 4 | Query patterns don't cover all agent workflow phases | Medium | Medium | Story focuses on "before implementation" KB queries but agents have multiple phases (setup, planning, implementation, verification, learnings). Each phase may benefit from KB queries. Example: learnings agent should query KB to check if similar lesson already exists before adding duplicate. |
| 5 | No guidance for multi-step query refinement | Low | Low | Agents may need to refine KB queries based on initial results (e.g., if "drizzle migration" returns 0 results, try "database migration"). Instructions don't cover iterative querying patterns. Should add "If no results, broaden query" guidance. |
| 6 | No examples of role-specific query filtering | Medium | Low | KB supports role filtering (role: "dev", "qa", "pm", "all") but examples don't show when to use it. Dev agents should filter by role="dev", QA agents by role="qa". Should add guidance: "Filter by your role to reduce noise, only use role='all' for cross-cutting concerns." |
| 7 | Empty KB scenario not addressed | High | Low | What if KB has 0 entries? Agent queries always return empty. Instructions say "proceed with best judgment" but don't explain how to detect "KB is empty" vs "KB has content but no matches". Should add check: if kb_search returns 0 results, run kb_stats to verify KB has entries. |
| 8 | Over-querying budget not defined | Medium | Low | Risk #2 mentions "excessive queries slow down workflows" but doesn't define "excessive". Should provide guideline: "1-2 queries per major task, max 5 queries per story workflow". Helps agents self-regulate. |
| 9 | No KB citation linting | Low | Medium | Agent output may cite KB sources inconsistently ("Per KB entry 123", "Based on KB 123", "KB123 says"). AC6 defines format but no enforcement. Consider creating linter or validation script that checks artifacts for citation format compliance. |
| 10 | Integration guide doesn't cover worker agents | Medium | Low | Story targets leader agents (dev-implement-implementation-leader, qa-verify-verification-leader) but leader agents spawn worker agents (backend-coder, frontend-coder). Should worker agents also query KB? If yes, integration guide needs worker-specific instructions. If no, document why. |

### Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | KB query result caching in agent context | High | Medium | Leader agents query KB once, use results throughout. But results are in agent's memory (not persistent). If workflow fails mid-execution, retry queries KB again. Consider: save KB query results to `_implementation/KB-CONTEXT.md`, let workers read from file instead of re-querying. Reduces API calls and improves consistency. |
| 2 | KB-driven decision trees | High | High | Power feature: KB entries could include decision trees ("If authentication story, consider: OAuth vs JWT vs session-based"). Agents parse decision tree from KB and present options to user via AskUserQuestion. Requires structured KB content and parsing logic. Future story. |
| 3 | Automatic KB result relevance scoring | Medium | Medium | Agents receive KB search results but must manually assess relevance. Could add agent prompt: "Rate each KB result 1-5 for relevance to current task, explain why". Improves agent reasoning transparency and helps refine KB content (low-rated entries may need better tagging). |
| 4 | KB query templates per agent type | Medium | Low | Instead of documenting query patterns in each agent file (duplication), create shared query template library: `.claude/kb-query-templates.yaml` with entries like `{type: "authentication", query: "authentication architecture decision", tags: ["auth", "security"]}`. Agents reference templates by type. Reduces maintenance. |
| 5 | Integration test automation | High | Medium | AC5 requires manual pilot story execution. Could automate: create test suite that spawns agent with KB integration, runs simple story, validates KB query count (1-3), validates citations exist. Prevents regression when KB API changes. |
| 6 | KB result excerpting in citations | Medium | Low | Current citation format: "Per KB entry 123 'Title': summary". Could enhance: include relevant excerpt from KB entry content. Example: "Per KB entry 123 'Drizzle Best Practices': 'Use db.transaction() for multi-table operations' (excerpt)". Improves traceability without requiring full entry read. |
| 7 | KB query suggestions in agent prompts | Low | Low | UX delight: when agent receives task, suggest KB queries based on task keywords. Example: story mentions "authentication" → agent prompts user "I found 5 KB entries on authentication, should I review before proceeding?". Requires keyword extraction and pre-query step. |
| 8 | KB integration verification script | Medium | Low | Create CI check: parse all agent .md files, verify KB integration sections exist, validate example syntax against kb_search schema, check character limits. Runs on PR to prevent drift. Script: `scripts/verify-kb-integration.ts`. |
| 9 | KB-first workflow metrics dashboard | Medium | High | After KNOW-041 implements query logging, create dashboard: which agents use KB most, which queries return 0 results, average query time. Helps identify: under-utilized agents (need better instructions), poor queries (need query refinement), KB content gaps (need more entries). |
| 10 | Contextual KB query expansion | Low | High | Advanced: when agent queries "drizzle migration", KB system automatically expands to related tags (database, schema, migration). Returns results matching any related concept. Requires tag relationship graph or embedding-based expansion. Future research. |

---

## Worker Token Summary

- Input: ~35,000 tokens (KNOW-040.md, stories.index, PLAN files, QA agent, elab-analyst instructions, dev agent examples, search schemas)
- Output: ~3,000 tokens (ANALYSIS.md)

**Total**: ~38,000 tokens
