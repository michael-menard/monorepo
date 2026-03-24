---
name: arbiter-outcome-tracker
description: Track the accuracy of arbiter rulings over time. After fixes are applied, record whether upheld findings actually needed fixes and whether dismissed findings were correctly dismissed.
mcp_tools_available:
  - kb_search
  - kb_add_lesson
  - kb_update
  - kb_get
---

# /arbiter-outcome-tracker - Track Arbiter Ruling Accuracy

## Description

Track the effectiveness of arbiter rulings over time. After fixes are applied, record:

- Was the upheld finding actually a real issue?
- Did the fix resolve the problem?
- Was the severity level appropriate?
- Was the dismissed finding correctly dismissed?

**This is automatically triggered after `/adversarial-review`** - the system will prompt for tracking after fixes are applied.

This creates a feedback loop that improves future arbiter decisions.

## Usage

**Automatic prompting is enabled by default** - just run the command and it will prompt for pending rulings.

```bash
# Track all pending rulings (prompts for each)
/arbiter-outcome-tracker --session-id "{uuid}"

# Quick track all with defaults
/arbiter-outcome-tracker --session-id "{uuid}" --track-all

# View accuracy stats
/arbiter-outcome-tracker --stats

# Single ruling
/arbiter-outcome-tracker --session-id "{uuid}" --finding-id "LG-001"
```

## Parameters

- **--session-id** - Review session UUID (required)
- **--finding-id** - Track a specific finding only
- **--track-all** - Skip prompts, track all with defaults
- **--stats** - Show aggregate accuracy stats instead of tracking
- **--outcome** - `fixed` | `partially_fixed` | `not_fixed` | `wont_fix`
- **--severity-accurate** - `true` | `false`
- **--notes** - Additional notes

---

## How It Works

### Step 1: Fetch Rulings from Session

```
# Query KB for the review session
kb_search(
  query: "arbiter-review {session_id}",
  artifact_type: "arbiter-review",
  limit: 1
)

→ Returns session with all rulings
```

### Step 2: Prompt for Each Ruling

```
══════════════════════════════════════════════════════════
  TRACK RULING: {finding_id}
══════════════════════════════════════════════════════════
  Ruling: {ruling} | Severity: {severity}
  Description: {short_description}

  Outcome? [1] Fixed  [2] Partial  [3] Won't fix  [4] Not real  [s] Skip
══════════════════════════════════════════════════════════
```

Quick keyboard shortcuts:

- `1-4` - Select outcome
- `s` - Skip this one
- `a` - Mark all as fixed
- `q` - Quit tracking

# Query KB for the review session

kb_get(
artifact_type: "arbiter-review",
story_id: "ARBITER-REVIEW-{session_id}"
)

→ Returns session with all rulings

```

### Step 2: For Each Untracked Ruling

Present to user:

```

══════════════════════════════════════════════════════════
RULING OUTCOME: {finding_id}
══════════════════════════════════════════════════════════
Ruling: {ruling} | Severity: {severity}
Source: {source_role} ({source_model})
Description: {finding_description}

Was this ruling correct?
[1] Yes - fix worked [2] Partial [3] Won't fix [4] No issue
══════════════════════════════════════════════════════════

```

### Step 3: Record Outcome (with Model Attribution)

Record outcome with model context for optimization:

```

kb_add_lesson(
title: "Ruling outcome: {finding_id}",
what_happened: "Ruling: {ruling}, Severity: {severity}. Fix applied: {outcome}",
why: |
Source agent: {source_role} using {source_model}
Was this correct? {severity_accurate_check}
Evidence: {evidence}
resolution: "{outcome_details}",
category: "arbiter-effectiveness",
story_id: "ARBITER-REVIEW-{session_id}",
tags: [
"arbiter-outcome",
"ruling:{ruling}",
"severity:{severity}",
"model:{source_model}",
"role:{source_role}",
"outcome:{outcome}",
"{finding_category}"
]
)

```

### Step 4: Update Session Artifact

```

kb_update(
story_id: "ARBITER-REVIEW-{session_id}",
content: {
rulings: [
{
finding_id: "{id}",
outcome: "{outcome}",
severity_accurate: {true|false},
source_role: "{role}",
source_model: "{model}",
tracked_at: "{timestamp}",
notes: "{notes}"
}
]
}
)

