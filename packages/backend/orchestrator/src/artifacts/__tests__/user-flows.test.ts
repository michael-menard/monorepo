/**
 * User Flows Schema Validation Tests
 * WINT-0200: Create User Flows Schema with State/Capability Enums
 *
 * Comprehensive validation tests for user flows schema:
 * - Happy path: Valid flows with all states/capabilities
 * - Error cases: Max constraints, invalid enums
 * - Edge cases: Empty arrays, boundaries
 * - Round-trip validation: JSON → Zod → JSON consistency
 */

import { describe, expect, it } from 'vitest'
import { ZodError } from 'zod'
import {
  UserFlowCapabilityEnum,
  UserFlowSchema,
  UserFlowsSchema,
  UserFlowStateEnum,
  UserFlowStepSchema,
  type UserFlow,
  type UserFlows,
  type UserFlowStep,
} from '../__types__/user-flows'
// Note: JSON Schema location is temporary pending WINT-0180 AC-2 decision
// eslint-disable-next-line import/no-relative-parent-imports
import userFlowsJsonSchema from '../../schemas/user-flows.schema.json'
import exampleFlow from './fixtures/example-user-flow.json'
 

describe('UserFlowStateEnum', () => {
  describe('valid states', () => {
    it('validates all 5 required states', () => {
      expect(UserFlowStateEnum.parse('loading')).toBe('loading')
      expect(UserFlowStateEnum.parse('empty')).toBe('empty')
      expect(UserFlowStateEnum.parse('validation_error')).toBe('validation_error')
      expect(UserFlowStateEnum.parse('server_error')).toBe('server_error')
      expect(UserFlowStateEnum.parse('permission_denied')).toBe('permission_denied')
    })
  })

  describe('invalid states', () => {
    it('rejects invalid state value with clear error', () => {
      try {
        UserFlowStateEnum.parse('invalid_state')
        expect.fail('Should have thrown ZodError')
      } catch (err) {
        expect(err).toBeInstanceOf(ZodError)
        const zodError = err as ZodError
        expect(zodError.errors[0].message).toContain(
          "Invalid enum value. Expected 'loading' | 'empty' | 'validation_error' | 'server_error' | 'permission_denied'",
        )
      }
    })
  })
})

describe('UserFlowCapabilityEnum', () => {
  describe('valid capabilities', () => {
    it('validates all 7 capabilities', () => {
      expect(UserFlowCapabilityEnum.parse('create')).toBe('create')
      expect(UserFlowCapabilityEnum.parse('view')).toBe('view')
      expect(UserFlowCapabilityEnum.parse('edit')).toBe('edit')
      expect(UserFlowCapabilityEnum.parse('delete')).toBe('delete')
      expect(UserFlowCapabilityEnum.parse('upload')).toBe('upload')
      expect(UserFlowCapabilityEnum.parse('replace')).toBe('replace')
      expect(UserFlowCapabilityEnum.parse('download')).toBe('download')
    })
  })

  describe('invalid capabilities', () => {
    it('rejects invalid capability value with clear error', () => {
      try {
        UserFlowCapabilityEnum.parse('invalid_capability')
        expect.fail('Should have thrown ZodError')
      } catch (err) {
        expect(err).toBeInstanceOf(ZodError)
        const zodError = err as ZodError
        expect(zodError.errors[0].message).toContain(
          "Invalid enum value. Expected 'create' | 'view' | 'edit' | 'delete' | 'upload' | 'replace' | 'download'",
        )
      }
    })
  })
})

