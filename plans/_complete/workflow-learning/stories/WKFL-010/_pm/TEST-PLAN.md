# Test Plan: WKFL-010 - Improvement Proposal Generator

## Scope Summary

**Endpoints touched**: None (CLI-only story)

**UI touched**: No

**Data/storage touched**: Yes
- KB reads: calibration entries, patterns, heuristics, retro recommendations
- KB writes: proposal entries with lifecycle tracking
- File reads: PATTERNS-{month}.yaml, HEURISTIC-PROPOSALS.yaml, WORKFLOW-RECOMMENDATIONS.md
- File writes: IMPROVEMENT-PROPOSALS-{date}.md

---

## Happy Path Tests

### Test 1: Generate proposals with all data sources available

**Setup**:
- KB contains ≥10 calibration entries from past 30 days (via WKFL-002)
- `.claude/patterns/PATTERNS-2026-02.yaml` exists with ≥3 patterns
- `.claude/config/HEURISTIC-PROPOSALS.yaml` exists with ≥2 proposals
- `WORKFLOW-RECOMMENDATIONS.md` exists with ≥1 recommendation

**Action**:
```bash
/improvement-proposals --days 30
```

**Expected outcome**:
- File created: `IMPROVEMENT-PROPOSALS-2026-02-{day}.md`
- YAML frontmatter includes: generated_date, data_period, sources_used (4/4), stories_analyzed (≥10)
- Markdown body contains High/Medium/Low priority sections
- At least 1 proposal in High priority (ROI ≥ 7.0)
- Proposals include: [P-XXX] title, source, evidence, impact/effort/ROI, status=proposed
- KB entries created for each proposal with tags: ["proposal", "source:{source}", "status:proposed", "priority:{level}"]

**Evidence**:
- File exists at expected path
- YAML frontmatter validates against schema
- Proposal count matches data sources (calibration gaps + patterns + heuristics + retro)
- KB query returns proposals with correct tags
- ROI scores correctly calculated (impact/effort on 0-10 scale)

---

### Test 2: Prioritize proposals by ROI score

**Setup**:
- Same as Test 1

**Action**:
```bash
/improvement-proposals --days 30
```

**Expected outcome**:
- High priority section (ROI ≥ 7.0): proposals sorted descending by ROI
- Medium priority section (ROI 4.0-6.9): proposals sorted descending by ROI
- Low priority section (ROI < 4.0): proposals sorted descending by ROI
- Example: P-001 (ROI 9.2) appears before P-002 (ROI 7.5) in High priority

**Evidence**:
- Parse output file, extract ROI scores per section
- Assert descending order within each section
- Assert no overlap between sections (all high > 7.0, all medium 4.0-6.9, all low < 4.0)

---

### Test 3: Track proposal lifecycle

**Setup**:
- Proposals exist in KB from previous run (status: proposed)

**Action**:
1. Human marks P-001 as accepted: `kb_update({ id: 'P-001', status: 'accepted' })`
2. Human marks P-002 as rejected: `kb_update({ id: 'P-002', status: 'rejected', rejection_reason: 'too high effort' })`
3. Run: `/improvement-proposals --days 30`

**Expected outcome**:
- Tracking summary table includes week-over-week status counts
- Proposal P-001 shows status: accepted, accepted_at timestamp
- Proposal P-002 shows status: rejected, rejection_reason
- New proposals generated this run have status: proposed

**Evidence**:
- Query KB for proposals with status=accepted → includes P-001
- Query KB for proposals with status=rejected → includes P-002 with rejection_reason field
- Tracking summary table matches KB query results

---

### Test 4: Learn from acceptance patterns

**Setup**:
- KB contains proposal history:
  - 10 calibration proposals: 8 accepted, 2 rejected
  - 10 pattern proposals: 9 accepted, 1 rejected
  - 10 heuristic proposals: 5 accepted, 5 rejected
  - 5 high-effort proposals: 1 accepted, 4 rejected
  - 5 low-effort proposals: 4 accepted, 1 rejected

**Action**:
```bash
/improvement-proposals --days 30
```

**Expected outcome**:
- Meta-learning section logs acceptance rates:
  - Calibration: 80% acceptance rate
  - Patterns: 90% acceptance rate
  - Heuristics: 50% acceptance rate
  - High-effort: 20% acceptance rate
  - Low-effort: 80% acceptance rate
- Future proposals from high-acceptance sources (calibration, patterns) get priority boost
- High-effort proposals include warning: "Note: High-effort proposals have 20% historical acceptance rate"

