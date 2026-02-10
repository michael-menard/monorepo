# Dev Feasibility Review: WKFL-006 - Cross-Story Pattern Mining

## Feasibility Summary

- **Feasible for MVP:** Yes (with dual-mode data source approach)
- **Confidence:** Medium
- **Why:** Core pattern mining logic is straightforward (file/path correlation, AC text analysis, agent correlation tracking). Primary risk is OUTCOME.yaml data availability (0 files exist currently), but VERIFICATION.yaml fallback (37 files available) provides viable interim data source. Embedding-based clustering (AC-4) may need simplification for MVP (text similarity instead of embeddings).

## Likely Change Surface (Core Only)

### Areas/Packages for Core Journey

**New Agent:**
- `.claude/agents/pattern-miner.agent.md` (sonnet model)
  - Pattern detection logic (file patterns, AC patterns, agent correlations)
  - Data loading (OUTCOME.yaml, VERIFICATION.yaml dual-mode)
  - Clustering algorithm (similarity-based grouping)
  - Output generation (three formats)

**New Schemas:**
- `.claude/schemas/patterns-schema.yaml` (PATTERNS-{month}.yaml structure)
- `.claude/schemas/agent-hints-schema.yaml` (AGENT-HINTS.yaml structure)

**New Command:**
- `.claude/commands/pattern-mine.md` (command specification)

**Data Sources:**
- Read from: `plans/**/OUTCOME.yaml` (future primary)
- Read from: `plans/**/VERIFICATION.yaml` (current fallback)

**Output Locations:**
- Write to: `.claude/patterns/PATTERNS-{YYYY-MM}.yaml`
- Write to: `.claude/patterns/AGENT-HINTS.yaml`
- Write to: `.claude/patterns/ANTI-PATTERNS.md`

### Endpoints for Core Journey

Not applicable - no API endpoints (workflow analysis agent).

### Critical Deploy Touchpoints

**KB Integration:**
- KB writes for significant patterns: `kb_add_lesson()` calls
- KB queries for similar patterns: `kb_search()` calls

**File System:**
- Pattern output directory: `.claude/patterns/` (must exist or be created)
- Schema directory: `.claude/schemas/` (already exists)
- Command directory: `.claude/commands/` (already exists)

## MVP-Critical Risks

### Risk 1: OUTCOME.yaml Data Unavailable (0 files exist)

**Why it blocks MVP:**
AC-1 requires minimum 10 stories per mining run, but OUTCOME.yaml generation is not yet active (WKFL-001 defined schema but integration not activated). Without fallback to VERIFICATION.yaml, pattern mining cannot run.

**Required mitigation:**
- Implement dual-mode data loading:
  - Primary: OUTCOME.yaml analysis (future-ready when generation activates)
  - Fallback: VERIFICATION.yaml analysis (works with 37 existing files)
- Detection logic: Check for OUTCOME.yaml files first, fall back to VERIFICATION.yaml if < 10 found
- Warning logging: Alert when using fallback mode
- Migration path: When OUTCOME.yaml generation activates, automatic switch to primary mode

### Risk 2: Clustering Algorithm Complexity (AC-4 embedding similarity)

**Why it blocks MVP:**
AC-4 requires clustering with embedding similarity > 0.85. True embedding similarity requires:
- External API dependency (OpenAI embeddings API), OR
- Local embedding model (sentence-transformers library)

Both add complexity and external dependencies not yet in architecture.

**Required mitigation:**
- MVP: Implement text-based similarity (Levenshtein distance or fuzzy matching)
- Adjust threshold: Use text similarity threshold (e.g., 0.70) calibrated to approximate embedding similarity
- Document limitation: Note in PATTERNS-{month}.yaml that clustering uses text similarity
- Future enhancement: Propose embedding upgrade in follow-up story
- Acceptance: Treat AC-4 as "clustering implemented" (algorithm may evolve)

### Risk 3: Schema Definitions Required Before Implementation

**Why it blocks MVP:**
Pattern-miner agent cannot generate output without defined schemas for PATTERNS-{month}.yaml and AGENT-HINTS.yaml. Schema structure drives output generation logic.

**Required mitigation:**
- Define schemas FIRST in `.claude/schemas/` directory:
  - `patterns-schema.yaml` (mining_period, stories_analyzed, file_patterns, ac_patterns, agent_correlations, cycle_predictors)
  - `agent-hints-schema.yaml` (hints per agent, pattern recommendations)
- Use story.yaml technical_notes section as schema draft
- Validate schema against WKFL-001's OUTCOME.yaml schema structure
- Schemas must be written before agent implementation begins

## Missing Requirements for MVP

### 1. Pattern Significance Thresholds

**Missing decision:**
What constitutes a "significant" pattern worthy of output and KB persistence?

