/**
 * AST scanner unit tests
 * WISH-20210
 */
import { describe, it, expect } from 'vitest'
import { Project } from 'ts-morph'
import {
  scanForTableReferences,
  scanForSchemaReferences,
  scanForColumnReferences,
  scanForEnumReferences,
} from '../utils/ast-scanner.js'

describe('AST Scanner', () => {
  describe('scanForTableReferences', () => {
    it('should detect db.select().from(table) references', () => {
      const project = new Project({ useInMemoryFileSystem: true })

      const sourceFile = project.createSourceFile(
        'test.ts',
        `
        import { db } from './db'
        import { wishlistItems } from './schema'

        export async function getItems() {
          return db.select().from(wishlistItems)
        }
      `,
      )

      const files = scanForTableReferences(project, 'wishlist_items')
      expect(files).toHaveLength(1)
      expect(files[0]).toContain('test.ts')
    })

    it('should detect db.insert(table) references', () => {
      const project = new Project({ useInMemoryFileSystem: true })

      project.createSourceFile(
        'test.ts',
        `
        import { db } from './db'
        import { wishlistItems } from './schema'

        export async function createItem(data: any) {
          return db.insert(wishlistItems).values(data)
        }
      `,
      )

      const files = scanForTableReferences(project, 'wishlist_items')
      expect(files).toHaveLength(1)
    })

    it('should detect table imports', () => {
      const project = new Project({ useInMemoryFileSystem: true })

      project.createSourceFile(
        'test.ts',
        `
        import { wishlistItems } from '@repo/database-schema'
      `,
      )

      const files = scanForTableReferences(project, 'wishlist_items')
      expect(files).toHaveLength(1)
    })

    it('should return empty array for no references', () => {
      const project = new Project({ useInMemoryFileSystem: true })

      project.createSourceFile(
        'test.ts',
        `
        export function someFunction() {
          return 'hello'
        }
      `,
      )

      const files = scanForTableReferences(project, 'wishlist_items')
      expect(files).toHaveLength(0)
    })
  })

  describe('scanForSchemaReferences', () => {
    it('should detect Zod schema usage', () => {
      const project = new Project({ useInMemoryFileSystem: true })

      project.createSourceFile(
        'test.ts',
        `
        import { WishlistItemSchema } from '@repo/api-client'

        export function validate(data: unknown) {
          return WishlistItemSchema.parse(data)
        }
      `,
      )

      const files = scanForSchemaReferences(project, 'WishlistItemSchema')
      expect(files).toHaveLength(1)
    })

    it('should detect z.infer type inference', () => {
      const project = new Project({ useInMemoryFileSystem: true })

      project.createSourceFile(
        'test.ts',
        `
        import { z } from 'zod'
        import { WishlistItemSchema } from '@repo/api-client'

        type WishlistItem = z.infer<typeof WishlistItemSchema>
      `,
      )

      const files = scanForSchemaReferences(project, 'WishlistItemSchema')
      expect(files).toHaveLength(1)
    })
  })

  describe('scanForColumnReferences', () => {
    it('should detect table.column references in queries', () => {
      const project = new Project({ useInMemoryFileSystem: true })

      project.createSourceFile(
        'test.ts',
        `
        import { db } from './db'
        import { wishlistItems } from './schema'
        import { eq } from 'drizzle-orm'

        export async function getByPriority(priority: number) {
          return db.select().from(wishlistItems).where(eq(wishlistItems.priority, priority))
        }
      `,
      )

      const files = scanForColumnReferences(project, 'wishlist_items', 'priority')
      expect(files).toHaveLength(1)
    })

    it('should detect column names in object literals', () => {
      const project = new Project({ useInMemoryFileSystem: true })

      project.createSourceFile(
        'test.ts',
        `
        export function buildUpdateData() {
          return {
            priority: 5,
            title: 'Test',
          }
        }
      `,
      )

      const files = scanForColumnReferences(project, 'wishlist_items', 'priority')
      expect(files).toHaveLength(1)
    })
  })

  describe('scanForEnumReferences', () => {
    it('should detect enum schema imports', () => {
      const project = new Project({ useInMemoryFileSystem: true })

      project.createSourceFile(
        'test.ts',
        `
        import { WishlistStoreSchema } from '@repo/api-client'

        export function validate(store: string) {
          return WishlistStoreSchema.parse(store)
        }
      `,
      )

      const files = scanForEnumReferences(project, 'WishlistStore')
      expect(files).toHaveLength(1)
    })

    it('should detect specific enum value usage', () => {
      const project = new Project({ useInMemoryFileSystem: true })

      project.createSourceFile(
        'test.ts',
        `
        export function isLego(store: string) {
          return store === 'LEGO'
        }
      `,
      )

      const files = scanForEnumReferences(project, 'WishlistStore', 'LEGO')
      expect(files).toHaveLength(1)
    })
  })
})