**Evidence**:
- Parse meta-learning section
- Verify acceptance rate calculations match KB data
- Check for warning text on high-effort proposals
- Verify priority boost applied (compare ROI scores for high-acceptance sources)

---

## Error Cases

### Error 1: KB unavailable

**Setup**:
- KB service is down or inaccessible

**Action**:
```bash
/improvement-proposals --days 30
```

**Expected outcome**:
- Error logged: "KB unavailable, cannot generate proposals without data"
- Command exits with failure
- No partial file written

**Evidence**:
- Check for error log message
- Verify exit code is non-zero
- Verify no IMPROVEMENT-PROPOSALS-{date}.md file created

---

### Error 2: All data sources missing

**Setup**:
- KB has no calibration entries
- PATTERNS-{month}.yaml does not exist
- HEURISTIC-PROPOSALS.yaml does not exist
- WORKFLOW-RECOMMENDATIONS.md does not exist

**Action**:
```bash
/improvement-proposals --days 30
```

**Expected outcome**:
- Warning logged: "All data sources unavailable (0/4), cannot generate proposals"
- Command exits with warning
- Suggest running WKFL-002, WKFL-006, WKFL-003, WKFL-001 to populate data

**Evidence**:
- Check for warning log message
- Verify exit code indicates warning (not failure)
- Verify suggestion text includes which stories to run

---

### Error 3: Insufficient data

**Setup**:
- KB has only 2 calibration entries (< 3 minimum)
- PATTERNS-{month}.yaml has only 1 pattern (< 3 minimum)

**Action**:
```bash
/improvement-proposals --days 30
```

**Expected outcome**:
- Warning logged: "Insufficient data for proposals (2 calibration entries, 1 pattern). Minimum 3 samples per source recommended. Continue? [y/n]"
- If user confirms (y): generate proposals with caveat in frontmatter: `data_quality: insufficient`
- If user declines (n): exit

**Evidence**:
- Check for warning prompt
- Verify data_quality field in frontmatter when user confirms
- Verify exit when user declines

---

### Error 4: Invalid date range

**Setup**:
- N/A

**Action**:
```bash
/improvement-proposals --days invalid
```

**Expected outcome**:
- Error: "Invalid date range: 'invalid'. Expected integer for --days or YYYY-MM-DD..YYYY-MM-DD"
- Command exits with failure

**Evidence**:
- Check for error message
- Verify exit code is non-zero

---

## Edge Cases (Reasonable)

### Edge 1: Stale data (month-old patterns)

**Setup**:
- PATTERNS-2026-01.yaml exists (from January)
- Current date is 2026-02-15
- PATTERNS-2026-02.yaml does not exist

**Action**:
```bash
/improvement-proposals --days 30
```

**Expected outcome**:
- Warning logged: "PATTERNS-2026-01.yaml is stale (45 days old). Consider running /pattern-mine to refresh."
- Proposals generated using stale patterns
- Frontmatter includes: `patterns_age: 45_days, patterns_stale: true`

**Evidence**:
- Check for warning log
- Verify frontmatter fields
- Verify proposals still generated (graceful degradation)

---

### Edge 2: High volume (50+ proposals)

**Setup**:
- KB has extensive data (100+ calibration entries, 50+ patterns)

**Action**:
```bash
/improvement-proposals --days 90
```

**Expected outcome**:
- All proposals generated (no artificial limit)
- High priority section may have 20+ proposals
- File size may be 50KB+ (acceptable)
- Performance: completes within 60 seconds

**Evidence**:
- Count proposals in output file
- Measure file size
- Measure execution time

---

### Edge 3: Duplicate proposals across sources

**Setup**:
- Calibration suggests: "Tighten security agent threshold"
- Patterns suggest: "Security agent has high false positive rate"

**Action**:
```bash
/improvement-proposals --days 30
```

**Expected outcome**:
- Deduplication logic detects similarity (text similarity > 0.8)
- Single merged proposal created: "Tighten security agent threshold (sources: calibration, patterns)"
- Evidence includes both data points
- ROI score boosted for cross-source confirmation

**Evidence**:
- Verify no duplicate proposals for same issue
- Check source field lists multiple sources
- Verify ROI boost applied (compare to single-source proposal)

---

### Edge 4: ROI edge case (impact=low, effort=low)

**Setup**:
- Heuristic proposal: "Fix typo in agent prompt"
- Impact: low (cosmetic issue)
- Effort: low (single character change)

**Action**:
```bash
/improvement-proposals --days 30
```

