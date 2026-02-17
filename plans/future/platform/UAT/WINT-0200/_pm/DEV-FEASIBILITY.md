# Dev Feasibility: WINT-0200

**Story:** Create User Flows Schema with State/Capability Enums
**Generated:** 2026-02-15
**Reviewer:** Dev Feasibility Worker
**Verdict:** ✅ FEASIBLE

---

## Executive Summary

**Effort Estimate:** 2-3 story points
**Risk Level:** Low
**Blocking Dependencies:** WINT-0180 AC-2 (storage strategy) - partial blocker
**Recommended Approach:** Proceed with both JSON Schema and Zod schema creation in parallel

---

## Technical Assessment

### Scope Validation

**In Scope:**
- ✅ JSON Schema definition (AC-1)
- ✅ Zod schema for runtime validation (AC-2)
- ✅ Documentation for states enum (AC-3)
- ✅ Documentation for capabilities enum (AC-4)
- ✅ Validation tests (AC-5)
- ✅ Example user flow (AC-6)
- ✅ Integration documentation (AC-7)

**Out of Scope:**
- ❌ PO cohesion checker implementation (WINT-4070)
- ❌ Cohesion sidecar implementation (WINT-4010)
- ❌ Database table creation (unless WINT-0180 requires)
- ❌ UI for editing flows
- ❌ Validation of existing flows in codebase

**Change Surface:**
- **New files only** - no modifications to existing code
- **No database migrations** - unless storage strategy changes
- **No API endpoints** - schema definition only
- **No deployment** - static files in repository

---

## Implementation Plan

### 1. Create JSON Schema (AC-1)

**Location:** TBD based on WINT-0180 AC-2 decision
- **Option 1:** `packages/backend/orchestrator/src/schemas/user-flows.schema.json` (filesystem)
- **Option 2:** Hybrid - file + database enum (if WINT-0180 recommends)

