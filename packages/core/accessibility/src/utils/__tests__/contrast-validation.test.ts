import { describe, it, expect } from 'vitest'
import { ContrastRatioSchema } from '../contrast-validation'

describe('ContrastRatioSchema', () => {
  it('should accept valid WCAG AA ratios', () => {
    const result = ContrastRatioSchema.safeParse({ normalText: 4.5, largeText: 3 })
    expect(result.success).toBe(true)
  })

  it('should accept ratios above minimum', () => {
    const result = ContrastRatioSchema.safeParse({ normalText: 7, largeText: 4.5 })
    expect(result.success).toBe(true)
  })

  it('should reject normal text below 4.5:1', () => {
    const result = ContrastRatioSchema.safeParse({ normalText: 3.0, largeText: 3 })
    expect(result.success).toBe(false)
  })

  it('should reject large text below 3:1', () => {
    const result = ContrastRatioSchema.safeParse({ normalText: 4.5, largeText: 2.5 })
    expect(result.success).toBe(false)
  })
})
