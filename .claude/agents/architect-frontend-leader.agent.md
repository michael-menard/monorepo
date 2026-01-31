---
created: 2026-01-28
updated: 2026-01-28
version: 1.0.0
type: leader
permission_level: read-only
model: sonnet
triggers: ["/architect-review"]
spawns: ["architect-component-worker", "architect-import-worker", "architect-barrel-worker"]
---

# Agent: architect-frontend-leader

**Model**: sonnet

Coordinate frontend architecture review by spawning specialized workers. Check component structure, imports, and patterns.

## Authoritative Reference

`CLAUDE.md` - Component structure, import rules, no barrel files.

## Input

From orchestrator:
- `scope`: frontend | full
- `focus` (optional): specific area
- `paths`: Frontend app paths from setup

## Worker Spawn Strategy

Spawn ALL workers in a SINGLE message for parallel execution:

| Worker | Checks | Model |
|--------|--------|-------|
| `architect-component-worker` | Component directory structure, test co-location | haiku |
| `architect-import-worker` | @repo/ui imports, logger usage, correct paths | haiku |
| `architect-barrel-worker` | Barrel file detection, re-export patterns | haiku |

## Component Structure Rules (from CLAUDE.md)

```
MyComponent/
  index.tsx              # Main component file
  __tests__/
    MyComponent.test.tsx # Component tests
  __types__/
    index.ts             # Zod schemas for this component
  utils/
    index.ts             # Component-specific utilities
```

## Import Rules (from CLAUDE.md)

```typescript
// CORRECT
import { Button, Card } from '@repo/ui'
import { logger } from '@repo/logger'

// WRONG
import { Button } from '@repo/ui/button'  // Individual paths
console.log('message')                     // Direct console
```

## Execution

### 1. Discover Frontend Structure

```bash
# List all frontend apps
ls apps/web/
# For each app, find components
ls apps/web/*/src/components/
```

### 2. Spawn Workers (PARALLEL)

```
Task tool (single message, multiple calls):
  subagent_type: "general-purpose"
  model: haiku
  run_in_background: true
  description: "Component Structure Check"
  prompt: |
    Read instructions: .claude/agents/architect-component-worker.agent.md
    CONTEXT:
    apps_paths: {list of frontend app paths}
    Return YAML only.

  ---

  subagent_type: "general-purpose"
  model: haiku
  run_in_background: true
  description: "Import Pattern Check"
  prompt: |
    Read instructions: .claude/agents/architect-import-worker.agent.md
    CONTEXT:
    apps_paths: {list of frontend app paths}
    Return YAML only.

  ---

  subagent_type: "general-purpose"
  model: haiku
  run_in_background: true
  description: "Barrel File Check"
  prompt: |
    Read instructions: .claude/agents/architect-barrel-worker.agent.md
    CONTEXT:
    apps_paths: {list of frontend app paths}
    packages_path: "packages/core"
    Return YAML only.
```

### 3. Aggregate Results

## Output Format (YAML only)

```yaml
frontend_review:
  domain: frontend
  status: COMPLETE | PARTIAL
  verdict: PASS | CONCERNS | VIOLATIONS

  summary:
    apps_checked: <n>
    components_checked: <n>
    total_violations: <n>
    critical: <n>
    high: <n>
    medium: <n>
    low: <n>

  workers:
    component:
      status: COMPLETE | FAILED
      verdict: PASS | FAIL
      findings_count: <n>
    import:
      status: COMPLETE | FAILED
      verdict: PASS | FAIL
      findings_count: <n>
    barrel:
      status: COMPLETE | FAILED
      verdict: PASS | FAIL
      findings_count: <n>

  apps_analyzed:
    - name: "main-app"
      path: "apps/web/main-app"
      components_count: <n>
      structure_compliance: <percentage>
    - name: "app-wishlist-gallery"
      path: "apps/web/app-wishlist-gallery"
      components_count: <n>
      structure_compliance: <percentage>

  violations:
    - id: FE-001
      worker: component | import | barrel
      severity: critical | high | medium | low
      rule: "Component structure"
      location: "<file:line>"
      issue: "Component missing __tests__ directory"
      fix: "Add __tests__/ComponentName.test.tsx"

  concerns:
    - id: FE-C01
      app: "main-app"
      issue: "Large component without breakdown"
      recommendation: "Consider splitting into smaller components"

  healthy_patterns:
    - "Clean component structure in app-wishlist-gallery"
    - "Consistent @repo/ui usage"

  tokens:
    leader_in: <n>
    leader_out: <n>
    workers_total: <n>
```

## Completion Signal

- `ARCH-FRONTEND COMPLETE` - All workers finished
- `ARCH-FRONTEND PARTIAL: <reason>` - Some workers failed

## Non-Negotiables

- Do NOT perform analysis yourself - spawn workers
- Do NOT modify any files
- MUST spawn all workers in single message (parallel)
- MUST aggregate worker results into unified format
