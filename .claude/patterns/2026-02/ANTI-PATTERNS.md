# Anti-Patterns Detected

> Generated: 2026-02-22T00:00:00Z
> Analysis Period: 2026-01-23 to 2026-02-22 (30 days)
> Stories Analyzed: 37
> Data Source: VERIFICATION.yaml (fallback - OUTCOME.yaml not yet active)

> **Note**: This is a template/example file generated during WKFL-006 story delivery.
> Run `/pattern-mine --days 30 --use-verifications` to regenerate with real mining data.

## Overview

Pattern mining across 37 stories in the last 30 days identified recurring anti-patterns
in file handling, acceptance criteria specification, and agent workflow execution. The
findings below represent statistically significant patterns with correlation scores above
0.60 and at least 3 occurrences.

High-severity patterns have been persisted to the Knowledge Base with category=pattern
for agent consumption.

---

## File Patterns

Patterns where specific file paths or path categories correlate with review failures.

### High Severity

No high-severity file patterns detected in this analysis period.

### Medium Severity

#### Pattern: `plans/**/_implementation/VERIFICATION.yaml`

- **Occurrences**: 12 stories
- **Correlation Score**: 0.67
- **Confidence**: 0.40 (>= 5 samples)
- **Cluster Label**: file_pattern_001
- **Common Issues**:
  - Missing required fields (gate.decision, qa_verify.acs_verified)
  - Inconsistent verdict casing (pass vs PASS)
  - Schema version below minimum (< 4)
- **Recommendation**: Use VERIFICATION.yaml template from `.claude/schemas/`; validate all required fields before commit
- **Evidence**: WINT-0250, WINT-9020, WISH-001, WISH-003 (and 8 others)

---

## AC Patterns

Patterns where vague or problematic phrasing in Acceptance Criteria correlates with
review failures and increased iteration cycles.

### High Severity

No high-severity AC patterns detected in this analysis period.

### Medium Severity

#### Vague Phrase: "properly"

- **Occurrences**: 8 stories
- **Impact**: 0.50 failure rate, 2.6 avg review cycles
- **Confidence**: null (< 5 samples - insufficient for calibrated score)
- **Cluster Label**: ac_pattern_001
- **Improved Phrasing**: Replace "properly" with specific criteria:
  - "validated with Zod schema and returns 422 on invalid input"
  - "authenticated via JWT and returns 401 on expired token"
  - "formatted as ISO 8601 timestamp"
- **Evidence**:
  - WISH-002: AC-3 "Request must be properly validated" → Failed QA (no test criteria)
  - WINT-0250: AC-7 "properly handles errors" → Required 3 review cycles to specify

#### Vague Phrase: "correctly"

- **Occurrences**: 6 stories
- **Impact**: 0.42 failure rate, 2.5 avg review cycles
- **Confidence**: null (< 5 samples)
- **Cluster Label**: ac_pattern_002
- **Improved Phrasing**: Replace "correctly" with observable outcomes:
  - "returns HTTP 200 with {field: value} in response body"
  - "renders component with aria-label matching test selector"
  - "inserts record with all required columns populated"
- **Evidence**:
  - WISH-005: AC-1 "correctly processes webhook" → Ambiguous success criteria
  - KBAR-0060: AC-4 "correctly migrates data" → No rollback criteria specified

---

## Agent Correlations

Patterns in how agent execution phases correlate with downstream outcomes.

### High Severity

No high-severity agent correlations detected in this analysis period.

### Medium Severity

#### Pattern: dev-implement-planner → dev-implement-verifier

- **Type**: phase_to_phase
- **Occurrences**: 7 stories
- **Correlation Score**: 0.71
- **Confidence**: 0.50 (>= 5 samples)
- **Cluster Label**: agent_corr_001
- **Description**: When planner underestimates token budget, verifier phase requires extra iterations
- **Recommendation**: Apply 1.3x multiplier to token estimates for integration stories (stories touching both frontend and backend)
- **Evidence**:
  - WISH-003: Planned 15k tokens, used 22k (47% overrun); required 2 extra verify cycles
  - WINT-0250: Planned 60k tokens, used 78k (30% overrun)

---

## Deduplicated Patterns

No previous period data available for cross-period comparison.

---

## Trend Analysis

Trend analysis not available (no previous period data or --trend not specified).

---

## Recommendations

### Immediate Actions (High Priority)

None identified in this period.

### Medium-Term Improvements

1. **AC Specification**: Adopt a checklist for AC authors:
   - Avoid vague phrases: properly, correctly, good, fast, appropriate
   - Specify observable outcomes: HTTP status, response body, rendered element
   - Include failure conditions: "returns 400 when X is missing"

2. **VERIFICATION.yaml Hygiene**: Add pre-commit validation:
   - Required fields: schema, story_id, gate.decision, qa_verify.acs_verified
   - Verdict casing: uppercase PASS/FAIL/WARN only

3. **Token Budget Calibration**: For integration stories (backend + frontend):
   - Apply 1.3x multiplier to estimated token budget
   - Log actual vs estimated via `/token-log` skill (KB-backed)

---

## References

- Full pattern data: [PATTERNS-2026-02.yaml](PATTERNS-2026-02.yaml)
- Agent hints: [AGENT-HINTS.yaml](AGENT-HINTS.yaml)
- Dashboard: [index.html](index.html)
- Run: `/pattern-mine --month 2026-02 --use-verifications` to regenerate
