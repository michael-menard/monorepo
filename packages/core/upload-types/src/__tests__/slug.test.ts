import { describe, it, expect } from 'vitest'
import { SlugSchema, slugify, slugWithSuffix, findAvailableSlug } from '../slug'

describe('SlugSchema', () => {
  it('should validate a valid slug', () => {
    expect(SlugSchema.safeParse('my-awesome-moc').success).toBe(true)
  })

  it('should validate single word', () => {
    expect(SlugSchema.safeParse('castle').success).toBe(true)
  })

  it('should validate with numbers', () => {
    expect(SlugSchema.safeParse('moc-2024').success).toBe(true)
  })

  it('should reject empty string', () => {
    expect(SlugSchema.safeParse('').success).toBe(false)
  })

  it('should reject uppercase', () => {
    expect(SlugSchema.safeParse('My-MOC').success).toBe(false)
  })

  it('should reject leading dash', () => {
    expect(SlugSchema.safeParse('-my-moc').success).toBe(false)
  })

  it('should reject trailing dash', () => {
    expect(SlugSchema.safeParse('my-moc-').success).toBe(false)
  })

  it('should reject consecutive dashes', () => {
    expect(SlugSchema.safeParse('my--moc').success).toBe(false)
  })

  it('should reject special characters', () => {
    expect(SlugSchema.safeParse('my_moc').success).toBe(false)
  })
})

describe('slugify', () => {
  it('should convert to lowercase', () => {
    expect(slugify('My AWESOME Moc')).toBe('my-awesome-moc')
  })

  it('should replace spaces with dashes', () => {
    expect(slugify('my awesome moc')).toBe('my-awesome-moc')
  })

  it('should remove special characters', () => {
    expect(slugify('My MOC! @#$%')).toBe('my-moc')
  })

  it('should collapse multiple spaces', () => {
    expect(slugify('my    awesome   moc')).toBe('my-awesome-moc')
  })

  it('should handle unicode characters', () => {
    expect(slugify('Café MOC')).toBe('cafe-moc')
  })

  it('should trim whitespace', () => {
    expect(slugify('  my moc  ')).toBe('my-moc')
  })

  it('should replace underscores with dashes', () => {
    expect(slugify('my_awesome_moc')).toBe('my-awesome-moc')
  })

  it('should return empty string for empty input', () => {
    expect(slugify('')).toBe('')
  })

  it('should return empty string for null-like input', () => {
    expect(slugify(null as unknown as string)).toBe('')
  })

  it('should truncate to max length', () => {
    const longTitle = 'a'.repeat(100)
    const slug = slugify(longTitle)
    expect(slug.length).toBeLessThanOrEqual(80)
  })

  it('should remove trailing dash after truncation', () => {
    const title = 'this is a very long title that needs to be truncated at some point later on'
    const slug = slugify(title)
    expect(slug.endsWith('-')).toBe(false)
  })
})

describe('slugWithSuffix', () => {
  it('should append suffix', () => {
    expect(slugWithSuffix('my-moc', 2)).toBe('my-moc-2')
  })

  it('should append larger suffix', () => {
    expect(slugWithSuffix('my-moc', 100)).toBe('my-moc-100')
  })

  it('should trim base if slug would exceed max length', () => {
    const longSlug = 'a'.repeat(78)
    const result = slugWithSuffix(longSlug, 2)
    expect(result.length).toBeLessThanOrEqual(80)
    expect(result.endsWith('-2')).toBe(true)
  })
})

describe('findAvailableSlug', () => {
  it('should return base slug if available', () => {
    expect(findAvailableSlug('my-moc', [])).toBe('my-moc')
  })

  it('should return base slug if not in list', () => {
    expect(findAvailableSlug('my-moc', ['other-moc', 'another-moc'])).toBe('my-moc')
  })

  it('should add suffix if base exists', () => {
    expect(findAvailableSlug('my-moc', ['my-moc'])).toBe('my-moc-2')
  })

  it('should increment suffix until available', () => {
    expect(findAvailableSlug('my-moc', ['my-moc', 'my-moc-2', 'my-moc-3'])).toBe('my-moc-4')
  })

  it('should handle large suffix lists', () => {
    const existing = ['my-moc']
    for (let i = 2; i <= 10; i++) {
      existing.push(`my-moc-${i}`)
    }
    expect(findAvailableSlug('my-moc', existing)).toBe('my-moc-11')
  })
})
