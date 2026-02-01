# MVP Plan: Knowledge-Driven Story Creation & Elaboration
*(with Reality Intake, Explicit Phase Contracts, and Convergence-Focused Metrics)*

---

## Bootstrap Configuration

| Setting | Value |
|---------|-------|
| Prefix | `FLOW` |
| Track 1 Start | `FLOW-1000` (Claude Code workflow updates) |
| Track 2 Start | `FLOW-2000` (LangGraph node implementations) |

### Track 1: Claude Code Workflow (FLOW-1000 series)
Updates to `.claude/commands/` and `.claude/agents/` to implement:
- Reality Intake phase
- Phase contracts in elaboration
- Delta-only elaboration
- Convergence metrics tracking
- Commitment boundary gates

### Track 2: LangGraph Implementation (FLOW-2000 series)
Build graph nodes in `packages/backend/orchestrator/`:
- Reality Intake sub-graph
- Story creation nodes (`story.seed`, `story.fanout.*`, `story.attack`, `story.synthesize`)
- Elaboration nodes (delta-only)
- Metrics collection integration

> **Intent:** Build a decision-centric engineering workflow that optimizes for **shared understanding at commitment time**, not superficial throughput — and measure it accordingly.

This plan explicitly avoids churn theater. It distinguishes **healthy learning cycles** from **costly execution churn**, and instruments only what matters.

---

## Core Principle (Non-Negotiable)

> **We do not optimize for fewer cycles.  
> We optimize for fewer surprises *after commitment*.**

All metrics, gates, and reviews exist to enforce this boundary.

---

# Phase Contracts (Explicit Expectations)

Each phase has **expected churn**, **cost**, and **ownership**.  
Metrics are interpreted *only* in the context of these expectations.

---

## Phase 1: Discovery / Story Creation
- **Churn expected:** HIGH
- **Cost of churn:** LOW
- **Owner:** PM / Architect / System
- **Purpose:** Explore uncertainty, surface gaps, shape scope

Healthy cycles:
- gap analysis ↔ refinement
- PM ↔ UX iteration
- architectural questioning
- scope reshaping

Anti-goal:
- silent assumptions
- early commitment

**No negative metrics apply in this phase.**

---

## Phase 2: Elaboration / Readiness
- **Churn expected:** MEDIUM
- **Cost of churn:** MEDIUM
- **Owner:** System + HiTL
- **Purpose:** Collapse ambiguity and prepare for commitment

Healthy cycles:
- AC refinement
- testability clarification
- UX/a11y tightening
- architectural sanity checks

Anti-goal:
- scope expansion without acknowledgement
- endless refinement loops

Primary signal:
- convergence toward readiness ≥ 85

---

## Phase 3: Development (Commitment Boundary)
- **Churn expected:** LOW
- **Cost of churn:** HIGH
- **Owner:** Developer
- **Purpose:** Execute on agreed understanding

Healthy cycles:
- refactoring for quality
- performance tuning
- test improvement
- code review feedback

**Negative signals (what we optimize against):**
- clarification questions
- scope changes
- requirement reinterpretation

---

## Phase 4: Post-Dev / QA
- **Churn expected:** VERY LOW
- **Cost of churn:** VERY HIGH
- **Owner:** System
- **Purpose:** Validate, not rediscover intent

Any scope or requirement churn here is a **system failure upstream**.

---

# Commitment Definition

**Commitment occurs at:**
- Readiness score ≥ **85**
- Blockers = 0
- Known unknowns ≤ **5**
- Context strength acknowledged

Metrics are evaluated **relative to this point**, not before.

---

# Reality Intake Sub-Graph (Workflow Boundary)

Runs **once per workflow shift**, not per story.

Produces:
```
/plans/baselines/BASELINE-REALITY-<date>.md
```

Defines:
- what exists
- what is in-progress
- what assumptions are invalid
- what must not be reworked

All new stories must reconcile against this baseline.

---

# Story Creation Flow (Reality-Aware)

1. `load_baseline_reality`
2. `retrieve_context`
3. `story.seed`
4. `story.fanout.*`
5. `story.attack` (bounded)
6. Gap hygiene (rank, never delete)
7. HiTL decisions
8. Readiness scoring
9. `story.synthesize`

---

# Elaboration (Delta-Only)

- Default: scoped deltas only
- Escape hatch triggers targeted re-review:
  - attacker (always)
  - architect / PM / UIUX / QA (as applicable)

No automatic full re-elaboration.

---

# Metrics Plan (Convergence-Focused)

## Metrics We Explicitly Care About

### 1. Time to Dev-Complete (TTDC)
Measured **after commitment**.

Track:
- median
- variance

We value **predictability over raw speed**.

---

### 2. Post-Commitment Ambiguity Rate (PCAR)
**North Star Metric**

Count of:
- clarification events after dev start
- scope-change events after dev start

This is the primary indicator of planning quality.

---

### 3. Stakeholder Turn Count (Post-Commitment Only)
Counts only:
- PM ↔ Dev
- UX ↔ Dev
- QA ↔ Dev

Triggered by clarification or scope change.

Pre-commitment turns are **explicitly excluded**.

---

### 4. Churn Placement Index
Distribution of churn by phase:
- discovery
- elaboration
- development
- post-dev

Healthy system:
- churn concentrated early
- sharp drop at commitment

---

### 5. Known Unknown Leakage
Count of unknowns discovered **after** commitment.

Any leakage indicates upstream failure.

---

## Metrics We Explicitly Do NOT Optimize

To avoid metric theater, we do **not** optimize for:
- fewer PR comments
- fewer review cycles
- fewer QA handoffs
- fewer revisions
- fewer meetings

These may increase or decrease without indicating success or failure.

---

# Gap Analysis Metrics (Secondary)

Used for system learning, not performance pressure:
- gap yield (accepted / suggested)
- category acceptance rates
- evidence-backed gap rates

Never used to judge individual performance.

---

# Interpretation Rules (Critical)

- Churn before commitment = **learning**
- Churn after commitment = **risk**
- No metric is evaluated without phase context
- Directionality matters more than precision

---

# Cost Justification Narrative

> “We are not reducing work.  
> We are moving uncertainty to a cheaper phase and reducing surprises during execution.”

This workflow justifies itself through:
- lower interruption cost
- faster convergence
- higher developer confidence
- more predictable delivery

---

## Anchor Question

> “Did we reduce ambiguity at commitment time without suppressing learning?”

If yes — the system is working.
