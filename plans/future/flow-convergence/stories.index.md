---
doc_type: stories_index
title: "FLOW Stories Index"
status: active
story_prefix: "FLOW"
created_at: "2026-01-31T00:00:00Z"
updated_at: "2026-01-31T00:00:00Z"
---

# FLOW Stories Index

All stories in this epic use the `FLOW-XXX` naming convention (starting at 001).

## Progress Summary

| Status | Count |
|--------|-------|
| completed | 0 |
| generated | 0 |
| in-progress | 0 |
| pending | 41 |

---

## Ready to Start

Stories with all dependencies satisfied (can be worked in parallel):

| Story | Feature | Blocked By |
|-------|---------|------------|
| FLOW-001 | Reality Intake Sub-Graph Infrastructure | — |
| FLOW-021 | LangGraph Reality Intake Node - Baseline Loader | — |

---

## FLOW-001: Reality Intake Sub-Graph Infrastructure

**Status:** pending
**Depends On:** none
**Phase:** 1
**Feature:** Create workflow boundary infrastructure that runs once per workflow shift to produce baseline reality snapshots

**Infrastructure:**
- `plans/baselines/` directory structure
- `BASELINE-REALITY-<date>.md` template

**Goal:** Establish workflow boundary infrastructure that produces baseline reality snapshots to prevent rework and validate assumptions

**Risk Notes:** Requires clear definition of what constitutes a workflow shift; integration with existing workflow commands

**Sizing Warning:** No

---

## FLOW-002: Reality Baseline Collection Agent

**Status:** pending
**Depends On:** FLOW-001
**Phase:** 1
**Feature:** Create agent that scans codebase and in-progress work to capture what exists, what is in-progress, and what assumptions are invalid

**Infrastructure:**
- `.claude/agents/reality-intake-agent.agent.md`

**Goal:** Build automated reality collection agent that produces accurate baseline snapshots of codebase state and active work

**Risk Notes:** Complex codebase scanning logic; need to define scope boundaries; potential performance issues on large repos

**Sizing Warning:** Yes

---

## FLOW-003: Story Seed Phase Integration

**Status:** pending
**Depends On:** FLOW-002
**Phase:** 2
**Feature:** Update story creation workflow to integrate story.seed node that loads baseline reality and retrieves context before generating initial story structure

**Infrastructure:**
- `.claude/commands/pm-story.md updates`
- `.claude/agents/pm-story-seed-agent.agent.md`

**Goal:** Ensure all new stories start with current reality baseline and relevant context to prevent assumption drift

**Risk Notes:** Tight integration with existing pm-story workflow; backward compatibility considerations

**Sizing Warning:** No

---

## FLOW-004: Story Fanout Agents Implementation

**Status:** pending
**Depends On:** FLOW-003
**Phase:** 2
**Feature:** Create specialized fanout agents (story.fanout.pm, story.fanout.ux, story.fanout.qa) that generate perspective-specific gap analyses

**Infrastructure:**
- `.claude/agents/story-fanout-pm.agent.md`
- `.claude/agents/story-fanout-ux.agent.md`
- `.claude/agents/story-fanout-qa.agent.md`

**Goal:** Enable multi-perspective gap analysis during story creation to surface blind spots early

**Risk Notes:** Coordination between multiple agents; potential for conflicting perspectives; unclear merge strategy

**Sizing Warning:** Yes

---

## FLOW-005: Bounded Attacker Agent

**Status:** pending
**Depends On:** FLOW-004
**Phase:** 2
**Feature:** Create story.attack agent that challenges assumptions and surfaces edge cases with bounded exploration to prevent endless iteration

**Infrastructure:**
- `.claude/agents/story-attack-agent.agent.md`

**Goal:** Surface critical edge cases and invalid assumptions during story creation without endless exploration

**Risk Notes:** Defining appropriate bounds; risk of overly aggressive or overly conservative challenges; HiTL decision integration

**Sizing Warning:** No

---

## FLOW-006: Gap Hygiene System

**Status:** pending
**Depends On:** FLOW-005
**Phase:** 2
**Feature:** Implement gap ranking and hygiene system that ranks gaps without deletion, maintaining full history for learning

**Infrastructure:**
- Gap ranking schema and storage

**Goal:** Maintain ranked gap history for system learning while preventing gap accumulation chaos

**Risk Notes:** Storage and retrieval mechanism; ranking algorithm design; integration with HiTL decision workflow

**Sizing Warning:** No

---

## FLOW-007: Readiness Scoring Engine

