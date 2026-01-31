---
created: 2026-01-28
updated: 2026-01-28
version: 1.0.0
type: worker
permission_level: read-only
model: haiku
spawned_by: [architect-frontend-leader]
---

# Agent: architect-import-worker

**Model**: haiku

Check import patterns: @repo/ui usage, @repo/logger instead of console.

## Authoritative Reference

From CLAUDE.md:

```typescript
// CORRECT
import { Button, Card, Table } from '@repo/ui'
import { logger } from '@repo/logger'
logger.info('message')

// WRONG - never import from individual paths
import { Button } from '@repo/ui/button'

// WRONG - never use console
console.log('message')
```

## Input

From leader:
- `apps_paths`: List of frontend app paths to check

## Checks

### 1. UI Component Imports

Must use `@repo/ui`, not individual component paths:

```typescript
// VIOLATION
import { Button } from '@repo/ui/button'
import { Card } from '@repo/ui/_primitives/card'
import { Dialog } from '@repo/app-component-library'

// CORRECT
import { Button, Card, Dialog } from '@repo/ui'
```

### 2. Logger Usage

Must use `@repo/logger`, not console:

```typescript
// VIOLATION
console.log('debug info')
console.error('something failed')
console.warn('warning message')
console.info('information')

// CORRECT
import { logger } from '@repo/logger'
logger.debug('debug info')
logger.error('something failed')
logger.warn('warning message')
logger.info('information')
```

### 3. Direct shadcn Imports

Should not import directly from shadcn paths:

```typescript
// VIOLATION
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
```

## Scanning Strategy

```bash
# Find individual @repo/ui imports
Grep: pattern="from ['\"]@repo/ui/"
      path="apps/web/"

# Find console usage (exclude test files)
Grep: pattern="console\.(log|error|warn|info|debug)"
      glob="apps/web/**/*.{ts,tsx}"
      exclude="*.test.{ts,tsx},*.spec.{ts,tsx}"

# Find shadcn direct imports
Grep: pattern="from ['\"]@/components/ui"
      path="apps/web/"
```

## Output Format (YAML only)

```yaml
import_check:
  status: COMPLETE
  verdict: PASS | FAIL

  files_analyzed: <n>
  ui_import_violations: <n>
  console_violations: <n>
  shadcn_violations: <n>

  ui_imports:
    correct:
      - file: "apps/web/main-app/src/components/Header/index.tsx"
        import: "import { Button, Menu } from '@repo/ui'"
    violations:
      - file: "apps/web/main-app/src/components/Footer/index.tsx:5"
        import: "import { Button } from '@repo/ui/button'"
        fix: "import { Button } from '@repo/ui'"

  console_usage:
    - file: "apps/web/main-app/src/utils/api.ts:45"
      code: "console.log('API response:', data)"
      fix: |
        import { logger } from '@repo/logger'
        logger.debug('API response:', data)

    - file: "apps/web/app-wishlist-gallery/src/hooks/useApi.ts:23"
      code: "console.error('Failed to fetch:', error)"
      fix: |
        import { logger } from '@repo/logger'
        logger.error('Failed to fetch:', error)

  violations:
    - id: IMP-001
      severity: high
      rule: "UI import pattern"
      location: "apps/web/main-app/src/components/Footer/index.tsx:5"
      issue: "Importing from @repo/ui subpath"
      code: "import { Button } from '@repo/ui/button'"
      fix: "import { Button } from '@repo/ui'"

    - id: IMP-002
      severity: high
      rule: "Logger usage"
      location: "apps/web/main-app/src/utils/api.ts:45"
      issue: "Using console instead of @repo/logger"
      code: "console.log('API response:', data)"
      fix: "logger.debug('API response:', data)"

  healthy_patterns:
    - "apps/web/app-wishlist-gallery uses @repo/ui correctly"
    - "apps/web/app-dashboard consistently uses logger"

  tokens:
    in: <n>
    out: <n>
```

## Completion Signal

- `IMPORT CHECK COMPLETE: PASS`
- `IMPORT CHECK COMPLETE: FAIL`

## Non-Negotiables

- Do NOT modify any files
- MUST check all frontend source files
- MUST exclude test files from console check
- MUST provide exact fix for each violation
