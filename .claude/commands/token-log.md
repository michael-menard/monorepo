/token-log STORY-XXX phase-name [input-tokens] [output-tokens]

You are the Token Logger utility. This skill logs token usage for a single phase/command execution.

-------------------------------------------------------------------------------
ARGUMENT PARSING
-------------------------------------------------------------------------------

This command accepts:
- `STORY-XXX` — story ID (e.g., STORY-001, WRKF-1021)
- `phase-name` — standardized phase name (see table below)
- `input-tokens` — (optional) input token count
- `output-tokens` — (optional) output token count

If tokens are not provided, prompt the user to estimate from `/cost` output.

-------------------------------------------------------------------------------
STANDARDIZED PHASE NAMES
-------------------------------------------------------------------------------

| Phase Name | Command |
|------------|---------|
| `pm-generate` | `/pm-generate-story` |
| `pm-fix` | `/pm-fix-story` |
| `elaboration` | `/elab-story` |
| `dev-setup` | Phase 0 of `/dev-implement-story` |
| `dev-planning` | Phase 1 of `/dev-implement-story` |
| `dev-implementation` | Phase 2 of `/dev-implement-story` |
| `dev-verification` | Phase 3 of `/dev-implement-story` |
| `dev-documentation` | Phase 4 of `/dev-implement-story` |
| `code-review` | `/dev-code-review` |
| `dev-fix` | `/dev-fix-story` |
| `qa-verify` | `/qa-verify-story` |

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
If not found, create it at `plans/stories/backlog/STORY-XXX/` (for initial phases).

-------------------------------------------------------------------------------
TOKEN LOG FILE LOCATION
-------------------------------------------------------------------------------

Target file: `<story-directory>/_implementation/TOKEN-LOG.md`

If `_implementation/` directory doesn't exist, create it.
If `TOKEN-LOG.md` doesn't exist, create it with the header.

-------------------------------------------------------------------------------
TOKEN LOG FORMAT
-------------------------------------------------------------------------------

```markdown
# Token Log - STORY-XXX

| Timestamp | Phase | Input | Output | Total | Cumulative |
|-----------|-------|-------|--------|-------|------------|
```

Each new entry appends a row:

```markdown
| 2026-01-24 10:30 | pm-generate | 15,000 | 5,000 | 20,000 | 20,000 |
| 2026-01-24 11:00 | elaboration | 20,000 | 2,000 | 22,000 | 42,000 |
```

-------------------------------------------------------------------------------
TASK
-------------------------------------------------------------------------------

1. Locate the story directory (search all possible locations)
2. Ensure `_implementation/` directory exists
3. If TOKEN-LOG.md doesn't exist, create with header
4. Read existing TOKEN-LOG.md to get current cumulative total
5. Calculate:
   - Total = input-tokens + output-tokens
   - Cumulative = previous_cumulative + Total
6. Append new row with:
   - Timestamp: current date/time in `YYYY-MM-DD HH:MM` format
   - Phase: the provided phase-name
   - Input: formatted with commas (e.g., 15,000)
   - Output: formatted with commas
   - Total: formatted with commas
   - Cumulative: formatted with commas
7. Report success with summary

-------------------------------------------------------------------------------
FORMAT NUMBERS
-------------------------------------------------------------------------------

Always format token numbers with commas for readability:
- 15000 → 15,000
- 117000 → 117,000
- 1500000 → 1,500,000

-------------------------------------------------------------------------------
OUTPUT
-------------------------------------------------------------------------------

After logging, report:

```
Token logged for STORY-XXX:
  Phase: phase-name
  Input: XX,XXX | Output: XX,XXX | Total: XX,XXX
  Cumulative: XXX,XXX
```

-------------------------------------------------------------------------------
ERROR HANDLING
-------------------------------------------------------------------------------

If story directory cannot be found in any location:
- Report: "Story STORY-XXX not found in any status directory"
- Suggest creating the story first

If phase-name is not in the standard list:
- Allow it but warn: "Non-standard phase name: 'custom-name'"

-------------------------------------------------------------------------------
EXAMPLES
-------------------------------------------------------------------------------

```bash
/token-log WRKF-1021 pm-generate 15000 5000
# → Logs 15k input, 5k output for pm-generate phase

/token-log WRKF-1021 elaboration 20000 2000
# → Logs 20k input, 2k output for elaboration phase
# → Cumulative now 42,000

/token-log WRKF-1021 dev-implementation 80000 37000
# → Logs 80k input, 37k output for dev-implementation
# → Cumulative now 159,000
```

-------------------------------------------------------------------------------
DONE
-------------------------------------------------------------------------------

Stop when:
- TOKEN-LOG.md is updated with new row
- Success message displayed
