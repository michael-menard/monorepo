---
status: ready-to-work
id: WKFL-002
title: Confidence Calibration
priority: P1
phase: analysis
epic: workflow-learning
dependencies: [WKFL-001, WKFL-004]
blocks: [WKFL-003, WKFL-010]
created: 2026-02-06
estimated_tokens: 50000
tags: [analysis, calibration, kb-integration, meta-workflow]
---

# WKFL-002: Confidence Calibration

## Context

Agent findings in VERIFICATION.yaml include stated confidence levels (high/medium/low) alongside severity. These confidence levels come from the Severity Calibration Framework (`.claude/agents/_shared/severity-calibration.md`), which guides agents through calibration questions to determine both severity and confidence.

However, there's currently no feedback loop to validate whether "high confidence" findings are actually correct. This creates calibration drift where agents may over- or under-estimate their confidence over time.

### Current State

**What Exists:**
- Severity Calibration Framework defines confidence levels in `.claude/agents/_shared/severity-calibration.md`
- VERIFICATION.yaml format includes `confidence: high|medium|low` field for each finding
- Agent frontmatter with `kb_tools` declaration for KB integration
- Knowledge Base MCP Server for storing and querying structured data

**What's Missing:**
- No tracking of stated confidence vs actual outcomes
- No accuracy metrics per agent per confidence level
- No alerting when confidence calibration drifts
- No data-driven threshold adjustment recommendations

**Example Current Flow:**
```yaml
# In VERIFICATION.yaml
findings:
  - id: SEC-042
    agent: code-review-security
    severity: high
    confidence: high  # Agent says "I'm very sure about this"
    description: "XSS vulnerability in user input handling"

# What happens after:
# - If it's a false positive: Nothing learns from it
# - If it's correct: No reinforcement
# - Pattern: Confidence slowly becomes meaningless
```

### Problem

Without calibration tracking:
1. **Agents don't learn from mistakes** - False positives at "high confidence" go untracked
2. **"High confidence" loses meaning** - If frequently wrong, developers stop trusting it
3. **No data-driven improvement** - Threshold adjustments are guesswork
4. **Developer trust erodes** - Confident but wrong findings damage credibility

**Impact on Workflow:**
- Gate failures from over-confident findings waste time
- Under-confident findings miss real issues
- Manual override rates are unknown
- No basis for evolving agent heuristics

### Reality Baseline

**Relevant Existing Features:**
- Knowledge Base MCP Server (active) - Will store calibration data
- VERIFICATION.yaml format (active) - Source of finding IDs and confidence levels
- Agent frontmatter with kb_tools (active) - Agents declare KB usage
- Severity Calibration Framework (active) - Defines confidence levels

**Active Dependencies:**
- WKFL-001 (Meta-Learning Loop) - Provides OUTCOME.yaml with actual story results
- WKFL-004 (Human Feedback Capture) - Provides /feedback command for explicit outcomes

**Constraints:**
- Both dependencies are `pending` status - WKFL-002 cannot start until they complete
- KB schema uses Zod-first types (all schema in `apps/api/knowledge-base/src/__types__/index.ts`)
- MCP tools must follow tool-handler pattern (logging, error sanitization, performance measurement)
- New entry types require updating `KnowledgeEntryTypeSchema` enum

## Goal

Build a calibration tracking system that:
1. Links finding IDs to feedback outcomes (from WKFL-004)
2. Computes accuracy per agent per confidence level
3. Generates weekly calibration reports
4. Produces actionable threshold adjustment recommendations

**Success Criteria:**
- Agents with "high confidence" maintain >90% accuracy
- False positives are tracked and visible in reports
- Threshold adjustments are data-driven, not guesswork
- Calibration gaps inform heuristic evolution (WKFL-003)

## Non-Goals

- Auto-applying threshold changes (WKFL-003 handles threshold evolution)
- Real-time calibration during review (post-hoc analysis only)
- Cross-project calibration (single project scope)
- Pattern mining across findings (WKFL-006 handles this)
- Confidence prediction for new findings (this tracks outcomes only)

### Protected Features

