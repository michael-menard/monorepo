---
name: review
description: Comprehensive code review with parallel specialist sub-agents. Analyzes requirements traceability, code quality, security, performance, accessibility, test coverage, and technical debt. Produces detailed findings and calls /qa-gate for final gate decision.
---

# /review - Comprehensive Code Review

## Description

Full-spectrum code review using parallel specialist sub-agents. Each specialist analyzes a specific dimension, findings are aggregated, and `/qa-gate` produces the final gate decision.

**Key Features:**
- Parallel specialist sub-agents for thorough analysis
- Requirements traceability (AC → tests mapping)
- Active refactoring when safe
- Technical debt identification
- Holistic findings aggregation
- Automatic gate decision via `/qa-gate`

## Usage

```bash
# Review a story
/review 3.1.5

# Review current branch (no story)
/review --branch

# Quick review (skip deep specialists)
/review 3.1.5 --quick

# Review with auto-fix enabled
/review 3.1.5 --fix

# Review specific files only
/review --files src/auth/**/*.ts

# Skip gate decision (findings only)
/review 3.1.5 --no-gate
```

## Parameters

- **story** - Story number (e.g., `3.1.5`) or omit for branch review
- **--branch** - Review current branch without story reference
- **--quick** - Run only required checks, skip deep specialists
- **--fix** - Auto-fix issues when safe (refactoring)
- **--files** - Review specific files only
- **--no-gate** - Skip `/qa-gate` call, return findings only

---

## EXECUTION INSTRUCTIONS

**CRITICAL: Use Task tool to spawn parallel sub-agents. Use TodoWrite to track progress.**

---

## Phase 0: Initialize & Gather Context

```
TodoWrite([
  { content: "Gather review context", status: "in_progress", activeForm: "Gathering context" },
  { content: "Run required checks", status: "pending", activeForm: "Running checks" },
  { content: "Spawn specialist sub-agents", status: "pending", activeForm: "Spawning specialists" },
  { content: "Aggregate findings", status: "pending", activeForm: "Aggregating findings" },
  { content: "Run qa-gate", status: "pending", activeForm: "Running qa-gate" },
  { content: "Update story file", status: "pending", activeForm: "Updating story" }
])
```

**Gather context:**
1. If story provided, read story file and extract:
   - Acceptance criteria
   - Tasks list
   - File list (if present)
   - Previous QA results
2. Get list of changed files: `git diff --name-only origin/main`
3. Read CLAUDE.md for project guidelines
4. Determine review scope (files to analyze)

**Risk assessment (determines review depth):**
Auto-escalate to deep review if:
- Auth/payment/security files touched
- No tests added
- Diff > 500 lines
- Previous gate was FAIL or CONCERNS
- Story has > 5 acceptance criteria

---

## Phase 1: Required Checks

**Run these first (blocking if they fail):**

```bash
pnpm test --filter='...[origin/main]'
pnpm check-types --filter='...[origin/main]'
pnpm lint --filter='...[origin/main]'
```

**If any fail and --fix is set:**
- Try to auto-fix lint issues: `pnpm lint --fix`
- Re-run checks

**If still failing:** Report and continue (will affect gate decision)

---

## Phase 2: Spawn Specialist Sub-Agents

**CRITICAL: Spawn all specialists in parallel using run_in_background: true**

### 2.1 Requirements Traceability Specialist

```
Task(
  subagent_type: "general-purpose",
  model: "haiku",
  description: "Requirements traceability",
  run_in_background: true,
  prompt: "You are a requirements traceability specialist.

           Story file: {STORY_FILE_PATH}
           Changed files: {CHANGED_FILES}

           For each acceptance criterion in the story:
           1. Find the test(s) that validate it
           2. Document the mapping using Given-When-Then format
           3. Identify any AC without test coverage

           Output format:
           ```yaml
           traceability:
             covered:
               - ac: 1
                 test_file: src/__tests__/auth.test.ts
                 test_name: 'should validate login credentials'
                 given_when_then: 'Given valid credentials, When login called, Then returns token'
             gaps:
               - ac: 3
                 description: 'No test for session timeout handling'
                 severity: medium
                 suggested_test: 'Add test for session expiry behavior'
           ```"
)
```

