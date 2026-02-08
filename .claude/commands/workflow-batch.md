---
created: 2026-02-06
updated: 2026-02-06
version: 1.0.0
wraps: dev-implement-story
agents:
  - dev-setup-leader.agent.md
  - dev-plan-leader.agent.md
  - dev-execute-leader.agent.md
artifacts:
  - CHECKPOINT.yaml
  - SCOPE.yaml
kb_tools:
  - kb_add_decision
  - kb_add_lesson
  - kb_search
shared:
  - _shared/decision-handling.md
  - _shared/autonomy-tiers.md
---

/workflow-batch {FEATURE_DIR} {STORY_ID} [flags]

You are the **Batch Orchestrator**. This command wraps `/dev-implement-story` with batch mode enabled.

## Purpose

Runs `/dev-implement-story` with:
- `batch_mode: true` - Decisions are queued instead of immediate escalation
- `autonomous: moderate` (default) - Auto-accepts Tier 1 and Tier 3 decisions
- Phase-end batch review - Pending decisions presented together

## Usage

```bash
# Run with batching (moderate autonomy by default)
/workflow-batch plans/future/wishlist WISH-001

# Specify autonomy level
/workflow-batch plans/future/wishlist WISH-001 --autonomous=aggressive

# Dry run to see what would be batched
/workflow-batch plans/future/wishlist WISH-001 --dry-run
```

## Flags

| Flag | Default | Purpose |
|------|---------|---------|
| `--autonomous=LEVEL` | moderate | Autonomy level (conservative, moderate, aggressive) |
| `--dry-run` | false | Analyze decisions without executing |
| `--batch-threshold=N` | 5 | Present batch when N decisions accumulated |
| `--max-iterations=N` | 3 | Max review/fix loops |

---

## Decision Handling

### Tier Behavior

| Tier | Category | Behavior |
|------|----------|----------|
| 1 | Clarification | Auto-accept using codebase conventions |
| 2 | Preference | Queue for batch review |
| 3 | Ambiguous Scope | Auto-accept with minimal interpretation |
| 4 | Destructive | **Immediate escalation** (never batched) |
| 5 | External Dependency | Queue for batch review |

### Auto-Accept Conditions

Tier 1 and 3 decisions are auto-accepted when ALL conditions are met:
- Confidence ≥ 0.8
- Matches existing codebase pattern
- Has project convention in `.claude/config/preferences.yaml`
- No conflicting preferences

### Moonshot Detection

Decisions matching moonshot patterns are automatically deferred:
- "future", "nice to have", "stretch goal"
- "out of scope", "phase 2", "later version"

These are logged to `DEFERRED-BACKLOG.yaml` without blocking workflow.

---

## Architecture

```
/workflow-batch
    │
    ├─► Wrap /dev-implement-story with batch mode
    │
    ├─► For each decision encountered:
    │     │
    │     ├─► Tier 4? → Immediate escalation
    │     │
    │     ├─► Moonshot? → Auto-defer to backlog
    │     │
    │     ├─► Auto-accept conditions met? → Log to DECISIONS-AUTO.yaml
    │     │
    │     └─► Otherwise → Queue for batch
    │
    ├─► At batch threshold or phase end:
    │     │
    │     └─► Present batch summary to user
    │           ├─► User approves/modifies
    │           └─► Apply decisions, continue
    │
    └─► On completion:
          ├─► Write BATCH-DECISIONS.yaml
          ├─► Write DEFERRED-BACKLOG.yaml (if any deferred)
          └─► Report summary
```

---

## Artifacts Created

| File | Location | Purpose |
|------|----------|---------|
| `BATCH-DECISIONS.yaml` | `_implementation/` | Summary of all batched decisions |
| `DECISIONS-AUTO.yaml` | `_implementation/` | Auto-accepted decisions log |
| `DEFERRED-BACKLOG.yaml` | `_implementation/` | Moonshot/out-of-scope items |

---

## Batch Summary Format

When batch is presented to user:

```markdown
## Batched Decisions (5 items)

### Auto-Accepted (3)
✓ [Tier 1] Test file naming → kebab-case (matches convention)
✓ [Tier 1] Import order → grouped by type (matches convention)
✓ [Tier 3] Validation scope → minimal (per autonomy level)

### Requires Review (2)
? [Tier 2] State management approach
  - Options: A) zustand  B) context  C) redux
  - Recommendation: A (matches existing patterns)

? [Tier 5] Add new dependency: react-dropzone
  - Risk: low (well-maintained, small footprint)
  - Recommendation: Approve

### Deferred to Backlog (1)
→ [Moonshot] Add keyboard shortcuts for power users

---

**Actions:**
- [A] Approve all recommendations
- [1-5] Review specific decision
- [R] Reject all and escalate
```

---

## Configuration

Batch behavior is controlled by:
- `.claude/config/autonomy.yaml` - Autonomy levels and phase overrides
- `.claude/config/preferences.yaml` - Project and learned preferences
- `.claude/config/decision-classification.yaml` - Tier classification patterns

---

## Example Session

```
> /workflow-batch plans/future/wishlist WISH-045

Starting WISH-045 with batch mode (moderate autonomy)...

[Phase 0: Setup] ✓ Complete
[Phase 1: Planning] ✓ Complete
  └─ 2 decisions auto-accepted

[Phase 2: Implementation]
  └─ Batch threshold reached (5 decisions)

## Batched Decisions

### Auto-Accepted (3)
✓ Test naming: kebab-case
✓ Component structure: standard
✓ Error handling: try-catch

### Requires Review (2)
? Use optimistic updates? → Recommended: Yes
? Add loading skeleton? → Recommended: Yes

[A] Approve / [1-2] Review / [R] Reject: A

Approved. Continuing...

[Phase 2: Implementation] ✓ Complete
[Phase 3: Verification] ✓ Complete
[Phase 4: Proof] ✓ Complete

## Summary
- Total decisions: 8
- Auto-accepted: 5
- User-approved: 2
- Deferred: 1 (see DEFERRED-BACKLOG.yaml)

WISH-045 ready for QA.
```

---

## Reference

- `.claude/agents/_shared/autonomy-tiers.md` - Tier definitions
- `.claude/agents/_reference/schemas/decisions-yaml.md` - Decision format
- `docs/FULL_WORKFLOW.md` - Full workflow documentation
