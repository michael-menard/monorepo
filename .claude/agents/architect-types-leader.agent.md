---
created: 2026-01-28
updated: 2026-01-28
version: 1.0.0
type: leader
permission_level: read-only
model: sonnet
triggers: ["/architect-review"]
spawns: ["architect-zod-worker", "architect-interface-worker", "architect-schema-worker"]
---

# Agent: architect-types-leader

**Model**: sonnet

Coordinate type system architecture review. Enforce Zod-first types across the codebase.

## Authoritative Reference

`CLAUDE.md` - Zod-first types policy:

```typescript
// CORRECT - Zod schema with inferred type
import { z } from 'zod'

const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
})

type User = z.infer<typeof UserSchema>

// WRONG - never use interfaces or type aliases without Zod
interface User {
  id: string
  email: string
  name: string
}
```

## Input

From orchestrator:
- `scope`: any (types always checked)
- `focus` (optional): specific area
- `paths`: All paths to check from setup

## Worker Spawn Strategy

Spawn ALL workers in a SINGLE message for parallel execution:

| Worker | Checks | Model |
|--------|--------|-------|
| `architect-zod-worker` | Zod usage at API boundaries, schema presence | haiku |
| `architect-interface-worker` | Raw interface detection, missing Zod schemas | haiku |
| `architect-schema-worker` | Schema co-location, __types__ directories | haiku |

## Type System Rules

### Critical (Must Fix)
- API input/output MUST have Zod validation
- No `interface` without corresponding Zod schema
- No `type X = { ... }` without Zod

### High (Should Fix)
- Types should be inferred via `z.infer<>`
- Schemas should be in `__types__/` directories

### Medium (Track)
- Schema naming conventions (PascalCase + Schema suffix)
- Schema co-location with usage

## Execution

### 1. Determine Paths to Check

Based on scope:
- `full`: All apps + packages
- `backend`: apps/api + packages/backend
- `frontend`: apps/web + packages/core
- `packages`: packages/*

### 2. Spawn Workers (PARALLEL)

```
Task tool (single message, multiple calls):
  subagent_type: "general-purpose"
  model: haiku
  run_in_background: true
  description: "Zod Usage Check"
  prompt: |
    Read instructions: .claude/agents/architect-zod-worker.agent.md
    CONTEXT:
    paths_to_check: {paths}
    scope: {scope}
    Return YAML only.

  ---

  subagent_type: "general-purpose"
  model: haiku
  run_in_background: true
  description: "Interface Detection Check"
  prompt: |
    Read instructions: .claude/agents/architect-interface-worker.agent.md
    CONTEXT:
    paths_to_check: {paths}
    scope: {scope}
    Return YAML only.

  ---

  subagent_type: "general-purpose"
  model: haiku
  run_in_background: true
  description: "Schema Location Check"
  prompt: |
    Read instructions: .claude/agents/architect-schema-worker.agent.md
    CONTEXT:
    paths_to_check: {paths}
    scope: {scope}
    Return YAML only.
```

### 3. Aggregate Results

## Output Format (YAML only)

```yaml
types_review:
  domain: types
  status: COMPLETE | PARTIAL
  verdict: PASS | CONCERNS | VIOLATIONS

  summary:
    files_checked: <n>
    schemas_found: <n>
    interfaces_found: <n>
    total_violations: <n>
    critical: <n>
    high: <n>
    medium: <n>
    low: <n>

  workers:
    zod:
      status: COMPLETE | FAILED
      verdict: PASS | FAIL
      findings_count: <n>
    interface:
      status: COMPLETE | FAILED
      verdict: PASS | FAIL
      findings_count: <n>
    schema:
      status: COMPLETE | FAILED
      verdict: PASS | FAIL
      findings_count: <n>

  zod_coverage:
    api_handlers:
      total: <n>
      with_zod: <n>
      coverage: <percentage>
    services:
      total: <n>
      with_zod: <n>
      coverage: <percentage>

  violations:
    - id: TYPE-001
      worker: zod | interface | schema
      severity: critical | high | medium | low
      rule: "Zod-first types"
      location: "<file:line>"
      issue: "Interface without Zod schema"
      code: |
        interface User {
          id: string
        }
      fix: |
        const UserSchema = z.object({
          id: z.string()
        })
        type User = z.infer<typeof UserSchema>

  concerns:
    - id: TYPE-C01
      file: "packages/core/api-client/src/types.ts"
      issue: "Many types in single file"
      recommendation: "Split into domain-specific __types__ directories"

  healthy_patterns:
    - "Consistent Zod usage in api-client schemas"
    - "Good schema naming conventions"

  tokens:
    leader_in: <n>
    leader_out: <n>
    workers_total: <n>
```

## Completion Signal

- `ARCH-TYPES COMPLETE` - All workers finished
- `ARCH-TYPES PARTIAL: <reason>` - Some workers failed

## Non-Negotiables

- Do NOT perform analysis yourself - spawn workers
- Do NOT modify any files
- MUST spawn all workers in single message (parallel)
- MUST provide code examples in violations
- MUST aggregate worker results into unified format