describe('UserFlowStepSchema', () => {
  describe('valid steps', () => {
    it('validates a minimal valid step', () => {
      const step: UserFlowStep = {
        stepName: 'Load data',
        state: 'loading',
        capabilities: [],
      }
      const result = UserFlowStepSchema.parse(step)
      expect(result).toMatchObject(step)
    })

    it('validates a step with all fields', () => {
      const step: UserFlowStep = {
        stepName: 'Create item',
        state: 'empty',
        capabilities: ['create', 'view'],
        description: 'User creates a new item',
      }
      const result = UserFlowStepSchema.parse(step)
      expect(result.stepName).toBe('Create item')
      expect(result.state).toBe('empty')
      expect(result.capabilities).toEqual(['create', 'view'])
      expect(result.description).toBe('User creates a new item')
    })

    it('validates a step with all 7 capabilities', () => {
      const step: UserFlowStep = {
        stepName: 'Full management',
        state: 'empty',
        capabilities: ['create', 'view', 'edit', 'delete', 'upload', 'replace', 'download'],
      }
      const result = UserFlowStepSchema.parse(step)
      expect(result.capabilities).toHaveLength(7)
    })
  })

  describe('invalid steps', () => {
    it('rejects step with empty name', () => {
      const step = {
        stepName: '',
        state: 'loading',
        capabilities: [],
      }
      try {
        UserFlowStepSchema.parse(step)
        expect.fail('Should have thrown ZodError')
      } catch (err) {
        expect(err).toBeInstanceOf(ZodError)
      }
    })

    it('rejects step with invalid state', () => {
      const step = {
        stepName: 'Load data',
        state: 'invalid_state',
        capabilities: [],
      }
      try {
        UserFlowStepSchema.parse(step)
        expect.fail('Should have thrown ZodError')
      } catch (err) {
        expect(err).toBeInstanceOf(ZodError)
      }
    })

    it('rejects step with too many capabilities (>7)', () => {
      const step = {
        stepName: 'Too many capabilities',
        state: 'empty',
        capabilities: [
          'create',
          'view',
          'edit',
          'delete',
          'upload',
          'replace',
          'download',
          'create', // 8th capability (duplicate for test)
        ],
      }
      try {
        UserFlowStepSchema.parse(step)
        expect.fail('Should have thrown ZodError')
      } catch (err) {
        expect(err).toBeInstanceOf(ZodError)
        const zodError = err as ZodError
        expect(zodError.errors[0].message).toContain('cannot have more than 7 capabilities')
      }
    })
  })
})

describe('UserFlowSchema', () => {
  describe('valid flows', () => {
    it('validates a minimal valid flow', () => {
      const flow: UserFlow = {
        flowName: 'Basic flow',
        steps: [
          {
            stepName: 'Step 1',
            state: 'loading',
            capabilities: [],
          },
        ],
      }
      const result = UserFlowSchema.parse(flow)
      expect(result).toMatchObject(flow)
    })

    it('validates a flow with max 7 steps (boundary test)', () => {
      const flow: UserFlow = {
        flowName: 'Max steps flow',
        steps: [
          { stepName: 'Step 1', state: 'loading', capabilities: [] },
          { stepName: 'Step 2', state: 'empty', capabilities: [] },
          { stepName: 'Step 3', state: 'validation_error', capabilities: [] },
          { stepName: 'Step 4', state: 'server_error', capabilities: [] },
          { stepName: 'Step 5', state: 'permission_denied', capabilities: [] },
          { stepName: 'Step 6', state: 'loading', capabilities: [] },
          { stepName: 'Step 7', state: 'empty', capabilities: [] },
        ],
      }
      const result = UserFlowSchema.parse(flow)
      expect(result.steps).toHaveLength(7)
    })

    it('validates a flow using all 5 required states', () => {
      const flow: UserFlow = {
        flowName: 'All states flow',
        steps: [
          { stepName: 'Loading step', state: 'loading', capabilities: ['view'] },
          { stepName: 'Empty step', state: 'empty', capabilities: ['create'] },
          { stepName: 'Validation error step', state: 'validation_error', capabilities: ['edit'] },
          { stepName: 'Server error step', state: 'server_error', capabilities: ['view'] },
          {
            stepName: 'Permission denied step',
            state: 'permission_denied',
            capabilities: ['view'],
          },
        ],
      }
      const result = UserFlowSchema.parse(flow)
      const states = result.steps.map(s => s.state)
      expect(states).toContain('loading')
      expect(states).toContain('empty')
      expect(states).toContain('validation_error')
      expect(states).toContain('server_error')
      expect(states).toContain('permission_denied')
    })
  })

  describe('invalid flows', () => {
    it('rejects flow with empty steps array', () => {
      const flow = {
        flowName: 'Empty flow',
        steps: [],
      }
      try {
        UserFlowSchema.parse(flow)
        expect.fail('Should have thrown ZodError')
      } catch (err) {
        expect(err).toBeInstanceOf(ZodError)
        const zodError = err as ZodError
        expect(zodError.errors[0].message).toContain('Flow must have at least 1 step')
      }
    })

    it('rejects flow with too many steps (>7)', () => {
      const flow = {
        flowName: 'Too many steps',
        steps: [
          { stepName: 'Step 1', state: 'loading', capabilities: [] },
          { stepName: 'Step 2', state: 'loading', capabilities: [] },
          { stepName: 'Step 3', state: 'loading', capabilities: [] },
          { stepName: 'Step 4', state: 'loading', capabilities: [] },
          { stepName: 'Step 5', state: 'loading', capabilities: [] },
          { stepName: 'Step 6', state: 'loading', capabilities: [] },
          { stepName: 'Step 7', state: 'loading', capabilities: [] },
          { stepName: 'Step 8', state: 'loading', capabilities: [] }, // 8th step
        ],
      }
      try {
        UserFlowSchema.parse(flow)
        expect.fail('Should have thrown ZodError')
      } catch (err) {
        expect(err).toBeInstanceOf(ZodError)
        const zodError = err as ZodError
        expect(zodError.errors[0].message).toContain('Flow cannot exceed 7 steps')
      }
    })
  })
})

