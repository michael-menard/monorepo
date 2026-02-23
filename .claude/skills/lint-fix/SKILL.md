---
name: lint-fix
description: Run ESLint with --fix across the repo (or a scope), capture errors that could not be auto-fixed, group them by rule, and surface config improvement opportunities. Use this skill instead of running pnpm lint directly.
---

# /lint-fix — Lint, Fix, and Capture

## Description

Runs ESLint with auto-fix across the monorepo, then captures every error that could **not** be resolved automatically. Errors are grouped by rule name and frequency so that patterns are visible. When a rule fires enough times, the skill flags it as a **config update candidate** with a concrete recommendation.

This skill is the canonical way for agents to run lint. Never call `pnpm lint` or `pnpm turbo run lint` directly — always go through `/lint-fix` so the learning loop stays intact.

## Usage

```bash
# Full repo
/lint-fix

# Single package
/lint-fix --scope=@repo/gallery

# Multiple packages
/lint-fix --scope=@repo/gallery,@repo/api-client

# Run without auto-fix (audit only — shows what would fail)
/lint-fix --dry-run

# Save a persistent report file
/lint-fix --report
```

## Parameters

- **--scope** - Comma-separated package names (e.g. `@repo/gallery`). Omit for full repo.
- **--dry-run** - Skip `--fix`; report errors without modifying files.
- **--report** - Write findings to `.claude/lint-reports/YYYY-MM-DD.md` in addition to terminal output.

---

## EXECUTION INSTRUCTIONS

### Phase 1: Build the lint command

```
IF --scope provided:
  filters = "--scope=@repo/pkg1 --scope=@repo/pkg2 ..."  (one --scope per package)
  cmd = "pnpm turbo run lint --force --continue {filters} 2>&1"
ELSE:
  cmd = "pnpm turbo run lint --force --continue 2>&1"

IF --dry-run:
  Note: packages without --fix in their lint script will already run without fix.
  For packages that DO have --fix, temporarily advise the user that dry-run mode
  cannot suppress --fix in individual package scripts — audit by reading the
  output errors only, do not interpret auto-fixed issues as failures.
```

### Phase 2: Run the linter and capture output

Run the command via Bash. Capture the full output — it may be large.

Key output signals to extract:

```
FAILURE LINE:   "@repo/pkg:lint:   15:3  error  <message>  <rule-name>"
SUCCESS LINE:   " Tasks:    N successful, N total"
FAILED PKGS:    " Failed:    @repo/pkg1#lint, @repo/pkg2#lint"
```

**Regex for error lines** (applied per line):
```
^\s*\d+:\d+\s+(error|warning)\s+(.+?)\s{2,}(\S+)\s*$
                                  ^message   ^rule-name
```

The **rule name** is the final whitespace-separated token on each error/warning line.
Common rule names: `@typescript-eslint/no-unused-vars`, `import/order`, `no-console`,
`prettier/prettier`, `jsx-a11y/click-events-have-key-events`, `import/no-duplicates`, etc.

### Phase 3: Parse and group errors

Build two maps from the captured output:

**By rule** (sorted descending by count):
```
rule_name → { count, severity, example_files: [up to 3 paths] }
```

**By package** (sorted descending by error count):
```
package_name → { errors, warnings }
```

Extract from the output:
- Total packages run
- Total packages that succeeded
- Total packages that failed (names)
- Total error count
- Total warning count

### Phase 4: Identify config update candidates

For each rule in the by-rule map, apply this decision table:

| Condition | Candidate type | Suggested action |
|-----------|---------------|-----------------|
| `@typescript-eslint/no-unused-vars` fires AND variable names start with `_` | False positive | Confirm `varsIgnorePattern: '^_'` is set in `eslint.config.js` |
| `no-console` fires in `apps/api/**` or `scripts/**` | Wrong scope | Check Node.js backend override has `'no-console': 'off'` |
| `import/order` fires ≥ 5 times in same file | Structural | File uses mid-file imports by design — add `/* eslint-disable import/order */` at top |
| `import/no-duplicates` fires ≥ 3 times | Structural | Consolidate imports from the same module |
| `prettier/prettier` fires ≥ 5 times in a package | Missing --fix | Ensure that package's lint script includes `--fix` |
| Any rule fires ≥ 10 times across ≥ 3 packages | Global pattern | Consider rule config change in root `eslint.config.js` |
| Any rule fires ≥ 3 times in test/script files | Wrong scope | May need a new file-glob override block in `eslint.config.js` |
| `no-constant-condition` fires in loop context | False positive | Add `{ checkLoops: false }` to rule config for backend |
| `jsx-a11y/*` fires on a single element repeatedly | Presentational | Element likely needs `role="presentation"` + matching keyboard handler |

