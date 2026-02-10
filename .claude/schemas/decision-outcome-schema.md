---
created: 2026-02-07
updated: 2026-02-07
version: 1.0.0
doc_type: schema
story_id: WKFL-003
---

# DECISION_OUTCOME Schema

Defines the structure for capturing decision outcomes from the autonomy framework. This data enables heuristic evolution, tier calibration, and learning from user feedback on auto-accepted vs escalated decisions.

---

## Overview

`decision_outcome` entries are created whenever a decision is made through the autonomy framework, regardless of tier or acceptance mode. These entries track:

- What pattern the decision matched
- What tier it was classified as
- Whether it was auto-accepted or escalated
- How the user responded (confirmed, overridden, or modified)

This data flows into the heuristic-evolver agent (WKFL-003), which analyzes success rates and proposes tier promotions/demotions.

---

## Schema Definition

```yaml
# decision_outcome entry - captured in Knowledge Base
# Version: 1

type: decision_outcome
schema_version: 1

# Decision identification
story_id: string            # Story where decision occurred (e.g., "WISH-2045")
decision_id: string         # Unique ID from DECISIONS.yaml (e.g., "D-001")
pattern: string             # Regex pattern that matched (from decision-classification.yaml)
timestamp: datetime         # ISO 8601 timestamp of decision

# Tier classification
tier: number                # 1-5 per autonomy-tiers.md
category: string            # One of: clarification, preference, ambiguous_scope, destructive, external_dependency

# Decision handling
auto_accepted: boolean      # true = proceeded autonomously, false = escalated to human
autonomy_level: string      # conservative | moderate | aggressive (from --autonomous flag)

# User outcome
user_outcome: enum          # confirmed | overridden | modified
  # confirmed: User accepted the decision as-is
  # overridden: User rejected and chose different option
  # modified: User accepted with changes

# Optional context
decision_text: string       # Brief description of what was decided (optional)
options_considered: array   # List of options presented (optional)
selected_option: string     # Which option was chosen (optional)
override_reason: string     # User explanation if overridden (optional)
```

---

## Field Descriptions

### Core Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | Always "decision_outcome" |
| `schema_version` | number | Yes | Schema version (currently 1) |
| `story_id` | string | Yes | Story identifier (e.g., WISH-2045) |
| `decision_id` | string | Yes | Unique decision identifier from DECISIONS.yaml |
| `pattern` | string | Yes | Regex pattern that triggered classification |
| `timestamp` | datetime | Yes | When decision was made (ISO 8601) |

### Classification Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tier` | number | Yes | Autonomy tier (1-5) from autonomy-tiers.md |
| `category` | string | Yes | Category name (clarification, preference, etc.) |
| `auto_accepted` | boolean | Yes | true = autonomous, false = escalated |
| `autonomy_level` | string | Yes | conservative, moderate, or aggressive |

### Outcome Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `user_outcome` | enum | Yes | confirmed, overridden, or modified |
| `decision_text` | string | No | Brief description of the decision |
| `options_considered` | array | No | List of options presented to user |
| `selected_option` | string | No | Which option was chosen |
| `override_reason` | string | No | User explanation if overridden |

---

## Examples

### Example 1: Confirmed Auto-Accept (High Success Pattern)

```yaml
type: decision_outcome
schema_version: 1

story_id: WISH-2045
decision_id: D-003
pattern: "loading.*state|skeleton"
timestamp: 2026-02-06T14:32:00Z

tier: 3
category: ambiguous_scope
auto_accepted: true
autonomy_level: moderate

user_outcome: confirmed
decision_text: "Add loading skeleton to wishlist table"
options_considered:
  - "Add skeleton component"
  - "Use spinner"
  - "Show empty state"
selected_option: "Add skeleton component"
```

### Example 2: Overridden Auto-Accept (Pattern Needs Demotion)

```yaml
type: decision_outcome
schema_version: 1

story_id: API-042
decision_id: D-001
pattern: "breaking.*api"
timestamp: 2026-02-05T10:15:00Z

tier: 2
category: preference
auto_accepted: true
autonomy_level: aggressive

user_outcome: overridden
decision_text: "Change API endpoint from /api/v1/items to /api/items"
options_considered:
  - "Change endpoint (breaking)"
  - "Add new endpoint (preserve old)"
  - "Version bump to v2"
selected_option: "Add new endpoint (preserve old)"
override_reason: "Breaking changes require versioning, not direct replacement"
```

### Example 3: Escalated Then Confirmed (Pattern Working as Expected)

```yaml
type: decision_outcome
schema_version: 1

story_id: AUTH-008
decision_id: D-002
pattern: "auth.*change|permission.*change"
timestamp: 2026-02-04T16:45:00Z

tier: 4
category: destructive
auto_accepted: false
autonomy_level: moderate

user_outcome: confirmed
decision_text: "Add new OAuth scope to user permissions"
options_considered:
  - "Add scope immediately"
  - "Add scope with migration"
  - "Defer to separate story"
selected_option: "Add scope with migration"
```

