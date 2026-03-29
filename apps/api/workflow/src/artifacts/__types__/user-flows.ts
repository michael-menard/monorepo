/**
 * User Flows Schema with State/Capability Enums
 * WINT-0200: Create User Flows Schema with State/Capability Enums
 *
 * Defines Zod schemas for user flow validation with required states and capabilities.
 * Enables PO cohesion checks and automated validation (WINT-0210, WINT-4010, WINT-4070).
 *
 * Uses Zod-first approach per CLAUDE.md - no TypeScript interfaces.
 */

import { z } from 'zod'

/**
 * User Flow State Enum
 *
 * Defines the required states that all user flows must handle for complete UX coverage.
 * PO cohesion checks verify that features address all required states.
 *
 * @remarks
 * Required states:
 * - `loading`: Initial data fetch in progress (show spinner or skeleton state)
 * - `empty`: No data exists yet (show empty state with call-to-action)
 * - `validation_error`: User input failed validation (show form errors with inline feedback)
 * - `server_error`: Backend returned 5xx error (show error boundary with retry option)
 * - `permission_denied`: User lacks required permissions (show 403 state, upgrade prompt)
 *
 * ## Extensibility
 *
 * To add a new state to this enum:
 * 1. Add the new state value to the enum array below
 * 2. Increment schema_version (minor version for new values, e.g., 1.0.0 → 1.1.0)
 * 3. Update this TSDoc comment with state description and usage guidance
 * 4. Add test cases for new state validation in user-flows.test.ts
 * 5. Update example flow to demonstrate new state (if applicable)
 * 6. Coordinate with WINT-0210/WINT-4xxx for cohesion rule updates
 *
 * @example
 * ```typescript
 * // Before (v1.0.0)
 * z.enum(['loading', 'empty', 'validation_error', 'server_error', 'permission_denied'])
 *
 * // After adding 'maintenance' state (v1.1.0)
 * z.enum(['loading', 'empty', 'validation_error', 'server_error', 'permission_denied', 'maintenance'])
 * ```
 */
export const UserFlowStateEnum = z.enum([
  'loading',
  'empty',
  'validation_error',
  'server_error',
  'permission_denied',
])

export type UserFlowState = z.infer<typeof UserFlowStateEnum>

/**
 * User Flow Capability Enum
 *
 * Defines the standard capabilities that user flows can include, mapped to CRUD operations.
 * PO cohesion checks verify that CRUD features include appropriate capabilities.
 *
 * @remarks
 * Standard capabilities with CRUD mapping:
 * - `create`: Create new entity (C in CRUD) - Used for add/create operations
 * - `view`: Read/view entity (R in CRUD) - Used for display/detail views
 * - `edit`: Update existing entity (U in CRUD) - Used for edit/modify operations
 * - `delete`: Remove entity (D in CRUD) - Used for delete/archive operations
 * - `upload`: Upload file/media (initial upload) - Used for new file uploads
 * - `replace`: Replace file/media (update existing file) - Used for file replacement
 * - `download`: Download file/media - Used for file export/download
 *
 * ## Extensibility
 *
 * To add a new capability to this enum:
 * 1. Add the new capability value to the enum array below
 * 2. Increment schema_version (minor version for new values, e.g., 1.0.0 → 1.1.0)
 * 3. Update this TSDoc comment with capability description and CRUD mapping (if applicable)
 * 4. Add test cases for new capability validation in user-flows.test.ts
 * 5. Update example flow to demonstrate new capability (if applicable)
 * 6. Update WINT-4050 cohesion rules if capability affects completeness checks
 *
 * @example
 * ```typescript
 * // Before (v1.0.0)
 * z.enum(['create', 'view', 'edit', 'delete', 'upload', 'replace', 'download'])
 *
 * // After adding 'share' capability (v1.1.0)
 * z.enum(['create', 'view', 'edit', 'delete', 'upload', 'replace', 'download', 'share'])
 * ```
 */
export const UserFlowCapabilityEnum = z.enum([
  'create',
  'view',
  'edit',
  'delete',
  'upload',
  'replace',
  'download',
])

export type UserFlowCapability = z.infer<typeof UserFlowCapabilityEnum>

/**
 * User Flow Step Schema
 *
 * Defines a single step within a user flow, including state and capabilities.
 */
export const UserFlowStepSchema = z.object({
  stepName: z.string().min(1, 'Step name is required'),
  state: UserFlowStateEnum,
  capabilities: z
    .array(UserFlowCapabilityEnum)
    .min(0, 'Capabilities array cannot be negative length')
    .max(7, 'Step cannot have more than 7 capabilities'),
  description: z.string().optional(),
})

export type UserFlowStep = z.infer<typeof UserFlowStepSchema>

/**
 * User Flow Schema
 *
 * Defines a complete user flow with multiple steps.
 * Hard constraint: Maximum 7 steps per flow to prevent mega-flow complexity.
 */
export const UserFlowSchema = z.object({
  flowName: z.string().min(1, 'Flow name is required'),
  steps: z
    .array(UserFlowStepSchema)
    .min(1, 'Flow must have at least 1 step')
    .max(7, 'Flow cannot exceed 7 steps'),
  description: z.string().optional(),
})

export type UserFlow = z.infer<typeof UserFlowSchema>

/**
 * User Flows Schema
 *
 * Defines all user flows for a feature.
 * Hard constraint: Maximum 5 flows per feature to prevent feature sprawl.
 */
export const UserFlowsSchema = z.object({
  schema_version: z.string().regex(/^\d+\.\d+\.\d+$/, 'schema_version must be semver format'),
  flows: z
    .array(UserFlowSchema)
    .min(0, 'Flows array can be empty for features in early planning')
    .max(5, 'Feature cannot exceed 5 flows'),
  featureName: z.string().optional(),
})

export type UserFlows = z.infer<typeof UserFlowsSchema>
