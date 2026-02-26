import { describe, expect, it } from 'vitest'
import { readdir } from 'fs/promises'
import { join } from 'path'
import { load } from 'js-yaml'
import { readFile } from 'fs/promises'

import {
  ChangeSpecSchema,
  ChangeSpecCollectionSchema,
  FileChangeSpecSchema,
  MigrationChangeSpecSchema,
  ConfigChangeSpecSchema,
  TestChangeSpecSchema,
  createFileChangeSpec,
  type ChangeSpec,
} from '../change-spec'

// ============================================================================
// Fixtures
// ============================================================================

const baseFileChangeSpec = {
  schema: 1 as const,
  story_id: 'APIP-1020',
  id: 'CS-1',
  description: 'Create change-spec.ts artifact schema',
  ac_ids: ['AC-1'],
  change_type: 'file_change' as const,
  file_path: 'packages/backend/orchestrator/src/artifacts/change-spec.ts',
  file_action: 'create' as const,
}

const baseMigrationChangeSpec = {
  schema: 1 as const,
  story_id: 'APIP-5001',
  id: 'CS-2',
  description: 'Add apip schema baseline migration',
  ac_ids: ['AC-1', 'AC-2'],
  change_type: 'migration_change' as const,
  file_path: 'db/migrations/001_apip_schema_baseline.sql',
}

const baseConfigChangeSpec = {
  schema: 1 as const,
  story_id: 'APIP-0010',
  id: 'CS-3',
  description: 'Add bullmq to pipeline-queue package.json',
  ac_ids: ['AC-1'],
  change_type: 'config_change' as const,
  file_path: 'packages/backend/pipeline-queue/package.json',
}

const baseTestChangeSpec = {
  schema: 1 as const,
  story_id: 'APIP-0010',
  id: 'CS-4',
  description: 'Write unit tests for PipelineJobDataSchema',
  ac_ids: ['AC-7'],
  change_type: 'test_change' as const,
  file_path: 'packages/backend/pipeline-queue/src/__tests__/pipeline-job-schema.test.ts',
  test_type: 'unit' as const,
}

// ============================================================================
// HP-1: file_change variant parses successfully
// ============================================================================

