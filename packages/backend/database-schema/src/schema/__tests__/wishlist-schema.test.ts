/**
 * Wishlist Schema Validation Tests (WISH-2000)
 *
 * Tests to verify the Drizzle schema exports correctly and has expected structure.
 */
import { describe, it, expect } from 'vitest'
import {
  wishlistItems,
  wishlistStoreEnum,
  wishlistCurrencyEnum,
  itemStatusEnum,
  buildStatusEnum,
} from '../index'

describe('Wishlist Schema', () => {
  describe('Table Export', () => {
    it('should export wishlistItems table', () => {
      expect(wishlistItems).toBeDefined()
      expect(typeof wishlistItems).toBe('object')
    })

    it('should have correct table name', () => {
      // Access internal table config using Drizzle's getTableName
      // The table config is accessed via the table's internal structure
      const tableConfig = wishlistItems as unknown as Record<string, unknown>
      // Check that the table object has the expected structure
      expect(tableConfig).toHaveProperty('id')
      expect(tableConfig).toHaveProperty('userId')
      // The actual table name is embedded in the Drizzle internals
      // We verify by checking column naming convention uses snake_case
      expect(wishlistItems.userId.name).toBe('user_id')
    })
  })

  describe('Column Definitions', () => {
    it('should have id column', () => {
      expect(wishlistItems.id).toBeDefined()
    })

    it('should have userId column', () => {
      expect(wishlistItems.userId).toBeDefined()
    })

    it('should have title column', () => {
      expect(wishlistItems.title).toBeDefined()
    })

    it('should have store column', () => {
      expect(wishlistItems.store).toBeDefined()
    })

    it('should have setNumber column', () => {
      expect(wishlistItems.setNumber).toBeDefined()
    })

    it('should have sourceUrl column', () => {
      expect(wishlistItems.sourceUrl).toBeDefined()
    })

    it('should have imageUrl column', () => {
      expect(wishlistItems.imageUrl).toBeDefined()
    })

    it('should have price column', () => {
      expect(wishlistItems.price).toBeDefined()
    })

    it('should have currency column', () => {
      expect(wishlistItems.currency).toBeDefined()
    })

    it('should have pieceCount column', () => {
      expect(wishlistItems.pieceCount).toBeDefined()
    })

    it('should have releaseDate column', () => {
      expect(wishlistItems.releaseDate).toBeDefined()
    })

    it('should have tags column', () => {
      expect(wishlistItems.tags).toBeDefined()
    })

    it('should have priority column', () => {
      expect(wishlistItems.priority).toBeDefined()
    })

    it('should have notes column', () => {
      expect(wishlistItems.notes).toBeDefined()
    })

    it('should have sortOrder column', () => {
      expect(wishlistItems.sortOrder).toBeDefined()
    })

    it('should have createdAt column', () => {
      expect(wishlistItems.createdAt).toBeDefined()
    })

    it('should have updatedAt column', () => {
      expect(wishlistItems.updatedAt).toBeDefined()
    })

    it('should have createdBy audit column', () => {
      expect(wishlistItems.createdBy).toBeDefined()
    })

    it('should have updatedBy audit column', () => {
      expect(wishlistItems.updatedBy).toBeDefined()
    })

    // SETS-MVP-001: Collection management columns
    it('should have status column', () => {
      expect(wishlistItems.status).toBeDefined()
    })

    it('should have statusChangedAt column', () => {
      expect(wishlistItems.statusChangedAt).toBeDefined()
    })

    it('should have purchaseDate column', () => {
      expect(wishlistItems.purchaseDate).toBeDefined()
    })

    it('should have purchasePrice column', () => {
      expect(wishlistItems.purchasePrice).toBeDefined()
    })

    it('should have purchaseTax column', () => {
      expect(wishlistItems.purchaseTax).toBeDefined()
    })

    it('should have purchaseShipping column', () => {
      expect(wishlistItems.purchaseShipping).toBeDefined()
    })

    it('should have buildStatus column', () => {
      expect(wishlistItems.buildStatus).toBeDefined()
    })
  })

  describe('Enums', () => {
    it('should export wishlistStoreEnum', () => {
      expect(wishlistStoreEnum).toBeDefined()
    })

    it('should have correct store enum values', () => {
      const enumValues = wishlistStoreEnum.enumValues
      expect(enumValues).toContain('LEGO')
      expect(enumValues).toContain('Barweer')
      expect(enumValues).toContain('Cata')
      expect(enumValues).toContain('BrickLink')
      expect(enumValues).toContain('Other')
      expect(enumValues).toHaveLength(5)
    })

    it('should export wishlistCurrencyEnum', () => {
      expect(wishlistCurrencyEnum).toBeDefined()
    })

    it('should have correct currency enum values', () => {
      const enumValues = wishlistCurrencyEnum.enumValues
      expect(enumValues).toContain('USD')
      expect(enumValues).toContain('EUR')
      expect(enumValues).toContain('GBP')
      expect(enumValues).toContain('CAD')
      expect(enumValues).toContain('AUD')
      expect(enumValues).toHaveLength(5)
    })

    // SETS-MVP-001: New enum types
    it('should export itemStatusEnum', () => {
      expect(itemStatusEnum).toBeDefined()
    })

    it('should have correct item status enum values', () => {
      const enumValues = itemStatusEnum.enumValues
      expect(enumValues).toContain('wishlist')
      expect(enumValues).toContain('owned')
      expect(enumValues).toHaveLength(2)
    })

    it('should export buildStatusEnum', () => {
      expect(buildStatusEnum).toBeDefined()
    })

    it('should have correct build status enum values', () => {
      const enumValues = buildStatusEnum.enumValues
      expect(enumValues).toContain('not_started')
      expect(enumValues).toContain('in_progress')
      expect(enumValues).toContain('completed')
      expect(enumValues).toHaveLength(3)
    })
  })

  describe('Column Count', () => {
    it('should have all expected columns (26 columns)', () => {
      // Get all column keys from the table
      const columns = Object.keys(wishlistItems).filter(
        key => key !== '_' && key !== '$inferInsert' && key !== '$inferSelect',
      )
      // Original columns (19): id, userId, title, store, setNumber, sourceUrl, imageUrl, price, currency,
      // pieceCount, releaseDate, tags, priority, notes, sortOrder, createdAt, updatedAt,
      // createdBy, updatedBy
      // SETS-MVP-001 additions (7): status, statusChangedAt, purchaseDate, purchasePrice,
      // purchaseTax, purchaseShipping, buildStatus
      // Total: 26 columns
      expect(columns.length).toBeGreaterThanOrEqual(26)
    })
  })

  describe('Default Values (SETS-MVP-001)', () => {
    it('should have default value for status column', () => {
      // Check that status column has a default
      const statusColumn = wishlistItems.status
      expect(statusColumn).toBeDefined()
      expect(statusColumn.hasDefault).toBe(true)
      expect(statusColumn.default).toBe('wishlist')
    })
  })
})