**Status:** pending
**Depends On:** FLOW-006
**Phase:** 2
**Feature:** Build readiness scoring system that calculates convergence score based on blockers, unknowns, and context strength

**Infrastructure:**
- Readiness calculation logic
- Score storage and history

**Goal:** Provide quantitative readiness signal (target ≥85) to determine commitment readiness

**Risk Notes:** Algorithm design and calibration; threshold tuning; potential gaming of metrics

**Sizing Warning:** No

---

## FLOW-008: Story Synthesis Agent

**Status:** pending
**Depends On:** FLOW-007
**Phase:** 2
**Feature:** Create story.synthesize agent that produces final story artifacts after gap analysis, attacks, and readiness checks

**Infrastructure:**
- `.claude/agents/story-synthesize-agent.agent.md`

**Goal:** Generate final story artifacts that consolidate all analyses and establish commitment baseline

**Risk Notes:** Complex synthesis logic; need to preserve all intermediate artifacts; template design

**Sizing Warning:** No

---

## FLOW-009: Elaboration Phase Contract Framework

**Status:** pending
**Depends On:** FLOW-008
**Phase:** 3
**Feature:** Define and implement explicit phase contracts for elaboration that specify expected churn, cost, and ownership

**Infrastructure:**
- Phase contract definitions
- `.claude/agents/elab-*.agent.md updates`

**Goal:** Establish explicit expectations for each elaboration phase to properly interpret churn metrics

**Risk Notes:** Requires buy-in on phase definitions; integration with existing elaboration workflow

**Sizing Warning:** No

---

## FLOW-010: Delta-Only Elaboration System

**Status:** pending
**Depends On:** FLOW-009
**Phase:** 3
**Feature:** Implement scoped delta elaboration that only reviews changed sections, with escape hatch for targeted full re-review

**Infrastructure:**
- Delta detection logic
- Escape hatch triggers
- `.claude/agents/elab-story.agent.md updates`

**Goal:** Reduce elaboration costs while maintaining quality through focused delta reviews with safety escape hatches

**Risk Notes:** Delta detection accuracy; escape hatch trigger design; risk of missing cross-cutting changes

**Sizing Warning:** Yes

---

## FLOW-011: Commitment Boundary Gate

**Status:** pending
**Depends On:** FLOW-010
**Phase:** 3
**Feature:** Implement commitment gate that enforces readiness ≥85, blockers=0, unknowns≤5 before allowing dev start

**Infrastructure:**
- Gate enforcement logic
- `.claude/commands/dev-implement-story.md updates`

**Goal:** Prevent premature commitment to development without sufficient readiness and clarity

**Risk Notes:** Threshold calibration; override mechanisms for exceptional cases; enforcement strategy

**Sizing Warning:** No

---

## FLOW-012: Time to Dev-Complete (TTDC) Metrics

**Status:** pending
**Depends On:** FLOW-011
**Phase:** 4
**Feature:** Implement metrics collection for time from commitment to dev-complete, tracking median and variance

**Infrastructure:**
- Timestamp collection at commitment and completion
- Metric storage and aggregation

**Goal:** Measure predictability of delivery post-commitment to validate workflow effectiveness

**Risk Notes:** Timestamp accuracy; definition of dev-complete; aggregation logic

**Sizing Warning:** No

---

## FLOW-013: Post-Commitment Ambiguity Rate (PCAR) Metrics

**Status:** pending
**Depends On:** FLOW-011
**Phase:** 4
**Feature:** Implement north star metric tracking clarification and scope-change events after development starts

**Infrastructure:**
- Event detection and classification
- Metric storage and reporting

**Goal:** Track primary indicator of planning quality through post-commitment ambiguity events

**Risk Notes:** Event detection accuracy; classification criteria; false positive handling

**Sizing Warning:** No

---

## FLOW-014: Stakeholder Turn Count Metrics

**Status:** pending
**Depends On:** FLOW-013
**Phase:** 4
**Feature:** Track post-commitment interaction counts between PM↔Dev, UX↔Dev, QA↔Dev triggered by clarification or scope changes

**Infrastructure:**
- Turn counting logic
- Stakeholder role identification

**Goal:** Measure post-commitment collaboration overhead as indicator of upstream planning quality

**Risk Notes:** Turn detection logic; stakeholder identification; trigger classification

**Sizing Warning:** No

---

## FLOW-015: Churn Placement Index Metrics

**Status:** pending
**Depends On:** FLOW-012
**Phase:** 4
**Feature:** Track distribution of churn across phases (discovery, elaboration, development, post-dev) to validate healthy early concentration

