# Patch Queue Pattern

**Version**: 1.0.0
**Story**: WINT-0190
**Status**: Active
**See also**: [repair-loop-pattern.md](./repair-loop-pattern.md)

---

## Overview

A Patch Queue is an ordered sequence of atomic patch steps, each scoped to a single architectural layer. It prevents mega-patches — commits that mix UI, API, schema, and tests changes — which cause review fatigue and cascading repair loops.

---

## Decision Rule

**Use the Patch Queue pattern when any implementation touches more than one architectural layer or more than one concern.**

Layers (in required ordering convention):
1. `types_schema` — Zod schemas, JSON schemas, type definitions
2. `api` — Lambda handlers, API routes, response shapes
3. `ui` — React components, hooks, pages
4. `tests` — Unit, integration, E2E tests
5. `cleanup` — Remove deprecated code, dead imports, stale utilities

If a story touches only a single layer and a single concern, a single unstructured patch is acceptable. Otherwise, structure work as a `patch-plan.json` with ordered steps.

---

## Default Limits and Rationale

| Limit | Value | Rationale |
|-------|-------|-----------|
| `max_files` per step | 10 | One feature surface. A single schema change, handler, or component should not require more than 10 files. If it does, the patch step is too broad. |
| `max_diff_lines` per step | 300 | Reviewable in one sitting (~15 min review). Beyond 300 lines, reviewers miss errors and verification failures become hard to attribute. |
| `patches` array `maxItems` | 10 | A story with more than 10 patch steps should be split into multiple stories. |

---

## AJV Validation

Validate your `patch-plan.json` against the schema before committing:

```bash
# Validate your patch plan against the schema
npx ajv validate \
  -s packages/backend/orchestrator/src/schemas/patch-plan.schema.json \
  -d path/to/your/patch-plan.json
```

Schema path: `packages/backend/orchestrator/src/schemas/patch-plan.schema.json`

---

## Examples

### Positive Example 1: Correctly ordered 3-step patch plan

```json
{
  "schema_version": "1.0.0",
  "patches": [
    {
      "patch_type": "types_schema",
      "description": "Add UserPreferences Zod schema",
      "max_files": 2, "max_diff_lines": 40,
      "verification_command": "pnpm check-types"
    },
    {
      "patch_type": "api",
      "description": "Add GET /user/preferences endpoint",
      "max_files": 3, "max_diff_lines": 80,
      "verification_command": "pnpm build"
    },
    {
      "patch_type": "tests",
      "description": "Unit tests for preferences handler",
      "max_files": 2, "max_diff_lines": 60,
      "verification_command": "pnpm test"
    }
  ]
}
```

Why this is correct: Each step is scoped to one layer. Types come before API. Tests come last.

### Positive Example 2: Repair loop correctly scoped to referenced errors

```json
{
  "patch_type": "types_schema",
  "description": "Add OrderStatus enum",
  "max_files": 1,
  "max_diff_lines": 20,
  "verification_command": "pnpm check-types",
  "repair_loop": {
    "fix_only_referenced_errors": true,
    "max_iterations": 3,
    "rerun_command": "pnpm check-types"
  }
}
```

Why this is correct: `fix_only_referenced_errors: true` means the agent reads the TypeScript error output, identifies the specific lines cited, and fixes only those — no opportunistic refactoring of surrounding code.

### Negative Example: Mega-patch violating ordering and limits

```json
{
  "schema_version": "1.0.0",
  "patches": [
    {
      "patch_type": "ui",
      "description": "Add user preferences feature",
      "max_files": 25,
      "max_diff_lines": 900
    }
  ]
}
```

Why this is wrong: (1) A single `ui` step cannot cover schema, API, and test changes — those are separate layers. (2) `max_files: 25` exceeds the `maximum: 10` constraint in the schema. (3) `max_diff_lines: 900` exceeds the `maximum: 300` constraint. (4) No verification command means failures are silent. This patch would fail AJV validation.

---

## WINT-0210 Compatibility Note

- Schema path: `packages/backend/orchestrator/src/schemas/patch-plan.schema.json` (exact path WINT-0210 Dev role pack references)
- Example file: `packages/backend/orchestrator/src/schemas/examples/patch-plan.example.json` (10-25 lines, demonstrates `types_schema → api → ui → tests → cleanup` ordering per WINT-0210 AC-7)
- Runtime enforcement of ordering: WINT-3010 scope (not enforced by JSON Schema — ordering is a documented convention only)

---

## Cross-Reference

When a `verification_command` fails and the agent enters repair mode, see [repair-loop-pattern.md](./repair-loop-pattern.md) for the full Repair Loop protocol.