Do not modify:
- Severity Calibration Framework (`.claude/agents/_shared/severity-calibration.md`)
- VERIFICATION.yaml schema (other stories depend on current format)
- Agent frontmatter format (established pattern)
- KB MCP tool handler pattern (reuse, don't rebuild)

## Scope

### In Scope

**New Components:**
1. Calibration entry schema in Knowledge Base
   - Entry type: `calibration` (new enum value)
   - Fields: agent_id, finding_id, story_id, stated_confidence, actual_outcome, timestamp
   - Tags: `['calibration', 'agent:{name}', 'confidence:{level}']`

2. `confidence-calibrator.agent.md` (haiku model)
   - Type: worker
   - KB tools: `kb_search` (read calibration entries), `kb_add_lesson` (if systemic issues found)
   - Single-phase: setup → query → analyze → report
   - No sub-agents needed

3. `/calibration-report` command
   - Spawns confidence-calibrator.agent.md
   - Arguments: `[--since=YYYY-MM-DD] [--agent=NAME]`
   - Default: last 7 days, all agents
   - Output: `CALIBRATION-{date}.yaml`

4. Calibration data integration
   - When feedback captured via `/feedback`, also write calibration entry
   - Outcome mapping: `false_positive` → 'false_positive', `severity_wrong` → 'severity_wrong', `helpful` → 'correct'

**Modified Components:**
1. Knowledge Base schema (`apps/api/knowledge-base/src/__types__/index.ts`)
   - Add 'calibration' to `KnowledgeEntryTypeSchema` enum
   - Define `CalibrationEntrySchema` with Zod

2. Knowledge Base tool handlers (`apps/api/knowledge-base/src/mcp-server/tool-handlers.ts`)
   - Extend `kb_add` to support calibration entries
   - No new tools needed (reuse existing)

3. WKFL-004 feedback command integration
   - After writing feedback entry, also write calibration entry
   - Link feedback to finding via finding_id

### Out of Scope

- Auto-adjusting thresholds (WKFL-003)
- Pattern mining (WKFL-006)
- Cross-agent pattern detection (handled by WKFL-006)
- Real-time calibration updates (weekly batch only)
- UI dashboard for calibration (CLI/YAML only)

### Surfaces Touched

**Backend:**
- `apps/api/knowledge-base/src/__types__/index.ts` - Schema definitions
- `apps/api/knowledge-base/src/db/schema.ts` - If enum change needed
- `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` - Potentially extend handlers

**Agent Files:**
- `.claude/agents/confidence-calibrator.agent.md` - New agent
- `.claude/commands/calibration-report.md` - New command
- (Future) `.claude/commands/feedback.md` - Integration point when WKFL-004 completes

**Output Files:**
- `CALIBRATION-{date}.yaml` - Generated reports

## Acceptance Criteria

### AC-1: Calibration Entry Schema Captures All Required Fields

**Criteria:**
Calibration entry schema includes agent_id, finding_id, story_id, stated_confidence, actual_outcome, and timestamp.

**Details:**
- Schema defined in `apps/api/knowledge-base/src/__types__/index.ts` using Zod
- Entry type: `calibration` added to `KnowledgeEntryTypeSchema` enum
- Fields:
  - `agent_id`: string (e.g., "code-review-security")
  - `finding_id`: string (e.g., "SEC-042")
  - `story_id`: string (e.g., "WISH-2045")
  - `stated_confidence`: enum('high', 'medium', 'low')
  - `actual_outcome`: enum('correct', 'false_positive', 'severity_wrong')
  - `timestamp`: ISO 8601 string
- Stored in KB via `kb_add` with tags: `['calibration', 'agent:{name}', 'confidence:{level}']`

**Verification:**
```bash
# Query KB for calibration entries
kb_search({ entry_type: "calibration", limit: 1 })

# Verify all fields populated in result
```

**Test Data:**
```yaml
entry_type: calibration
agent_id: code-review-security
finding_id: SEC-042
story_id: WISH-2045
stated_confidence: high
actual_outcome: false_positive
timestamp: 2026-02-06T15:30:00Z
tags: ['calibration', 'agent:code-review-security', 'confidence:high']
```

---

### AC-2: Calibration Data Source Integrates with WKFL-004 Feedback

**Criteria:**
When feedback is captured via `/feedback`, a calibration entry is also written to KB.

**Details:**
- Outcome mapping:
  - `feedback_type: false_positive` → `actual_outcome: false_positive`
  - `feedback_type: severity_wrong` → `actual_outcome: severity_wrong`
  - `feedback_type: helpful` → `actual_outcome: correct`
  - `feedback_type: missing` → Not mapped (no calibration entry)
- Calibration entry linked to finding via finding_id
- Integration point: WKFL-004's `/feedback` command calls `kb_add` twice (feedback + calibration)

**Verification:**
```bash
# After: /feedback SEC-042 --false-positive "reason"
# Verify two entries created:
kb_search({ entry_type: "feedback", finding_id: "SEC-042" })
kb_search({ entry_type: "calibration", finding_id: "SEC-042" })
```

**Dependencies:**
- WKFL-004 must complete first
- Feedback schema must include finding_id field

---

### AC-3: Confidence-Calibrator Agent Analyzes Accuracy Per Agent

**Criteria:**
`confidence-calibrator.agent.md` queries KB for calibration entries and computes accuracy per (agent_id, stated_confidence).

**Details:**
- Query KB for calibration entries grouped by (agent_id, stated_confidence)
- Accuracy calculation: `accuracy = correct_predictions / total_predictions`
  - `correct_predictions` = count where `actual_outcome = 'correct'`
  - `total_predictions` = total count for (agent, confidence level)
- Minimum 5 samples before reporting accuracy
- Output includes:
  - Agent name
  - Confidence level
  - Accuracy score (0.0-1.0)
  - Sample size
  - Breakdown: correct, false_positive, severity_wrong counts

**Verification:**
```yaml
# CALIBRATION-2026-02-06.yaml
agents:
  code-review-security:
    high_confidence:
      accuracy: 0.85
      sample_size: 20
      breakdown:
        correct: 17
        false_positive: 2
        severity_wrong: 1
    medium_confidence:
      accuracy: 0.70
      sample_size: 10
      breakdown:
        correct: 7
        false_positive: 2
        severity_wrong: 1
```

**Agent Spec:**
- Model: haiku
- Type: worker
- KB tools: kb_search, kb_add_lesson
- Phases: setup → query → analyze → report

---

### AC-4: Alert When "High" Confidence Accuracy Drops Below 90%

**Criteria:**
For each agent with stated_confidence='high', if accuracy < 0.90 and sample_size >= 10, flag in report.

**Details:**
- Threshold: 0.90 (90%) for "high" confidence
- Minimum samples: 10 (ensures statistical relevance)
- Alert format in CALIBRATION-{date}.yaml:
  ```yaml
  alerts:
    - agent: code-review-security
      confidence_level: high
      accuracy: 0.85
      threshold: 0.90
      sample_size: 20
      message: "High confidence accuracy below threshold"
  ```

**Verification:**
Generate calibration report with mock data:
- Agent A: high confidence, 85% accuracy, 20 samples → Alert present
- Agent B: high confidence, 92% accuracy, 15 samples → No alert
- Agent C: high confidence, 80% accuracy, 5 samples → No alert (insufficient samples)

---

### AC-5: Generate Threshold Adjustment Recommendations

**Criteria:**
Calibration report includes actionable threshold adjustment recommendations based on accuracy trends.

**Details:**
- Recommendations based on observed accuracy:
  - If agent's "high" accuracy < 0.90: "Tighten high threshold from X to X+0.05"
  - If agent's "low" accuracy > 0.85: "Trust low confidence more, consider promoting to medium"
- Recommendations are proposals only, not auto-applied
- Format:
  ```yaml
  recommendations:
    - agent: code-review-security
      current_state:
        confidence_level: high
        accuracy: 0.85
        sample_size: 20
      recommendation: "Tighten high threshold from 0.85 to 0.90"
      rationale: "High confidence findings have 15% error rate, below 90% target"
      priority: high
  ```

**Open Question:**
Where are "current thresholds" stored? Options:
- Agent frontmatter (e.g., `confidence_threshold: 0.85`)
- Config file (`.claude/config/agent-thresholds.yaml`)
- Conceptual only (recommendations describe behavior change, not specific thresholds)

**Resolution for MVP:**
Recommendations describe behavior change conceptually. Actual threshold implementation deferred to WKFL-003.

**Verification:**
Mock calibration data → recommendations generated → recommendations are specific and actionable

---

### AC-6: /calibration-report Command Generates Weekly Report

**Criteria:**
`/calibration-report` command spawns confidence-calibrator.agent.md and produces CALIBRATION-{date}.yaml.

**Details:**
- Command structure: `/calibration-report [--since=YYYY-MM-DD] [--agent=NAME]`
- Default: last 7 days, all agents
- Output file: `CALIBRATION-{date}.yaml` in current directory or `_reports/`
- Report sections:
  1. Summary (total findings analyzed, agents covered, date range)
  2. Accuracy by agent by confidence level
  3. Alerts (agents below threshold)
  4. Recommendations (threshold adjustments)
  5. Trends (if historical data available)

**Verification:**
```bash
# Run command
/calibration-report --since=2026-01-30 --agent=code-review-security

# Verify output file created
cat CALIBRATION-2026-02-06.yaml

# Verify contains all sections
```

---

### AC-7: Calibration Agent Uses Haiku Model

**Criteria:**
`confidence-calibrator.agent.md` frontmatter specifies `model: haiku` and `type: worker`.

**Details:**
- Frontmatter:
  ```yaml
  model: haiku
  type: worker
  kb_tools: [kb_search, kb_add_lesson]
  ```
- Rationale: Simple aggregation logic, no complex reasoning needed
- KB tools:
  - `kb_search` - Read calibration entries
  - `kb_add_lesson` - Write lesson if systemic issue found (e.g., "All security agents over-confident on XSS")

**Verification:**
Read frontmatter of `confidence-calibrator.agent.md` → verify model and type

---

## Reuse Plan

### Must Reuse

**Existing Infrastructure:**
- `knowledge_entries` table - No new tables, extend with new entry type
- `kb_add` tool - For writing calibration entries
- `kb_search` tool - With tag filtering for querying calibration history
- Zod schema validation - All inputs must validate

**Existing Patterns:**
- Agent frontmatter with `kb_tools` declaration
- Tool handler pattern from existing MCP tools (logging, error sanitization, performance measurement)
- YAML output format for reports (consistent with VERIFICATION.yaml)

**Existing Packages:**
- `apps/api/knowledge-base` - Schema and tool handlers
- `.claude/agents/_shared/` - Shared patterns and frameworks

### May Create

**New Components:**
- `confidence-calibrator.agent.md` - New worker agent
- `.claude/commands/calibration-report.md` - New command
- `CalibrationEntrySchema` - New Zod schema
- `CALIBRATION-{date}.yaml` - New report format

### Integration Points

**WKFL-004 Feedback Integration:**
When WKFL-004 completes, `/feedback` command will:
1. Write feedback entry (existing)
2. Write calibration entry (new)
3. Link both via finding_id

**WKFL-001 Outcome Integration:**
Optional enhancement: Also pull calibration data from OUTCOME.yaml
- If finding was addressed in fix cycle → `actual_outcome: correct`
- If finding was ignored/deferred → No calibration entry (inconclusive)

## Architecture Notes

### Schema Design

**Option A: New Entry Type (Recommended)**
```typescript
// apps/api/knowledge-base/src/__types__/index.ts
const KnowledgeEntryTypeSchema = z.enum([
  'note',
  'decision',
  'constraint',
  'runbook',
  'lesson',
  'calibration',  // NEW
])

const CalibrationEntrySchema = z.object({
  agent_id: z.string(),
  finding_id: z.string(),
  story_id: z.string(),
  stated_confidence: z.enum(['high', 'medium', 'low']),
  actual_outcome: z.enum(['correct', 'false_positive', 'severity_wrong']),
  timestamp: z.string().datetime(),
})
```

**Rationale:**
- Cleaner separation from other entry types
- Easier to query (filter by entry_type='calibration')
- Explicit schema validation
- Future-proof for calibration-specific fields

**Option B: Use Existing 'lesson' Type with Tags**
```typescript
// Reuse existing 'lesson' entry type
tags: ['calibration', 'agent:code-review-security', 'confidence:high']
```

**Rationale:**
- No schema changes needed
- Works with existing KB tools
- More flexible

**Decision:** Use Option A. The cleaner separation and explicit schema are worth the small schema change.

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  Story Completion                                                │
│  (Dev implements fix, QA verifies)                               │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  VERIFICATION.yaml                                               │
│  findings:                                                       │
│    - id: SEC-042                                                 │
│      confidence: high  ◄─── Stated confidence                    │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  /feedback SEC-042 --false-positive "reason"                     │
│  (Human provides actual outcome)                                 │
└────────────────┬────────────────────────────────────────────────┘
                 │
          ┌──────┴──────┐
          │             │
          ▼             ▼
┌──────────────┐ ┌─────────────────┐
│  Feedback    │ │  Calibration    │
│  Entry       │ │  Entry          │
│  (WKFL-004)  │ │  (WKFL-002)     │
└──────┬───────┘ └────────┬────────┘
       │                  │
       │                  │
       └─────────┬────────┘
                 ▼
         ┌───────────────┐
         │  Knowledge    │
         │  Base         │
         └───────┬───────┘
                 │
                 ▼
         ┌───────────────┐
         │  /calibration │
         │  -report      │
         └───────┬───────┘
                 │
                 ▼
    ┌────────────────────────┐
    │  CALIBRATION-date.yaml │
    │  - Accuracy scores     │
    │  - Alerts              │
    │  - Recommendations     │
    └────────────────────────┘
```

### Query Performance Considerations

**Expected Volume:**
- ~50 stories per month
- ~3 agents per story (security, architecture, QA)
- ~5 findings per agent
- = ~750 findings/month
- If 30% get feedback = ~225 calibration entries/month

**Query Pattern:**
```typescript
kb_search({
  entry_type: 'calibration',
  tags: ['agent:code-review-security', 'confidence:high'],
  since: '2026-01-30',
})
```

**Optimization:**
- Tag indexing already exists in KB
- Initial scope: <1000 entries per month
- No special indexing needed for MVP
- Consider composite index if dataset grows: (entry_type, tags, timestamp)

### Agent Architecture

**confidence-calibrator.agent.md Flow:**

```
Phase 1: Setup
  ├─ Read frontmatter (model: haiku, kb_tools: [kb_search, kb_add_lesson])
  ├─ Parse command args (--since, --agent)
  └─ Validate date range

Phase 2: Query
  ├─ kb_search for calibration entries (filtered by date/agent)
  ├─ Group by (agent_id, stated_confidence)
  └─ Aggregate counts: correct, false_positive, severity_wrong

Phase 3: Analyze
  ├─ Compute accuracy per group (correct / total)
  ├─ Identify alerts (high confidence < 0.90)
  ├─ Generate recommendations (threshold adjustments)
  └─ Format results

Phase 4: Report
  ├─ Write CALIBRATION-{date}.yaml
  ├─ If systemic issue detected: kb_add_lesson
  └─ Output completion signal
```

**No Sub-Agents Needed:**
Simple aggregation logic, no complex reasoning required.

### Weekly Job Mechanism

**Options:**

1. **Manual Command** (MVP)
   - User runs `/calibration-report` weekly
   - Simple, no infrastructure
   - Cons: Relies on human memory

2. **Pre-Commit Hook**
   - Runs before every commit
   - Cons: Too frequent, noisy

3. **Scheduled Cron Job**
   - Weekly cron: `0 9 * * MON /calibration-report`
   - Pros: Automated, consistent
   - Cons: Requires cron setup

**Decision:** Manual command for MVP. Automation deferred to future story.

## Infrastructure Notes

### Knowledge Base Schema Changes

**Required Changes:**

1. **Add 'calibration' to entry type enum:**
   ```typescript
   // apps/api/knowledge-base/src/__types__/index.ts
   export const KnowledgeEntryTypeSchema = z.enum([
     'note',
     'decision',
     'constraint',
     'runbook',
     'lesson',
     'calibration',  // ADD
   ])
   ```

2. **Define CalibrationEntrySchema:**
   ```typescript
   // apps/api/knowledge-base/src/__types__/index.ts
   export const CalibrationEntrySchema = z.object({
     agent_id: z.string().min(1),
     finding_id: z.string().regex(/^[A-Z]+-\d+$/),  // e.g., SEC-042
     story_id: z.string().regex(/^[A-Z]+-\d+$/),    // e.g., WISH-2045
     stated_confidence: z.enum(['high', 'medium', 'low']),
     actual_outcome: z.enum(['correct', 'false_positive', 'severity_wrong']),
     timestamp: z.string().datetime(),
   })

   export type CalibrationEntry = z.infer<typeof CalibrationEntrySchema>
   ```

3. **Update tool handler validation:**
   ```typescript
   // apps/api/knowledge-base/src/mcp-server/tool-handlers.ts
   // In kb_add handler:
   if (entry_type === 'calibration') {
     CalibrationEntrySchema.parse(entry_data)
   }
   ```

**No Database Migration Needed:**
`knowledge_entries` table already supports flexible JSONB, no schema change.

### MCP Tool Reuse

**Existing Tools:**
- `kb_add` - Add entry to KB
- `kb_search` - Query entries by type, tags, date range

**No New Tools Needed:**
Existing tools support all required operations.

**Tool Handler Pattern:**
All handlers include:
- Zod validation
- Logging with correlation IDs
- Error sanitization
- Performance measurement
- Access control via `checkAccess(agentRole, toolName)`

**Example kb_add Call:**
```javascript
kb_add({
  entry_type: 'calibration',
  title: 'Calibration point for SEC-042',
  content: JSON.stringify({
    agent_id: 'code-review-security',
    finding_id: 'SEC-042',
    story_id: 'WISH-2045',
    stated_confidence: 'high',
    actual_outcome: 'false_positive',
    timestamp: '2026-02-06T15:30:00Z',
  }),
  tags: ['calibration', 'agent:code-review-security', 'confidence:high'],
  story_id: 'WISH-2045',
})
```

### Error Handling

**Scenarios:**

1. **KB Unavailable:**
   - Fallback: Queue writes to `DEFERRED-KB-WRITES.yaml`
   - Retry mechanism in future story

2. **Insufficient Data:**
   - If sample_size < 5: Report "Insufficient data" instead of accuracy
   - No alert, no recommendation

3. **Schema Validation Failure:**
   - MCP tool handler returns error
   - Calibrator agent logs error, continues with other entries

4. **Missing Dependencies:**
   - WKFL-001 or WKFL-004 not complete: BLOCKED status
   - Cannot generate meaningful calibration without outcome data

## Test Plan

### Unit Tests

**Schema Validation:**
- `CalibrationEntrySchema` accepts valid entries
- Rejects invalid: missing fields, wrong enum values, invalid finding_id format
- Edge cases: empty strings, null values, extra fields

**Accuracy Calculation:**
- 100% accuracy (all correct)
- 0% accuracy (all false_positive)
- Mixed outcomes: 17/20 correct = 0.85
- Insufficient samples (< 5): No accuracy reported

**Threshold Recommendation Logic:**
- High confidence, 85% accuracy, 20 samples → Recommendation generated
- High confidence, 95% accuracy, 20 samples → No recommendation
- High confidence, 80% accuracy, 3 samples → No recommendation (insufficient samples)

**Tag Generation:**
- Agent name correctly formatted: `agent:code-review-security`
- Confidence level correctly formatted: `confidence:high`
- All required tags present: `['calibration', 'agent:*', 'confidence:*']`

### Integration Tests

**KB Write Integration:**
- `kb_add` successfully writes calibration entry
- Entry queryable via `kb_search({ entry_type: 'calibration' })`
- Tags correctly indexed and filterable

**WKFL-004 Feedback Integration:**
- `/feedback SEC-042 --false-positive "reason"` creates both feedback and calibration entries
- Outcome mapping correct: `false_positive` → `actual_outcome: false_positive`
- Finding_id correctly linked

**Query Performance:**
- Query 100 calibration entries: < 100ms
- Query with tag filters: < 50ms
- Aggregate by (agent, confidence): < 200ms

### End-to-End Tests

**Weekly Report Generation:**
1. Seed KB with mock calibration entries (varied agents, confidence levels, outcomes)
2. Run `/calibration-report --since=2026-01-30`
3. Verify CALIBRATION-2026-02-06.yaml created
4. Verify all sections present: summary, accuracy, alerts, recommendations
5. Verify accuracy calculations correct
6. Verify alerts triggered for agents below threshold

**Alert Triggering:**
1. Seed with high-confidence findings: 17/20 correct (85% accuracy)
2. Run calibration report
3. Verify alert present in CALIBRATION-{date}.yaml
4. Verify message: "High confidence accuracy below threshold"

**Recommendation Generation:**
1. Seed with varied accuracy levels
2. Run calibration report
3. Verify recommendations specific: "Tighten high threshold from 0.85 to 0.90"
4. Verify recommendations prioritized: high accuracy drift = high priority

### Test Data Requirements

**Mock VERIFICATION.yaml:**
```yaml
findings:
  - id: SEC-042
    agent: code-review-security
    severity: high
    confidence: high
  - id: SEC-043
    agent: code-review-security
    severity: medium
    confidence: medium
  - id: ARCH-015
    agent: code-review-architecture
    severity: high
    confidence: high
```

**Mock Feedback Entries:**
```yaml
- finding_id: SEC-042
  feedback_type: false_positive
  reason: "Input sanitized upstream"
- finding_id: SEC-043
  feedback_type: helpful
  note: "Good catch"
- finding_id: ARCH-015
  feedback_type: severity_wrong
  original_severity: high
  suggested_severity: medium
```

**Mock Calibration Entries:**
```yaml
- agent_id: code-review-security
  finding_id: SEC-042
  story_id: WISH-2045
  stated_confidence: high
  actual_outcome: false_positive
  timestamp: 2026-02-01T10:00:00Z

- agent_id: code-review-security
  finding_id: SEC-043
  story_id: WISH-2045
  stated_confidence: medium
  actual_outcome: correct
  timestamp: 2026-02-01T10:05:00Z

# ... 20+ more entries for meaningful aggregation
```

### Coverage Targets

- Schema validation: 100%
- Accuracy calculation: 100%
- Recommendation logic: 100%
- KB integration: 90%
- E2E calibration flow: 80%

### Quality Gates

Before merge:
- [ ] All unit tests pass
- [ ] Integration tests pass
- [ ] Schema changes validated with existing KB
- [ ] Manual smoke test: Run `/calibration-report` with seed data
- [ ] CALIBRATION-{date}.yaml format verified
- [ ] Documentation updated

## Open Questions

### Q1: Threshold Storage Location

**Question:** Where are agent confidence thresholds currently defined?

**Options:**
1. Agent frontmatter (e.g., `confidence_threshold: 0.85`)
2. Config file (`.claude/config/agent-thresholds.yaml`)
3. Hardcoded in agent logic
4. Conceptual only (no explicit thresholds)

**Impact:** Affects how recommendations are phrased. If thresholds are explicit, recommendations can reference current values. If conceptual, recommendations describe behavior changes.

**Resolution for MVP:** Recommendations describe behavior changes conceptually. Actual threshold implementation deferred to WKFL-003 (Emergent Heuristic Discovery).

**Example Recommendation:**
```yaml
recommendation: "Tighten high threshold - agent is over-confident"
rationale: "High confidence findings have 15% error rate, below 90% target"
# Not: "Raise threshold from 0.85 to 0.90" (assumes explicit threshold)
```

### Q2: Outcome Source Beyond Feedback

**Question:** Should calibration also pull from OUTCOME.yaml (WKFL-001) for "was this finding addressed in the fix?"

**Options:**
1. Feedback only (explicit human judgment)
2. OUTCOME.yaml + Feedback (implicit + explicit)
3. OUTCOME.yaml as fallback if no feedback

**Pros of OUTCOME.yaml:**
- More data points (not all findings get explicit feedback)
- Captures implicit validation (finding addressed = likely correct)

**Cons:**
- Noisier signal (finding ignored ≠ false positive)
- Requires parsing fix cycle data

**Resolution for MVP:** Feedback only. OUTCOME.yaml integration deferred to future enhancement.

### Q3: Minimum Sample Size

**Question:** Is 5 samples sufficient for reporting accuracy? Should we require 10 for recommendations?

**Trade-offs:**
- 5 samples: Faster feedback, higher variance
- 10 samples: More stable, slower to detect drift

**Resolution:** 5 samples for reporting accuracy, 10 samples for generating recommendations and alerts.

### Q4: Weekly Job Automation

**Question:** Should this be a manual command or an automated cron job?

**Options:**
1. Manual `/calibration-report` (MVP)
2. Pre-commit hook (too frequent)
3. Weekly cron job (requires infrastructure)
4. Triggered by story count (every 10 stories)

**Resolution:** Manual command for MVP. Automation deferred to future story if valuable.

### Q5: Cross-Agent Pattern Detection

**Question:** Should calibration report identify patterns across multiple agents (e.g., "All security agents over-confident on XSS")?

**Scope:** This crosses into pattern mining territory (WKFL-006).

**Resolution:** No cross-agent patterns in WKFL-002. Each agent analyzed independently. WKFL-006 handles cross-story pattern mining.

## Dependencies

### Blocks This Story

- **WKFL-001** (Meta-Learning Loop) - Provides OUTCOME.yaml with actual story results
  - Status: `pending`
  - Needed for: Optional outcome data source (not MVP-blocking)

- **WKFL-004** (Human Feedback Capture) - Provides /feedback command and feedback schema
  - Status: `pending`
  - Needed for: Primary source of actual outcomes (MVP-blocking)

**Impact:** WKFL-002 cannot start implementation until WKFL-004 completes. WKFL-001 is optional for MVP.

### This Story Blocks

- **WKFL-003** (Emergent Heuristic Discovery) - Uses calibration data to evolve autonomy tiers
- **WKFL-010** (Improvement Proposal Generator) - Uses calibration gaps to generate improvement proposals

## Implementation Phases

### Phase 1: Schema & Infrastructure (Tokens: ~8k)

**Deliverables:**
- Add 'calibration' to `KnowledgeEntryTypeSchema`
- Define `CalibrationEntrySchema` with Zod
- Update tool handler validation
- Write unit tests for schema

**Files Changed:**
- `apps/api/knowledge-base/src/__types__/index.ts`
- `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts`
- `apps/api/knowledge-base/src/__types__/__tests__/schemas.test.ts`

### Phase 2: Confidence-Calibrator Agent (Tokens: ~15k)

**Deliverables:**
- Create `confidence-calibrator.agent.md`
- Implement query, analyze, report phases
- Accuracy calculation logic
- Alert generation logic
- Recommendation generation logic
- Unit tests for analysis logic

**Files Created:**
- `.claude/agents/confidence-calibrator.agent.md`

### Phase 3: Calibration-Report Command (Tokens: ~5k)

**Deliverables:**
- Create `/calibration-report` command
- Command arg parsing (--since, --agent)
- Spawn confidence-calibrator.agent.md
- CALIBRATION-{date}.yaml output format
- Integration test

**Files Created:**
- `.claude/commands/calibration-report.md`

### Phase 4: WKFL-004 Integration (Tokens: ~6k)

**Deliverables:**
- Extend `/feedback` command to write calibration entry
- Outcome mapping logic
- Integration test: feedback → calibration entry

**Files Changed:**
- `.claude/commands/feedback.md` (when WKFL-004 completes)

**Blocked By:** WKFL-004 completion

### Phase 5: Testing & Documentation (Tokens: ~12k)

**Deliverables:**
- E2E test: Seed data → report generation → verify output
- Performance test: Query 100+ calibration entries
- Manual smoke test with real data
- Documentation: How to run calibration reports
- Update FULL_WORKFLOW.md

**Files Changed:**
- `docs/FULL_WORKFLOW.md`
- Test files

### Phase 6: Verification

**Quality Gates:**
- [ ] All ACs verified
- [ ] Schema changes do not break existing KB queries
- [ ] Calibration report format is clear and actionable
- [ ] Manual test: Run report with seed data, verify recommendations make sense
- [ ] Token usage within budget (target: 40k, budget: 50k)

**Token Estimate:** ~46k total (within 50k budget)

## Success Metrics

**Immediate (After WKFL-002):**
- Calibration data captured for all feedback
- Weekly reports generated successfully
- Accuracy metrics visible per agent

**Medium-term (After WKFL-003):**
- Threshold adjustments informed by calibration data
- Agent confidence accuracy improves over time
- False positive rate for "high confidence" findings decreases

**Long-term (Full Learning System):**
- "High confidence" findings maintain >90% accuracy
- Developer trust in agent findings increases
- Manual override rate decreases

## Related Work

**Depends On:**
- WKFL-001: Meta-Learning Loop (optional outcome source)
- WKFL-004: Human Feedback Capture (primary outcome source)

**Enables:**
- WKFL-003: Emergent Heuristic Discovery (uses calibration data)
- WKFL-010: Improvement Proposal Generator (uses calibration gaps)

**Related:**
- WKFL-006: Cross-Story Pattern Mining (different scope, but complementary)
- Severity Calibration Framework (existing, not modified)

## Notes

- This is a meta-workflow story (improves the workflow itself, not the application)
- Heavily dependent on WKFL-004 completing first
- Manual command approach for MVP keeps scope manageable
- Automation deferred to future if value proven
- Threshold adjustment recommendations are proposals only, never auto-applied

---

**Story Status:** Ready for elaboration after WKFL-004 completes

---

## QA Discovery Notes (Auto-Generated)

_Added by Autonomous Elaboration on 2026-02-06_

### MVP Gaps Resolved

No MVP-critical gaps found. All acceptance criteria are complete and implementable.

| # | Finding | Resolution | Status |
|---|---------|-----------|--------|
| 1 | Core calibration schema required | AC-1 defines CalibrationEntrySchema with all required fields | ✓ Complete |
| 2 | Data source integration unclear | AC-2 defines feedback mapping: false_positive→false_positive, helpful→correct | ✓ Complete |
| 3 | Agent analysis logic specified | AC-3 defines accuracy calculation: correct / total, min 5 samples | ✓ Complete |
| 4 | Alert thresholds defined | AC-4 specifies 90% threshold for high confidence with 10-sample minimum | ✓ Complete |
| 5 | Recommendations action-oriented | AC-5 defines threshold adjustment recommendations with rationale | ✓ Complete |
| 6 | Command interface clear | AC-6 specifies /calibration-report with --since and --agent args | ✓ Complete |
| 7 | Model selection justified | AC-7 confirms haiku model with rationale (simple aggregation) | ✓ Complete |

### Non-Blocking Items (Logged to KB)

36 non-blocking findings identified and categorized:

| # | Finding | Category | KB Status |
|---|---------|----------|-----------|
| 1-5 | Non-critical gaps (OUTCOME.yaml, sample thresholds, patterns, confidence definitions, trending) | data-source, threshold-tuning, pattern-detection, calibration-framework, reporting | logged |
| 6-14 | Enhancement opportunities (automation, threshold storage, alerts, visualization, ML, root cause analysis, recommendations, similarity) | automation, threshold-storage, alerting, visualization, ml-enhancement, pattern-analysis, recommendations, similarity-detection | logged |
| 15-18 | Edge cases (trending, insufficient samples, concurrent entries, stale data) | trending, edge-case | logged |
| 19-25 | UX polish & performance (formatting, prioritization, comparison, leaderboard, query optimization, embedding latency, parallelization) | ux-polish, performance | logged |
| 26-32 | Observability & integrations (metrics, false positive rate, coverage, PR comments, Slack, JIRA, CI/CD) | observability, integration | logged |
| 33-36 | Future-proofing (multi-model, confidence intervals, Bayesian updating, active learning) | future-proofing | logged |

### Summary

- **ACs added**: 0 (all 7 ACs complete as specified)
- **KB entries queued**: 36 enhancement/non-blocking findings
- **Mode**: autonomous
- **Verdict**: PASS - Ready to proceed to implementation

### Key Decisions Made

1. **Threshold Storage (Q1)**: Deferred to WKFL-003. MVP uses conceptual recommendations, not explicit thresholds.
2. **OUTCOME.yaml Integration (Q2)**: Deferred. MVP uses explicit feedback only as outcome source.
3. **Sample Size Threshold (Q3)**: 5 samples for reporting, 10 samples for alerts/recommendations.
4. **Weekly Job Automation (Q4)**: Manual command (/calibration-report) for MVP. Cron automation deferred to future story.

### Implementation Prerequisites

- **WKFL-004 completion required** before Phase 4 (WKFL-004 Feedback Integration)
- Phases 1-3 can proceed independently
- KB schema changes must be validated with existing infrastructure before deployment