```

---

## Accuracy Statistics

Query KB for aggregate accuracy by role AND model:

```

kb_search(
query: "arbiter outcome effectiveness",
entry_type: "lesson",
tags: ["arbiter-outcome"],
limit: 100
)

→ Returns all tracked outcomes with model attribution
→ Calculate:

BY ROLE × MODEL:

- langgraph:sonnet: upheld_rate=88%, severity_acc=85%
- langgraph:opus: upheld_rate=85%, severity_acc=82%
- database:sonnet: upheld_rate=90%, severity_acc=88%
- ai_apps:opus: upheld_rate=92%, severity_acc=94%

BY MODEL ACROSS ROLES:

- sonnet: avg_accuracy=87%, avg_cost=$3/1K
- opus: avg_accuracy=89%, avg_cost=$15/1K
- haiku: avg_accuracy=78%, avg_cost=$0.25/1K

```

```

---

## Dashboard Output

```
╔═══════════════════════════════════════════════════════════════════════╗
║              ARBITER EFFECTIVENESS DASHBOARD                        ║
╠═══════════════════════════════════════════════════════════════════════╣
║  Total Rulings Tracked: 47    Sessions Reviewed: 12                 ║
╠═══════════════════════════════════════════════════════════════════════╣
║  RULING ACCURACY                                                     ║
║  Upheld:    24/29 (83%)   Dismissed: 16/18 (89%)                   ║
║  Severity Accuracy: 87% (41/47)                                     ║
╠═══════════════════════════════════════════════════════════════════════╣
║  MODEL PERFORMANCE BY ROLE                                          ║
║  ───────────────────────────────────────────────────────────────────║
║  LangGraph:   sonnet 88% ████████▊░  |  opus 85%                  ║
║  Database:    sonnet 90% █████████░  |  opus 78%                  ║
║  AI-Apps:    opus   92% █████████▊░  ← Best for LLM               ║
║  MultiAgent: sonnet 89% ████████▉░  |  opus 80%                   ║
║  Security:   opus   95% █████████▊   ← Best for security            ║
║  Performance:sonnet 92% █████████░  |  opus 88%                    ║
║  Arch:      opus   94% █████████▍  |  sonnet 85%                  ║
║  DA:         haiku  88% ████████▊░  ← Best for edge cases!         ║
╠═══════════════════════════════════════════════════════════════════════╣
║  MODEL SUMMARY                                                      ║
║  sonnet: avg 89% accuracy  |  $3/1K tokens  | Best value          ║
║  opus:   avg 89% accuracy   |  $15/1K tokens | Deep reasoning       ║
║  haiku:  avg 78% accuracy  |  $0.25/1K      | Fast edge cases      ║
╠═══════════════════════════════════════════════════════════════════════╣
║  COST TRACKING                                                      ║
║  Tokens: 2.4M    Sessions: 12    Avg Cost: $1.04/review           ║
╚═══════════════════════════════════════════════════════════════════════╝

MODEL OPTIMIZATION SUGGESTIONS:
  → Security: sonnet→opus (+7% quality, +$0.12/review)
  → DA: sonnet→haiku (+13% quality, -$0.14/review)
  → Net: +2% quality, -$0.02/review
```

---

## Improvement Triggers

The system can flag when arbiter should reconsider:

| Trigger                  | Threshold | Action                      |
| ------------------------ | --------- | --------------------------- |
| Upheld incorrect rate    | > 30%     | Review upheld patterns      |
| Dismissed incorrect rate | > 20%     | Review dismissal criteria   |
| Severity overstatement   | > 15%     | Tend toward lower severity  |
| Severity understatement  | > 10%     | Tend toward higher severity |

---

## Integration with Adversarial Review

The `/arbiter-outcome-tracker` can be invoked:

1. **After fix sprint** - Manual trigger by user
2. **Scheduled check** - Weekly cron job to prompt for pending outcomes
3. **Pre-review** - As part of `/adversarial-review` to show recent accuracy stats

```

# Example pre-review stats shown to Arbiter:

ARBITER ACCURACY (recent 10 sessions):

- Upheld: 80% correct (was the right call)
- Dismissed: 90% correct (was the right call)
- Severity: 85% accurate

NOTE: Performance issues have lower accuracy (70%).
Consider being more conservative on performance rulings.

```

```

```