**Expected outcome**:
- ROI calculated: low (2) / low (1) = 2.0
- Proposal placed in Low priority section (ROI < 4.0)
- Note: Low impact proposals are deprioritized even with low effort

**Evidence**:
- Verify ROI score = 2.0
- Verify placement in Low priority section
- Verify not in Medium priority (common mistake: low effort → medium priority)

---

### Edge 5: First run (no historical proposals)

**Setup**:
- KB has no proposal entries (first time running)

**Action**:
```bash
/improvement-proposals --days 30
```

**Expected outcome**:
- Meta-learning section notes: "No historical proposals found. Acceptance patterns will be tracked starting this week."
- Proposals generated without meta-learning adjustments
- KB entries created for future meta-learning

**Evidence**:
- Check meta-learning section for first-run message
- Verify proposals generated successfully
- Query KB confirms proposal entries created

---

## Required Tooling Evidence

### Backend Testing

**Required .http requests**: N/A (KB integration via mcp__postgres-knowledgebase__query, no HTTP endpoints)

**KB Query Examples**:

1. Query calibration entries:
```javascript
kb_search({
  query: "calibration agent accuracy",
  tags: ["calibration"],
  limit: 50
})
```

2. Query proposals by status:
```javascript
kb_search({
  query: "proposals",
  tags: ["proposal", "status:accepted"],
  limit: 100
})
```

3. Query acceptance patterns:
```sql
SELECT source, status, COUNT(*) as count
FROM kb_entries
WHERE tags @> '["proposal"]'::jsonb
GROUP BY source, status
```

**Assertions**:
- Calibration query returns expected count
- Proposal query filters by status correctly
- Acceptance pattern query computes percentages correctly

---

### CLI Testing

**Required commands**:

1. Basic run:
```bash
/improvement-proposals --days 30
```

2. Custom date range:
```bash
/improvement-proposals --start 2026-01-01 --end 2026-01-31
```

3. Dry run (no KB writes):
```bash
/improvement-proposals --days 30 --dry-run
```

**Assertions**:
- Command executes without errors
- Output file created with expected structure
- KB entries created (or not created in dry-run mode)
- Exit code 0 on success

---

## Risks to Call Out

### Risk 1: Test data dependency

**Issue**: Tests require WKFL-002, WKFL-006, WKFL-003, WKFL-001 to have run and populated data.

**Mitigation**: Create mock data fixtures for test environment:
- `test/fixtures/calibration-entries.json`
- `test/fixtures/PATTERNS-test.yaml`
- `test/fixtures/HEURISTIC-PROPOSALS-test.yaml`
- `test/fixtures/WORKFLOW-RECOMMENDATIONS-test.md`

**Blocker?**: No - use fixtures for unit tests, integration tests use real data if available.

---

### Risk 2: KB schema changes

**Issue**: Proposal schema may evolve over time, breaking old queries.

**Mitigation**:
- Version schema in KB (tags include `["schema:v1"]`)
- Support backward-compatible queries
- Document migration path for schema updates

**Blocker?**: No - handle gracefully with version checks.

---

### Risk 3: Performance with large datasets

**Issue**: 100+ KB entries may slow down queries and proposal generation.

**Mitigation**:
- Add date range filtering to KB queries (default: 30 days)
- Implement pagination for large result sets
- Cache frequent queries (patterns, heuristics) in memory
- Set timeout: 60 seconds max execution time

**Blocker?**: No - mitigations are straightforward.

---

### Risk 4: Deduplication accuracy

**Issue**: Text similarity threshold (0.8) may miss duplicates or flag false positives.

**Mitigation**:
- Log all deduplication decisions for review
- Allow manual override: `--no-dedup` flag
- Tune threshold based on feedback (start at 0.8, adjust as needed)

**Blocker?**: No - initial threshold is reasonable, can be tuned.

---

## Test Execution Plan

### Phase 1: Unit Tests (Mock Data)
- Test ROI calculation logic
- Test priority bucketing
- Test deduplication algorithm
- Test meta-learning calculations
- Estimated time: 2-3 hours

### Phase 2: Integration Tests (Real Data)
- Test with all data sources available
- Test with missing data sources (graceful degradation)
- Test KB read/write operations
- Test file I/O (read patterns, write proposals)
- Estimated time: 3-4 hours

### Phase 3: E2E Tests (Full Workflow)
- Run `/improvement-proposals` on actual WKFL data
- Verify proposal quality and relevance
- Test proposal lifecycle (proposed → accepted → rejected → implemented)
- Measure performance and accuracy
- Estimated time: 2-3 hours

**Total estimated testing effort**: 7-10 hours
