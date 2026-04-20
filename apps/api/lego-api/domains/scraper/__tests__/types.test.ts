import { describe, it, expect } from 'vitest'
import {
  detectScraperType,
  detectBricklinkItemType,
  AddJobInputSchema,
  JobListQuerySchema,
} from '../types.js'

describe('detectScraperType', () => {
  it('detects bricklink catalog URL', () => {
    expect(
      detectScraperType('https://www.bricklink.com/catalogList.asp?catType=S&catString=746.753'),
    ).toBe('bricklink-catalog')
  })

  it('detects bricklink minifig URL with M=', () => {
    expect(
      detectScraperType('https://www.bricklink.com/v2/catalog/catalogitem.page?M=cas002'),
    ).toBe('bricklink-minifig')
  })

  it('detects bricklink CMF set URL with S=', () => {
    expect(
      detectScraperType('https://www.bricklink.com/v2/catalog/catalogitem.page?S=col25-1'),
    ).toBe('bricklink-minifig')
  })

  it('detects LEGO.com product URL', () => {
    expect(
      detectScraperType('https://www.lego.com/en-us/product/lamborghini-42115'),
    ).toBe('lego-set')
  })

  it('detects rebrickable set URL', () => {
    expect(
      detectScraperType('https://rebrickable.com/sets/76919-1/mclaren/'),
    ).toBe('rebrickable-set')
  })

  it('detects bare minifig number', () => {
    expect(detectScraperType('cas002')).toBe('bricklink-minifig')
  })

  it('detects bare CMF number', () => {
    expect(detectScraperType('col25-1')).toBe('bricklink-minifig')
  })

  it('returns null for unrecognized input', () => {
    expect(detectScraperType('hello world')).toBeNull()
    expect(detectScraperType('123')).toBeNull()
    expect(detectScraperType('https://google.com')).toBeNull()
  })
})

describe('detectBricklinkItemType', () => {
  it('returns S for col-prefixed items', () => {
    expect(detectBricklinkItemType('col25-1')).toBe('S')
    expect(detectBricklinkItemType('colhp-5')).toBe('S')
    expect(detectBricklinkItemType('colmar-3')).toBe('S')
  })

  it('returns M for non-col items', () => {
    expect(detectBricklinkItemType('cas002')).toBe('M')
    expect(detectBricklinkItemType('sw0001')).toBe('M')
    expect(detectBricklinkItemType('cty1234')).toBe('M')
  })
})

describe('AddJobInputSchema', () => {
  it('accepts valid input with URL', () => {
    const result = AddJobInputSchema.safeParse({
      url: 'https://www.bricklink.com/v2/catalog/catalogitem.page?M=cas002',
    })
    expect(result.success).toBe(true)
  })

  it('accepts input with explicit type', () => {
    const result = AddJobInputSchema.parse({
      url: 'cas002',
      type: 'bricklink-minifig',
    })
    expect(result.type).toBe('bricklink-minifig')
  })

  it('defaults wishlist to false', () => {
    const result = AddJobInputSchema.parse({ url: 'cas002' })
    expect(result.wishlist).toBe(false)
  })

  it('rejects empty URL', () => {
    const result = AddJobInputSchema.safeParse({ url: '' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid type', () => {
    const result = AddJobInputSchema.safeParse({ url: 'cas002', type: 'invalid' })
    expect(result.success).toBe(false)
  })
})

describe('JobListQuerySchema', () => {
  it('defaults limit to 50', () => {
    const result = JobListQuerySchema.parse({})
    expect(result.limit).toBe(50)
  })

  it('accepts valid status filter', () => {
    const result = JobListQuerySchema.parse({ status: 'failed' })
    expect(result.status).toBe('failed')
  })

  it('rejects invalid status', () => {
    const result = JobListQuerySchema.safeParse({ status: 'invalid' })
    expect(result.success).toBe(false)
  })

  it('coerces string limit to number', () => {
    const result = JobListQuerySchema.parse({ limit: '25' })
    expect(result.limit).toBe(25)
  })

  it('rejects limit over 200', () => {
    const result = JobListQuerySchema.safeParse({ limit: '500' })
    expect(result.success).toBe(false)
  })
})