---

## Integration Points

### Producers

Decision outcomes are produced by:

- **dev-plan-leader**: When making planning decisions (scope, approach, tech choices)
- **dev-implementation-worker**: When making implementation decisions (component structure, patterns)
- **dev-fix-worker**: When making fix decisions (refactor vs patch, test coverage)
- **qa-verify-leader**: When making verification decisions (test scope, acceptable edge cases)

Each agent logs decisions to `DECISIONS.yaml` in the story's `_implementation/` directory. At the end of each phase, the leader writes decision_outcome entries to the KB.

### Consumers

Decision outcomes are consumed by:

- **heuristic-evolver.agent.md** (WKFL-003): Analyzes success rates and proposes tier adjustments
- **calibration.agent.md** (WKFL-002): Correlates decision overhead with token usage
- **pattern-miner.agent.md** (WKFL-006): Identifies cross-story decision patterns
- **workflow-retro.agent.md**: Retrospective analysis of decision quality

---

## Data Flow

```
1. Agent makes decision
   ↓
2. Matches pattern in decision-classification.yaml
   ↓
3. Classifies to tier (1-5)
   ↓
4. Checks autonomy level (--autonomous flag)
   ↓
5. Auto-accepts or escalates based on tier + autonomy level
   ↓
6. User confirms/overrides/modifies
   ↓
7. Agent logs to DECISIONS.yaml
   ↓
8. End of phase: Leader writes decision_outcome to KB
   ↓
9. heuristic-evolver queries KB for all decision_outcome entries
   ↓
10. Groups by pattern, computes success rate
    ↓
11. Proposes tier promotions (>95% success) or demotions (<80% success)
    ↓
12. Human reviews HEURISTIC-PROPOSALS.yaml
    ↓
13. Human updates decision-classification.yaml (manual step)
```

---

## KB Query Examples

### Query all decision outcomes for a story

```javascript
kb_search({
  query: "story_id:WISH-2045",
  type: "decision_outcome",
  limit: 100
})
```

### Query outcomes for a specific pattern

```javascript
kb_search({
  query: "pattern:loading.*state",
  type: "decision_outcome",
  limit: 50
})
```

### Query overridden auto-accepts (high priority for demotion)

```javascript
kb_search({
  query: "auto_accepted:true user_outcome:overridden",
  type: "decision_outcome",
  limit: 20
})
```

### Query by tier

```javascript
kb_search({
  query: "tier:3",
  type: "decision_outcome",
  limit: 100
})
```

---

## Evolution Notes

This schema is designed for backward-compatible evolution:

### Version 1.0.0 (Current)

- Core fields for pattern, tier, outcome tracking
- Supports promotion/demotion heuristics

### Future Enhancements

1. **Quality Scoring** (v1.1.0)
   ```yaml
   quality_score: number    # 0-100, derived from user feedback + metrics
   confidence: number       # How certain we are about this decision
   ```

2. **Timing Metrics** (v1.1.0)
   ```yaml
   time_to_confirm_ms: number    # How long user took to respond
   time_to_implement_ms: number  # How long implementation took
   ```

3. **Rework Tracking** (v1.2.0)
   ```yaml
   rework_needed: boolean        # Did this decision cause follow-up work?
   rework_story_ids: array       # Stories created to fix issues from this decision
   ```

4. **Pattern Versioning** (v1.2.0)
   ```yaml
   pattern_version: number       # Track pattern evolution over time
   superseded_by: string         # If pattern was replaced
   ```

When evolving, increment `schema_version` and document migrations in `.claude/migrations/`.

---

## Validation Rules

1. **Required fields**: All fields marked "Required: Yes" must be present
2. **Enum values**: `user_outcome` must be one of: confirmed, overridden, modified
3. **Tier range**: `tier` must be 1-5
4. **Autonomy level**: `autonomy_level` must be one of: conservative, moderate, aggressive
5. **Pattern match**: `pattern` should exist in `decision-classification.yaml` (soft validation)
6. **Timestamp format**: ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)

---

## Usage in WKFL-003

The heuristic-evolver agent uses decision_outcome entries to:

1. **Group by pattern**: Collect all decisions matching the same pattern
2. **Compute success rate**: `confirmed / (confirmed + overridden + modified)`
3. **Filter by sample size**: Require minimum 5 samples per pattern
4. **Apply promotion logic**: Success rate >95% → propose tier - 1
5. **Apply demotion logic**: Success rate <80% → propose tier + 1; <50% → propose tier + 2
6. **Generate proposals**: Write to HEURISTIC-PROPOSALS.yaml for human review

See `.claude/agents/heuristic-evolver.agent.md` for full implementation details.