**Infrastructure:**
- Churn event classification by phase
- Distribution calculation and visualization

**Goal:** Validate that churn concentrates early with sharp drop at commitment

**Risk Notes:** Churn event definition and detection; phase boundary definitions

**Sizing Warning:** No

---

## FLOW-016: Known Unknown Leakage Metrics

**Status:** pending
**Depends On:** FLOW-013
**Phase:** 4
**Feature:** Count unknowns discovered after commitment as indicator of upstream failure

**Infrastructure:**
- Unknown classification and tracking
- Leakage detection post-commitment

**Goal:** Identify upstream planning failures through post-commitment unknown discovery

**Risk Notes:** Unknown classification criteria; detection accuracy; root cause linking

**Sizing Warning:** No

---

## FLOW-017: Gap Analysis Learning Metrics

**Status:** pending
**Depends On:** FLOW-006
**Phase:** 4
**Feature:** Implement secondary metrics for gap yield, category acceptance rates, and evidence-backed gap rates for system learning

**Infrastructure:**
- Gap acceptance tracking
- Category and evidence classification

**Goal:** Enable system learning from gap analysis patterns without creating performance pressure

**Risk Notes:** Metric interpretation guidelines; avoiding misuse for performance evaluation

**Sizing Warning:** No

---

## FLOW-021: LangGraph Reality Intake Node - Baseline Loader

**Status:** pending
**Depends On:** FLOW-001
**Phase:** 1
**Feature:** Create load_baseline_reality node that reads most recent BASELINE-REALITY-<date>.md and provides it as graph state

**Infrastructure:**
- `packages/backend/orchestrator/nodes/reality/load-baseline.ts`

**Goal:** Provide LangGraph nodes with access to current reality baseline for context-aware processing

**Risk Notes:** File system access patterns; error handling for missing baselines; state management

**Sizing Warning:** No

---

## FLOW-022: LangGraph Reality Intake Node - Context Retrieval

**Status:** pending
**Depends On:** FLOW-021
**Phase:** 1
**Feature:** Create retrieve_context node that pulls relevant codebase context based on story scope and reality baseline

**Infrastructure:**
- `packages/backend/orchestrator/nodes/reality/retrieve-context.ts`

**Goal:** Provide targeted context retrieval for story creation that respects reality boundaries

**Risk Notes:** Context scope determination; retrieval performance; relevance ranking

**Sizing Warning:** No

---

## FLOW-023: LangGraph Story Node - Seed

**Status:** pending
**Depends On:** FLOW-022
**Phase:** 2
**Feature:** Create story.seed node that generates initial story structure from reality baseline and retrieved context

**Infrastructure:**
- `packages/backend/orchestrator/nodes/story/seed.ts`

**Goal:** Generate initial story structure that is grounded in current reality

**Risk Notes:** Template design; LLM prompt engineering; output validation

**Sizing Warning:** No

---

## FLOW-024: LangGraph Story Node - Fanout PM

**Status:** pending
**Depends On:** FLOW-023
**Phase:** 2
**Feature:** Create story.fanout.pm node that generates product management perspective gap analysis

**Infrastructure:**
- `packages/backend/orchestrator/nodes/story/fanout-pm.ts`

**Goal:** Surface product-perspective gaps and considerations during story creation

**Risk Notes:** PM perspective definition; gap classification; output schema

**Sizing Warning:** No

---

## FLOW-025: LangGraph Story Node - Fanout UX

**Status:** pending
**Depends On:** FLOW-023
**Phase:** 2
**Feature:** Create story.fanout.ux node that generates UX/design perspective gap analysis

**Infrastructure:**
- `packages/backend/orchestrator/nodes/story/fanout-ux.ts`

**Goal:** Surface UX and accessibility gaps during story creation

**Risk Notes:** UX perspective definition; a11y consideration completeness

**Sizing Warning:** No

---

## FLOW-026: LangGraph Story Node - Fanout QA

**Status:** pending
**Depends On:** FLOW-023
**Phase:** 2
**Feature:** Create story.fanout.qa node that generates QA/testing perspective gap analysis

**Infrastructure:**
- `packages/backend/orchestrator/nodes/story/fanout-qa.ts`

**Goal:** Surface testability and quality assurance gaps during story creation

**Risk Notes:** QA perspective definition; testability criteria

**Sizing Warning:** No

---

## FLOW-027: LangGraph Story Node - Attack

