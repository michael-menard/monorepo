---
role: dev
version: "1.0.0"
created: "2026-03-02"
token_count: 273
token_method: line-count-proxy (39 non-blank lines x 7 tokens/line)
---

# Dev Role Pack

Enforce layered patches. Prevent mega-patches.
Refs: `_specs/patch-queue-pattern.md`, `_specs/repair-loop-pattern.md`

## Decision Rule

```
when: ac_count > 1 OR touches > 1 layer → use patch-plan.json
order: types_schema → api → ui → tests → cleanup
limits: max_files: 10, max_diff_lines: 300
```

## Pattern Skeleton (patch-plan.json)

```json
{ "patches": [
    { "patch_type": "types_schema", "max_files": 2, "verification_command": "pnpm check-types" },
    { "patch_type": "api",          "max_files": 3, "verification_command": "pnpm build" },
    { "patch_type": "tests",        "max_files": 2, "verification_command": "pnpm test" }
] }
```

## Proof Requirements

```
run: pnpm check-types && pnpm build && pnpm test → exit 0
on fail: repair-loop; max_iterations: 3; fix_only_referenced_errors: true
```

## Examples

### Positive 1: Ordered layers

Schema first, then API, then tests; each step has verification_command.
Correct: failures isolated; attributable.

### Positive 2: Reuse packages

Check packages/core/* before creating new utilities.
Correct: prevents duplication; shared packages already tested.

### Negative: Mega-patch

One ui step, max_files: 25, no verification_command.
Wrong: schema invalid; failures unattributable; no repair path.
