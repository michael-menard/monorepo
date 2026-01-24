/token-report STORY-XXX

You are the Token Report generator. This skill generates a summary report aggregating all logged token usage for a story.

-------------------------------------------------------------------------------
ARGUMENT PARSING
-------------------------------------------------------------------------------

This command accepts:
- `STORY-XXX` — story ID (e.g., STORY-001, WRKF-1021)

-------------------------------------------------------------------------------
LOCATE STORY DIRECTORY
-------------------------------------------------------------------------------

The story can be in one of these directories:
1. `plans/stories/backlog/STORY-XXX/`
2. `plans/stories/elaboration/STORY-XXX/`
3. `plans/stories/ready-to-work/STORY-XXX/`
4. `plans/stories/in-progress/STORY-XXX/`
5. `plans/stories/QA/STORY-XXX/`
6. `plans/stories/UAT/STORY-XXX/`

Search these directories in order to find the story.

-------------------------------------------------------------------------------
PRECONDITIONS
-------------------------------------------------------------------------------

- TOKEN-LOG.md MUST exist at `<story-directory>/_implementation/TOKEN-LOG.md`
- If not found: STOP and report "No token log found for STORY-XXX"

-------------------------------------------------------------------------------
TASK
-------------------------------------------------------------------------------

1. Read `<story-directory>/_implementation/TOKEN-LOG.md`
2. Parse all rows from the token log table
3. Generate `<story-directory>/_implementation/TOKEN-SUMMARY.md`

-------------------------------------------------------------------------------
TOKEN SUMMARY FORMAT
-------------------------------------------------------------------------------

```markdown
# Token Summary - STORY-XXX

Generated: YYYY-MM-DD HH:MM

## Phase Breakdown

| Phase | Input | Output | Total | % of Total |
|-------|-------|--------|-------|------------|
| pm-generate | 15,000 | 5,000 | 20,000 | 12.6% |
| elaboration | 20,000 | 2,000 | 22,000 | 13.8% |
| dev-implementation | 80,000 | 37,000 | 117,000 | 73.6% |
| **Total** | **115,000** | **44,000** | **159,000** | **100%** |

## Cost Estimate

Using Claude Opus pricing:
- Input: $0.003 / 1K tokens
- Output: $0.015 / 1K tokens

| Category | Tokens | Cost |
|----------|--------|------|
| Input | 115,000 | $0.35 |
| Output | 44,000 | $0.66 |
| **Total** | **159,000** | **$1.01** |

## High-Cost Operations

Phases exceeding 30,000 tokens:

| Phase | Total Tokens | Notes |
|-------|-------------|-------|
| dev-implementation | 117,000 | Primary implementation work |

## Comparison to Typical Budget

| Metric | This Story | Typical | Variance |
|--------|-----------|---------|----------|
| PM phases | 42,000 | 50,000 | -16% |
| Dev phases | 117,000 | 100,000 | +17% |
| Total | 159,000 | 200,000 | -21% |

## Timeline

| First Entry | Last Entry | Duration |
|-------------|------------|----------|
| YYYY-MM-DD HH:MM | YYYY-MM-DD HH:MM | X hours |

## Raw Log

(Copied from TOKEN-LOG.md for reference)

| Timestamp | Phase | Input | Output | Total | Cumulative |
|-----------|-------|-------|--------|-------|------------|
...
```

-------------------------------------------------------------------------------
CALCULATIONS
-------------------------------------------------------------------------------

**Percentage of Total:**
```
phase_percent = (phase_total / grand_total) * 100
```

**Cost Estimate:**
```
input_cost = (input_tokens / 1000) * 0.003
output_cost = (output_tokens / 1000) * 0.015
total_cost = input_cost + output_cost
```

**Typical Budget Reference:**

| Phase Group | Typical Total |
|-------------|---------------|
| PM phases (pm-generate, pm-fix, elaboration) | 50,000 |
| Dev phases (dev-*, code-review) | 100,000 |
| QA phases (qa-verify) | 50,000 |
| Full story lifecycle | 200,000 |

**Variance:**
```
variance_percent = ((actual - typical) / typical) * 100
```

-------------------------------------------------------------------------------
HIGH-COST THRESHOLD
-------------------------------------------------------------------------------

Flag phases exceeding 30,000 tokens as "high-cost operations"

Group phases for analysis:
- PM: pm-generate, pm-fix
- Elaboration: elaboration
- Dev Setup: dev-setup
- Dev Planning: dev-planning
- Dev Implementation: dev-implementation (often highest)
- Dev Verification: dev-verification
- Dev Documentation: dev-documentation
- Review: code-review
- QA: qa-verify
- Fix: dev-fix

-------------------------------------------------------------------------------
OUTPUT
-------------------------------------------------------------------------------

After generating the summary, report:

```
Token summary generated for STORY-XXX:

Total: XXX,XXX tokens (~$X.XX)
Phases: N phases logged
Highest: phase-name (XX,XXX tokens)
Status: [Under budget / On budget / Over budget]

File: plans/stories/<status>/STORY-XXX/_implementation/TOKEN-SUMMARY.md
```

-------------------------------------------------------------------------------
ERROR HANDLING
-------------------------------------------------------------------------------

If TOKEN-LOG.md is empty or has no data rows:
- Report: "TOKEN-LOG.md exists but contains no data"
- Suggest running `/token-log` first

If TOKEN-LOG.md has malformed rows:
- Report which rows couldn't be parsed
- Continue with parseable rows

-------------------------------------------------------------------------------
EXAMPLE OUTPUT
-------------------------------------------------------------------------------

For a story with multiple phases logged:

```
Token summary generated for WRKF-1021:

Total: 159,000 tokens (~$1.01)
Phases: 3 phases logged
Highest: dev-implementation (117,000 tokens)
Status: Under budget (21% below typical)

File: plans/stories/in-progress/WRKF-1021/_implementation/TOKEN-SUMMARY.md
```

-------------------------------------------------------------------------------
DONE
-------------------------------------------------------------------------------

Stop when:
- TOKEN-SUMMARY.md is written
- Summary displayed to user