describe('UserFlowsSchema', () => {
  describe('valid user flows', () => {
    it('validates an empty flows array (early planning state)', () => {
      const userFlows: UserFlows = {
        schema_version: '1.0.0',
        flows: [],
        featureName: 'Early feature',
      }
      const result = UserFlowsSchema.parse(userFlows)
      expect(result.flows).toHaveLength(0)
    })

    it('validates a single flow', () => {
      const userFlows: UserFlows = {
        schema_version: '1.0.0',
        flows: [
          {
            flowName: 'Single flow',
            steps: [
              {
                stepName: 'Step 1',
                state: 'loading',
                capabilities: ['view'],
              },
            ],
          },
        ],
      }
      const result = UserFlowsSchema.parse(userFlows)
      expect(result.flows).toHaveLength(1)
    })

    it('validates max 5 flows (boundary test)', () => {
      const userFlows: UserFlows = {
        schema_version: '1.0.0',
        flows: [
          {
            flowName: 'Flow 1',
            steps: [{ stepName: 'Step 1', state: 'loading', capabilities: [] }],
          },
          {
            flowName: 'Flow 2',
            steps: [{ stepName: 'Step 1', state: 'empty', capabilities: [] }],
          },
          {
            flowName: 'Flow 3',
            steps: [{ stepName: 'Step 1', state: 'validation_error', capabilities: [] }],
          },
          {
            flowName: 'Flow 4',
            steps: [{ stepName: 'Step 1', state: 'server_error', capabilities: [] }],
          },
          {
            flowName: 'Flow 5',
            steps: [{ stepName: 'Step 1', state: 'permission_denied', capabilities: [] }],
          },
        ],
      }
      const result = UserFlowsSchema.parse(userFlows)
      expect(result.flows).toHaveLength(5)
    })

    it('validates flows with all common capabilities (create, view, edit, delete)', () => {
      const userFlows: UserFlows = {
        schema_version: '1.0.0',
        flows: [
          {
            flowName: 'CRUD flow',
            steps: [
              { stepName: 'View items', state: 'loading', capabilities: ['view'] },
              { stepName: 'Create item', state: 'empty', capabilities: ['create'] },
              { stepName: 'Edit item', state: 'empty', capabilities: ['edit', 'view'] },
              { stepName: 'Delete item', state: 'empty', capabilities: ['delete'] },
            ],
          },
        ],
      }
      const result = UserFlowsSchema.parse(userFlows)
      const allCapabilities = result.flows.flatMap(f =>
        f.steps.flatMap(s => s.capabilities),
      )
      expect(allCapabilities).toContain('create')
      expect(allCapabilities).toContain('view')
      expect(allCapabilities).toContain('edit')
      expect(allCapabilities).toContain('delete')
    })
  })

  describe('invalid user flows', () => {
    it('rejects invalid schema_version format', () => {
      const userFlows = {
        schema_version: 'invalid',
        flows: [],
      }
      try {
        UserFlowsSchema.parse(userFlows)
        expect.fail('Should have thrown ZodError')
      } catch (err) {
        expect(err).toBeInstanceOf(ZodError)
        const zodError = err as ZodError
        expect(zodError.errors[0].message).toContain('schema_version must be semver format')
      }
    })

    it('rejects too many flows (>5)', () => {
      const userFlows = {
        schema_version: '1.0.0',
        flows: [
          { flowName: 'Flow 1', steps: [{ stepName: 'S1', state: 'loading', capabilities: [] }] },
          { flowName: 'Flow 2', steps: [{ stepName: 'S1', state: 'loading', capabilities: [] }] },
          { flowName: 'Flow 3', steps: [{ stepName: 'S1', state: 'loading', capabilities: [] }] },
          { flowName: 'Flow 4', steps: [{ stepName: 'S1', state: 'loading', capabilities: [] }] },
          { flowName: 'Flow 5', steps: [{ stepName: 'S1', state: 'loading', capabilities: [] }] },
          { flowName: 'Flow 6', steps: [{ stepName: 'S1', state: 'loading', capabilities: [] }] }, // 6th flow
        ],
      }
      try {
        UserFlowsSchema.parse(userFlows)
        expect.fail('Should have thrown ZodError')
      } catch (err) {
        expect(err).toBeInstanceOf(ZodError)
        const zodError = err as ZodError
        expect(zodError.errors[0].message).toContain('Feature cannot exceed 5 flows')
      }
    })
  })

  describe('round-trip validation', () => {
    it('validates JSON → Zod → JSON consistency', () => {
      const input: UserFlows = {
        schema_version: '1.0.0',
        flows: [
          {
            flowName: 'Test flow',
            steps: [
              {
                stepName: 'Step 1',
                state: 'loading',
                capabilities: ['view'],
                description: 'Test step',
              },
            ],
            description: 'Test flow description',
          },
        ],
        featureName: 'Test feature',
      }

      // Serialize to JSON
      const json = JSON.stringify(input)

      // Parse JSON
      const parsed = JSON.parse(json)

      // Validate with Zod
      const validated = UserFlowsSchema.parse(parsed)

      // Serialize back to JSON
      const outputJson = JSON.stringify(validated)

      // Ensure round-trip matches
      expect(outputJson).toBe(json)
    })
  })

  describe('example flow validation (AC-6)', () => {
    it('validates example-user-flow.json against Zod schema', () => {
      const result = UserFlowsSchema.parse(exampleFlow)
      expect(result.schema_version).toBe('1.0.0')
      expect(result.featureName).toBe('LEGO Set Management')
      expect(result.flows.length).toBeGreaterThan(0)
      expect(result.flows.length).toBeLessThanOrEqual(5)
    })

    it('verifies example flow includes all 5 required states', () => {
      const result = UserFlowsSchema.parse(exampleFlow)
      const allStates = result.flows.flatMap(f => f.steps.map(s => s.state))

      expect(allStates).toContain('loading')
      expect(allStates).toContain('empty')
      expect(allStates).toContain('validation_error')
      expect(allStates).toContain('server_error')
      expect(allStates).toContain('permission_denied')
    })

    it('verifies example flow includes at least 4 common capabilities', () => {
      const result = UserFlowsSchema.parse(exampleFlow)
      const allCapabilities = result.flows.flatMap(f =>
        f.steps.flatMap(s => s.capabilities),
      )
      const uniqueCapabilities = [...new Set(allCapabilities)]

      expect(uniqueCapabilities).toContain('create')
      expect(uniqueCapabilities).toContain('view')
      expect(uniqueCapabilities).toContain('edit')
      expect(uniqueCapabilities).toContain('delete')
    })

    it('verifies all flows in example respect max 7 steps constraint', () => {
      const result = UserFlowsSchema.parse(exampleFlow)
      result.flows.forEach(flow => {
        expect(flow.steps.length).toBeLessThanOrEqual(7)
      })
    })
  })

  describe('JSON Schema validation (AC-1)', () => {
    it('validates JSON Schema is valid Draft 2020-12', () => {
      expect(userFlowsJsonSchema.$schema).toBe('https://json-schema.org/draft/2020-12/schema')
      expect(userFlowsJsonSchema.$id).toBeTruthy()
      expect(userFlowsJsonSchema.title).toBe('User Flows Schema')
      expect(userFlowsJsonSchema.$defs).toBeDefined()
    })

    it('JSON Schema defines all required enums', () => {
      const stateEnum = userFlowsJsonSchema.$defs.UserFlowState as {
        enum: string[]
      }
      const capabilityEnum = userFlowsJsonSchema.$defs.UserFlowCapability as {
        enum: string[]
      }

      // Verify states enum
      expect(stateEnum.enum).toHaveLength(5)
      expect(stateEnum.enum).toContain('loading')
      expect(stateEnum.enum).toContain('empty')
      expect(stateEnum.enum).toContain('validation_error')
      expect(stateEnum.enum).toContain('server_error')
      expect(stateEnum.enum).toContain('permission_denied')

      // Verify capabilities enum
      expect(capabilityEnum.enum).toHaveLength(7)
      expect(capabilityEnum.enum).toContain('create')
      expect(capabilityEnum.enum).toContain('view')
      expect(capabilityEnum.enum).toContain('edit')
      expect(capabilityEnum.enum).toContain('delete')
      expect(capabilityEnum.enum).toContain('upload')
      expect(capabilityEnum.enum).toContain('replace')
      expect(capabilityEnum.enum).toContain('download')
    })

    it('JSON Schema defines max constraints', () => {
      const flowsProperty = userFlowsJsonSchema.properties.flows as {
        maxItems: number
      }
      const userFlowDef = userFlowsJsonSchema.$defs.UserFlow as {
        properties: {
          steps: { maxItems: number }
        }
      }

      expect(flowsProperty.maxItems).toBe(5)
      expect(userFlowDef.properties.steps.maxItems).toBe(7)
    })
  })
})