**Status:** pending
**Depends On:** FLOW-024, FLOW-025, FLOW-026
**Phase:** 2
**Feature:** Create story.attack node that challenges assumptions and surfaces edge cases with bounded exploration

**Infrastructure:**
- `packages/backend/orchestrator/nodes/story/attack.ts`

**Goal:** Surface critical edge cases through bounded adversarial analysis

**Risk Notes:** Bound definition and enforcement; challenge depth control; HiTL integration

**Sizing Warning:** No

---

## FLOW-028: LangGraph Story Node - Gap Hygiene

**Status:** pending
**Depends On:** FLOW-027
**Phase:** 2
**Feature:** Create gap hygiene node that ranks gaps and maintains history without deletion

**Infrastructure:**
- `packages/backend/orchestrator/nodes/story/gap-hygiene.ts`

**Goal:** Maintain clean ranked gap list with full history for learning

**Risk Notes:** Ranking algorithm; storage strategy; retrieval performance

**Sizing Warning:** No

---

## FLOW-029: LangGraph Story Node - Readiness Scoring

**Status:** pending
**Depends On:** FLOW-028
**Phase:** 2
**Feature:** Create readiness scoring node that calculates convergence score from blockers, unknowns, and context strength

**Infrastructure:**
- `packages/backend/orchestrator/nodes/story/readiness-score.ts`

**Goal:** Calculate quantitative readiness signal for commitment decision

**Risk Notes:** Algorithm design and calibration; threshold sensitivity

**Sizing Warning:** No

---

## FLOW-030: LangGraph Story Node - Synthesize

**Status:** pending
**Depends On:** FLOW-029
**Phase:** 2
**Feature:** Create story.synthesize node that produces final story artifacts from all analyses

**Infrastructure:**
- `packages/backend/orchestrator/nodes/story/synthesize.ts`

**Goal:** Generate final consolidated story artifacts with all analyses integrated

**Risk Notes:** Synthesis logic complexity; template design; artifact validation

**Sizing Warning:** No

---

## FLOW-031: LangGraph Elaboration Node - Delta Detection

**Status:** pending
**Depends On:** FLOW-030
**Phase:** 3
**Feature:** Create delta detection node that identifies changes between elaboration iterations

**Infrastructure:**
- `packages/backend/orchestrator/nodes/elaboration/delta-detect.ts`

**Goal:** Enable scoped delta reviews by accurately detecting changed sections

**Risk Notes:** Diff algorithm accuracy; semantic change detection; false negative risk

**Sizing Warning:** No

---

## FLOW-032: LangGraph Elaboration Node - Delta Review

**Status:** pending
**Depends On:** FLOW-031
**Phase:** 3
**Feature:** Create delta review node that performs focused reviews on changed sections only

**Infrastructure:**
- `packages/backend/orchestrator/nodes/elaboration/delta-review.ts`

**Goal:** Reduce elaboration costs through focused delta reviews

**Risk Notes:** Review scope determination; cross-cutting change detection

**Sizing Warning:** No

---

## FLOW-033: LangGraph Elaboration Node - Escape Hatch

**Status:** pending
**Depends On:** FLOW-032
**Phase:** 3
**Feature:** Create escape hatch node that triggers targeted full re-review when delta review is insufficient

**Infrastructure:**
- `packages/backend/orchestrator/nodes/elaboration/escape-hatch.ts`

**Goal:** Provide safety mechanism for cases where delta review is insufficient

**Risk Notes:** Trigger condition design; targeted review scope; stakeholder routing

**Sizing Warning:** No

---

## FLOW-034: LangGraph Gate Node - Commitment Validation

**Status:** pending
**Depends On:** FLOW-029
**Phase:** 3
**Feature:** Create commitment gate node that validates readiness ≥85, blockers=0, unknowns≤5 before allowing progression

**Infrastructure:**
- `packages/backend/orchestrator/nodes/gates/commitment-gate.ts`

**Goal:** Enforce commitment readiness requirements before development phase

**Risk Notes:** Gate bypass mechanisms; threshold enforcement; validation accuracy

**Sizing Warning:** No

---

## FLOW-035: LangGraph Metrics Node - Event Collection

**Status:** pending
**Depends On:** FLOW-034
**Phase:** 4
**Feature:** Create metrics collection node that captures events (commitments, completions, clarifications, scope changes)

**Infrastructure:**
- `packages/backend/orchestrator/nodes/metrics/collect-events.ts`

**Goal:** Capture all events necessary for convergence metrics calculation

