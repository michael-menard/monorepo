# DECISIONS.md Format

Format for batching multiple decisions instead of single escalations.

---

## Purpose

When multiple decisions arise during agent execution, batch them into a single escalation to reduce human interruptions.

---

## File Location

`{FEATURE_DIR}/in-progress/{STORY_ID}/_implementation/DECISIONS.md`

---

## Format

```markdown
# Pending Decisions

Story: {STORY_ID}
Phase: {current_phase}
Agent: {agent_name}
Created: {timestamp}

## Decision 1: {Title}

**Tier**: 1 | 2 | 3 | 4 | 5
**Category**: clarification | preference | ambiguous_scope | destructive | external_dependency

**Context**:
{Why this decision is needed}

**Options**:
1. **{Option A}**: {description}
2. **{Option B}**: {description}
3. **{Option C}**: {description}

**Recommendation**: {Option X}
**Rationale**: {Why this option is recommended}

**Status**: pending | approved | rejected
**Approved By**: user | auto (tier 1, moderate autonomy)
**Decision**: {final choice}

---

## Decision 2: {Title}
...

---

## Summary

| # | Tier | Category | Recommendation | Status |
|---|------|----------|----------------|--------|
| 1 | 2 | preference | Option A | pending |
| 2 | 3 | ambiguous_scope | Option B | pending |
| 3 | 1 | clarification | Option A | auto-approved |

**Awaiting human input**: Decisions 1, 2
**Auto-approved (per autonomy level)**: Decision 3
```

---

## Autonomy Handling

| Autonomy Level | Tier 1 | Tier 2 | Tier 3 | Tier 4 | Tier 5 |
|----------------|--------|--------|--------|--------|--------|
| conservative | escalate | escalate | escalate | escalate | escalate |
| moderate | auto | escalate | auto | escalate | escalate |
| aggressive | auto | auto | auto | escalate | auto (low-risk) |

Auto-approved decisions are marked with `Status: auto-approved` and `Approved By: auto ({tier}, {autonomy_level})`.

---

## Workflow

1. Agent encounters decision point
2. Agent checks DECISIONS.md - if exists, append; else create
3. Agent checks autonomy level:
   - If auto-approve: mark approved, continue
   - If escalate: add to pending, report batch
4. When all decisions resolved, agent continues

---

## Human Response

Human reviews DECISIONS.md and updates:
- `Status: approved` or `Status: rejected`
- `Decision: {choice}`

Agent re-reads DECISIONS.md and continues with approved decisions.
