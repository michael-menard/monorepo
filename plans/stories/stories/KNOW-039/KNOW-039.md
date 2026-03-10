---
story_id: KNOW-039
title: ADR Injection in Elaboration and Architect-Driven ADR Creation
status: backlog
created: 2026-02-22
updated: 2026-02-22
epic: KNOW
feature: Knowledge Base
type: feature
priority: high
depends_on:
  - KNOW-038  # ADRs must be in DB before elaboration agents can query them
---

# KNOW-039: ADR Injection in Elaboration and Architect-Driven ADR Creation

## Context

ADRs are currently consulted only during **dev planning** and **QA verification** — after a story has already been elaborated and implementation has begun. This is too late. Architectural constraints should shape the story *during elaboration*, before acceptance criteria are finalized and before scope decisions are locked in.

Two gaps exist:

**Gap 1 — Elaboration blindspot:** The `elab-analyst` and the architect expert in the gang of seven do not query ADRs before producing their findings. A story elaborated without awareness of ADR-001 (API path schema) or ADR-005 (testing strategy) may produce ACs that conflict with standing architectural decisions. The conflict is only caught when the dev agent reads the ADR during planning — causing a costly late-stage revision.

**Gap 2 — No creation pipeline:** When the architect expert in elaboration identifies a new architectural decision (e.g. "we've decided to use Aurora for all relational data"), there is no structured path to write that as an ADR. It may end up as a note in the ELAB.yaml or be lost entirely. ADRs should be proposed during elaboration by the architect, reviewed, and written to the KB if approved.

## Goal

1. Inject active ADRs into the elaboration context so the expert gang can validate stories against standing constraints
2. Give the architect expert a structured path to propose new ADRs during elaboration, which are then written to the KB

## Non-goals

- Changing the `elab-analyst` audit checklist structure
- Requiring every elaboration to produce an ADR
- Automated ADR approval (human or architect agent proposes, elaboration workflow records)

## Scope

### Gap 1: ADR Injection in Elaboration

**`elab-analyst.agent.md` update** — add a new pre-audit step:

```
### Step 0: Load Active ADRs

Before performing the story audit, query active ADRs:

kb_search({
  entry_type: 'decision',
  tags: ['adr'],
  min_confidence: null,       // ADRs don't decay
  confidence_weight: 0,       // Rank by recency, not confidence
  limit: 20
})

For each ADR returned:
- Check if this story's scope intersects with the ADR's domain
- If yes, add to `relevant_adrs[]` in ELAB.yaml
- If any AC conflicts with an ADR, flag as a gap with severity: blocking
```

**ELAB.yaml extension:**
```yaml
relevant_adrs:
  - id: "adr-001"
    title: "API Endpoint Path Schema"
    applies_because: "Story modifies API endpoints"
    conflicts: []   # List of AC IDs that conflict with this ADR
```

**Conflict handling:** If an AC conflicts with an active ADR, it is treated as a `gap` with `severity: blocking`. The AC must be revised to comply before the story can pass elaboration. This is not overridable in autonomous mode — it requires human review.

### Gap 2: Architect-Driven ADR Proposals

**New `elab-architect.agent.md` capability:**

The architect expert (already part of the gang of seven) gains a new output channel — `adr_proposals[]` in ELAB.yaml:

```yaml
adr_proposals:
  - title: "Aurora PostgreSQL for all relational transactional data"
    context: "Story introduces a new relational data model. Multiple storage options were considered."
    decision: "Use Aurora PostgreSQL. DynamoDB considered but rejected due to relational join requirements."
    consequences: "All future relational data must use Aurora. DynamoDB reserved for key-value/session data."
    proposed_by: "architect-expert"
    status: proposed
```

**`elab-completion-leader.agent.md` update:**

After elaboration passes, for each `adr_proposals[]` entry:
1. If `status: proposed`, call `kb_add_decision` with `status: 'proposed'`
2. Record the returned KB entry ID in ELAB.yaml
3. Tag the proposal with `adr-proposed`, `story:{story_id}`

**Proposed ADRs** are not active constraints until manually promoted to `status: active` via `kb_update`. They appear in ADR queries filtered by status so humans can review and approve.

### `knowledge-context-loader` Update

Extend to also load `status: proposed` ADRs separately, surfacing them as "pending decisions" that dev agents should be aware of but not treat as hard constraints.

### Packages Affected

- `.claude/agents/elab-analyst.agent.md` — Step 0 ADR load + conflict detection
- `.claude/agents/elab-architect.agent.md` (or equivalent) — `adr_proposals[]` output
- `.claude/agents/elab-completion-leader.agent.md` — write proposed ADRs to KB
- `.claude/agents/knowledge-context-loader.agent.md` — load proposed ADRs separately
- `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` — ensure `status: proposed` is queryable

## Acceptance Criteria

- [ ] `elab-analyst` loads active ADRs from the KB before beginning story audit
- [ ] ADRs relevant to the story's domain are listed in `relevant_adrs[]` in ELAB.yaml
- [ ] An AC that conflicts with an active ADR is flagged as a blocking gap
- [ ] A blocking ADR conflict cannot be auto-resolved in autonomous mode
- [ ] The architect expert can propose new ADRs via `adr_proposals[]` in ELAB.yaml
- [ ] Proposed ADRs are written to `knowledge_entries` with `status: proposed` after elaboration completes
- [ ] Proposed ADRs are visible in KB queries filtered to `status: proposed`
- [ ] Proposed ADRs are NOT treated as hard constraints until promoted to `status: active`
- [ ] `knowledge-context-loader` loads proposed ADRs as a separate "pending decisions" section
