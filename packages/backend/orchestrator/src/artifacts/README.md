# Artifacts Package

This directory contains Zod schema definitions and type definitions for workflow artifacts used by the orchestrator.

## User Flows Schema (WINT-0200)

### Overview

The User Flows Schema defines a standardized structure for documenting user flows with required states and capabilities. This enables Product Owner (PO) cohesion checks to verify feature completeness across all UX scenarios.

### Schema File Locations

- **Zod Schema (Runtime Validation)**: `packages/backend/orchestrator/src/artifacts/__types__/user-flows.ts`
- **Example Flow**: `packages/backend/orchestrator/src/artifacts/__tests__/fixtures/example-user-flow.json`
- **JSON Schema (File Validation)**: Location TBD - depends on WINT-0180 storage strategy decision
  - Will be updated once WINT-0180 AC-2 determines storage pattern (filesystem, database, or hybrid)

### Required States

All user flows must handle these 5 required states for complete UX coverage:

1. **loading** - Initial data fetch in progress (show spinner or skeleton state)
2. **empty** - No data exists yet (show empty state with call-to-action)
3. **validation_error** - User input failed validation (show form errors with inline feedback)
4. **server_error** - Backend returned 5xx error (show error boundary with retry option)
5. **permission_denied** - User lacks required permissions (show 403 state, upgrade prompt)

### Standard Capabilities

User flows can include these capabilities, mapped to CRUD operations:

| Capability | CRUD Mapping | Description |
|------------|--------------|-------------|
| `create` | C (Create) | Create new entity |
| `view` | R (Read) | Read/view entity |
| `edit` | U (Update) | Update existing entity |
| `delete` | D (Delete) | Remove entity |
| `upload` | - | Upload file/media (initial upload) |
| `replace` | - | Replace file/media (update existing file) |
| `download` | - | Download file/media |

### Hard Constraints

- **Maximum 5 flows per feature** - Prevents feature sprawl
- **Maximum 7 steps per flow** - Prevents mega-flow complexity
- **Semver schema_version** - Tracks schema evolution (e.g., "1.0.0")

### Agent Validation Usage

Import and use the Zod schema for runtime validation:

```typescript
import { UserFlowsSchema, type UserFlows } from '@repo/orchestrator/artifacts/__types__/user-flows'

// Validate user flows JSON
try {
  const userFlows = UserFlowsSchema.parse(userFlowsJson)
  console.log('Valid user flows:', userFlows)
} catch (error) {
  console.error('Validation failed:', error.errors)
}

// Type-safe access
const flows: UserFlows = UserFlowsSchema.parse(input)
flows.flows.forEach(flow => {
  console.log(`Flow: ${flow.flowName}`)
  flow.steps.forEach(step => {
    console.log(`  - ${step.stepName} (${step.state})`)
  })
})
```

### PO Cohesion Check Integration

This schema enables automated cohesion checks across multiple stories:

#### WINT-0210: Role Pack Templates

The PO role pack will import this schema to validate user flows during the elaboration phase:

```typescript
import { UserFlowsSchema } from '@repo/orchestrator/artifacts/__types__/user-flows'

// Validate feature completeness
const userFlows = UserFlowsSchema.parse(featureFlows)

// Check state coverage
const allStates = userFlows.flows.flatMap(f => f.steps.map(s => s.state))
const missingStates = ['loading', 'empty', 'validation_error', 'server_error', 'permission_denied']
  .filter(state => !allStates.includes(state))

if (missingStates.length > 0) {
  console.warn('Missing required states:', missingStates)
}

// Check CRUD capability coverage
const allCapabilities = userFlows.flows.flatMap(f => f.steps.flatMap(s => s.capabilities))
const hasCRUD = ['create', 'view', 'edit', 'delete'].every(cap => allCapabilities.includes(cap))

if (!hasCRUD) {
  console.warn('Feature is missing CRUD capabilities')
}
```

#### WINT-4010: Cohesion Sidecar

The cohesion sidecar will use this schema for automated validation:

```typescript
// Automated validation service
const cohesionResults = await cohesionSidecar.validateFeature({
  featureId: 'FEAT-123',
  userFlowsPath: './user-flows.json',
})

// Returns findings for PO review
cohesionResults.findings.forEach(finding => {
  console.log(`${finding.type}: ${finding.message}`)
})
```

