# Elaboration Analysis - WKFL-006

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | WKFL-006 appears in stories.index.md with matching description ("Cross-Story Pattern Mining") and correct blocking relationships (WKFL-007, WKFL-009, WKFL-010). Deliverables match. |
| 2 | Internal Consistency | FAIL | High | Goals promise 4 capabilities (analysis, clustering, file-pattern correlation, pattern output) but AC-4 introduces a metric ("embedding similarity > 0.85") that has no technical mechanism defined anywhere in the story. The story also lists "Agent Correlation" and "Cycle Patterns" as Technical Notes pattern types but neither has a corresponding AC. |
| 3 | Reuse-First | CONDITIONAL | Medium | Reuse Plan correctly identifies OUTCOME.yaml, VERIFICATION.yaml, and KB tools as must-reuse. However the story gives no guidance on which existing shared package utility or agent infrastructure provides the file-traversal / glob logic for collecting OUTCOME.yaml files across the plan tree. |
| 4 | Ports & Adapters | PASS | — | This is a CLI/agent story with no API transport concerns. Analog check: core analysis logic (pattern detection, correlation calculation) should be separable from output formatting (YAML, Markdown). Story does not violate this but also does not specify it. Low severity. |
| 5 | Local Testability | FAIL | High | No concrete test plan exists. AC-4 ("embedding similarity > 0.85") is not locally testable at all because Claude Code has no direct embedding API access. The minimum-sample guard (AC-1) has a testable verification but no script or command is given. Output format verification (AC-2, AC-3, AC-5, AC-6) is possible but not specified. |
| 6 | Decision Completeness | FAIL | Critical | Three blocking TBDs exist: (1) "last N days" — N is never defined; (2) the embedding mechanism for AC-4 is undefined; (3) "weekly cron" is mentioned in scope but Claude Code has no cron capability and the fallback (/pattern-mine command) is listed as an "or", leaving the scheduling model ambiguous. |
| 7 | Risk Disclosure | FAIL | High | No risks section exists. Hidden dependencies: AC-4 implicitly requires an embedding model or embedding-like capability that is not part of the Claude Code execution environment. WKFL-001 must be completed and have produced OUTCOME.yaml files before any mining run can meet the AC-1 minimum (10 stories). No fallback or bootstrap path is described. |
| 8 | Story Sizing | PASS | — | 6 ACs, single agent, no frontend work, single output directory. Sizing is appropriate. However the 4 Technical Notes pattern types (file, AC, agent correlation, cycle) without matching ACs creates implicit scope that inflates implementation work. |
| 9 | Subtask Decomposition | FAIL | High | No Subtasks section exists. Story transitioned from story.yaml without subtask decomposition. ACs are not mapped to implementation steps. No canonical file paths for agent output location are given. |

---

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | AC-4 embedding similarity mechanism undefined | Critical | Define how clustering is performed in a Claude Code context. Options: (a) LLM-based semantic grouping (agent prompt asks Claude to group similar findings), (b) keyword/regex fuzzy match, (c) explicit Jaccard similarity on finding text. "Embedding similarity > 0.85" implies a vector embedding API that does not exist in this environment. The AC must be rewritten to specify the actual mechanism. |
| 2 | "last N days" — N undefined | Critical | The goal states "last N days" with no value or configuration point. Must define: a default N (e.g., 30), a CLI flag (e.g., `--days 30`), and whether N is calendar days or story-completion days. |
| 3 | Scheduling model ambiguous | High | Scope lists "/pattern-mine command (or weekly cron)". Claude Code has no cron. The story must commit to the /pattern-mine command as the sole invocation method, and remove or defer "weekly cron" to a future story (or explicitly delegate to an external scheduler story). |
| 4 | No risks section | High | Story has no Technical Risks or Open Questions section. At minimum the following must be disclosed: (a) AC-4 embedding dependency risk; (b) bootstrap risk (fewer than 10 OUTCOME.yaml files exist until WKFL-001 produces them); (c) data access risk (the miner must glob the entire plan tree — no path pattern is specified). |
| 5 | Technical Notes pattern types exceed ACs | Medium | Technical Notes describes 4 pattern types (file_patterns, ac_patterns, agent_correlations, cycle_predictors) and the YAML schema shows all 4 as output sections. However ACs only cover ac_patterns (AC-3) and file_patterns (AC-2). Agent correlations and cycle predictors are implicit scope. Either add ACs for them or explicitly call them out-of-scope. |
| 6 | Output file location not specified | Medium | Where are PATTERNS-{month}.yaml, ANTI-PATTERNS.md, and AGENT-HINTS.yaml written? No canonical path exists (e.g., `.claude/patterns/`, `plans/future/platform/workflow-learning/patterns/`, etc.). Implementer has no guidance. |
| 7 | No subtask decomposition | High | Story has no Subtasks section. All 6 ACs lack implementation mapping. Required: at minimum a Setup task, agent-creation task, data-collection task, analysis task, output-writing task, and verification task. |
| 8 | AGENT-HINTS.yaml injection mechanism undefined | Medium | AC-5 says patterns should be "injectable into prompts" but no mechanism is specified. How does an agent read AGENT-HINTS.yaml at runtime? Is it appended to system prompts? Read at agent startup? This is a cross-story integration point that blocks WKFL-007, WKFL-009, and WKFL-010. |
| 9 | Bootstrap scenario unhandled | Medium | AC-1 says "skip with warning" if < 10 stories. But what constitutes a valid story for counting purposes? Only stories with OUTCOME.yaml? Any story with a story.yaml? This must be specified to make the skip logic implementable. |