**Implementation:**
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.com/schemas/user-flows.schema.json",
  "title": "User Flows Schema",
  "description": "Schema for defining user flows with required states and capabilities",
  "type": "object",
  "required": ["schema_version", "flows"],
  "properties": {
    "schema_version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$",
      "description": "Schema version for evolution tracking"
    },
    "flows": {
      "type": "array",
      "maxItems": 5,
      "description": "Maximum 5 flows per feature",
      "items": {
        "type": "object",
        "required": ["name", "steps"],
        "properties": {
          "name": {"type": "string"},
          "steps": {
            "type": "array",
            "maxItems": 7,
            "description": "Maximum 7 steps per flow",
            "items": {
              "type": "object",
              "required": ["action", "capabilities", "states"],
              "properties": {
                "action": {"type": "string"},
                "capabilities": {
                  "type": "array",
                  "items": {
                    "enum": ["create", "view", "edit", "delete", "upload", "replace", "download"]
                  }
                },
                "states": {
                  "type": "array",
                  "items": {
                    "enum": ["loading", "empty", "validation_error", "server_error", "permission_denied"]
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

**Effort:** 1 hour
**Risk:** None - standard JSON Schema syntax

---

### 2. Create Zod Schema (AC-2)

**Location:** `packages/backend/orchestrator/src/artifacts/__types__/user-flows.ts`

**Implementation:**
```typescript
import { z } from 'zod'

// State enum - required states for user flow validation
export const UserFlowStateSchema = z.enum([
  'loading',
  'empty',
  'validation_error',
  'server_error',
  'permission_denied',
])

// Capability enum - required capabilities for CRUD operations
export const UserFlowCapabilitySchema = z.enum([
  'create',
  'view',
  'edit',
  'delete',
  'upload',
  'replace',
  'download',
])

// Step schema - individual step in a user flow
export const UserFlowStepSchema = z.object({
  action: z.string().min(1).describe('Action name or description'),
  capabilities: z.array(UserFlowCapabilitySchema).min(1).describe('Capabilities used in this step'),
  states: z.array(UserFlowStateSchema).min(1).describe('States covered in this step'),
})

// Flow schema - single user flow with max 7 steps
export const UserFlowSchema = z.object({
  name: z.string().min(1).describe('Flow name'),
  steps: z.array(UserFlowStepSchema).max(7).describe('Maximum 7 steps per flow'),
})

// User flows schema - feature-level with max 5 flows
export const UserFlowsSchema = z.object({
  schema_version: z.string().regex(/^\d+\.\d+\.\d+$/).describe('Schema version (semver)'),
  flows: z.array(UserFlowSchema).max(5).describe('Maximum 5 flows per feature'),
})

// Inferred types
export type UserFlowState = z.infer<typeof UserFlowStateSchema>
export type UserFlowCapability = z.infer<typeof UserFlowCapabilitySchema>
export type UserFlowStep = z.infer<typeof UserFlowStepSchema>
export type UserFlow = z.infer<typeof UserFlowSchema>
export type UserFlows = z.infer<typeof UserFlowsSchema>
```

**Effort:** 1-2 hours
**Risk:** None - follows established Zod patterns from WINT-0110

---

### 3. Documentation (AC-3, AC-4, AC-7)

**AC-3: States Enum Documentation**
Add TSDoc comments to each state:
```typescript
/**
 * Required user flow states for PO cohesion validation.
 *
 * @remarks
 * All user flows must consider these states for complete UX coverage:
 *
 * - `loading`: Initial data fetch in progress (spinner, skeleton state)
 * - `empty`: No data exists yet (empty state, call-to-action)
 * - `validation_error`: User input failed validation (form errors, inline feedback)
 * - `server_error`: Backend returned 5xx error (error boundary, retry option)
 * - `permission_denied`: User lacks required permissions (403 state, upgrade prompt)
 *
 * @extensibility
 * To add new states in future versions:
 * 1. Add enum value to both JSON Schema and Zod schema
 * 2. Increment `schema_version` minor version
 * 3. Update documentation with usage guidelines
 * 4. Add migration guide for existing flows
 */
```

**AC-4: Capabilities Enum Documentation**
Add TSDoc comments to each capability:
```typescript
/**
 * Required user flow capabilities for CRUD completeness validation.
 *
 * @remarks
 * Standard CRUD operations:
 * - `create`: Create new entity (C in CRUD)
 * - `view`: Read/view entity (R in CRUD)
 * - `edit`: Update existing entity (U in CRUD)
 * - `delete`: Remove entity (D in CRUD)
 *
 * File/media operations:
 * - `upload`: Upload file/media (initial upload)
 * - `replace`: Replace file/media (update existing file)
 * - `download`: Download file/media
 *
 * @extensibility
 * To add new capabilities in future versions:
 * 1. Add enum value to both JSON Schema and Zod schema
 * 2. Increment `schema_version` minor version
 * 3. Document CRUD mapping (if applicable)
 * 4. Update cohesion rules (WINT-4050) if capability implies others
 */
```

**AC-7: Integration Documentation**
Create `packages/backend/orchestrator/src/artifacts/README.md`:
```markdown
# User Flows Schema

## Location
- **JSON Schema:** `./schemas/user-flows.schema.json`
- **Zod Schema:** `./__types__/user-flows.ts`
- **Tests:** `./__tests__/user-flows.test.ts`
- **Example:** See test fixtures

## Usage

### Agent Validation
```typescript
import { UserFlowsSchema } from './artifacts/__types__/user-flows'

const flow = { /* ... */ }
const result = UserFlowsSchema.safeParse(flow)

if (!result.success) {
  console.error('Invalid flow:', result.error)
}
```

### PO Cohesion Checks (WINT-0210)
PO role pack will use this schema to validate:
1. All required states are covered (loading, empty, errors, permissions)
2. All required capabilities are present (CRUD completeness)
3. Flow complexity is within bounds (≤5 flows, ≤7 steps)

## Storage Strategy
Depends on WINT-0180 AC-2 decision:
- **Filesystem:** User flows stored as JSON files validated against schema
- **Database:** Hybrid approach with JSONB column and pgEnum for states/capabilities
- **Current:** Both JSON Schema and Zod schema exist for flexibility

## Related Stories
- **WINT-0180:** Examples Framework (storage pattern)
- **WINT-0210:** Role Pack Templates (PO cohesion checks)
- **WINT-4010:** Cohesion Sidecar (automated validation)
- **WINT-4070:** cohesion-prosecutor Agent (PO role enforcement)
```

**Effort:** 1 hour
**Risk:** None - documentation only

---

### 4. Validation Tests (AC-5)

**Location:** `packages/backend/orchestrator/src/artifacts/__tests__/user-flows.test.ts`

**Test Coverage:**
- Happy path: valid flow
- Error cases: too many flows, too many steps, invalid enums
- Round-trip validation: JSON Schema ↔ Zod
- Edge cases: empty flows, minimum flow, all enums used

**Effort:** 2-3 hours
**Risk:** None - unit tests only, no integration complexity

---

### 5. Example User Flow (AC-6)

**Location:** Test fixtures or `./schemas/examples/basic-user-flow.json`

**Example:**
```json
{
  "schema_version": "1.0.0",
  "flows": [
    {
      "name": "Create and Edit MOC",
      "steps": [
        {
          "action": "Navigate to MOCs list",
          "capabilities": ["view"],
          "states": ["loading", "empty"]
        },
        {
          "action": "Click Create MOC",
          "capabilities": ["create"],
          "states": ["permission_denied"]
        },
        {
          "action": "Fill MOC form",
          "capabilities": ["create"],
          "states": ["validation_error"]
        },
        {
          "action": "Submit form",
          "capabilities": ["create"],
          "states": ["server_error"]
        },
        {
          "action": "View created MOC",
          "capabilities": ["view", "edit", "delete"],
          "states": ["loading"]
        }
      ]
    }
  ]
}
```

**Effort:** 30 minutes
**Risk:** None - example only

---

## Reuse Analysis

### Existing Patterns to Follow

1. **WINT Database Enum Pattern** (`packages/backend/database-schema/src/schema/wint.ts`)
   - Reference for pgEnum structure if database storage needed
   - Pattern: `export const storyStateEnum = pgEnum('story_state', [...])`

2. **Session Management Zod Pattern** (`packages/backend/mcp-tools/src/session-management/__types__/index.ts`)
   - Reference for Zod validation structure
   - Pattern: Use `z.enum()`, `.max()`, `.min()`, `.describe()`

3. **WINT-0180 Schema Versioning** (when available)
   - Reference for `schema_version` field usage
   - Not blocking - can use placeholder and update later

### No New Dependencies Required
- Zod: ✅ Already installed
- Drizzle: ✅ Already installed (if database enum needed)
- Vitest: ✅ Already configured

---

## Risks and Mitigations

### Risk 1: WINT-0180 Storage Decision (Medium)
**Impact:** May need to add database enum if hybrid storage chosen
**Probability:** 30%
**Mitigation:**
- Create both JSON Schema and Zod schema now
- If database enum needed later, add pgEnum in separate micro-commit
- Zod schema remains valid regardless of storage choice

**Fallback Plan:** If WINT-0180 is delayed, proceed with JSON Schema + Zod, add database enum in follow-up story

---

### Risk 2: State/Capability Enum Expansion (Low)
**Impact:** Initial 5 states / 7 capabilities may be insufficient for edge cases
**Probability:** 20%
**Mitigation:**
- Include extensibility documentation (AC-3, AC-4)
- Use `schema_version` field for evolution tracking
- Document process for adding new enum values

**Fallback Plan:** Accept current enums as MVP, add expansion story to backlog

---

### Risk 3: Downstream Integration Unknown (Low)
**Impact:** WINT-0210 and WINT-4xxx integration details unclear
**Probability:** 10%
**Mitigation:**
- Focus on schema correctness and validation
- Provide clear integration documentation (AC-7)
- Schema can be consumed by any downstream story

**Fallback Plan:** Downstream stories adapt schema as needed, this story provides foundation

---

## Timeline

| Task | Effort | Dependencies |
|------|--------|--------------|
| JSON Schema (AC-1) | 1h | None |
| Zod Schema (AC-2) | 1-2h | None |
| Documentation (AC-3, AC-4, AC-7) | 1h | AC-1, AC-2 |
| Tests (AC-5) | 2-3h | AC-2 |
| Example (AC-6) | 0.5h | AC-1, AC-2 |
| **Total** | **5.5-7.5h** | **2-3 story points** |

---

## Recommendations

### ✅ Proceed with Story
- All acceptance criteria are implementable
- No blocking technical constraints
- Reuse patterns are well-established
- Risk level is low with clear mitigations

### ⚠️ Considerations
1. **WINT-0180 dependency:** Monitor for storage decision, be prepared to add database enum
2. **Extensibility:** Document enum expansion process clearly for future maintainers
3. **Testing:** Achieve 100% coverage on validation logic (deterministic, no excuses)

### 📋 Pre-Implementation Checklist
- [ ] Confirm WINT-0180 AC-2 status (storage strategy)
- [ ] Review Zod patterns in WINT-0110 for consistency
- [ ] Set up test file structure in packages/backend/orchestrator
- [ ] Decide on JSON Schema location (coordinate with WINT-0180)

---

## Conclusion

**Verdict:** ✅ **FEASIBLE**

Story is well-scoped, low-risk, and uses established patterns. Recommended to proceed immediately. Partial dependency on WINT-0180 is non-blocking - can proceed with both approaches in parallel and reconcile later if needed.

Estimated completion time: 1-2 days for solo developer.
