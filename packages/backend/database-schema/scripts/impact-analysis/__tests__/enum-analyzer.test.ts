/**
 * Enum analyzer unit tests
 * WISH-20210
 */
import { describe, it, expect } from 'vitest'
import { Project } from 'ts-morph'
import { analyzeEnumChange } from '../analyzers/enum-analyzer.js'
import { ParsedChange } from '../__types__/index.js'
import { EnumInfo } from '../utils/schema-introspector.js'

describe('Enum Analyzer', () => {
  const mockEnumInfo: EnumInfo = {
    name: 'wishlist_store',
    values: ['LEGO', 'Barweer', 'Cata', 'BrickLink', 'Other'],
  }

  describe('add-value', () => {
    it('should identify low impact for adding enum value', () => {
      const project = new Project({ useInMemoryFileSystem: true })

      project.createSourceFile(
        'test.ts',
        `
        import { WishlistStoreSchema } from '@repo/api-client'
      `,
      )

      const parsedChange: ParsedChange = {
        operation: 'add-value',
        target: 'Amazon',
      }

      const result = analyzeEnumChange(project, parsedChange, mockEnumInfo, '')

      expect(result.changeSummary.operation).toBe('add-value')
      expect(result.riskAssessment.breaking).toBe(false)
      expect(result.riskAssessment.backwardCompatible).toBe(true)
      expect(result.recommendations).toContain('Non-breaking: Adding enum value is backward compatible')
    })

    it('should identify Zod schemas needing updates', () => {
      const project = new Project({ useInMemoryFileSystem: true })

      // Create a file that imports and uses WishlistStoreSchema
      project.createSourceFile(
        'schemas/wishlist.ts',
        `
        import { z } from 'zod'
        import { WishlistStoreSchema } from '@repo/api-client'

        export function validateStore(store: string) {
          return WishlistStoreSchema.parse(store)
        }
      `,
      )

      const parsedChange: ParsedChange = {
        operation: 'add-value',
        target: 'Amazon',
      }

      const result = analyzeEnumChange(project, parsedChange, mockEnumInfo, '')

      // The analyzer should find the schema reference
      const zodFindings = result.findingsByCategory['zod-schema']
      expect(zodFindings).toBeDefined()
      expect(zodFindings.length).toBeGreaterThan(0)
    })

    it('should recommend reviewing switch statements', () => {
      const project = new Project({ useInMemoryFileSystem: true })

      const parsedChange: ParsedChange = {
        operation: 'add-value',
        target: 'Amazon',
      }

      const result = analyzeEnumChange(project, parsedChange, mockEnumInfo, '')

      const hasSwitchRecommendation = result.recommendations.some(rec =>
        rec.includes('switch statements'),
      )
      expect(hasSwitchRecommendation).toBe(true)
    })
  })

  describe('remove-value', () => {
    it('should identify breaking change for removing enum value', () => {
      const project = new Project({ useInMemoryFileSystem: true })

      project.createSourceFile(
        'test.ts',
        `
        export function isOther(store: string) {
          return store === 'Other'
        }
      `,
      )

      const parsedChange: ParsedChange = {
        operation: 'remove-value',
        target: 'Other',
      }

      const result = analyzeEnumChange(project, parsedChange, mockEnumInfo, '')

      expect(result.changeSummary.operation).toBe('remove-value')
      expect(result.riskAssessment.breaking).toBe(true)
      expect(result.riskAssessment.backwardCompatible).toBe(false)
    })

    it('should identify all hardcoded references to enum value', () => {
      const project = new Project({ useInMemoryFileSystem: true })

      project.createSourceFile(
        'service.ts',
        `
        export function getStore() {
          return 'Other'
        }
      `,
      )

      project.createSourceFile(
        'component.tsx',
        `
        export function StoreSelect() {
          const defaultStore = 'Other'
          return <div>{defaultStore}</div>
        }
      `,
      )

      const parsedChange: ParsedChange = {
        operation: 'remove-value',
        target: 'Other',
      }

      const result = analyzeEnumChange(project, parsedChange, mockEnumInfo, '')

      const totalFindings = Object.values(result.findingsByCategory).reduce(
        (sum, findings) => sum + findings.length,
        0,
      )
      expect(totalFindings).toBeGreaterThan(0)
    })

    it('should recommend data migration', () => {
      const project = new Project({ useInMemoryFileSystem: true })

      const parsedChange: ParsedChange = {
        operation: 'remove-value',
        target: 'Other',
      }

      const result = analyzeEnumChange(project, parsedChange, mockEnumInfo, '')

      const hasMigrationRecommendation = result.recommendations.some(rec =>
        rec.includes('existing data'),
      )
      expect(hasMigrationRecommendation).toBe(true)
    })
  })

  describe('rename-value', () => {
    it('should identify breaking change for renaming enum value', () => {
      const project = new Project({ useInMemoryFileSystem: true })

      project.createSourceFile(
        'test.ts',
        `
        export function check(store: string) {
          return store === 'Other'
        }
      `,
      )

      const parsedChange: ParsedChange = {
        operation: 'rename-value',
        target: 'Other',
        newName: 'Custom',
      }

      const result = analyzeEnumChange(project, parsedChange, mockEnumInfo, '')

      expect(result.changeSummary.operation).toBe('rename-value')
      expect(result.riskAssessment.breaking).toBe(true)
      expect(result.changeSummary.description).toContain('Other')
      expect(result.changeSummary.description).toContain('Custom')
    })

    it('should suggest migration strategy', () => {
      const project = new Project({ useInMemoryFileSystem: true })

      const parsedChange: ParsedChange = {
        operation: 'rename-value',
        target: 'Other',
        newName: 'Custom',
      }

      const result = analyzeEnumChange(project, parsedChange, mockEnumInfo, '')

      const hasStepByStepStrategy = result.recommendations.some(rec => rec.includes('Step 1'))
      expect(hasStepByStepStrategy).toBe(true)
    })
  })
})
