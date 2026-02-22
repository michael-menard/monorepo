# Elaboration Analysis - WKFL-010

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | stories.index.md lists WKFL-010 as "Improvement Proposal Generator" with exact match to story.yaml scope |
| 2 | Internal Consistency | CONDITIONAL PASS | Medium | Goals and non-goals are internally consistent; however AC-5 ("acceptance rate of proposals improves") is not concretely verifiable within story bounds — it describes a long-term emergent outcome, not a testable acceptance criterion for this story |
| 3 | Reuse-First | PASS | — | reuse_plan correctly mandates reuse of all WKFL component outputs and KB tools; new artifacts are limited and justified |
| 4 | Ports & Adapters | PASS | — | No API endpoints; this is a CLI/agent story. Agent files and commands are the only adapters. Core aggregation logic is transport-agnostic |
| 5 | Local Testability | CONDITIONAL PASS | Medium | No concrete local testing plan specified. No `.http` tests (not needed for non-API story), but no verification commands for the `/improvement-proposals` command or agent execution are defined |
| 6 | Decision Completeness | FAIL | High | Three unresolved blockers: (1) data query interface for aggregating inputs from WKFL-002/003/006/008 is not defined — the story assumes KB contains all needed data but no query contract exists; (2) no definition of the ROI score formula; (3) no fallback when a dependency's data is unavailable (e.g. WKFL-008 experiments not yet run) |
| 7 | Risk Disclosure | FAIL | High | No risks section in story.yaml. Risks are material: dependency on 5 upstream components (WKFL-002/003/004/006/008), cold-start problem (no data on first run), meta-learning AC-5 has no measurement definition, proposal tracking in KB depends on INFR-001 schema |
| 8 | Story Sizing | PASS | — | 5 ACs, no API endpoints, agent-only scope, no frontend work. Below all sizing thresholds |
| 9 | Subtask Decomposition | FAIL | High | No `## Subtasks` section exists. No `## Canonical References` section. story.yaml has no subtask breakdown. ACs are not mapped to implementation steps |

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | AC-5 is not verifiable within story scope | Medium | Replace with a measurable proxy: "Proposal acceptance rate is tracked and a baseline is established after first 3 runs" — the long-term improvement emerges over time, but this story must establish the tracking mechanism with a baseline |
| 2 | ROI score formula undefined | High | Define the formula in technical_notes: e.g. `roi_score = (impact_weight * effort_inverse) / 10` with explicit numeric mappings for high/medium/low |
| 3 | Data query contract missing | High | Specify how the proposer queries each source: which KB tags, YAML file paths, or event queries are used per source (calibration, patterns, experiments, heuristics, feedback). Without this, AC-1 is unimplementable |
| 4 | Cold-start / missing-dependency behavior undefined | High | Document what happens when a source has no data (e.g. WKFL-008 experiments not run yet). Must define skip-with-log behavior vs. fail behavior |
| 5 | No risks section | High | Add `risks` section to story.yaml covering: (a) upstream data gaps, (b) INFR-001 dependency for proposal tracking schema, (c) meta-learning bootstrap problem, (d) KB write conflicts |
| 6 | No subtask decomposition | High | Add `## Subtasks` and `## Canonical References` sections before story enters ready-to-work |
| 7 | Local testing plan absent | Medium | Add a `local_testing_plan` that specifies: (a) how to seed test data from each source, (b) command to invoke `/improvement-proposals`, (c) expected output structure to verify |
| 8 | WKFL-006 dependency mismatch | Medium | story.yaml lists `WKFL-006` and `WKFL-002` as dependencies; stories.index.md lists `WKFL-003` and `WKFL-007` as also feeding into WKFL-010. Dependencies should include WKFL-003 (heuristics), WKFL-004 (feedback), and WKFL-008 (experiments) since all five are listed in technical_notes as input sources |

## Split Recommendation

Not required. Story sizing is within bounds (5 ACs, agent-only scope, no frontend, no API endpoints).

## Preliminary Verdict

**Verdict**: CONDITIONAL PASS

The story concept is sound and scope is well-defined. The non-goals are clear and the reuse plan is correct. However, three High-severity issues must be resolved before the story enters ready-to-work: the missing data query contract (issue #3), the undefined ROI formula (issue #2), and the absent subtask decomposition (issue #6). The cold-start risk and missing risks section (issues #4, #5) are also required additions.

---

## MVP-Critical Gaps

| # | Gap | Blocks | Required Fix |
|---|-----|--------|--------------|
| 1 | Data query contract for each input source not defined | AC-1 cannot be implemented — developer has no contract for querying calibration/pattern/experiment data | Add per-source query spec to technical_notes: KB tag queries, YAML file path patterns, and field mappings |
| 2 | ROI score formula undefined | AC-3 (prioritize by ROI) is unimplementable without a deterministic formula | Define numeric mappings for impact (high=3, medium=2, low=1) and effort (low=3, medium=2, high=1), and the formula `roi_score = (impact * effort_inverse) / 1.0` or equivalent |
| 3 | Subtask decomposition missing | Story cannot be executed by an implementation agent without subtasks | Add subtasks covering: (ST-1) aggregate inputs, (ST-2) compute ROI scores, (ST-3) generate IMPROVEMENT-PROPOSALS-{date}.md, (ST-4) write proposal tracking KB entries, (ST-5) meta-learning KB query/update |
| 4 | Dependency list incomplete | AC-1 references WKFL-003, WKFL-004, WKFL-008 as input sources but they are not listed in `dependencies:` | Add WKFL-003, WKFL-004, WKFL-008 to `dependencies:` so scheduler blocks correctly |

---

## Worker Token Summary

- Input: ~6,500 tokens (story.yaml, stories.index.md, PLAN.meta.md, PLAN.exec.md, WKFL-006/story.yaml, agent instructions)
- Output: ~1,200 tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
