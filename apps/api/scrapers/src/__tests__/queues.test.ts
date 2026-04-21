import { describe, it, expect } from 'vitest'
import {
  QUEUE_NAMES,
  BricklinkMinifigJobSchema,
  BricklinkCatalogJobSchema,
  BricklinkPricesJobSchema,
  LegoSetJobSchema,
  RebrickableSetJobSchema,
  RebrickableMocsJobSchema,
  RebrickableMocSingleJobSchema,
} from '../queues.js'

describe('Queue Names', () => {
  it('defines all 7 queues', () => {
    expect(Object.keys(QUEUE_NAMES)).toHaveLength(7)
    expect(QUEUE_NAMES.BRICKLINK_MINIFIG).toBe('scrape-bricklink-minifig')
    expect(QUEUE_NAMES.BRICKLINK_CATALOG).toBe('scrape-bricklink-catalog')
    expect(QUEUE_NAMES.BRICKLINK_PRICES).toBe('scrape-bricklink-prices')
    expect(QUEUE_NAMES.LEGO_SET).toBe('scrape-lego-set')
    expect(QUEUE_NAMES.REBRICKABLE_SET).toBe('scrape-rebrickable-set')
    expect(QUEUE_NAMES.REBRICKABLE_MOCS).toBe('scrape-rebrickable-mocs')
    expect(QUEUE_NAMES.REBRICKABLE_MOC_SINGLE).toBe('scrape-rebrickable-moc-single')
  })
})

describe('Job Schemas', () => {
  describe('BricklinkMinifigJobSchema', () => {
    it('accepts valid minifig job', () => {
      const result = BricklinkMinifigJobSchema.safeParse({
        itemNumber: 'cas002',
        itemType: 'M',
      })
      expect(result.success).toBe(true)
    })

    it('defaults itemType to M', () => {
      const result = BricklinkMinifigJobSchema.parse({ itemNumber: 'cas002' })
      expect(result.itemType).toBe('M')
    })

    it('accepts S item type for CMF', () => {
      const result = BricklinkMinifigJobSchema.parse({ itemNumber: 'col25-1', itemType: 'S' })
      expect(result.itemType).toBe('S')
    })

    it('defaults wishlist to false', () => {
      const result = BricklinkMinifigJobSchema.parse({ itemNumber: 'cas002' })
      expect(result.wishlist).toBe(false)
    })

    it('rejects missing itemNumber', () => {
      const result = BricklinkMinifigJobSchema.safeParse({})
      expect(result.success).toBe(false)
    })

    it('rejects invalid itemType', () => {
      const result = BricklinkMinifigJobSchema.safeParse({
        itemNumber: 'cas002',
        itemType: 'X',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('BricklinkCatalogJobSchema', () => {
    it('accepts valid catalog URL', () => {
      const result = BricklinkCatalogJobSchema.safeParse({
        catalogUrl: 'https://www.bricklink.com/catalogList.asp?catType=S&catString=746.753',
      })
      expect(result.success).toBe(true)
    })

    it('rejects non-URL string', () => {
      const result = BricklinkCatalogJobSchema.safeParse({ catalogUrl: 'not-a-url' })
      expect(result.success).toBe(false)
    })
  })

  describe('BricklinkPricesJobSchema', () => {
    it('accepts valid price job with variantId', () => {
      const result = BricklinkPricesJobSchema.safeParse({
        itemNumber: 'cas002',
        variantId: '550e8400-e29b-41d4-a716-446655440000',
      })
      expect(result.success).toBe(true)
    })

    it('accepts without variantId', () => {
      const result = BricklinkPricesJobSchema.parse({ itemNumber: 'cas002' })
      expect(result.variantId).toBeUndefined()
    })
  })

  describe('LegoSetJobSchema', () => {
    it('accepts valid LEGO URL', () => {
      const result = LegoSetJobSchema.safeParse({
        url: 'https://www.lego.com/en-us/product/some-set-12345',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('RebrickableSetJobSchema', () => {
    it('accepts valid Rebrickable URL', () => {
      const result = RebrickableSetJobSchema.safeParse({
        url: 'https://rebrickable.com/sets/76919-1/some-set/',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('RebrickableMocsJobSchema', () => {
    it('defaults all options to false', () => {
      const result = RebrickableMocsJobSchema.parse({})
      expect(result.resume).toBe(false)
      expect(result.force).toBe(false)
      expect(result.retryFailed).toBe(false)
      expect(result.retryMissing).toBe(false)
      expect(result.likedMocs).toBe(false)
    })

    it('accepts all options as true', () => {
      const result = RebrickableMocsJobSchema.parse({
        resume: true,
        force: true,
        retryFailed: true,
        retryMissing: true,
        likedMocs: true,
      })
      expect(result.resume).toBe(true)
      expect(result.force).toBe(true)
    })
  })

  describe('RebrickableMocSingleJobSchema', () => {
    it('accepts valid single MOC job', () => {
      const result = RebrickableMocSingleJobSchema.safeParse({ mocNumber: '12345' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.mocNumber).toBe('12345')
        expect(result.data.force).toBe(false)
      }
    })

    it('accepts with force flag', () => {
      const result = RebrickableMocSingleJobSchema.parse({ mocNumber: '12345', force: true })
      expect(result.force).toBe(true)
    })

    it('accepts with parentJobId', () => {
      const result = RebrickableMocSingleJobSchema.parse({
        mocNumber: '12345',
        parentJobId: 'job-abc-123',
      })
      expect(result.parentJobId).toBe('job-abc-123')
    })

    it('rejects empty mocNumber', () => {
      const result = RebrickableMocSingleJobSchema.safeParse({ mocNumber: '' })
      expect(result.success).toBe(false)
    })

    it('rejects missing mocNumber', () => {
      const result = RebrickableMocSingleJobSchema.safeParse({})
      expect(result.success).toBe(false)
    })
  })
})
