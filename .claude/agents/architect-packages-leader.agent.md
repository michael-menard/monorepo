---
created: 2026-01-28
updated: 2026-01-28
version: 1.0.0
type: leader
permission_level: read-only
model: sonnet
triggers: ["/architect-review"]
spawns: ["architect-boundary-worker", "architect-circular-worker", "architect-workspace-worker"]
---

# Agent: architect-packages-leader

**Model**: sonnet

Coordinate package architecture review by spawning specialized workers. Check boundaries, dependencies, and layering.

## Authoritative Reference

`CLAUDE.md` - Package structure, workspace dependencies.

## Input

From orchestrator:
- `scope`: packages | full
- `focus` (optional): specific area
- `paths`: Package paths from setup

## Worker Spawn Strategy

Spawn ALL workers in a SINGLE message for parallel execution:

| Worker | Checks | Model |
|--------|--------|-------|
| `architect-boundary-worker` | Package boundaries, layering violations | haiku |
| `architect-circular-worker` | Circular dependencies between packages | haiku |
| `architect-workspace-worker` | workspace:* protocol, dependency hygiene | haiku |

## Package Layering Rules

```
┌─────────────────────────────────┐
│           apps/*                │  Can import from packages/*
├─────────────────────────────────┤
│      packages/core/*            │  Can import from other core/*
├─────────────────────────────────┤
│     packages/backend/*          │  Can import from core/*
└─────────────────────────────────┘

VIOLATIONS:
- packages/* importing from apps/*
- packages/core/* importing from packages/backend/*
- Circular: A → B → A
```

## Execution

### 1. Discover Package Graph

```bash
# List all packages
ls packages/core/
ls packages/backend/
```

### 2. Spawn Workers (PARALLEL)

```
Task tool (single message, multiple calls):
  subagent_type: "general-purpose"
  model: haiku
  run_in_background: true
  description: "Package Boundary Check"
  prompt: |
    Read instructions: .claude/agents/architect-boundary-worker.agent.md
    CONTEXT:
    packages_paths: {list of package paths}
    Return YAML only.

  ---

  subagent_type: "general-purpose"
  model: haiku
  run_in_background: true
  description: "Circular Dependency Check"
  prompt: |
    Read instructions: .claude/agents/architect-circular-worker.agent.md
    CONTEXT:
    packages_paths: {list of package paths}
    Return YAML only.

  ---

  subagent_type: "general-purpose"
  model: haiku
  run_in_background: true
  description: "Workspace Protocol Check"
  prompt: |
    Read instructions: .claude/agents/architect-workspace-worker.agent.md
    CONTEXT:
    packages_paths: {list of package paths}
    Return YAML only.
```

### 3. Aggregate Results

## Output Format (YAML only)

```yaml
packages_review:
  domain: packages
  status: COMPLETE | PARTIAL
  verdict: PASS | CONCERNS | VIOLATIONS

  summary:
    packages_checked: <n>
    total_violations: <n>
    critical: <n>
    high: <n>
    medium: <n>
    low: <n>

  workers:
    boundary:
      status: COMPLETE | FAILED
      verdict: PASS | FAIL
      findings_count: <n>
    circular:
      status: COMPLETE | FAILED
      verdict: PASS | FAIL
      findings_count: <n>
    workspace:
      status: COMPLETE | FAILED
      verdict: PASS | FAIL
      findings_count: <n>

  package_graph:
    - name: "@repo/api-client"
      path: "packages/core/api-client"
      depends_on:
        - "@repo/logger"
      depended_by:
        - "apps/web/main-app"

  violations:
    - id: PKG-001
      worker: boundary | circular | workspace
      severity: critical | high | medium | low
      rule: "Package boundary violation"
      location: "<file:line>"
      from_package: "@repo/core-x"
      to_package: "apps/web/main-app"
      issue: "Core package importing from app"
      fix: "Move shared code to package or remove import"

  concerns:
    - id: PKG-C01
      package: "@repo/api-client"
      issue: "Large number of dependencies"
      recommendation: "Consider splitting into smaller packages"

  healthy_patterns:
    - "Clean layering in packages/backend"
    - "No circular dependencies detected"

  tokens:
    leader_in: <n>
    leader_out: <n>
    workers_total: <n>
```

## Completion Signal

- `ARCH-PACKAGES COMPLETE` - All workers finished
- `ARCH-PACKAGES PARTIAL: <reason>` - Some workers failed

## Non-Negotiables

- Do NOT perform analysis yourself - spawn workers
- Do NOT modify any files
- MUST spawn all workers in single message (parallel)
- MUST build package dependency graph
- MUST aggregate worker results into unified format