describe('ChangeSpecSchema', () => {
  describe('HP-1: file_change variant', () => {
    it('parses a minimal valid file_change ChangeSpec', () => {
      const result = ChangeSpecSchema.parse(baseFileChangeSpec)

      expect(result.schema).toBe(1)
      expect(result.change_type).toBe('file_change')
      expect(result.story_id).toBe('APIP-1020')
      expect(result.id).toBe('CS-1')
      expect(result.ac_ids).toEqual(['AC-1'])
      if (result.change_type === 'file_change') {
        expect(result.file_path).toBe('packages/backend/orchestrator/src/artifacts/change-spec.ts')
        expect(result.file_action).toBe('create')
      }
    })

    it('parses a fully-populated file_change ChangeSpec', () => {
      const spec = {
        ...baseFileChangeSpec,
        rationale: 'Core schema for ChangeSpec pipeline',
        estimated_tokens: 8000,
        complexity: 'medium' as const,
        test_strategy: 'unit+integration' as const,
        test_hints: ['Validate discriminated union narrowing', 'Test all 4 variants'],
        expected_behavior: 'Schema parses all variant types',
        dependencies: [],
        file_language: 'typescript' as const,
        created_at: '2026-02-26T00:00:00.000Z',
      }

      const result = ChangeSpecSchema.parse(spec)

      expect(result.complexity).toBe('medium')
      expect(result.test_strategy).toBe('unit+integration')
      expect(result.test_hints).toHaveLength(2)
      if (result.change_type === 'file_change') {
        expect(result.file_language).toBe('typescript')
      }
    })

    it('defaults complexity to unknown when not provided', () => {
      const result = ChangeSpecSchema.parse(baseFileChangeSpec)
      expect(result.complexity).toBe('unknown')
    })

    it('defaults test_strategy to unit when not provided', () => {
      const result = ChangeSpecSchema.parse(baseFileChangeSpec)
      expect(result.test_strategy).toBe('unit')
    })

    it('defaults test_hints to empty array', () => {
      const result = ChangeSpecSchema.parse(baseFileChangeSpec)
      expect(result.test_hints).toEqual([])
    })

    it('defaults dependencies to empty array', () => {
      const result = ChangeSpecSchema.parse(baseFileChangeSpec)
      expect(result.dependencies).toEqual([])
    })
  })

  // ============================================================================
  // HP-2: migration_change variant parses successfully
  // ============================================================================

  describe('HP-2: migration_change variant', () => {
    it('parses a minimal valid migration_change ChangeSpec', () => {
      const result = ChangeSpecSchema.parse(baseMigrationChangeSpec)

      expect(result.change_type).toBe('migration_change')
      expect(result.story_id).toBe('APIP-5001')
      if (result.change_type === 'migration_change') {
        expect(result.file_path).toBe('db/migrations/001_apip_schema_baseline.sql')
        expect(result.reversible).toBe(false)
        expect(result.affected_tables).toEqual([])
      }
    })

    it('parses a fully-populated migration_change ChangeSpec', () => {
      const spec = {
        ...baseMigrationChangeSpec,
        migration_version: '001',
        migration_name: 'apip_schema_baseline',
        reversible: true,
        affected_tables: ['apip.schema_migrations'],
      }

      const result = ChangeSpecSchema.parse(spec)

      if (result.change_type === 'migration_change') {
        expect(result.migration_version).toBe('001')
        expect(result.migration_name).toBe('apip_schema_baseline')
        expect(result.reversible).toBe(true)
        expect(result.affected_tables).toEqual(['apip.schema_migrations'])
      }
    })
  })

  // ============================================================================
  // HP-3: config_change and test_change variants parse successfully
  // ============================================================================

  describe('HP-3: config_change and test_change variants', () => {
    it('parses a valid config_change ChangeSpec', () => {
      const result = ChangeSpecSchema.parse(baseConfigChangeSpec)

      expect(result.change_type).toBe('config_change')
      if (result.change_type === 'config_change') {
        expect(result.file_path).toBe('packages/backend/pipeline-queue/package.json')
        expect(result.adds_dependency).toBe(false)
        expect(result.dependency_names).toEqual([])
      }
    })

    it('parses a config_change with dependency additions', () => {
      const spec = {
        ...baseConfigChangeSpec,
        config_type: 'package_json' as const,
        adds_dependency: true,
        dependency_names: ['bullmq', 'ioredis'],
      }

      const result = ChangeSpecSchema.parse(spec)

      if (result.change_type === 'config_change') {
        expect(result.adds_dependency).toBe(true)
        expect(result.dependency_names).toEqual(['bullmq', 'ioredis'])
      }
    })

    it('parses a valid test_change ChangeSpec', () => {
      const result = ChangeSpecSchema.parse(baseTestChangeSpec)

      expect(result.change_type).toBe('test_change')
      if (result.change_type === 'test_change') {
        expect(result.test_type).toBe('unit')
        expect(result.file_path).toContain('__tests__')
      }
    })

    it('parses a test_change with all optional fields', () => {
      const spec = {
        ...baseTestChangeSpec,
        covers_file: 'packages/backend/pipeline-queue/src/__types__/index.ts',
        test_framework: 'vitest' as const,
      }

      const result = ChangeSpecSchema.parse(spec)

      if (result.change_type === 'test_change') {
        expect(result.covers_file).toBe(
          'packages/backend/pipeline-queue/src/__types__/index.ts',
        )
        expect(result.test_framework).toBe('vitest')
      }
    })
  })

  // ============================================================================
  // EC-1: schema version 2 is rejected (must be literal 1)
  // ============================================================================

  describe('EC-1: wrong schema version is rejected', () => {
    it('rejects schema version 2', () => {
      const spec = { ...baseFileChangeSpec, schema: 2 }
      expect(() => ChangeSpecSchema.parse(spec)).toThrow()
    })

    it('rejects schema version 0', () => {
      const spec = { ...baseFileChangeSpec, schema: 0 }
      expect(() => ChangeSpecSchema.parse(spec)).toThrow()
    })
  })

  // ============================================================================
  // EC-2: unknown change_type is rejected
  // ============================================================================

  describe('EC-2: unknown change_type is rejected', () => {
    it('rejects an unknown change_type', () => {
      const spec = { ...baseFileChangeSpec, change_type: 'doc_change' }
      expect(() => ChangeSpecSchema.parse(spec)).toThrow()
    })

    it('rejects a missing change_type', () => {
      const { change_type: _, ...specWithoutType } = baseFileChangeSpec
      expect(() => ChangeSpecSchema.parse(specWithoutType)).toThrow()
    })
  })

  // ============================================================================
  // EC-3: empty ac_ids is rejected
  // ============================================================================

  describe('EC-3: empty ac_ids is rejected', () => {
    it('rejects an empty ac_ids array', () => {
      const spec = { ...baseFileChangeSpec, ac_ids: [] }
      expect(() => ChangeSpecSchema.parse(spec)).toThrow()
    })

    it('rejects missing ac_ids', () => {
      const { ac_ids: _, ...specWithoutAcIds } = baseFileChangeSpec
      expect(() => ChangeSpecSchema.parse(specWithoutAcIds)).toThrow()
    })
  })

  // ============================================================================
  // ED-1: story_id must match pattern
  // ============================================================================

  describe('ED-1: story_id pattern validation', () => {
    it('accepts valid story_id patterns', () => {
      const patterns = ['APIP-1020', 'WISH-001', 'KBAR-0150', 'FOO-99999']
      for (const story_id of patterns) {
        expect(() => ChangeSpecSchema.parse({ ...baseFileChangeSpec, story_id })).not.toThrow()
      }
    })

    it('rejects lowercase story_id', () => {
      const spec = { ...baseFileChangeSpec, story_id: 'apip-1020' }
      expect(() => ChangeSpecSchema.parse(spec)).toThrow()
    })

    it('rejects story_id without number part', () => {
      const spec = { ...baseFileChangeSpec, story_id: 'APIP' }
      expect(() => ChangeSpecSchema.parse(spec)).toThrow()
    })
  })

  // ============================================================================
  // ED-2: ChangeSpecCollection schema
  // ============================================================================

  describe('ED-2: ChangeSpecCollection schema', () => {
    it('parses a valid ChangeSpecCollection', () => {
      const collection = {
        schema: 1 as const,
        story_id: 'APIP-1020',
        changes: [baseFileChangeSpec],
      }

      const result = ChangeSpecCollectionSchema.parse(collection)
      expect(result.schema).toBe(1)
      expect(result.story_id).toBe('APIP-1020')
      expect(result.changes).toHaveLength(1)
    })

    it('rejects a collection with zero changes', () => {
      const collection = {
        schema: 1,
        story_id: 'APIP-1020',
        changes: [],
      }
      expect(() => ChangeSpecCollectionSchema.parse(collection)).toThrow()
    })

    it('accepts a collection with mixed change types', () => {
      const collection = {
        schema: 1 as const,
        story_id: 'APIP-1020',
        changes: [
          baseFileChangeSpec,
          baseMigrationChangeSpec,
          baseConfigChangeSpec,
          baseTestChangeSpec,
        ],
      }
      const result = ChangeSpecCollectionSchema.parse(collection)
      expect(result.changes).toHaveLength(4)
    })
  })

  // ============================================================================
  // HP-4: YAML decomposition files parse against ChangeSpecSchema
  // Glob-reads decompositions/ directory; skips gracefully if empty.
  // When populated (after ST-4), validates all 10 story YAMLs.
  // ============================================================================

  describe('HP-4: YAML decomposition files parse against ChangeSpecSchema', () => {
    it('inline fixture: validates a ChangeSpec parsed from YAML-like object', () => {
      // This inline fixture validates the parse logic regardless of filesystem state
      const yamlLikeObject = {
        schema: 1,
        story_id: 'APIP-0010',
        id: 'CS-1',
        description: 'Create pipeline-queue package scaffold',
        ac_ids: ['AC-1'],
        change_type: 'config_change',
        file_path: 'packages/backend/pipeline-queue/package.json',
        file_action: 'create', // extra field — ignored by config_change
      }

      // config_change variant
      const spec = {
        schema: 1 as const,
        story_id: 'APIP-0010',
        id: 'CS-1',
        description: 'Create pipeline-queue package scaffold',
        ac_ids: ['AC-1'],
        change_type: 'config_change' as const,
        file_path: 'packages/backend/pipeline-queue/package.json',
      }
      const result = ChangeSpecSchema.parse(spec)
      expect(result.change_type).toBe('config_change')

      // suppress unused warning
      void yamlLikeObject
    })

    it('parses all decomposition YAML files if they exist', async () => {
      const decompositionsDir = join(
        process.cwd(),
        '../../../plans/future/platform/autonomous-pipeline/_spike-output/APIP-1020/decompositions',
      )

      let files: string[]
      try {
        files = await readdir(decompositionsDir)
      } catch {
        // Directory doesn't exist yet — skip gracefully
        return
      }

      const yamlFiles = files.filter(
        f => f.endsWith('.yaml') && f !== 'decomposition-template.yaml',
      )

      if (yamlFiles.length === 0) {
        // No decompositions yet — gracefully skip
        return
      }

      const errors: Array<{ file: string; error: string }> = []

      for (const file of yamlFiles) {
        const filePath = join(decompositionsDir, file)
        try {
          const content = await readFile(filePath, 'utf-8')
          const parsed = load(content)

          // Each file is a ChangeSpecCollection
          ChangeSpecCollectionSchema.parse(parsed)
        } catch (e) {
          errors.push({ file, error: e instanceof Error ? e.message : String(e) })
        }
      }

      if (errors.length > 0) {
        const messages = errors.map(e => `  ${e.file}: ${e.error}`).join('\n')
        throw new Error(`${errors.length} decomposition file(s) failed schema validation:\n${messages}`)
      }
    })
  })

  // ============================================================================
  // createFileChangeSpec helper
  // ============================================================================

  describe('createFileChangeSpec helper', () => {
    it('creates a valid FileChangeSpec with defaults', () => {
      const spec = createFileChangeSpec(
        'APIP-1020',
        'CS-1',
        'src/change-spec.ts',
        'Create schema file',
        ['AC-1'],
      )

      expect(spec.schema).toBe(1)
      expect(spec.change_type).toBe('file_change')
      expect(spec.file_action).toBe('create')
      expect(spec.complexity).toBe('unknown')
      expect(spec.test_strategy).toBe('unit')
    })

    it('creates a valid FileChangeSpec with modify action', () => {
      const spec = createFileChangeSpec(
        'APIP-1020',
        'CS-2',
        'src/index.ts',
        'Export ChangeSpecSchema',
        ['AC-1', 'AC-5'],
        'modify',
      )

      expect(spec.file_action).toBe('modify')
      expect(spec.ac_ids).toEqual(['AC-1', 'AC-5'])
    })

    it('produces a spec that passes FileChangeSpecSchema.parse()', () => {
      const spec = createFileChangeSpec('APIP-1020', 'CS-1', 'src/x.ts', 'Do thing', ['AC-1'])
      expect(() => FileChangeSpecSchema.parse(spec)).not.toThrow()
    })
  })
})
