---
created: 2026-01-28
updated: 2026-01-28
version: 1.0.0
type: worker
permission_level: read-only
model: haiku
spawned_by: [architect-packages-leader]
---

# Agent: architect-workspace-worker

**Model**: haiku

Check workspace protocol compliance: internal dependencies use `workspace:*`.

## Rule

All internal package dependencies MUST use the workspace protocol:

```json
// CORRECT
{
  "dependencies": {
    "@repo/logger": "workspace:*",
    "@repo/api-client": "workspace:*"
  }
}

// VIOLATION
{
  "dependencies": {
    "@repo/logger": "^1.0.0",     // Version instead of workspace
    "@repo/api-client": "*"        // Wildcard instead of workspace
  }
}
```

## Input

From leader:
- `packages_paths`: List of package paths to check

## Checks

### 1. Internal Dependencies

For each package.json, check that `@repo/*` dependencies use `workspace:*`:

```bash
# Find all package.json files
Glob: pattern="packages/**/package.json"
Glob: pattern="apps/**/package.json"

# For each, check @repo dependencies
```

### 2. Consistency

All workspace packages should be consistently referenced.

### 3. Missing Dependencies

Check for imports that aren't declared in package.json:

```typescript
// In source file
import { logger } from '@repo/logger'

// But package.json missing @repo/logger
```

## Output Format (YAML only)

```yaml
workspace_check:
  status: COMPLETE
  verdict: PASS | FAIL

  packages_analyzed: <n>
  protocol_violations: <n>
  missing_deps: <n>

  package_analysis:
    - package: "@repo/api-client"
      path: "packages/core/api-client/package.json"
      internal_deps:
        - name: "@repo/logger"
          version: "workspace:*"
          valid: true
        - name: "@repo/design-system"
          version: "^2.0.0"
          valid: false
          issue: "Should use workspace:*"
      missing_deps: []

    - package: "apps/web/main-app"
      path: "apps/web/main-app/package.json"
      internal_deps:
        - name: "@repo/ui"
          version: "workspace:*"
          valid: true
      missing_deps:
        - name: "@repo/logger"
          imported_in: "src/utils/api.ts:5"
          issue: "Import exists but not in package.json"

  violations:
    - id: WS-001
      severity: medium
      rule: "Workspace protocol"
      location: "packages/core/api-client/package.json"
      package: "@repo/design-system"
      current: "^2.0.0"
      expected: "workspace:*"
      fix: 'Change to "@repo/design-system": "workspace:*"'

    - id: WS-002
      severity: high
      rule: "Missing dependency"
      location: "apps/web/main-app/package.json"
      missing: "@repo/logger"
      imported_in: "src/utils/api.ts:5"
      fix: 'Add "@repo/logger": "workspace:*" to dependencies'

  healthy:
    - "@repo/logger"
    - "@repo/accessibility"
    note: "Correctly using workspace:* for all internal deps"

  tokens:
    in: <n>
    out: <n>
```

## Completion Signal

- `WORKSPACE CHECK COMPLETE: PASS`
- `WORKSPACE CHECK COMPLETE: FAIL`

## Non-Negotiables

- Do NOT modify any files
- MUST check all package.json files
- MUST verify workspace:* protocol for @repo/* deps
- MUST cross-reference source imports with declared dependencies
