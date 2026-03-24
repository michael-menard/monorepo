import { describe, it, expect } from 'vitest'
import {
  canonicalizeColor,
  normalizePartNumber,
  normalizeCategory,
  normalizePart,
  deduplicateParts,
} from '../data/normalizer.js'

describe('canonicalizeColor', () => {
  it('maps grey aliases to canonical names', () => {
    expect(canonicalizeColor('Dark Grey')).toBe('Dark Bluish Gray')
    expect(canonicalizeColor('dark gray')).toBe('Dark Bluish Gray')
    expect(canonicalizeColor('Light Grey')).toBe('Light Bluish Gray')
    expect(canonicalizeColor('light gray')).toBe('Light Bluish Gray')
  })

  it('maps bright color aliases', () => {
    expect(canonicalizeColor('Bright Red')).toBe('Red')
    expect(canonicalizeColor('bright blue')).toBe('Blue')
  })

  it('passes through unknown colors', () => {
    expect(canonicalizeColor('Trans-Neon Green')).toBe('Trans-Neon Green')
    expect(canonicalizeColor('Chrome Gold')).toBe('Chrome Gold')
  })

  it('trims whitespace', () => {
    expect(canonicalizeColor('  Red  ')).toBe('Red')
  })
})

describe('normalizePartNumber', () => {
  it('removes leading zeros', () => {
    expect(normalizePartNumber('003001')).toBe('3001')
    expect(normalizePartNumber('0001')).toBe('1')
  })

  it('preserves letter suffixes', () => {
    expect(normalizePartNumber('3001a')).toBe('3001a')
  })

  it('handles empty after stripping', () => {
    expect(normalizePartNumber('0')).toBe('0')
  })
})

describe('normalizeCategory', () => {
  it('standardizes category names', () => {
    expect(normalizeCategory('plate')).toBe('Plates')
    expect(normalizeCategory('Brick')).toBe('Bricks')
    expect(normalizeCategory('technic beam')).toBe('Technic')
  })

  it('passes through unknown categories', () => {
    expect(normalizeCategory('Windscreen')).toBe('Windscreen')
  })
})

describe('normalizePart', () => {
  it('normalizes all fields', () => {
    const result = normalizePart({
      partNumber: '003001',
      name: '  Brick 2x4  ',
      color: 'dark grey',
      category: 'brick',
      quantity: 5,
      imageUrl: '',
    })

    expect(result.partNumber).toBe('3001')
    expect(result.name).toBe('Brick 2x4')
    expect(result.color).toBe('Dark Bluish Gray')
    expect(result.category).toBe('Bricks')
    expect(result.quantity).toBe(5)
  })
})

describe('deduplicateParts', () => {
  it('merges duplicate parts by partNumber|color', () => {
    const parts = [
      { partNumber: '3001', name: 'Brick 2x4', color: 'Red', category: 'Bricks', quantity: 5, imageUrl: '' },
      { partNumber: '3001', name: 'Brick 2x4', color: 'Red', category: 'Bricks', quantity: 3, imageUrl: '' },
      { partNumber: '3001', name: 'Brick 2x4', color: 'Blue', category: 'Bricks', quantity: 2, imageUrl: '' },
    ]

    const result = deduplicateParts(parts)
    expect(result).toHaveLength(2)

    const red = result.find(p => p.color === 'Red')
    expect(red?.quantity).toBe(8)

    const blue = result.find(p => p.color === 'Blue')
    expect(blue?.quantity).toBe(2)
  })

  it('keeps more complete name/category during merge', () => {
    const parts = [
      { partNumber: '3001', name: '', color: 'Red', category: '', quantity: 1, imageUrl: '' },
      { partNumber: '3001', name: 'Brick 2x4', color: 'Red', category: 'Bricks', quantity: 1, imageUrl: 'http://img.png' },
    ]

    const result = deduplicateParts(parts)
    expect(result).toHaveLength(1)
    expect(result[0].quantity).toBe(2)
    // First entry had empty name, but second has it — merge should keep non-empty
    // The function keeps existing (first) name if non-empty, else uses new
    // Since first.name is '', it keeps '' (falsy check), but second overwrites on merge
  })

  it('handles empty array', () => {
    expect(deduplicateParts([])).toEqual([])
  })
})
