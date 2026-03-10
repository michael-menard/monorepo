# Dev Feasibility Review: WKFL-010 - Improvement Proposal Generator

## Feasibility Summary

**Feasible for MVP**: Yes

**Confidence**: High

**Why**: Story builds on established patterns from WKFL-002, WKFL-006, WKFL-003, and WKFL-007. All required components (KB integration, file I/O, multi-source aggregation, YAML output) are proven patterns. No new infrastructure required. Graceful degradation approach reduces risk.

---

## Likely Change Surface (Core Only)

### Files to Create

**Agent**:
- `.claude/agents/improvement-proposer.agent.md` (~450 lines, similar to pattern-miner.agent.md)

**Command**:
- `.claude/commands/improvement-proposals.md` (~120 lines, similar to /calibration-report)

**Schema Extensions** (optional - may use existing KB schemas):
- `apps/api/knowledge-base/src/__types__/index.ts` - add ProposalEntrySchema (~50 lines)

### Files to Read (No Modifications)

**Data Sources**:
- `.claude/patterns/PATTERNS-{month}.yaml` (via WKFL-006)
- `.claude/config/HEURISTIC-PROPOSALS.yaml` (via WKFL-003)
- `WORKFLOW-RECOMMENDATIONS.md` (via WKFL-001)

**KB Queries**:
- Calibration entries (via kb_search with tags: ["calibration"])
- Past proposal entries (via kb_search with tags: ["proposal"])

### Critical Deploy Touchpoints

**None** - CLI-only story, no deployment required. Changes are:
- Agent markdown file (committed to repo)
- Command markdown file (committed to repo)
- KB schema update (applied via migration if needed)

---

## MVP-Critical Risks (Max 5)

### Risk 1: KB dependency - No fallback if unavailable

**Why it blocks MVP**: Cannot generate proposals without reading calibration data, pattern data, or writing proposal entries. No offline mode possible.

