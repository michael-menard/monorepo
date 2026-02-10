/**
 * Column analyzer unit tests
 * WISH-20210
 */
import { describe, it, expect } from 'vitest'
import { Project } from 'ts-morph'
import { analyzeColumnChange } from '../analyzers/column-analyzer.js'
import { ParsedChange } from '../__types__/index.js'
import { TableInfo } from '../utils/schema-introspector.js'

describe('Column Analyzer', () => {
  const mockTableInfo: TableInfo = {
    name: 'wishlist_items',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, hasDefault: true },
      { name: 'title', type: 'text', nullable: false, hasDefault: false },
      { name: 'priority', type: 'integer', nullable: true, hasDefault: true },
    ],
  }

  describe('add-column', () => {
    it('should identify low impact for optional column', () => {
      const project = new Project({ useInMemoryFileSystem: true })

      project.createSourceFile(
        'test.ts',
        `
        import { WishlistItemSchema } from '@repo/api-client'
      `,
      )

      const parsedChange: ParsedChange = {
        operation: 'add-column',
        target: 'notes',
        newType: 'text',
      }

      const result = analyzeColumnChange(project, parsedChange, mockTableInfo, '')

      expect(result.changeSummary.operation).toBe('add-column')
      expect(result.riskAssessment.breaking).toBe(false)
      expect(result.riskAssessment.backwardCompatible).toBe(true)
      expect(result.effortEstimate).toBe('Low')
    })

    it('should recommend Zod schema updates', () => {
      const project = new Project({ useInMemoryFileSystem: true })

      // Create a file that imports and uses WishlistItemSchema
      project.createSourceFile(
        'schemas/wishlist.ts',
        `
        import { z } from 'zod'
        import { WishlistItemSchema } from '@repo/api-client'

        export function validateItem(data: unknown) {
          return WishlistItemSchema.parse(data)
        }
      `,
      )

      const parsedChange: ParsedChange = {
        operation: 'add-column',
        target: 'notes',
        newType: 'text',
      }

      const result = analyzeColumnChange(project, parsedChange, mockTableInfo, '')

      // The analyzer should find the schema reference
      const zodFindings = result.findingsByCategory['zod-schema']
      expect(zodFindings).toBeDefined()
      expect(zodFindings.length).toBeGreaterThan(0)
    })
  })

  describe('drop-column', () => {
    it('should identify breaking change for column removal', () => {
      const project = new Project({ useInMemoryFileSystem: true })

      project.createSourceFile(
        'test.ts',
        `
        import { wishlistItems } from './schema'
        import { eq } from 'drizzle-orm'

        export function query() {
          return db.select().from(wishlistItems).where(eq(wishlistItems.priority, 5))
        }
      `,
      )

      const parsedChange: ParsedChange = {
        operation: 'drop-column',
        target: 'priority',
      }

      const result = analyzeColumnChange(project, parsedChange, mockTableInfo, '')

      expect(result.changeSummary.operation).toBe('drop-column')
      expect(result.riskAssessment.breaking).toBe(true)
      expect(result.riskAssessment.backwardCompatible).toBe(false)
      expect(result.recommendations).toContain('BREAKING CHANGE: Remove all code references first')
    })

    it('should identify all files referencing the column', () => {
      const project = new Project({ useInMemoryFileSystem: true })

      project.createSourceFile(
        'repo.ts',
        `
        import { wishlistItems } from './schema'
        const priority = wishlistItems.priority
      `,
      )

      project.createSourceFile(
        'service.ts',
        `
        export function update() {
          return { priority: 5 }
        }
      `,
      )

      const parsedChange: ParsedChange = {
        operation: 'drop-column',
        target: 'priority',
      }

      const result = analyzeColumnChange(project, parsedChange, mockTableInfo, '')

      const totalFindings = Object.values(result.findingsByCategory).reduce(
        (sum, findings) => sum + findings.length,
        0,
      )
      expect(totalFindings).toBeGreaterThan(0)
    })
  })

  describe('rename-column', () => {
    it('should identify breaking change for column rename', () => {
      const project = new Project({ useInMemoryFileSystem: true })

      const parsedChange: ParsedChange = {
        operation: 'rename-column',
        target: 'priority',
        newName: 'importance',
      }

      const result = analyzeColumnChange(project, parsedChange, mockTableInfo, '')

      expect(result.changeSummary.operation).toBe('rename-column')
      expect(result.riskAssessment.breaking).toBe(true)
      expect(result.recommendations.length).toBeGreaterThan(0)
    })

    it('should suggest migration strategy with dual columns', () => {
      const project = new Project({ useInMemoryFileSystem: true })

      const parsedChange: ParsedChange = {
        operation: 'rename-column',
        target: 'priority',
        newName: 'importance',
      }

      const result = analyzeColumnChange(project, parsedChange, mockTableInfo, '')

      const hasStepByStepStrategy = result.recommendations.some(rec => rec.includes('Step 1'))
      expect(hasStepByStepStrategy).toBe(true)
    })
  })

  describe('change-type', () => {
    it('should identify breaking change for type change', () => {
      const project = new Project({ useInMemoryFileSystem: true })

      const parsedChange: ParsedChange = {
        operation: 'change-type',
        target: 'priority',
        newType: 'text',
      }

      const result = analyzeColumnChange(project, parsedChange, mockTableInfo, '')

      expect(result.changeSummary.operation).toBe('change-type')
      expect(result.riskAssessment.breaking).toBe(true)
      expect(result.riskAssessment.rollbackSafe).toBe(false)
    })

    it('should recommend data migration', () => {
      const project = new Project({ useInMemoryFileSystem: true })

      const parsedChange: ParsedChange = {
        operation: 'change-type',
        target: 'priority',
        newType: 'text',
      }

      const result = analyzeColumnChange(project, parsedChange, mockTableInfo, '')

      const hasMigrationRecommendation = result.recommendations.some(rec =>
        rec.includes('data migration'),
      )
      expect(hasMigrationRecommendation).toBe(true)
    })
  })
})