### 2.2 Code Quality Specialist

```
Task(
  subagent_type: "general-purpose",
  model: "haiku",
  description: "Code quality review",
  run_in_background: true,
  prompt: "You are a code quality specialist.

           Project guidelines: {CLAUDE_MD_CONTENT}
           Changed files: {CHANGED_FILES}

           Analyze for:
           1. Architecture and design patterns
           2. Code duplication
           3. Refactoring opportunities
           4. Best practices adherence
           5. CLAUDE.md compliance (Zod schemas, @repo/ui, @repo/logger, no barrel files)

           For each finding:
           - id: QUAL-{NNN}
           - severity: low|medium|high
           - finding: Description
           - file: File path
           - line: Line number
           - suggested_action: How to fix
           - can_auto_fix: true|false

           Return as YAML."
)
```

### 2.3 Security Specialist

```
Task(
  subagent_type: "general-purpose",
  model: "haiku",
  description: "Security review",
  run_in_background: true,
  prompt: "You are a security specialist.

           Changed files: {CHANGED_FILES}

           Check for:
           - Authentication/authorization issues
           - Injection vulnerabilities (SQL, XSS, command)
           - Sensitive data exposure
           - OWASP Top 10 issues
           - Hardcoded secrets or credentials
           - Insecure dependencies

           For each finding:
           - id: SEC-{NNN}
           - severity: low|medium|high
           - finding: Description
           - file: File path
           - line: Line number
           - cwe: CWE reference if applicable
           - suggested_action: How to fix

           Return as YAML."
)
```

### 2.4 Performance Specialist

```
Task(
  subagent_type: "general-purpose",
  model: "haiku",
  description: "Performance review",
  run_in_background: true,
  prompt: "You are a performance specialist.

           Changed files: {CHANGED_FILES}

           Check for:
           - N+1 query patterns
           - Missing database indexes
           - Unnecessary re-renders in React
           - Large bundle imports
           - Missing memoization (useMemo, useCallback, React.memo)
           - Inefficient algorithms
           - Memory leaks

           For each finding:
           - id: PERF-{NNN}
           - severity: low|medium|high
           - finding: Description
           - file: File path
           - estimated_impact: Description of performance impact
           - suggested_action: How to fix

           Return as YAML."
)
```

### 2.5 Accessibility Specialist

```
Task(
  subagent_type: "general-purpose",
  model: "haiku",
  description: "Accessibility review",
  run_in_background: true,
  prompt: "You are an accessibility specialist.

           Changed files: {CHANGED_FILES}

           Check for:
           - WCAG 2.1 AA compliance
           - Keyboard navigation support
           - Screen reader compatibility
           - Missing ARIA labels/roles
           - Color contrast issues
           - Focus management
           - Form labels and error messages

           For each finding:
           - id: A11Y-{NNN}
           - severity: low|medium|high
           - finding: Description
           - file: File path
           - wcag_criterion: WCAG reference (e.g., 1.4.3)
           - suggested_action: How to fix

           Return as YAML."
)
```

### 2.6 Test Coverage Specialist

```
Task(
  subagent_type: "general-purpose",
  model: "haiku",
  description: "Test coverage analysis",
  run_in_background: true,
  prompt: "You are a test coverage specialist.

           Changed files: {CHANGED_FILES}
           Test files: {TEST_FILES}

           Analyze:
           1. Test coverage for changed code
           2. Test quality and maintainability
           3. Edge cases and error scenarios
           4. Mock/stub appropriateness
           5. Test level appropriateness (unit vs integration vs e2e)

           For each finding:
           - id: TEST-{NNN}
           - severity: low|medium|high
           - finding: Description
           - file: File being tested (or missing tests)
           - suggested_action: What tests to add/improve

           Return as YAML."
)
```

