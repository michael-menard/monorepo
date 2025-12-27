<!-- Powered by BMAD™ Core -->

# review-story

Perform a comprehensive code review with quality gate decision.

## Description

This task delegates to the `/review` Claude Code skill, which provides comprehensive analysis using parallel specialist sub-agents.

## Usage

```bash
# Via BMAD agent
@qa *review 3.1.5

# Direct skill invocation
/review 3.1.5
```

## Execution

**Invoke the `/review` skill with the story number:**

```
Skill(
  skill: "review",
  args: "{story_id}"
)
```

The `/review` skill will:

1. **Gather Context**
   - Read story file and extract acceptance criteria
   - Get changed files from git
   - Load project guidelines (CLAUDE.md)

2. **Run Required Checks**
   - Tests, type checking, linting

3. **Spawn Specialist Sub-Agents** (parallel)
   - Requirements Traceability (AC → tests mapping)
   - Code Quality (patterns, refactoring)
   - Security (OWASP, CWE)
   - Performance (N+1, re-renders)
   - Accessibility (WCAG 2.1 AA)
   - Test Coverage (gaps, quality)
   - Technical Debt (shortcuts, TODOs)

4. **Aggregate Findings**
   - Combine all specialist findings
   - Deduplicate and sort by severity

5. **Run QA Gate**
   - Calls `/qa-gate` to produce gate decision
   - Creates gate file at `docs/qa/gates/{story}-{slug}.yml`

6. **Update Story File**
   - Appends review results to QA Results section

## Options

Pass options through to the skill:

```bash
# Quick review (skip deep specialists)
/review 3.1.5 --quick

# Review with auto-fix enabled
/review 3.1.5 --fix

# Skip gate decision (findings only)
/review 3.1.5 --no-gate
```

## Output

- Story file updated with QA Results section
- Gate file created at `docs/qa/gates/{story}-{slug}.yml`
- Comprehensive findings report to user

## Related

- `/qa-gate` - Standalone gate decision without full review
- `/implement` - Calls `/review` as part of implementation workflow