**Required PM clarification:**
- File/path pattern: Minimum N occurrences (suggest 3 based on workflow-retro agent)
- Correlation threshold: Minimum X% correlation (suggest 0.60 = 60% correlation)
- AC pattern: Minimum N stories with vague phrases (suggest 3)
- Agent correlation: Minimum N disagreement instances (suggest 3)
- Sample size: Absolute minimum before declaring pattern (suggest 3)

**Concrete text for story:**
```
Pattern Significance Thresholds:
- Minimum occurrences: 3 (pattern must appear in ≥3 stories)
- Minimum correlation: 0.60 (60% failure rate for file patterns)
- Minimum sample size: 3 (any pattern type)
- Token variance: 20%+ (inherited from workflow-retro)
- Similarity clustering: 0.70 (text similarity) or 0.85 (embedding similarity)
```

### 2. Time Window for Analysis

**Missing decision:**
How many days back should pattern mining analyze? Default value for `--days` parameter?

**Required PM clarification:**
- Default window: 30 days? 60 days? Last sprint?
- Sliding window vs fixed periods (e.g., always analyze current month)
- Overlap handling (patterns detected in multiple runs)

**Concrete text for story:**
```
Time Window Configuration:
- Default: Last 30 days (configurable via --days parameter)
- Monthly mode: --month YYYY-MM analyzes specific month
- Overlap allowed: Patterns may appear in multiple monthly reports
```

### 3. Weekly Cron vs Manual Command

**Missing decision:**
Is weekly cron execution in scope for MVP, or manual command only?

**Required PM clarification:**
- MVP: Manual `/pattern-mine` command only
- Future: Weekly cron job (separate infrastructure story)
- Execution trigger: Manual operator run, or automated?

**Concrete text for story:**
```
Execution Model (MVP):
- Manual command: /pattern-mine --days 30
- Weekly cron: OUT OF SCOPE (document setup, implement in future story)
- Operator-triggered: Yes (PM or dev runs manually after sufficient stories complete)
```

## MVP Evidence Expectations

### Proof Needed for Core Journey

**1. Pattern Detection Working:**
- Given 15 synthetic OUTCOME.yaml (or VERIFICATION.yaml) files with patterns
- When `/pattern-mine --days 30` runs
- Then PATTERNS-{month}.yaml generated with file_patterns, ac_patterns, agent_correlations sections populated

**2. Dual-Mode Data Loading:**
- Given 0 OUTCOME.yaml files and 20 VERIFICATION.yaml files
- When `/pattern-mine --days 30` runs
- Then warning logged, VERIFICATION.yaml used, patterns generated

**3. Clustering Working:**
- Given 12 OUTCOME.yaml files with similar findings (text similarity > threshold)
- When `/pattern-mine --days 30` runs
- Then findings clustered into single pattern entry (not 12 separate)

**4. Output Format Compliance:**
- All three output files generated (PATTERNS, AGENT-HINTS, ANTI-PATTERNS)
- PATTERNS-{month}.yaml validates against schema
- AGENT-HINTS.yaml contains per-agent recommendations

**5. KB Integration:**
- Significant patterns persisted to KB via kb_add_lesson
- Queryable via kb_search with tags: ["pattern", "workflow"]

### Critical CI/Deploy Checkpoints

**Pre-Implementation:**
- [ ] Schemas defined in `.claude/schemas/` (patterns-schema.yaml, agent-hints-schema.yaml)
- [ ] Pattern significance thresholds documented in story
- [ ] Time window configuration decided

**Implementation:**
- [ ] Pattern-miner.agent.md created and validated
- [ ] Command specification created: `.claude/commands/pattern-mine.md`
- [ ] Dual-mode data loading implemented (OUTCOME.yaml, VERIFICATION.yaml)

**Testing:**
- [ ] Test fixtures created (synthetic OUTCOME.yaml, VERIFICATION.yaml)
- [ ] Pattern detection tests passing (file patterns, AC patterns, agent correlations)
- [ ] Clustering tests passing (similarity threshold validation)
- [ ] Output format tests passing (schema validation)
- [ ] KB integration tests passing (writes and queries)

**Documentation:**
- [ ] Agent documentation complete (pattern-miner.agent.md)
- [ ] Command usage documented (pattern-mine.md)
- [ ] Output format examples included (PATTERNS.yaml, AGENT-HINTS.yaml samples)
- [ ] Weekly cron setup documented (for future activation)

**Verification (QA):**
- [ ] Run against 37 existing VERIFICATION.yaml files (real data test)
- [ ] Validate patterns make sense (sanity check)
- [ ] Confirm AGENT-HINTS.yaml actionable (ready for agent enhancement)
- [ ] KB patterns queryable and useful
