---
created: 2026-03-03
updated: 2026-03-03
version: 1.0.0
doc_type: schema
story_id: AC-1010
---

# ELAB.yaml Schema

Golden reference schema for the elaboration lifecycle artifact. ELAB.yaml is the single source of truth for all elaboration data: audit findings, gaps, opportunities, decisions, and final verdict.

---

## Overview

ELAB.yaml is written by `elab-analyst` and finalized by `elab-completion-leader`. It replaces the four previously separate artifacts:
- Legacy `ANALYSIS` (formerly .md) → merged into `audit[]` section
- Legacy `DECISIONS` (formerly .yaml, elab-phase only) → merged into `gaps[].decision` and `opportunities[].decision` fields
- Legacy `FUTURE-OPPORTUNITIES` (formerly .md) → merged into `opportunities[]` section
- Legacy `ELAB-{STORY_ID}` (formerly .md) → entire lifecycle now in ELAB.yaml

---

## Schema Definition

```yaml
# ELAB.yaml - Elaboration Lifecycle Record
# schema_version MUST be the first field

schema_version: 1
story_id: string           # e.g., "WISH-2045"
timestamp: datetime        # ISO 8601 — when analyst wrote this

# Audit findings (9-point checklist)
audit:
  - id: scope_alignment
    status: PASS | FAIL | WARN
    note: string

  - id: internal_consistency
    status: PASS | FAIL | WARN
    note: string

  - id: reuse_first
    status: PASS | FAIL | WARN
    note: string

  - id: ports_adapters
    status: PASS | FAIL | WARN
    note: string

  - id: testability
    status: PASS | FAIL | WARN
    note: string

  - id: decision_completeness
    status: PASS | FAIL | WARN
    note: string

  - id: risk_disclosure
    status: PASS | FAIL | WARN
    note: string

  - id: story_sizing
    status: PASS | FAIL | SPLIT
    note: string

  - id: subtask_decomposition
    status: PASS | CONDITIONAL | FAIL
    note: string

# MVP-blocking gaps only (non-blocking items go in opportunities[])
gaps:
  - id: string             # e.g., "gap-1"
    check: string          # which audit check triggered this
    finding: string        # description of the gap
    severity: string       # critical | high | medium | low
    decision: null | string  # filled by autonomous-decider or completion-leader
    ac_added: null | string  # "AC-7: description" if decision=add_ac

# Non-blocking future opportunities
opportunities:
  - id: string             # e.g., "opp-1"
    category: string       # edge_cases | ux_polish | performance | observability | integrations
    finding: string        # description of the opportunity
    effort: string         # low | medium | high
    decision: null | string  # filled by autonomous-decider or completion-leader
    kb_entry_id: null | string  # KB ID if logged

# Only present when story_sizing audit = SPLIT
split_recommendation:
  splits:
    - id: string           # "A", "B", etc.
      scope: string
      ac_allocation: array
      dependency: string   # "none" or split ID this depends on

# Set by analyst; finalized by completion-leader
preliminary_verdict: null | PASS | CONDITIONAL_PASS | FAIL | SPLIT_REQUIRED
verdict: null | PASS | CONDITIONAL_PASS | FAIL | SPLIT_REQUIRED
decided_at: null | datetime  # ISO 8601 — when verdict was finalized

summary:
  gaps_found: number
  gaps_resolved: number        # gaps with decision != null
  opportunities_found: number
  opportunities_logged: number # opportunities with kb_entry_id != null
  acs_added: number
```

---

## Field Descriptions

### Core Fields

| Field | Type | Required | Writer | Description |
|-------|------|----------|--------|-------------|
| `schema_version` | number | Yes | analyst | Always `1`; increment on breaking changes |
| `story_id` | string | Yes | analyst | Story identifier |
| `timestamp` | datetime | Yes | analyst | When analyst wrote ELAB.yaml |

### Audit Fields

Each `audit[]` entry covers one of 9 checklist points.

| Status | Meaning |
|--------|---------|
| `PASS` | Check passed without issues |
| `FAIL` | Check failed — may generate a gap |
| `WARN` | Concern noted but not blocking |
| `SPLIT` | Applies only to `story_sizing` — story must be split |
| `CONDITIONAL` | Applies only to `subtask_decomposition` — acceptable with caveats |

