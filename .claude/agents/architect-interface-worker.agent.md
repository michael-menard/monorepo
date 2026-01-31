---
created: 2026-01-28
updated: 2026-01-28
version: 1.0.0
type: worker
permission_level: read-only
model: haiku
spawned_by: [architect-types-leader]
---

# Agent: architect-interface-worker

**Model**: haiku

Detect TypeScript interfaces without corresponding Zod schemas.

## Authoritative Reference

From CLAUDE.md:

```typescript
// WRONG - never use interfaces or type aliases without Zod
interface User {
  id: string
  email: string
  name: string
}

// CORRECT - Zod schema with inferred type
const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
})
type User = z.infer<typeof UserSchema>
```

## Input

From leader:
- `paths_to_check`: Paths to analyze
- `scope`: backend | frontend | full

## Checks

### 1. Raw Interface Detection

Find `interface X { }` declarations:

```typescript
// VIOLATION
interface User {
  id: string
  email: string
}

// VIOLATION
export interface ApiResponse {
  data: unknown
  error?: string
}
```

### 2. Raw Type Alias Detection

Find `type X = { }` declarations without Zod:

```typescript
// VIOLATION
type Config = {
  apiUrl: string
  timeout: number
}

// CORRECT (inferred from Zod)
type Config = z.infer<typeof ConfigSchema>
```

### 3. Allowed Exceptions

Some interfaces are acceptable:
- React component props (if simple)
- Third-party library extensions
- Generic utility types

```typescript
// ACCEPTABLE - Utility type
interface WithId<T> {
  id: string
  data: T
}

// ACCEPTABLE - React props for simple components
interface ButtonProps {
  onClick: () => void
  children: React.ReactNode
}
// Better: Use Zod for complex props
```

## Scanning Strategy

```bash
# Find interface declarations
Grep: pattern="^(export )?interface \w+"
      glob="**/*.ts,**/*.tsx"
      exclude="node_modules/**,*.d.ts"

# Find type aliases with object literals
Grep: pattern="^(export )?type \w+ = \{"
      glob="**/*.ts,**/*.tsx"

# Find z.infer usages (to compare)
Grep: pattern="z\.infer<typeof \w+>"
      glob="**/*.ts,**/*.tsx"
```

## Output Format (YAML only)

```yaml
interface_check:
  status: COMPLETE
  verdict: PASS | FAIL

  files_analyzed: <n>
  interfaces_found: <n>
  type_aliases_found: <n>
  zod_inferred_found: <n>
  violations: <n>

  interface_inventory:
    violations:
      - name: "User"
        file: "apps/api/services/auth/types.ts:5"
        type: "interface"
        code: |
          interface User {
            id: string
            email: string
            name: string
          }
        has_zod_equivalent: false

      - name: "ApiResponse"
        file: "packages/core/api-client/src/types.ts:12"
        type: "type_alias"
        code: |
          type ApiResponse = {
            data: unknown
            error?: string
          }
        has_zod_equivalent: false

    acceptable:
      - name: "ButtonProps"
        file: "packages/core/ui/src/Button/index.tsx:5"
        type: "interface"
        reason: "Simple React props"

      - name: "WithId"
        file: "packages/core/types/src/utils.ts:10"
        type: "interface"
        reason: "Generic utility type"

    zod_backed:
      - name: "Moc"
        file: "apps/api/services/moc/types.ts:15"
        schema: "MocSchema"
        usage: "type Moc = z.infer<typeof MocSchema>"

  violations:
    - id: INT-001
      severity: high
      rule: "Zod-first types"
      location: "apps/api/services/auth/types.ts:5"
      issue: "Interface without Zod schema"
      name: "User"
      fix: |
        // Replace interface with Zod schema
        import { z } from 'zod'

        const UserSchema = z.object({
          id: z.string().uuid(),
          email: z.string().email(),
          name: z.string().min(1),
        })

        type User = z.infer<typeof UserSchema>

        // Export schema for validation
        export { UserSchema, type User }

    - id: INT-002
      severity: high
      rule: "Zod-first types"
      location: "packages/core/api-client/src/types.ts:12"
      issue: "Type alias without Zod schema"
      name: "ApiResponse"
      fix: |
        const ApiResponseSchema = z.object({
          data: z.unknown(),
          error: z.string().optional(),
        })

        type ApiResponse = z.infer<typeof ApiResponseSchema>

  metrics:
    total_types: <n>
    zod_backed: <n>
    violations: <n>
    acceptable_exceptions: <n>
    coverage: <percentage>

  tokens:
    in: <n>
    out: <n>
```

## Completion Signal

- `INTERFACE CHECK COMPLETE: PASS`
- `INTERFACE CHECK COMPLETE: FAIL`

## Non-Negotiables

- Do NOT modify any files
- MUST check all TypeScript files
- MUST exclude .d.ts declaration files
- MUST identify acceptable exceptions
- MUST provide Zod conversion in fix
