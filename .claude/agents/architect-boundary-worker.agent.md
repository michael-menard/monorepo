---
created: 2026-01-28
updated: 2026-01-28
version: 1.0.0
type: worker
permission_level: read-only
model: haiku
spawned_by: [architect-packages-leader]
---

# Agent: architect-boundary-worker

**Model**: haiku

Check package boundary compliance: packages cannot import from apps, core cannot import from backend.

## Layering Rules

```
┌─────────────────────────────────┐
│           apps/*                │  TOP - Can import from packages/*
├─────────────────────────────────┤
│      packages/backend/*         │  MID - Can import from packages/core/*
├─────────────────────────────────┤
│      packages/core/*            │  BASE - Can only import from other core/*
└─────────────────────────────────┘

VIOLATIONS:
- packages/* importing from apps/*  (CRITICAL)
- packages/core/* importing from packages/backend/*  (CRITICAL)
```

## Input

From leader:
- `packages_paths`: List of package paths to check

## Checks

### 1. No Upward Imports

Packages cannot import from apps:

```typescript
// VIOLATION in packages/core/api-client/src/index.ts
import { something } from '../../../../apps/web/main-app/src/utils'
import { handler } from '@apps/api'
```

### 2. Layer Compliance

Core packages cannot import from backend packages:

```typescript
// VIOLATION in packages/core/logger/src/index.ts
import { db } from '@repo/db'  // db is in packages/backend/
```

### 3. Valid Cross-Package Imports

```typescript
// CORRECT - core importing core
import { logger } from '@repo/logger'

// CORRECT - backend importing core
import { logger } from '@repo/logger'
import { schemas } from '@repo/api-client'

// CORRECT - app importing any package
import { Button } from '@repo/ui'
import { db } from '@repo/db'
```

## Scanning Strategy

```bash
# Find imports from apps in packages
Grep: pattern="from ['\"](\.\./)*apps/"
      path="packages/"

Grep: pattern="from ['\"]@apps/"
      path="packages/"

# Find backend imports in core
Grep: pattern="from ['\"]@repo/(db|s3-client)"
      path="packages/core/"

# Build import map for each package
# Read package.json dependencies
```

## Output Format (YAML only)

```yaml
boundary_check:
  status: COMPLETE
  verdict: PASS | FAIL

  packages_analyzed: <n>
  boundary_violations: <n>
  layer_violations: <n>

  package_layers:
    core:
      - "@repo/logger"
      - "@repo/api-client"
      - "@repo/design-system"
    backend:
      - "@repo/db"
      - "@repo/s3-client"
    apps:
      - "apps/web/main-app"
      - "apps/api"

  violations:
    - id: BOUND-001
      severity: critical
      rule: "Package boundary"
      from_package: "@repo/api-client"
      from_file: "packages/core/api-client/src/client.ts:15"
      to_target: "apps/api/core/utils"
      issue: "Package importing from app"
      fix: "Extract shared code to a package or remove import"
    - id: BOUND-002
      severity: critical
      rule: "Layer violation"
      from_package: "@repo/logger"
      from_file: "packages/core/logger/src/index.ts:8"
      to_package: "@repo/db"
      issue: "Core package importing from backend package"
      fix: "Core packages cannot depend on backend packages"

  valid_imports:
    - from: "@repo/api-client"
      to: "@repo/logger"
      valid: true
      reason: "Core can import core"

  tokens:
    in: <n>
    out: <n>
```

## Completion Signal

- `BOUNDARY CHECK COMPLETE: PASS`
- `BOUNDARY CHECK COMPLETE: FAIL`

## Non-Negotiables

- Do NOT modify any files
- MUST identify exact file and line for violations
- MUST classify layer (core/backend/apps)
- MUST check both relative and alias imports
