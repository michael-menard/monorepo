# Integration Test Documentation

Story: WKFL-006
Purpose: Full mining flow validation (data loading → detection → clustering → output → KB)

---

## Full Flow Test 1: VERIFICATION.yaml Fallback Mode (AC-8)

```
command: /pattern-mine --days 30 --use-verifications
fixtures: verification-samples.yaml (22 stories)

flow:
  1. OUTCOME.yaml search → 0 files found
  2. Log warning: "OUTCOME.yaml unavailable - using VERIFICATION.yaml fallback"
  3. VERIFICATION.yaml search → 22 files found (>= 10, proceed)
  4. Batch load 22 files (10 + 10 + 2)
  5. Extract: story_id, touched_files, verdicts, AC text
  6. Detect file patterns (Step 2)
     → "apps/api/routes/auth.ts": 13 occurrences, correlation 0.85, severity: high
  7. Detect AC patterns (Step 3)
     → "properly": 8 occurrences, failure_rate 0.87, severity: high
     → "correctly": 5 occurrences, failure_rate 0.40, severity: medium
  8. Cluster findings (Step 4)
     → cluster_labels assigned, similarity_scores computed
  9. Detect agent correlations (Step 5)
  10. Generate PATTERNS-2026-02.yaml
      → data_quality.fallback_mode: true
      → warnings include fallback warning
  11. Generate AGENT-HINTS.yaml
  12. Generate ANTI-PATTERNS.md
  13. Generate index.html
  14. KB: kb_add_lesson for high-severity patterns (auth.ts, "properly")
  15. Inject hints into matching agent .md files
  16. Print completion report

assertions:
  - outputs_directory: .claude/patterns/2026-02/
  - PATTERNS-2026-02.yaml: exists, schema: 2, stories_analyzed: 22
  - AGENT-HINTS.yaml: exists, agents section non-empty
  - ANTI-PATTERNS.md: exists, contains "properly" section
  - index.html: exists, contains <table> elements
  - metadata.data_quality.fallback_mode: true
  - metadata.warnings: contains "OUTCOME.yaml unavailable"
  - file_patterns[0].cluster_label: non-null
  - file_patterns[0].confidence: non-null (>= 5 samples)
  - ac_patterns[0].confidence: null ("properly" first seen with < 5 samples in some periods)
```

---

## Full Flow Test 2: Minimum Sample Threshold Enforcement (AC-1)

```
command: /pattern-mine --days 7 --use-verifications
scenario: only 8 VERIFICATION.yaml files in last 7 days

flow:
  1. Search for OUTCOME.yaml → 0 found
  2. Search for VERIFICATION.yaml in last 7 days → 8 found
  3. 8 < 10 minimum
  4. Log warning: "WARNING: Only 8 stories found. Pattern mining requires ≥10 stories. Skipping run."
  5. Exit without generating outputs

assertions:
  - no PATTERNS file created
  - no AGENT-HINTS.yaml created
  - no ANTI-PATTERNS.md created
  - no index.html created
  - exit with non-zero status
  - warning message logged to output
```

---

## Full Flow Test 3: Cross-Period Deduplication (AC-16)

```
command: /pattern-mine --month 2026-02 --use-verifications
precondition: PATTERNS-2026-01.yaml exists at .claude/patterns/2026-01/

flow:
  1. Load 2026-02 VERIFICATION.yaml files
  2. Detect current period patterns
  3. Load .claude/patterns/2026-01/PATTERNS-2026-01.yaml (previous period)
  4. Compare patterns using Levenshtein similarity >= 0.70
  5. Mark matching patterns: deduplicated_from_previous: true, first_seen: "2026-01"
  6. Populate deduplicated_from_previous section in output

assertions:
  - deduplicated_from_previous.previous_period: "2026-01"
  - repeated patterns have first_seen: "2026-01"
  - new patterns not in dedup section
  - dedup section counts match report
```

---

## Full Flow Test 4: Trend Analysis (AC-12, --trend flag)

```
command: /pattern-mine --month 2026-02 --trend --use-verifications
precondition: PATTERNS-2026-01.yaml exists

flow:
  1. Load current period data
  2. Detect patterns
  3. Load previous period PATTERNS-2026-01.yaml
  4. Compare metrics for each pattern
  5. Assign trend: improving/regressing/stable/new/resolved
  6. Generate trend_summary section

assertions:
  - trend_summary.period: "2026-02"
  - trend_summary.compared_to: "2026-01"
  - every pattern has trend field (not null when --trend used)
  - trend_summary counts sum to total patterns + resolved
```

---

## Full Flow Test 5: --all-epics Flag (AC-11)

```
command: /pattern-mine --days 30 --all-epics --use-verifications

flow:
  1. Glob: plans/**/_implementation/VERIFICATION.yaml (all directories, not just current epic)
  2. Load all found files within time window
  3. Proceed normally

assertions:
  - stories loaded from multiple epic directories (workflow-learning, wint, kbar, etc.)
  - stories_analyzed > stories found with --current-epic-only
  - metadata.flags.all_epics: true
```

---

## Full Flow Test 6: AGENT-HINTS Idempotent Injection (AC-5, AC-15)

```
command_1: /pattern-mine --days 30 --use-verifications
command_2: /pattern-mine --days 30 --use-verifications  # re-run

flow_command_1:
  1. AGENT-HINTS.yaml generated
  2. For each agent with hints: search for <!-- PATTERN-HINTS:START --> in agent .md
  3. Marker not found → append hints section

flow_command_2:
  1. AGENT-HINTS.yaml regenerated (may have same or different content)
  2. For each agent: search for <!-- PATTERN-HINTS:START --> marker
  3. Marker found → REPLACE content between START and END (not duplicate)
  4. Log: "Injected hints into {agent}.agent.md (replaced existing)"

assertions:
  - after command_2, count of <!-- PATTERN-HINTS:START --> in any agent file: exactly 1
  - hints reflect command_2 data (not stale from command_1)
  - no duplicate sections in any agent file
```

---

## Full Flow Test 7: index.html Dashboard (AC-13)

```
command: /pattern-mine --days 30 --use-verifications

assertions:
  - .claude/patterns/YYYY-MM/index.html exists
  - file is valid HTML (starts with <!DOCTYPE html>)
  - contains summary cards (file patterns count, AC patterns count)
  - contains <table> for each pattern type
  - contains links to PATTERNS-YYYY-MM.yaml, ANTI-PATTERNS.md, AGENT-HINTS.yaml
  - HTML entities escaped (no raw < > in user-generated text)
  - overwritten on re-run (not appended)
```

---

## Full Flow Test 8: KB Integration

```
command: /pattern-mine --days 30 --use-verifications
scenario: patterns detected with severity: high

flow:
  1. For each high-severity pattern:
     - kb_add_lesson({category: 'pattern', tags: ['pattern', 'workflow', 'cross-story', 'high']})
  2. One KB entry per pattern (not per occurrence/story)
  3. After run, kb_search({category: 'pattern'}) returns entries

assertions:
  - KB entries created for high-severity patterns only
  - Each KB entry has category: pattern
  - tags include 'pattern', 'workflow', 'cross-story'
  - KB entries queryable after run
  - completion report: "KB Entries Created: {N}"
```