### 2.7 Technical Debt Specialist

```
Task(
  subagent_type: "general-purpose",
  model: "haiku",
  description: "Technical debt assessment",
  run_in_background: true,
  prompt: "You are a technical debt specialist.

           Changed files: {CHANGED_FILES}

           Identify:
           1. Accumulated shortcuts or TODOs
           2. Missing tests
           3. Outdated patterns or dependencies
           4. Architecture violations
           5. Code that should be refactored
           6. Documentation gaps

           For each finding:
           - id: DEBT-{NNN}
           - severity: low|medium|high
           - finding: Description
           - file: File path
           - estimated_effort: small|medium|large
           - suggested_action: How to address

           Return as YAML."
)
```

---

## Phase 3: Collect Results

**Wait for all specialists to complete:**

```
results = {
  traceability: TaskOutput(task_id: "{traceability_id}"),
  code_quality: TaskOutput(task_id: "{quality_id}"),
  security: TaskOutput(task_id: "{security_id}"),
  performance: TaskOutput(task_id: "{performance_id}"),
  accessibility: TaskOutput(task_id: "{accessibility_id}"),
  test_coverage: TaskOutput(task_id: "{coverage_id}"),
  technical_debt: TaskOutput(task_id: "{debt_id}")
}
```

---

## Phase 4: Aggregate Findings

**Combine all findings into unified structure:**

```yaml
review_summary:
  story: "{STORY_NUM}"
  reviewed_at: "{ISO-8601}"
  files_analyzed: {count}

  checks:
    tests: { status: PASS|FAIL }
    types: { status: PASS|FAIL }
    lint: { status: PASS|FAIL }

  findings:
    total: {count}
    by_severity:
      high: {count}
      medium: {count}
      low: {count}
    by_category:
      security: {count}
      performance: {count}
      accessibility: {count}
      code_quality: {count}
      test_coverage: {count}
      technical_debt: {count}
      requirements: {count}

  traceability:
    ac_total: {count}
    ac_covered: {count}
    ac_gaps: {count}

  all_findings:
    - id: SEC-001
      category: security
      severity: high
      finding: "..."
      file: "..."
      suggested_action: "..."
    # ... all findings sorted by severity
```

**Deduplicate findings:**
- Merge similar findings from different specialists
- Keep highest severity when duplicated

---

## Phase 5: Auto-Fix (if --fix enabled)

**For findings with can_auto_fix: true:**

```
Task(
  subagent_type: "general-purpose",
  description: "Apply safe refactoring",
  prompt: "Apply these safe fixes:

           {FIXABLE_FINDINGS}

           Project guidelines: {CLAUDE_MD_CONTENT}

           For each fix:
           1. Make the change
           2. Run tests to verify
           3. Commit with message: 'refactor: {description}'

           Report what was fixed and what was skipped."
)
```

**Re-run required checks after fixes.**

---

## Phase 6: Run QA Gate

**Unless --no-gate specified:**

```
Invoke /qa-gate skill with:
- Story number (if provided)
- Aggregated findings
- Check results

The /qa-gate skill will:
- Determine gate decision (PASS/CONCERNS/FAIL)
- Create gate file at docs/qa/gates/{story}-{slug}.yml
- Return gate status
```

---

## Phase 7: Update Story File

**If story provided, update QA Results section:**

