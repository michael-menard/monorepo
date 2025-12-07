/**
 * Slug Utility Unit Tests
 *
 * Story 3.1.14: Slug Generation — Deterministic + Suffixing
 *
 * Tests slug generation and conflict resolution.
 */

import { describe, it, expect } from 'vitest'
import { slugify, slugWithSuffix, findAvailableSlug, SlugSchema } from '../slug'

describe('Slug Utility', () => {
  describe('slugify', () => {
    it('converts title to lowercase', () => {
      expect(slugify('My LEGO MOC')).toBe('my-lego-moc')
    })

    it('replaces spaces with dashes', () => {
      expect(slugify('hello world')).toBe('hello-world')
    })

    it('replaces underscores with dashes', () => {
      expect(slugify('hello_world')).toBe('hello-world')
    })

    it('removes special characters', () => {
      expect(slugify('Hello! World?')).toBe('hello-world')
    })

    it('collapses multiple dashes', () => {
      expect(slugify('hello   world')).toBe('hello-world')
      expect(slugify('hello---world')).toBe('hello-world')
    })

    it('removes leading and trailing dashes', () => {
      expect(slugify('  hello world  ')).toBe('hello-world')
      expect(slugify('---hello---')).toBe('hello')
    })

    it('handles unicode characters', () => {
      expect(slugify('Café Résumé')).toBe('cafe-resume')
    })

    // Multilingual input tests (AC 3)
    it('handles German umlauts', () => {
      expect(slugify('Münchner Städte')).toBe('munchner-stadte')
    })

    it('handles Spanish characters', () => {
      expect(slugify('Año Nuevo España')).toBe('ano-nuevo-espana')
    })

    it('handles French characters', () => {
      expect(slugify('Château Élégant')).toBe('chateau-elegant')
    })

    it('handles Nordic characters', () => {
      expect(slugify('Smörgåsbord')).toBe('smorgasbord')
    })

    it('handles non-Latin scripts by removing them', () => {
      // Non-Latin scripts (Cyrillic, CJK, etc.) are removed as they cannot be ASCII-transliterated
      expect(slugify('Hello 日本語 World')).toBe('hello-world')
      expect(slugify('Привет Мир')).toBe('')
      expect(slugify('한국어 테스트')).toBe('')
    })

    it('handles mixed Latin and non-Latin', () => {
      expect(slugify('LEGO® Castle 城堡')).toBe('lego-castle')
    })

    it('truncates to max length', () => {
      const longTitle = 'a'.repeat(100)
      const result = slugify(longTitle)
      expect(result.length).toBeLessThanOrEqual(80)
    })

    it('handles empty string', () => {
      expect(slugify('')).toBe('')
    })

    it('handles null/undefined', () => {
      expect(slugify(null as unknown as string)).toBe('')
      expect(slugify(undefined as unknown as string)).toBe('')
    })

    it('handles numbers', () => {
      expect(slugify('MOC 12345')).toBe('moc-12345')
    })

    it('handles mixed content', () => {
      expect(slugify('My LEGO® Castle (2024)')).toBe('my-lego-castle-2024')
    })
  })

  describe('slugWithSuffix', () => {
    it('appends suffix to slug', () => {
      expect(slugWithSuffix('my-moc', 2)).toBe('my-moc-2')
      expect(slugWithSuffix('my-moc', 10)).toBe('my-moc-10')
    })

    it('trims base slug if suffix would exceed max length', () => {
      const longSlug = 'a'.repeat(78)
      const result = slugWithSuffix(longSlug, 2)
      expect(result.length).toBeLessThanOrEqual(80)
      expect(result).toMatch(/-2$/)
    })

    it('removes trailing dash when trimming', () => {
      const result = slugWithSuffix('my-long-slug-name', 999)
      expect(result).not.toMatch(/--/)
    })
  })

  describe('findAvailableSlug', () => {
    it('returns base slug if not in existing list', () => {
      expect(findAvailableSlug('my-moc', [])).toBe('my-moc')
      expect(findAvailableSlug('my-moc', ['other-moc'])).toBe('my-moc')
    })

    it('returns slug with suffix if base exists', () => {
      expect(findAvailableSlug('my-moc', ['my-moc'])).toBe('my-moc-2')
    })

    it('finds next available suffix', () => {
      expect(findAvailableSlug('my-moc', ['my-moc', 'my-moc-2'])).toBe('my-moc-3')
      expect(findAvailableSlug('my-moc', ['my-moc', 'my-moc-2', 'my-moc-3'])).toBe('my-moc-4')
    })

    it('handles gaps in suffix sequence', () => {
      expect(findAvailableSlug('my-moc', ['my-moc', 'my-moc-3'])).toBe('my-moc-2')
    })
  })

  describe('SlugSchema', () => {
    it('accepts valid slugs', () => {
      expect(SlugSchema.parse('my-moc')).toBe('my-moc')
      expect(SlugSchema.parse('moc-12345')).toBe('moc-12345')
      expect(SlugSchema.parse('a')).toBe('a')
    })

    it('rejects empty string', () => {
      expect(() => SlugSchema.parse('')).toThrow('Slug is required')
    })

    it('rejects invalid format', () => {
      expect(() => SlugSchema.parse('My MOC')).toThrow('Invalid slug format')
      expect(() => SlugSchema.parse('my_moc')).toThrow('Invalid slug format')
      expect(() => SlugSchema.parse('-my-moc')).toThrow('Invalid slug format')
      expect(() => SlugSchema.parse('my-moc-')).toThrow('Invalid slug format')
    })

    it('rejects slug over 80 chars', () => {
      expect(() => SlugSchema.parse('a'.repeat(81))).toThrow('Slug too long')
    })
  })
})