**Risk Notes:** Event classification accuracy; timing precision; storage strategy

**Sizing Warning:** No

---

## FLOW-036: LangGraph Metrics Node - TTDC Calculator

**Status:** pending
**Depends On:** FLOW-035
**Phase:** 4
**Feature:** Create TTDC calculation node that computes time from commitment to dev-complete with median and variance

**Infrastructure:**
- `packages/backend/orchestrator/nodes/metrics/calc-ttdc.ts`

**Goal:** Calculate time-to-dev-complete metrics for predictability assessment

**Risk Notes:** Calculation accuracy; aggregation logic; outlier handling

**Sizing Warning:** No

---

## FLOW-037: LangGraph Metrics Node - PCAR Calculator

**Status:** pending
**Depends On:** FLOW-035
**Phase:** 4
**Feature:** Create PCAR calculation node that counts post-commitment ambiguity events

**Infrastructure:**
- `packages/backend/orchestrator/nodes/metrics/calc-pcar.ts`

**Goal:** Calculate north star metric for planning quality

**Risk Notes:** Event detection accuracy; false positive handling

**Sizing Warning:** No

---

## FLOW-038: LangGraph Metrics Node - Turn Counter

**Status:** pending
**Depends On:** FLOW-035
**Phase:** 4
**Feature:** Create stakeholder turn counting node for post-commitment PM/UX/QA interactions

**Infrastructure:**
- `packages/backend/orchestrator/nodes/metrics/count-turns.ts`

**Goal:** Track collaboration overhead as planning quality indicator

**Risk Notes:** Turn detection logic; stakeholder identification

**Sizing Warning:** No

---

## FLOW-039: LangGraph Metrics Node - Churn Distribution

**Status:** pending
**Depends On:** FLOW-035
**Phase:** 4
**Feature:** Create churn placement index node that calculates churn distribution across phases

**Infrastructure:**
- `packages/backend/orchestrator/nodes/metrics/calc-churn.ts`

**Goal:** Validate healthy churn distribution pattern

**Risk Notes:** Phase classification; distribution calculation

**Sizing Warning:** No

---

## FLOW-040: LangGraph Metrics Node - Unknown Leakage Tracker

**Status:** pending
**Depends On:** FLOW-035
**Phase:** 4
**Feature:** Create unknown leakage detection node that identifies post-commitment unknowns

**Infrastructure:**
- `packages/backend/orchestrator/nodes/metrics/track-leakage.ts`

**Goal:** Detect upstream planning failures through unknown leakage

**Risk Notes:** Unknown classification; detection accuracy

**Sizing Warning:** No

---

## FLOW-041: LangGraph Metrics Node - Gap Analytics

**Status:** pending
**Depends On:** FLOW-028
**Phase:** 4
**Feature:** Create gap analysis metrics node for yield, acceptance rates, and evidence tracking

**Infrastructure:**
- `packages/backend/orchestrator/nodes/metrics/gap-analytics.ts`

**Goal:** Enable system learning from gap analysis patterns

**Risk Notes:** Metric interpretation; avoiding performance pressure misuse

**Sizing Warning:** No

---

## FLOW-042: LangGraph Graph - Story Creation Flow

**Status:** pending
**Depends On:** FLOW-030
**Phase:** 2
**Feature:** Compose complete story creation graph from reality intake through synthesis nodes

**Infrastructure:**
- `packages/backend/orchestrator/graphs/story-creation.ts`

**Goal:** Provide complete executable story creation workflow graph

**Risk Notes:** Graph composition complexity; state management; error handling; branching logic

**Sizing Warning:** Yes

---

## FLOW-043: LangGraph Graph - Elaboration Flow

**Status:** pending
**Depends On:** FLOW-033
**Phase:** 3
**Feature:** Compose complete elaboration graph with delta detection, review, and escape hatch

**Infrastructure:**
- `packages/backend/orchestrator/graphs/elaboration.ts`

**Goal:** Provide complete executable elaboration workflow graph

**Risk Notes:** Graph composition complexity; conditional routing; state management

**Sizing Warning:** Yes

---

## FLOW-044: LangGraph Graph - Metrics Collection Flow

**Status:** pending
**Depends On:** FLOW-041
**Phase:** 4
**Feature:** Compose complete metrics collection and analysis graph

**Infrastructure:**
- `packages/backend/orchestrator/graphs/metrics.ts`

**Goal:** Provide complete executable metrics workflow graph

**Risk Notes:** Graph composition; parallel metric calculation; aggregation

**Sizing Warning:** No

---