---

## Preliminary Verdict

**Verdict**: FAIL

**Rationale**: WKFL-006 has three Critical-severity issues (undefined embedding mechanism, undefined N parameter, ambiguous scheduling) that individually block safe implementation. Additionally, 4 of 9 audit checks failed. The story is a well-intentioned concept with a useful Technical Notes section and correct YAML schema examples, but it lacks the implementation precision needed to proceed. It requires a targeted elaboration pass focused on resolving the Critical issues and adding subtask decomposition before implementation can begin.

**Required Before Proceeding:**
1. Rewrite AC-4 to use an LLM-native clustering mechanism (not embedding similarity)
2. Define N in "last N days" with a default and CLI override
3. Remove "weekly cron" from scope or create a separate scheduler story
4. Add a Technical Risks section covering the embedding dependency, bootstrap scenario, and data path
5. Define canonical output paths for all output files
6. Add a Subtasks section mapping each AC to implementation steps
7. Specify the AGENT-HINTS.yaml injection mechanism or defer AC-5 to WKFL-007/WKFL-009 which consume the output

---

## MVP-Critical Gaps

| # | Gap | Blocks | Required Fix |
|---|-----|--------|--------------|
| 1 | Embedding mechanism for AC-4 is not implementable as written | AC-4, all clustering output | Rewrite to use LLM-based semantic grouping: the agent reads all findings, asks Claude to group conceptually similar items, and assigns a group label. Remove the "0.85 threshold" or redefine it as a minimum co-occurrence count. |
| 2 | Undefined N in "last N days" | AC-1, data collection | Add `--days N` CLI argument to /pattern-mine with default of 30. Document in AC-1 verification that the command accepts `--days` flag. |
| 3 | Output file canonical paths missing | AC-2, AC-3, AC-5, AC-6 | Specify that all output goes to `.claude/patterns/YYYY-MM/` or equivalent. Without this, implementer will create files in inconsistent locations and downstream stories (WKFL-007 reads AGENT-HINTS.yaml) cannot find them. |
| 4 | No subtask decomposition | All ACs | Add Subtasks section. Minimum required subtasks: (1) Setup & data collection (find all OUTCOME.yaml files matching criteria), (2) Pattern analysis (file patterns, AC patterns, agent correlations, cycle predictors), (3) Clustering (LLM-based grouping), (4) Output generation (PATTERNS-{month}.yaml, AGENT-HINTS.yaml, ANTI-PATTERNS.md), (5) KB writes, (6) Verification run. |
| 5 | AGENT-HINTS.yaml injection mechanism undefined | AC-5, and WKFL-007/WKFL-009/WKFL-010 which consume it | Specify how agents read AGENT-HINTS.yaml. If agent prompts must be manually updated, say so. If the intent is automatic injection via the knowledge-context-loader agent, reference that explicitly. This is an integration contract required by all three downstream stories. |

---

## Worker Token Summary

- Input: ~9,800 tokens (WKFL-006.md, story.yaml, stories.index.md, WKFL-001 ELAB + ANALYSIS, WKFL-002 ANALYSIS, WKFL-003 ANALYSIS — reference for format and precedent)
- Output: ~2,600 tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
- Total: ~12,400 tokens