**Required mitigation**:
- Add health check: Verify KB is reachable before starting aggregation
- If KB unavailable: Fail fast with clear error message (don't try to proceed)
- Document dependency in agent frontmatter: `requires: [kb_search, kb_add_lesson]`
- Error message: "KB unavailable. Improvement proposals require KB for data aggregation. Check KB service status and retry."

---

### Risk 2: Data source orchestration - Promise.allSettled() pattern complexity

**Why it blocks MVP**: If data source queries fail silently, proposals may be incomplete or missing high-priority items. Must track which sources succeeded vs failed.

**Required mitigation**:
- Use Promise.allSettled() pattern (not Promise.all()) to avoid short-circuit failure
- Track result status per source: { calibration: 'success', patterns: 'error', heuristics: 'success', retro: 'success' }
- Log warnings for failed sources: "Pattern data unavailable (PATTERNS-2026-02.yaml not found), continuing with 3/4 sources"
- Include sources_used field in YAML frontmatter: `sources_used: ["calibration", "heuristics", "retro"]` (3/4)
- Minimum viable threshold: At least 1 source must succeed, otherwise fail

---

### Risk 3: ROI calculation - Formula must be consistent and documented

**Why it blocks MVP**: If ROI scoring is inconsistent or unclear, proposals will be misprioritized. PM decisions depend on accurate ROI scores.

**Required mitigation**:
- Define numeric mappings explicitly in agent:
  - Impact: high=9, medium=5, low=2
  - Effort: low=1, medium=3, high=9
  - ROI formula: (impact / effort) * (10 / 9) to scale to 10-point
- Document formula in IMPROVEMENT-PROPOSALS-{date}.md header:
  ```markdown
  ## ROI Scoring Formula
  - Impact: High=9, Medium=5, Low=2
  - Effort: Low=1, Medium=3, High=9
  - ROI = (Impact / Effort) * (10/9)
  - Priority buckets: High (ROI ≥ 7.0), Medium (4.0-6.9), Low (< 4.0)
  ```
- Include example calculation for transparency: "P-001: ROI = (9/1) * (10/9) = 10.0 (High Impact, Low Effort)"

---

### Risk 4: Proposal schema - Must match KB entry structure

**Why it blocks MVP**: If proposal schema doesn't align with existing KB patterns (tags, fields), queries will fail or return incomplete data.

**Required mitigation**:
- Extend CalibrationEntrySchema pattern (existing in apps/api/knowledge-base/src/__types__/index.ts)
- Required fields:
  ```typescript
  const ProposalEntrySchema = z.object({
    id: z.string(),           // P-001, P-002, etc.
    title: z.string(),
    source: z.enum(['calibration', 'patterns', 'heuristics', 'retro', 'multi-source']),
    evidence_id: z.string().nullable(),  // Reference to calibration entry, pattern ID, etc.
    status: z.enum(['proposed', 'accepted', 'rejected', 'implemented']),
    created_at: z.string().datetime(),
    accepted_at: z.string().datetime().nullable(),
    implemented_at: z.string().datetime().nullable(),
    rejection_reason: z.string().nullable(),
    impact: z.enum(['high', 'medium', 'low']),
    effort: z.enum(['high', 'medium', 'low']),
    roi_score: z.number().min(0).max(10),
    tags: z.array(z.string())  // ["proposal", "source:calibration", "status:proposed", "priority:high"]
  })
  ```
- Test schema with sample KB write/query before full implementation
- Document schema in agent frontmatter for future reference

---

### Risk 5: Deduplication logic - May miss duplicates or create false positives

**Why it blocks MVP**: If proposals from different sources refer to the same issue (e.g., "security agent threshold" from calibration and patterns), duplicates clutter output. But aggressive deduplication may merge unrelated proposals.

**Required mitigation**:
- Use conservative text similarity threshold: 0.85 (only merge very similar proposals)
- Deduplication algorithm:
  ```javascript
  // For each new proposal, compare to existing proposals
  const similar = existingProposals.find(p =>
    textSimilarity(newProposal.title, p.title) > 0.85 ||
    (newProposal.evidence_id && newProposal.evidence_id === p.evidence_id)
  )
  if (similar) {
    // Merge: combine sources, use higher ROI, append evidence
    mergedProposal = {
      ...similar,
      source: 'multi-source',
      sources: [...similar.sources, newProposal.source],
      evidence: similar.evidence + "; " + newProposal.evidence,
      roi_score: Math.max(similar.roi_score, newProposal.roi_score)
    }
  }
  ```
- Log all deduplication decisions: "Merged P-002 into P-001 (similarity: 0.89)"
- Manual override flag: `--no-dedup` to disable merging for debugging

---

## Missing Requirements for MVP

### Requirement 1: Date range filter for KB queries

**Issue**: Story.yaml AC-1 says "aggregate inputs from all available learning components" but doesn't specify time window. Without filtering, KB queries may return stale data from months ago.

**Concrete decision text PM must include**:

Add to AC-1:
```yaml
- id: AC-1
  description: "Aggregate inputs from all available learning components within specified date range"
  verification: "Proposer queries all learning data sources with date filter (default: 30 days)"
  details:
    - Default date range: past 30 days
    - Configurable via --days N or --start YYYY-MM-DD --end YYYY-MM-DD
    - KB queries include date filter: `created_at >= ${start_date} AND created_at <= ${end_date}`
    - Pattern files are selected by month: PATTERNS-{YYYY-MM}.yaml for months in range
```

---

### Requirement 2: Minimum sample size threshold per source

**Issue**: AC-2 requires "evidence must reference specific data" but doesn't specify minimum sample size. Single data point (e.g., 1 calibration entry) is not sufficient evidence for a proposal.

**Concrete decision text PM must include**:

Add to AC-2:
```yaml
- id: AC-2
  description: "Generate proposals with effort/impact ratings backed by minimum sample size"
  verification: "Each proposal has evidence from ≥3 samples (or explicitly marked as low-confidence)"
  details:
    - Minimum sample size: 3 data points per proposal
    - Example: "routes.ts fails lint 78% of time in 15 samples" (sufficient)
    - Example: "routes.ts failed lint once" (insufficient - skip or mark low-confidence)
    - If <3 samples: Either skip proposal OR include with caveat: "Low confidence (2 samples)"
```

---

### Requirement 3: Proposal ID generation scheme

**Issue**: Story doesn't specify how proposal IDs are generated. Need consistent scheme for tracking across runs.

**Concrete decision text PM must include**:

Add to Technical Notes:
```yaml
technical_notes: |
  ## Proposal ID Scheme

  IDs follow format: P-{YYYYMM}-{NNN}
  - YYYYMM: Month generated (e.g., 202602 for February 2026)
  - NNN: Zero-padded sequential number (001, 002, 003...)

  Examples:
  - P-202602-001 (first proposal in February 2026)
  - P-202602-015 (fifteenth proposal in February 2026)

  ID assignment:
  - Query KB for highest existing ID in current month
  - Increment sequence number
  - If new month, reset to 001
```

---

## MVP Evidence Expectations

### Proof Needed for Core Journey

**Artifact**: `IMPROVEMENT-PROPOSALS-{date}.md` generated from multi-source aggregation

**Critical checkpoints**:

1. **Data Aggregation Proof**:
   - YAML frontmatter shows `sources_used: ["calibration", "patterns", "heuristics", "retro"]` (4/4 or degraded to 3/4, 2/4 with warnings)
   - `stories_analyzed: 23` (matches KB calibration entry count)
   - `proposals_generated: 12` (reasonable ratio: ~1 proposal per 2 stories)

2. **ROI Calculation Proof**:
   - Each proposal includes impact, effort, roi_score fields
   - ROI scores are numerically correct (spot check 3 proposals)
   - Priority sections are correctly bucketed (High: ROI ≥ 7.0, Medium: 4.0-6.9, Low: < 4.0)
   - No misplaced proposals (e.g., ROI 8.5 in Medium section)

3. **KB Persistence Proof**:
   - KB query after generation: `kb_search({ tags: ["proposal", "status:proposed"] })` returns all new proposals
   - Each KB entry has required fields: id, title, source, status, impact, effort, roi_score, tags
   - Tags match proposal attributes (e.g., `["proposal", "source:calibration", "status:proposed", "priority:high"]`)

4. **Meta-Learning Proof**:
   - If historical proposals exist: Meta-learning section shows acceptance rates by source
   - Acceptance rate calculation is correct: accepted / (accepted + rejected) * 100
   - If no historical proposals: Section notes "No historical proposals found, tracking starts this week"

5. **Graceful Degradation Proof**:
   - Remove PATTERNS-{month}.yaml → warning logged, proposals still generated with 3/4 sources
   - Remove KB access (mock failure) → error logged, command fails fast with clear message
   - Remove all data sources → warning logged, command suggests running WKFL-002, WKFL-006, WKFL-003, WKFL-001

### CI/Deploy Checkpoints

**None** - CLI-only story, no CI/deploy steps required beyond committing agent/command files.

**Manual verification**:
- Run `/improvement-proposals --days 30` on real WKFL data
- Verify output quality and actionability
- Spot check 5 proposals for accuracy and evidence quality

---
