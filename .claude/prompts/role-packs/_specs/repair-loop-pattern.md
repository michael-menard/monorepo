# Repair Loop Pattern

**Version**: 1.0.0
**Story**: WINT-0190
**Status**: Active
**See also**: [patch-queue-pattern.md](./patch-queue-pattern.md)

---

## Overview

The Repair Loop is a bounded, error-scoped fix cycle that activates when a patch step's `verification_command` fails. It ensures agents fix only what is broken — not surrounding code — and stop after a configurable number of iterations.

---

## Activation Trigger

The Repair Loop activates when a patch step's `verification_command` fails (non-zero exit code). Without a `repair_loop` configuration on the patch step, the agent must stop and escalate. With a `repair_loop` configured, the agent may proceed through the repair cycle.

---

## Protocol

### Step 1: Read tool output

Read the full output of the failed `verification_command`. Identify:
- Specific error codes (e.g., `TS2345`, `ESLint no-unused-vars`)
- Specific file paths and line numbers cited in the output

### Step 2: Fix only referenced errors (`fix_only_referenced_errors: true`)

**Constraint**: When `fix_only_referenced_errors` is `true`, the agent may ONLY modify:
- The exact lines cited in the error output
- Files explicitly named in the error output

The agent must NOT:
- Refactor surrounding functions not cited in the error
- Rename variables beyond the scope of the error
- Add new abstractions while in repair mode
- Touch files not mentioned in the error output

**Rationale**: Opportunistic cleanup during repair cascades into new failures, making root causes impossible to isolate.

### Step 3: Minimal changes requirement

Make the smallest possible change that resolves the cited error. If fixing the error requires a design change larger than the current `max_diff_lines` budget, stop and escalate rather than expanding the patch scope.

### Step 4: Rerun until green (`rerun_command`)

After each fix, run the `rerun_command` (e.g., `pnpm check-types`). This command should be identical to or a subset of the original `verification_command`.

### Step 5: Respect `max_iterations` guardrail

If the `rerun_command` still fails after `max_iterations` attempts, **stop and escalate**. Do not continue the repair loop. Log the final error output for human review.

---

## Examples

### Positive Example 1: Repair loop with bounded iterations

```json
{
  "patch_type": "types_schema",
  "description": "Add InstructionSet Zod schema",
  "max_files": 2,
  "max_diff_lines": 60,
  "verification_command": "pnpm check-types",
  "repair_loop": {
    "fix_only_referenced_errors": true,
    "max_iterations": 3,
    "rerun_command": "pnpm check-types"
  }
}
```

The agent runs `pnpm check-types`, sees `TS2345` on line 42 of `instruction-set.schema.ts`, fixes only that line, reruns. Stops after 3 attempts if still failing.

### Positive Example 2: Escalation after max_iterations reached

```
Iteration 1: pnpm check-types → FAIL (TS2345 on line 42)
  Fix: corrected return type on line 42
Iteration 2: pnpm check-types → FAIL (TS2322 on line 58)
  Fix: corrected argument type on line 58
Iteration 3: pnpm check-types → FAIL (TS2339 on line 71)
  Fix: added missing property on line 71
Iteration 4: max_iterations (3) reached → ESCALATE
  Action: Stop, report final error output to human reviewer
```

Why this is correct: The agent respected the `max_iterations: 3` guardrail and escalated rather than continuing indefinitely.

### Negative Example: Opportunistic refactoring during repair mode

```
verification_command fails: TS2345 on UserProfile.tsx line 18

WRONG agent behavior:
- Fixes line 18 (correct)
- Notices UserProfile.tsx has inconsistent prop types → refactors entire component
- Renames props across 4 files for consistency
- Adds new type guard utility while "in the area"
- pnpm check-types now fails on 3 new errors introduced by refactor
```

Why this is wrong: The agent violated `fix_only_referenced_errors: true`. The original error was one line; the repair introduced new failures. Repair loops must be surgical, not opportunistic.

---

## Cross-Reference

The Repair Loop is configured per-step in a Patch Queue. See [patch-queue-pattern.md](./patch-queue-pattern.md) for how `repair_loop` fits into the full `PatchStep` structure and when to use the Patch Queue pattern.