```markdown
## QA Results

### Review Date: {DATE}

### Reviewed By: Claude Code

### Summary

- **Files Analyzed:** {count}
- **Total Findings:** {count} (high: {N}, medium: {N}, low: {N})
- **Traceability:** {N}/{M} acceptance criteria have test coverage

### Required Checks

| Check | Status |
|-------|--------|
| Tests | {PASS/FAIL} |
| Types | {PASS/FAIL} |
| Lint  | {PASS/FAIL} |

### Specialist Findings

| Category | Findings | High | Medium | Low |
|----------|----------|------|--------|-----|
| Security | {N} | {N} | {N} | {N} |
| Performance | {N} | {N} | {N} | {N} |
| Accessibility | {N} | {N} | {N} | {N} |
| Code Quality | {N} | {N} | {N} | {N} |
| Test Coverage | {N} | {N} | {N} | {N} |
| Technical Debt | {N} | {N} | {N} | {N} |

### Top Issues

{List top 5-10 issues by severity}

1. **[SEC-001] high:** {finding}
   - File: {file}
   - Action: {suggested_action}

### Traceability Gaps

{List any AC without test coverage}

- **AC {N}:** {description} - {suggested_test}

### Refactoring Applied

{If --fix was used, list changes made}

- **{file}:** {what was changed and why}

### Gate Status

Gate: {PASS|CONCERNS|FAIL} → docs/qa/gates/{story}-{slug}.yml

### Recommended Status

{✓ Ready for Done} or {✗ Changes Required}
```

---

## Phase 8: Report to User

```
═══════════════════════════════════════════════════════════════════
  Code Review Complete: {STORY_NUM} - {STORY_TITLE}
═══════════════════════════════════════════════════════════════════

Files Analyzed: {N}
Time Taken: {duration}

REQUIRED CHECKS
  Tests:    {PASS|FAIL}
  Types:    {PASS|FAIL}
  Lint:     {PASS|FAIL}

SPECIALIST FINDINGS ({total} total)
  Security:       {N} issues ({high}H {medium}M {low}L)
  Performance:    {N} issues ({high}H {medium}M {low}L)
  Accessibility:  {N} issues ({high}H {medium}M {low}L)
  Code Quality:   {N} issues ({high}H {medium}M {low}L)
  Test Coverage:  {N} issues ({high}H {medium}M {low}L)
  Technical Debt: {N} issues ({high}H {medium}M {low}L)

REQUIREMENTS TRACEABILITY
  {covered}/{total} acceptance criteria have test coverage
  {gaps} gaps identified

TOP ISSUES
  1. [SEC-001] high: {finding}
  2. [PERF-001] medium: {finding}
  ...

{If --fix was used:}
REFACTORING APPLIED
  - {file}: {change}
  ...

GATE DECISION
  Status: {PASS|CONCERNS|FAIL}
  Gate File: docs/qa/gates/{story}-{slug}.yml

{If FAIL:}
RECOMMENDATION: Address high-severity issues before proceeding.

{If CONCERNS:}
RECOMMENDATION: Review medium-severity issues and proceed with awareness.

{If PASS:}
RECOMMENDATION: Ready for merge.

═══════════════════════════════════════════════════════════════════
```

---

## Sub-Agent Architecture

```
Main Orchestrator (/review)
    │
    ├─▶ Context Gathering (inline)
    │
    ├─▶ Required Checks (inline)
    │   ├── pnpm test
    │   ├── pnpm check-types
    │   └── pnpm lint
    │
    ├─▶ Specialist Sub-Agents (parallel, haiku)
    │   ├── Requirements Traceability
    │   ├── Code Quality
    │   ├── Security
    │   ├── Performance
    │   ├── Accessibility
    │   ├── Test Coverage
    │   └── Technical Debt
    │
    ├─▶ Aggregation (inline)
    │
    ├─▶ Auto-Fix (optional, general-purpose)
    │
    └─▶ /qa-gate (produces gate file)
```

---

## Issue ID Prefixes

| Prefix | Specialist |
|--------|------------|
| SEC- | Security |
| PERF- | Performance |
| A11Y- | Accessibility |
| QUAL- | Code Quality |
| TEST- | Test Coverage |
| DEBT- | Technical Debt |
| REQ- | Requirements Traceability |

---

## When to Use

### /review (comprehensive)
- Pre-merge reviews
- Story completion reviews
- Major feature reviews
- Security-sensitive changes

### /review --quick
- Small changes
- Documentation updates
- Minor fixes

### /qa-gate (standalone)
- Quick pass/fail decision
- CI/CD integration
- Automated checks only
