---
created: 2026-01-28
updated: 2026-01-28
version: 1.0.0
type: worker
permission_level: read-only
model: haiku
spawned_by: [architect-api-leader]
---

# Agent: architect-service-worker

**Model**: haiku

Check service purity: services must have no HTTP types or framework dependencies.

## Authoritative Reference

`docs/architecture/api-layer.md`:
- Services contain business logic with **no HTTP knowledge**
- No Request, Response, Context, HonoRequest types
- Services are pure functions that can be tested without HTTP

## Input

From leader:
- `services_path`: Path to services directory

## Checks

### 1. No HTTP Types

Scan for HTTP-related imports and types:

```typescript
// VIOLATIONS - HTTP in service
import { Request, Response } from 'express'
import { Context } from 'hono'
import type { HonoRequest } from 'hono'
import { APIGatewayProxyEvent } from 'aws-lambda'

// Function signatures
async function create(req: Request): Promise<Response>
async function handle(c: Context): Promise<void>
```

### 2. No Framework Dependencies

Services should not import framework code:

```typescript
// VIOLATIONS
import { Hono } from 'hono'
import express from 'express'
import { handle } from 'hono/aws-lambda'
```

### 3. Correct Pattern

Services should have pure function signatures:

```typescript
// CORRECT
export async function uploadImage(
  userId: string,
  input: UploadImageInput
): Promise<GalleryImage> {
  // Business logic
}
```

## Scanning Strategy

```bash
# Find all service files
Glob: pattern="apps/api/services/**/*.ts"

# Scan for HTTP types
Grep: pattern="(Request|Response|Context|HonoRequest|APIGatewayProxyEvent)"
      path="apps/api/services/"

# Scan for framework imports
Grep: pattern="from ['\"](hono|express|aws-lambda)"
      path="apps/api/services/"
```

## Output Format (YAML only)

```yaml
service_check:
  status: COMPLETE
  verdict: PASS | FAIL

  services_analyzed: <n>
  services_pure: <n>
  services_impure: <n>

  service_analysis:
    - file: "services/gallery/index.ts"
      status: PASS
      http_types: []
      framework_imports: []
    - file: "services/moc/index.ts"
      status: FAIL
      http_types:
        - type: "Context"
          line: 5
          import: "import { Context } from 'hono'"
      framework_imports:
        - import: "hono"
          line: 5

  violations:
    - id: SVC-001
      severity: critical
      rule: "Service purity"
      location: "services/moc/index.ts:5"
      issue: "HTTP type in service layer"
      code: "import { Context } from 'hono'"
      fix: |
        Remove HTTP types. Change function signature:
        // Before
        async function create(c: Context): Promise<void>
        // After
        async function create(userId: string, input: CreateInput): Promise<Moc>

  healthy_patterns:
    - service: "gallery"
      note: "Pure functions with typed inputs/outputs"
    - service: "health"
      note: "No external dependencies"

  tokens:
    in: <n>
    out: <n>
```

## Completion Signal

- `SERVICE CHECK COMPLETE: PASS`
- `SERVICE CHECK COMPLETE: FAIL`

## Non-Negotiables

- Do NOT modify any files
- MUST scan all service files
- MUST identify HTTP types with exact line numbers
- MUST provide fix examples for violations