### Gap Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (gap-1, gap-2, …) |
| `check` | string | Audit check that triggered this gap |
| `finding` | string | What is missing or problematic |
| `severity` | enum | `critical` \| `high` \| `medium` \| `low` |
| `decision` | null \| string | Null until autonomous-decider or completion-leader fills it |
| `ac_added` | null \| string | Set when decision=`add_ac` — describes the AC added |

### Opportunity Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (opp-1, opp-2, …) |
| `category` | enum | `edge_cases` \| `ux_polish` \| `performance` \| `observability` \| `integrations` |
| `finding` | string | What future work is possible |
| `effort` | enum | `low` \| `medium` \| `high` |
| `decision` | null \| string | Null until downstream agent fills it |
| `kb_entry_id` | null \| string | Set when opportunity is logged to KB |

### Verdict Fields

| Field | Writer | Description |
|-------|--------|-------------|
| `preliminary_verdict` | elab-analyst | Set at end of analysis phase |
| `verdict` | elab-completion-leader | Final verdict after decisions are applied |
| `decided_at` | elab-completion-leader | Timestamp when verdict was finalized |

| Verdict | Meaning |
|---------|---------|
| `PASS` | All checks passed, no blocking gaps |
| `CONDITIONAL_PASS` | Minor gaps resolved, ready to work with notes |
| `FAIL` | Blocking gaps remain — story needs PM fixes |
| `SPLIT_REQUIRED` | Story is too large — must be split before work |

---

## Lifecycle

```
elab-analyst writes:
  schema_version, story_id, timestamp
  audit[] (all 9 checks)
  gaps[] (MVP-blocking only)
  opportunities[] (non-blocking)
  preliminary_verdict
  summary.gaps_found, summary.opportunities_found

  ↓

elab-autonomous-decider (if autonomous mode) fills:
  gaps[].decision
  opportunities[].decision
  opportunities[].kb_entry_id

  ↓

elab-completion-leader writes:
  verdict
  decided_at
  summary.gaps_resolved
  summary.opportunities_logged
  summary.acs_added
  (interactive mode: also fills gaps[].decision, opportunities[].decision)
```

---

## Example

```yaml
schema_version: 1
story_id: WISH-2045
timestamp: 2026-03-03T10:00:00Z

audit:
  - id: scope_alignment
    status: PASS
    note: ""
  - id: internal_consistency
    status: PASS
    note: ""
  - id: reuse_first
    status: PASS
    note: ""
  - id: ports_adapters
    status: PASS
    note: ""
  - id: testability
    status: WARN
    note: "No .http test file specified for POST /wishlist endpoint"
  - id: decision_completeness
    status: PASS
    note: ""
  - id: risk_disclosure
    status: FAIL
    note: "No timeout handling specified for upload flow"
  - id: story_sizing
    status: PASS
    note: ""
  - id: subtask_decomposition
    status: PASS
    note: ""

gaps:
  - id: gap-1
    check: risk_disclosure
    finding: "No timeout handling in upload flow — blocks core user journey"
    severity: high
    decision: add_ac
    ac_added: "AC-7: Upload times out after 30s with user-visible error"

opportunities:
  - id: opp-1
    category: ux_polish
    finding: "Debounce search input to reduce unnecessary requests"
    effort: low
    decision: defer
    kb_entry_id: null

preliminary_verdict: CONDITIONAL_PASS
verdict: CONDITIONAL_PASS
decided_at: 2026-03-03T11:30:00Z
summary:
  gaps_found: 1
  gaps_resolved: 1
  opportunities_found: 1
  opportunities_logged: 0
  acs_added: 1
```

---

## Related Agents

| Agent | Role |
|-------|------|
| `elab-analyst.agent.md` | Phase 1 — writes audit, gaps, opportunities, preliminary_verdict |
| `elab-autonomous-decider.agent.md` | Optional — fills decision fields autonomously |
| `elab-completion-leader.agent.md` | Phase 2 — finalizes verdict, summary, decided_at |

---

## Changelog

### Version 1.0.0 (2026-03-03 - AC-1010)
- Initial golden reference schema
- Consolidates four formerly separate artifacts into a single lifecycle artifact: ANALYSIS (md), DECISIONS (yaml, elab-phase), FUTURE-OPPORTUNITIES (md), and ELAB-{STORY_ID} (md)
- `schema_version` is always the first field (ENG-ARCH-002)