#### WINT-4070: cohesion-prosecutor Agent

The PO enforcement agent will use this schema to block incomplete features:

```typescript
// PO agent validates feature cohesion before approval
const cohesionReport = await prosecutorAgent.checkFeatureCohesion(userFlows)

if (!cohesionReport.isComplete) {
  throw new Error(`Feature fails cohesion check: ${cohesionReport.issues.join(', ')}`)
}
```

### Extensibility

#### Adding New States

To add a new state to the enum:

1. **Update Zod Schema**: Add the new state value to `UserFlowStateEnum` in `user-flows.ts`
2. **Increment Schema Version**: Update `schema_version` (minor version: 1.0.0 → 1.1.0)
3. **Update Documentation**: Add TSDoc comment with state description and usage guidance
4. **Add Tests**: Create test cases for new state validation in `user-flows.test.ts`
5. **Update Example**: Add new state to `example-user-flow.json` (if applicable)
6. **Coordinate Downstream**: Update WINT-0210/WINT-4xxx cohesion rules if needed

**Example:**

```typescript
// Before (v1.0.0)
export const UserFlowStateEnum = z.enum([
  'loading',
  'empty',
  'validation_error',
  'server_error',
  'permission_denied',
])

// After adding 'maintenance' state (v1.1.0)
export const UserFlowStateEnum = z.enum([
  'loading',
  'empty',
  'validation_error',
  'server_error',
  'permission_denied',
  'maintenance', // New state
])
```

#### Adding New Capabilities

To add a new capability to the enum:

1. **Update Zod Schema**: Add the new capability value to `UserFlowCapabilityEnum` in `user-flows.ts`
2. **Increment Schema Version**: Update `schema_version` (minor version: 1.0.0 → 1.1.0)
3. **Update Documentation**: Add TSDoc comment with capability description and CRUD mapping (if applicable)
4. **Add Tests**: Create test cases for new capability validation in `user-flows.test.ts`
5. **Update Example**: Add new capability to `example-user-flow.json` (if applicable)
6. **Update Cohesion Rules**: Coordinate with WINT-4050 if capability affects completeness checks

**Example:**

```typescript
// Before (v1.0.0)
export const UserFlowCapabilityEnum = z.enum([
  'create',
  'view',
  'edit',
  'delete',
  'upload',
  'replace',
  'download',
])

// After adding 'share' capability (v1.1.0)
export const UserFlowCapabilityEnum = z.enum([
  'create',
  'view',
  'edit',
  'delete',
  'upload',
  'replace',
  'download',
  'share', // New capability
])
```

### Schema Versioning

The `schema_version` field uses semantic versioning (major.minor.patch):

- **Major version** (e.g., 1.0.0 → 2.0.0): Breaking changes to enum values or structure
- **Minor version** (e.g., 1.0.0 → 1.1.0): New enum values added (backward compatible)
- **Patch version** (e.g., 1.0.0 → 1.0.1): Documentation or clarification updates

#### Migration Process

When a breaking change is required:

1. Document migration path in schema changelog
2. Provide migration script for existing flows
3. Update all downstream consumers (WINT-0210, WINT-4010, WINT-4070)
4. Increment major version

### Related Stories

- **WINT-0180** (Examples Framework) - Defines storage patterns for schemas
- **WINT-0210** (Role Pack Templates) - PO role pack will use schema for cohesion checks
- **WINT-4010** (Cohesion Sidecar) - Automated validation service
- **WINT-4070** (cohesion-prosecutor Agent) - PO enforcement agent

### Testing

Run the test suite:

```bash
cd packages/backend/orchestrator
pnpm test user-flows.test.ts
```

Test coverage: **100%** (all validation paths covered)

### Example User Flow

See `packages/backend/orchestrator/src/artifacts/__tests__/fixtures/example-user-flow.json` for a complete example demonstrating:

- All 5 required states
- Common CRUD capabilities (create, view, edit, delete)
- Multiple flows (4 flows in the example)
- Proper step structure with descriptions

The example validates successfully against both the Zod schema and will validate against the JSON Schema once WINT-0180 determines the storage location.
