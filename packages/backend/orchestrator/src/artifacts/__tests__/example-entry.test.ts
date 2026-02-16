import { describe, expect, it } from 'vitest'

import {
  createExampleEntry,
  deprecateExampleEntry,
  ExampleCategorySchema,
  ExampleEntrySchema,
  ExampleLifecycleStateSchema,
  ExampleTypeSchema,
  recordExampleUsage,
  validateExampleEntry,
  type ExampleCategory,
  type ExampleEntry,
  type ExampleLifecycleState,
  type ExampleType,
} from '../example-entry'

describe('ExampleEntry Schemas', () => {
  describe('ExampleCategorySchema', () => {
    it('accepts valid categories', () => {
      const validCategories: ExampleCategory[] = [
        'decision-making',
        'code-patterns',
        'testing',
        'documentation',
        'error-handling',
        'validation',
        'state-management',
        'api-design',
        'performance',
        'accessibility',
        'security',
        'data-modeling',
        'workflow',
        'communication',
        'other',
      ]

      validCategories.forEach(category => {
        expect(ExampleCategorySchema.parse(category)).toBe(category)
      })
    })

    it('rejects invalid categories', () => {
      expect(() => ExampleCategorySchema.parse('invalid-category')).toThrow()
      expect(() => ExampleCategorySchema.parse('')).toThrow()
      expect(() => ExampleCategorySchema.parse(123)).toThrow()
    })
  })

  describe('ExampleLifecycleStateSchema', () => {
    it('accepts valid states', () => {
      const validStates: ExampleLifecycleState[] = ['created', 'validated', 'deprecated']

      validStates.forEach(state => {
        expect(ExampleLifecycleStateSchema.parse(state)).toBe(state)
      })
    })

    it('rejects invalid states', () => {
      expect(() => ExampleLifecycleStateSchema.parse('active')).toThrow()
      expect(() => ExampleLifecycleStateSchema.parse('pending')).toThrow()
    })
  })

  describe('ExampleTypeSchema', () => {
    it('accepts valid types', () => {
      const validTypes: ExampleType[] = ['positive', 'negative', 'both']

      validTypes.forEach(type => {
        expect(ExampleTypeSchema.parse(type)).toBe(type)
      })
    })

    it('rejects invalid types', () => {
      expect(() => ExampleTypeSchema.parse('mixed')).toThrow()
    })
  })

  describe('ExampleEntrySchema validation', () => {
    it('validates a minimal valid example entry', () => {
      const example = {
        schema_version: '1.0.0',
        id: 'example-001',
        category: 'code-patterns',
        type: 'both',
        scenario: 'Choosing between interface and Zod schema',
        positive_example: 'Use Zod schema with z.infer<typeof>',
        negative_example: 'Do not use TypeScript interfaces without Zod',
        status: 'created',
        created_at: '2026-02-14T12:00:00.000Z',
        updated_at: '2026-02-14T12:00:00.000Z',
        validated_at: null,
        deprecated_at: null,
        created_by: null,
        source_story_id: null,
        deprecation_reason: null,
        superseded_by: null,
      }

      const result = ExampleEntrySchema.parse(example)
      expect(result).toMatchObject(example)
    })

    it('validates example with all optional fields', () => {
      const example = {
        schema_version: '1.0.0',
        id: 'example-002',
        category: 'testing',
        type: 'positive',
        scenario: 'Writing unit tests for Zod schemas',
        positive_example: 'Test round-trip validation with parse/stringify',
        negative_example: null,
        context: {
          applicability: 'All Zod schema validations',
          prerequisites: ['Vitest installed', 'Schema defined'],
          related_examples: ['example-001'],
          decision_tier: 1,
          tags: ['zod', 'testing', 'validation'],
        },
        outcome_metrics: {
          times_referenced: 5,
          times_followed: 4,
          success_rate: 0.75,
          last_used_at: '2026-02-14T11:00:00.000Z',
        },
        status: 'validated',
        created_at: '2026-02-13T12:00:00.000Z',
        updated_at: '2026-02-14T12:00:00.000Z',
        validated_at: '2026-02-13T15:00:00.000Z',
        deprecated_at: null,
        created_by: 'dev-coder-agent',
        source_story_id: 'WINT-0100',
        deprecation_reason: null,
        superseded_by: null,
      }

      const result = ExampleEntrySchema.parse(example)
      expect(result.context?.tags).toContain('zod')
      expect(result.outcome_metrics?.times_referenced).toBe(5)
      expect(result.status).toBe('validated')
    })

    it('rejects invalid schema version format', () => {
      const example = {
        schema_version: '1.0', // Not semver
        id: 'example-003',
        category: 'code-patterns',
        scenario: 'Test scenario that is long enough',
        status: 'created',
        created_at: '2026-02-14T12:00:00.000Z',
        updated_at: '2026-02-14T12:00:00.000Z',
      }

      expect(() => ExampleEntrySchema.parse(example)).toThrow()
    })

    it('rejects scenario that is too short', () => {
      const example = {
        schema_version: '1.0.0',
        id: 'example-004',
        category: 'code-patterns',
        scenario: 'Short', // Less than 10 chars
        status: 'created',
        created_at: '2026-02-14T12:00:00.000Z',
        updated_at: '2026-02-14T12:00:00.000Z',
      }

      expect(() => ExampleEntrySchema.parse(example)).toThrow()
    })

    it('rejects invalid timestamp format', () => {
      const example = {
        schema_version: '1.0.0',
        id: 'example-005',
        category: 'code-patterns',
        scenario: 'Valid scenario description here',
        status: 'created',
        created_at: 'not-a-timestamp',
        updated_at: '2026-02-14T12:00:00.000Z',
      }

      expect(() => ExampleEntrySchema.parse(example)).toThrow()
    })

    it('validates decision tier constraints', () => {
      const example = {
        schema_version: '1.0.0',
        id: 'example-006',
        category: 'decision-making',
        scenario: 'Valid scenario description',
        context: {
          decision_tier: 3, // Valid (1-5)
        },
        status: 'created',
        created_at: '2026-02-14T12:00:00.000Z',
        updated_at: '2026-02-14T12:00:00.000Z',
      }

      expect(() => ExampleEntrySchema.parse(example)).not.toThrow()
    })

    it('rejects decision tier outside valid range', () => {
      const example = {
        schema_version: '1.0.0',
        id: 'example-007',
        category: 'decision-making',
        scenario: 'Valid scenario description',
        context: {
          decision_tier: 6, // Invalid (must be 1-5)
        },
        status: 'created',
        created_at: '2026-02-14T12:00:00.000Z',
        updated_at: '2026-02-14T12:00:00.000Z',
      }

      expect(() => ExampleEntrySchema.parse(example)).toThrow()
    })

    it('validates success rate constraints', () => {
      const example = {
        schema_version: '1.0.0',
        id: 'example-008',
        category: 'testing',
        scenario: 'Valid scenario description',
        outcome_metrics: {
          times_referenced: 10,
          times_followed: 8,
          success_rate: 0.8, // Valid (0.0-1.0)
          last_used_at: '2026-02-14T11:00:00.000Z',
        },
        status: 'created',
        created_at: '2026-02-14T12:00:00.000Z',
        updated_at: '2026-02-14T12:00:00.000Z',
      }

      expect(() => ExampleEntrySchema.parse(example)).not.toThrow()
    })

    it('rejects success rate outside valid range', () => {
      const example = {
        schema_version: '1.0.0',
        id: 'example-009',
        category: 'testing',
        scenario: 'Valid scenario description',
        outcome_metrics: {
          times_referenced: 10,
          times_followed: 8,
          success_rate: 1.5, // Invalid (must be 0.0-1.0)
          last_used_at: '2026-02-14T11:00:00.000Z',
        },
        status: 'created',
        created_at: '2026-02-14T12:00:00.000Z',
        updated_at: '2026-02-14T12:00:00.000Z',
      }

      expect(() => ExampleEntrySchema.parse(example)).toThrow()
    })
  })

  describe('createExampleEntry', () => {
    it('creates an example with required fields only', () => {
      const example = createExampleEntry({
        id: 'example-010',
        category: 'code-patterns',
        scenario: 'Testing round-trip validation',
      })

      expect(example.schema_version).toBe('1.0.0')
      expect(example.id).toBe('example-010')
      expect(example.category).toBe('code-patterns')
      expect(example.scenario).toBe('Testing round-trip validation')
      expect(example.type).toBe('both')
      expect(example.status).toBe('created')
      expect(example.positive_example).toBeNull()
      expect(example.negative_example).toBeNull()
      expect(example.outcome_metrics?.times_referenced).toBe(0)
      expect(example.outcome_metrics?.times_followed).toBe(0)
    })

    it('creates an example with all optional fields', () => {
      const example = createExampleEntry({
        id: 'example-011',
        category: 'testing',
        scenario: 'Unit testing Zod schemas',
        type: 'positive',
        positive_example: 'Use .parse() for validation',
        negative_example: null,
        context: {
          decision_tier: 1,
          tags: ['zod', 'testing'],
        },
        created_by: 'dev-agent',
        source_story_id: 'WINT-0180',
      })

      expect(example.type).toBe('positive')
      expect(example.positive_example).toBe('Use .parse() for validation')
      expect(example.context?.decision_tier).toBe(1)
      expect(example.created_by).toBe('dev-agent')
      expect(example.source_story_id).toBe('WINT-0180')
    })

    it('creates a valid example that passes schema validation', () => {
      const example = createExampleEntry({
        id: 'example-012',
        category: 'documentation',
        scenario: 'Writing agent documentation',
        positive_example: 'Use markdown with YAML frontmatter',
      })

      expect(() => ExampleEntrySchema.parse(example)).not.toThrow()
    })

    it('sets timestamps correctly', () => {
      const before = new Date().toISOString()
      const example = createExampleEntry({
        id: 'example-013',
        category: 'workflow',
        scenario: 'Agent decision workflow',
      })
      const after = new Date().toISOString()

      expect(example.created_at).toBeDefined()
      expect(example.updated_at).toBeDefined()
      expect(example.created_at >= before).toBe(true)
      expect(example.created_at <= after).toBe(true)
      expect(example.validated_at).toBeNull()
      expect(example.deprecated_at).toBeNull()
    })
  })

  describe('validateExampleEntry', () => {
    it('transitions example from created to validated', async () => {
      const created = createExampleEntry({
        id: 'example-014',
        category: 'security',
        scenario: 'Input validation patterns',
      })

      expect(created.status).toBe('created')
      expect(created.validated_at).toBeNull()

      // Small delay to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 10))

      const validated = validateExampleEntry(created)

      expect(validated.status).toBe('validated')
      expect(validated.validated_at).not.toBeNull()
      expect(validated.updated_at).not.toBe(created.updated_at)
    })

    it('preserves all other fields when validating', () => {
      const created = createExampleEntry({
        id: 'example-015',
        category: 'api-design',
        scenario: 'RESTful API patterns',
        positive_example: 'Use standard HTTP methods',
        created_by: 'pm-agent',
      })

      const validated = validateExampleEntry(created)

      expect(validated.id).toBe(created.id)
      expect(validated.category).toBe(created.category)
      expect(validated.scenario).toBe(created.scenario)
      expect(validated.positive_example).toBe(created.positive_example)
      expect(validated.created_by).toBe(created.created_by)
      expect(validated.created_at).toBe(created.created_at)
    })
  })

  describe('deprecateExampleEntry', () => {
    it('transitions example to deprecated state', () => {
      const example = createExampleEntry({
        id: 'example-016',
        category: 'state-management',
        scenario: 'Old state management pattern',
      })

      const deprecated = deprecateExampleEntry(
        example,
        'Pattern no longer recommended',
        'example-017',
      )

      expect(deprecated.status).toBe('deprecated')
      expect(deprecated.deprecated_at).not.toBeNull()
      expect(deprecated.deprecation_reason).toBe('Pattern no longer recommended')
      expect(deprecated.superseded_by).toBe('example-017')
    })

    it('allows deprecation without superseding example', () => {
      const example = createExampleEntry({
        id: 'example-018',
        category: 'performance',
        scenario: 'Outdated optimization technique',
      })

      const deprecated = deprecateExampleEntry(example, 'No longer effective')

      expect(deprecated.status).toBe('deprecated')
      expect(deprecated.deprecation_reason).toBe('No longer effective')
      expect(deprecated.superseded_by).toBeNull()
    })

    it('updates timestamp when deprecating', async () => {
      const example = createExampleEntry({
        id: 'example-019',
        category: 'error-handling',
        scenario: 'Old error pattern',
      })

      const originalUpdated = example.updated_at

      // Small delay to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 10))

      const deprecated = deprecateExampleEntry(example, 'Deprecated')

      expect(deprecated.updated_at).not.toBe(originalUpdated)
    })
  })

  describe('recordExampleUsage', () => {
    it('increments times_referenced when example is queried', () => {
      const example = createExampleEntry({
        id: 'example-020',
        category: 'validation',
        scenario: 'Input validation',
      })

      expect(example.outcome_metrics?.times_referenced).toBe(0)

      const updated = recordExampleUsage(example, false)

      expect(updated.outcome_metrics?.times_referenced).toBe(1)
      expect(updated.outcome_metrics?.times_followed).toBe(0)
    })

    it('increments both times_referenced and times_followed when followed', () => {
      const example = createExampleEntry({
        id: 'example-021',
        category: 'accessibility',
        scenario: 'ARIA label patterns',
      })

      const updated = recordExampleUsage(example, true)

      expect(updated.outcome_metrics?.times_referenced).toBe(1)
      expect(updated.outcome_metrics?.times_followed).toBe(1)
    })

    it('calculates success rate correctly', () => {
      const example = createExampleEntry({
        id: 'example-022',
        category: 'testing',
        scenario: 'Test patterns',
      })

      // First usage: followed and successful
      let updated = recordExampleUsage(example, true, true)
      expect(updated.outcome_metrics?.success_rate).toBe(1.0)

      // Second usage: followed but failed
      updated = recordExampleUsage(updated, true, false)
      expect(updated.outcome_metrics?.success_rate).toBe(0.5)

      // Third usage: followed and successful
      updated = recordExampleUsage(updated, true, true)
      expect(updated.outcome_metrics?.success_rate).toBeCloseTo(0.667, 2)
    })

    it('updates last_used_at timestamp', () => {
      const example = createExampleEntry({
        id: 'example-023',
        category: 'data-modeling',
        scenario: 'Schema design',
      })

      expect(example.outcome_metrics?.last_used_at).toBeNull()

      const updated = recordExampleUsage(example, true)

      expect(updated.outcome_metrics?.last_used_at).not.toBeNull()
      expect(typeof updated.outcome_metrics?.last_used_at).toBe('string')
    })

    it('preserves success rate when not following', () => {
      const example = createExampleEntry({
        id: 'example-024',
        category: 'communication',
        scenario: 'User communication patterns',
      })

      // Set initial success rate
      let updated = recordExampleUsage(example, true, true)
      const initialSuccessRate = updated.outcome_metrics?.success_rate

      // Query but don't follow
      updated = recordExampleUsage(updated, false)

      expect(updated.outcome_metrics?.success_rate).toBe(initialSuccessRate)
    })
  })

  describe('Round-trip validation (AC-1)', () => {
    it('validates example can be stringified and parsed', () => {
      const original = createExampleEntry({
        id: 'example-025',
        category: 'code-patterns',
        scenario: 'Zod schema patterns for TypeScript',
        positive_example: 'Always use Zod with z.infer<typeof>',
        negative_example: 'Never use plain TypeScript interfaces',
        context: {
          decision_tier: 1,
          tags: ['typescript', 'zod', 'schemas'],
        },
      })

      // Round trip: object → JSON string → object
      const jsonString = JSON.stringify(original)
      const parsed = JSON.parse(jsonString)
      const validated = ExampleEntrySchema.parse(parsed)

      expect(validated).toMatchObject(original)
      expect(validated.id).toBe(original.id)
      expect(validated.scenario).toBe(original.scenario)
      expect(validated.positive_example).toBe(original.positive_example)
      expect(validated.context?.tags).toEqual(original.context?.tags)
    })

    it('validates complex example with all fields through round-trip', () => {
      const complex = createExampleEntry({
        id: 'example-026',
        category: 'workflow',
        scenario: 'Agent workflow decision patterns',
        type: 'both',
        positive_example: 'Query examples before escalating',
        negative_example: 'Do not skip example query step',
        context: {
          applicability: 'All decision tiers except Tier 4',
          prerequisites: ['Examples framework loaded', 'Decision tier identified'],
          related_examples: ['example-001', 'example-002'],
          decision_tier: 2,
          tags: ['workflow', 'decision-making', 'examples'],
        },
        created_by: 'dev-execute-leader',
        source_story_id: 'WINT-0180',
      })

      const validated = validateExampleEntry(complex)

      // Round trip
      const jsonString = JSON.stringify(validated)
      const parsed = JSON.parse(jsonString)
      const roundTripped = ExampleEntrySchema.parse(parsed)

      expect(roundTripped.id).toBe(validated.id)
      expect(roundTripped.status).toBe('validated')
      expect(roundTripped.context?.prerequisites).toEqual(validated.context?.prerequisites)
      expect(roundTripped.validated_at).toBe(validated.validated_at)
    })
  })
})
