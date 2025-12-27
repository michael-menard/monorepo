<!-- Powered by BMAD™ Core -->

# qa-gate

Create or update a quality gate decision file for a story.

## Description

This task delegates to the `/qa-gate` Claude Code skill, which runs quality checks and produces a persistent YAML gate file.

## Usage

```bash
# Via BMAD agent
@qa *gate 3.1.5

# Direct skill invocation
/qa-gate 3.1.5
```

## Execution

**Invoke the `/qa-gate` skill with the story number:**

```
Skill(
  skill: "qa-gate",
  args: "{story_id}"
)
```

The `/qa-gate` skill will:

1. **Run Required Checks**
   - Tests: `pnpm test`
   - Types: `pnpm check-types`
   - Lint: `pnpm lint`

2. **Run Specialist Reviews** (if `--deep` flag)
   - Security specialist
   - Performance specialist
   - Accessibility specialist

3. **Determine Gate Decision**
   - PASS: No issues or only low severity
   - CONCERNS: Medium severity issues
   - FAIL: High severity issues or check failures
   - WAIVED: Explicitly accepted with approval

4. **Create Gate File**
   - Location: `docs/qa/gates/{story}-{slug}.yml`
   - Schema: Standardized YAML with findings

5. **Update Story File**
   - Appends gate reference to QA Results section

## Options

```bash
# Full gate with specialist reviews
/qa-gate 3.1.5 --deep

# Specific specialists only
/qa-gate 3.1.5 --security --performance

# Waive known issues
/qa-gate 3.1.5 --waive --reason "MVP release" --approved-by "Tech Lead"

# Preview without persisting
/qa-gate 3.1.5 --dry-run
```

## Gate File Schema

```yaml
schema: 1
story: "3.1.5"
story_title: "Story Title"
gate: PASS|CONCERNS|FAIL|WAIVED
status_reason: "1-2 sentence explanation"
reviewer: "Claude Code"
updated: "2025-01-15T10:30:00Z"

waiver:
  active: false
  reason: ""
  approved_by: ""

top_issues:
  - id: "SEC-001"
    severity: high
    finding: "Description"
    suggested_action: "How to fix"
    file: "src/auth.ts"

nfr_validation:
  security: { status: PASS, issue_count: 0 }
  performance: { status: PASS, issue_count: 0 }
  accessibility: { status: PASS, issue_count: 0 }
  tests: { status: PASS, details: "" }
  types: { status: PASS, details: "" }
  lint: { status: PASS, details: "" }

risk_summary:
  totals: { high: 0, medium: 0, low: 0 }
  recommendations:
    must_fix: []
    should_fix: []
```

## Severity Scale

**Fixed values - no variations:**

| Severity | Description |
|----------|-------------|
| `high` | Critical, should block |
| `medium` | Should fix soon |
| `low` | Fix when convenient |

## Issue ID Prefixes

| Prefix | Category |
|--------|----------|
| SEC- | Security |
| PERF- | Performance |
| A11Y- | Accessibility |
| TEST- | Testing gaps |
| REL- | Reliability |
| MNT- | Maintainability |
| ARCH- | Architecture |
| DOC- | Documentation |
| REQ- | Requirements |

## Related

- `/review` - Full review with all specialists (calls `/qa-gate` at end)
- `/implement` - Calls `/qa-gate` as part of implementation workflow