**Threshold for "high value"**: any rule with ≥ 3 occurrences is worth reporting.

### Phase 5: Attempt manual fixes for remaining errors

For each remaining error that is NOT a config-update candidate:

1. **Read the file** at the reported path and line.
2. Apply the minimal fix:
   - `no-unused-vars`: prefix with `_` or remove if clearly dead code
   - `no-console`: replace with `logger.info/warn/error` (import `@repo/logger` if missing)
   - `no-case-declarations`: wrap case body in `{ }` braces
   - `no-useless-escape`: remove the unnecessary backslash
   - `import/no-relative-parent-imports` in non-domain code: restructure import
   - `jsx-a11y/click-events-have-key-events`: add `onKeyDown` matching the `onClick`
   - `jsx-a11y/no-static-element-interactions`: add `role="presentation"` if element is decorative
3. If the fix is unclear or risky, **skip and note in report** rather than guessing.
4. After all manual fixes, re-run the affected packages to confirm they pass:
   ```
   pnpm turbo run lint --force --continue --scope=@repo/affected-pkg 2>&1
   ```

### Phase 6: Output report

Always print to terminal. If `--report` flag provided, also write to
`.claude/lint-reports/YYYY-MM-DD.md` (create directory if needed).

#### Terminal format

```
═══════════════════════════════════════════════════════
  /lint-fix Report — {date}
═══════════════════════════════════════════════════════

Result: {PASS | FAIL}
Packages: {N passed} / {N total}  ({N failed})
Errors:   {N}   Warnings: {N}

{If PASS:}
✓ All packages lint clean.

{If FAIL:}
── Errors by Rule ──────────────────────────────────────

  {count}×  {rule-name}
             Files: {file1}, {file2}, ...
  {count}×  {rule-name}
             Files: ...
  ...

── Packages with Errors ────────────────────────────────

  @repo/pkg1    {E} errors  {W} warnings
  @repo/pkg2    {E} errors
  ...

── Config Update Candidates ────────────────────────────

  {If any candidates found:}
  CANDIDATE [{rule}] — {count} occurrences
    Reason:     {why this is a candidate}
    Suggestion: {concrete change to eslint.config.js or package.json}
    Example:    {code snippet of the suggested change}

  {If no candidates:}
  None — no patterns detected above threshold.

── Manual Fixes Applied ────────────────────────────────

  {list of files edited and what was changed}
  {or "None" if nothing was fixable}

── Still Failing ───────────────────────────────────────

  {files/lines still erroring with rule name and brief reason why not auto-fixed}
  {or "None — all errors resolved."}

═══════════════════════════════════════════════════════
```

#### Persistent report format (if --report)

Write to `.claude/lint-reports/YYYY-MM-DD.md`:

```markdown
# Lint Report — {YYYY-MM-DD}

**Result:** PASS | FAIL
**Packages:** {N passed} / {N total}
**Errors:** {N} | **Warnings:** {N}
**Scope:** full repo | {package list}

## Errors by Rule

| Rule | Count | Example Files |
|------|-------|---------------|
| `rule-name` | N | file1, file2 |

## Packages with Errors

| Package | Errors | Warnings |
|---------|--------|----------|
| @repo/pkg | N | N |

## Config Update Candidates

### {rule-name} — {count} occurrences

- **Reason:** {explanation}
- **Suggested change:**
  ```js
  // eslint.config.js — {location of change}
  '{rule}': ['error', { ... }]
  ```

## Manual Fixes Applied

{bulleted list or "None"}

## Still Failing

{bulleted list or "None — all errors resolved."}
```

---

## Integration Notes

- This skill is the **single entry point for all linting**. Workflow skills (`/dev-implement-story`, `/dev-fix-story`, `/qa-verify-story`, etc.) should call `/lint-fix` rather than `pnpm lint` directly.
- The config update candidates section feeds directly into `eslint.config.js` improvements. When the same candidate appears across multiple report runs, that is strong signal to update the config permanently.
- Use `--report` in CI-adjacent workflows so reports accumulate over time. Review `.claude/lint-reports/` periodically to spot recurring patterns.

## Config files to check when updating

| File | What to update |
|------|---------------|
| `eslint.config.js` | Rule configs, ignore patterns, file-glob overrides |
| `packages/*/package.json` | Add `--fix` flag to `lint` script |
| `CLAUDE.md` Common Pitfalls | Document new conventions |
