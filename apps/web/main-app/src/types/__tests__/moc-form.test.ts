/**
 * Story 3.1.16: MOC Form Schema Tests
 *
 * Tests for Zod form validation schemas including discriminated union behavior.
 */

import { describe, it, expect } from 'vitest'
import {
  MocInstructionFormSchema,
  createEmptyMocForm,
  createEmptySetForm,
  normalizeTags,
  isFormValidForFinalize,
  getFormErrors,
} from '../moc-form'

describe('MocInstructionFormSchema', () => {
  describe('MOC type validation', () => {
    it('validates a complete MOC form', () => {
      const mocForm = {
        type: 'moc' as const,
        title: 'My Awesome MOC',
        description: 'A detailed description of my MOC build',
        author: 'JohnBuilder',
        setNumber: 'MOC-12345',
        partsCount: 500,
        theme: 'Technic',
        tags: ['technic', 'vehicle'],
        status: 'draft' as const,
        visibility: 'private' as const,
        features: [],
        eventBadges: [],
      }

      const result = MocInstructionFormSchema.safeParse(mocForm)
      expect(result.success).toBe(true)
    })

    it('requires author for MOC type', () => {
      const mocForm = {
        type: 'moc' as const,
        title: 'My Awesome MOC',
        description: 'A detailed description of my MOC build',
        author: '', // Empty author
        setNumber: 'MOC-12345',
        partsCount: 500,
        theme: 'Technic',
      }

      const result = MocInstructionFormSchema.safeParse(mocForm)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(i => i.path.includes('author'))).toBe(true)
      }
    })

    it('requires partsCount to be at least 1', () => {
      const mocForm = {
        type: 'moc' as const,
        title: 'My Awesome MOC',
        description: 'A detailed description of my MOC build',
        author: 'JohnBuilder',
        setNumber: 'MOC-12345',
        partsCount: 0, // Invalid
        theme: 'Technic',
      }

      const result = MocInstructionFormSchema.safeParse(mocForm)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(i => i.path.includes('partsCount'))).toBe(true)
      }
    })
  })

  describe('Set type validation', () => {
    it('validates a complete Set form', () => {
      const setForm = {
        type: 'set' as const,
        title: 'LEGO Technic Ferrari',
        description: 'Official LEGO Technic Ferrari set instructions',
        brand: 'LEGO',
        setNumber: '42143',
        theme: 'Technic',
        tags: ['technic', 'car'],
        status: 'draft' as const,
        visibility: 'private' as const,
        features: [],
        eventBadges: [],
        retired: false,
      }

      const result = MocInstructionFormSchema.safeParse(setForm)
      expect(result.success).toBe(true)
    })

    it('requires brand for Set type', () => {
      const setForm = {
        type: 'set' as const,
        title: 'LEGO Technic Ferrari',
        description: 'Official LEGO Technic Ferrari set instructions',
        brand: '', // Empty brand
        setNumber: '42143',
        theme: 'Technic',
      }

      const result = MocInstructionFormSchema.safeParse(setForm)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(i => i.path.includes('brand'))).toBe(true)
      }
    })

    it('validates releaseYear within valid range', () => {
      const setForm = {
        type: 'set' as const,
        title: 'LEGO Technic Ferrari',
        description: 'Official LEGO Technic Ferrari set instructions',
        brand: 'LEGO',
        setNumber: '42143',
        theme: 'Technic',
        releaseYear: 1940, // Too old
      }

      const result = MocInstructionFormSchema.safeParse(setForm)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(i => i.path.includes('releaseYear'))).toBe(true)
      }
    })
  })

  describe('Common field validation', () => {
    it('requires title to be at least 3 characters', () => {
      const form = {
        type: 'moc' as const,
        title: 'AB', // Too short
        description: 'A detailed description',
        author: 'JohnBuilder',
        setNumber: 'MOC-12345',
        partsCount: 500,
        theme: 'Technic',
      }

      const result = MocInstructionFormSchema.safeParse(form)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(i => i.path.includes('title'))).toBe(true)
      }
    })

    it('requires description to be at least 10 characters', () => {
      const form = {
        type: 'moc' as const,
        title: 'My MOC',
        description: 'Short', // Too short
        author: 'JohnBuilder',
        setNumber: 'MOC-12345',
        partsCount: 500,
        theme: 'Technic',
      }

      const result = MocInstructionFormSchema.safeParse(form)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(i => i.path.includes('description'))).toBe(true)
      }
    })
  })
})

describe('Helper functions', () => {
  describe('createEmptyMocForm', () => {
    it('creates a valid empty MOC form', () => {
      const form = createEmptyMocForm()
      expect(form.type).toBe('moc')
      expect(form.title).toBe('')
      expect(form.description).toBe('')
      expect(form.author).toBe('')
      expect(form.status).toBe('draft')
      expect(form.visibility).toBe('private')
    })
  })

  describe('createEmptySetForm', () => {
    it('creates a valid empty Set form', () => {
      const form = createEmptySetForm()
      expect(form.type).toBe('set')
      expect(form.title).toBe('')
      expect(form.brand).toBe('')
      expect(form.retired).toBe(false)
    })
  })

  describe('normalizeTags', () => {
    it('trims and lowercases tags', () => {
      const result = normalizeTags(['  Technic  ', 'VEHICLE', ' car '])
      expect(result).toEqual(['technic', 'vehicle', 'car'])
    })

    it('removes duplicates', () => {
      const result = normalizeTags(['technic', 'Technic', 'TECHNIC'])
      expect(result).toEqual(['technic'])
    })

    it('removes empty tags', () => {
      const result = normalizeTags(['technic', '', '  ', 'vehicle'])
      expect(result).toEqual(['technic', 'vehicle'])
    })
  })

  describe('isFormValidForFinalize', () => {
    it('returns true for valid MOC form', () => {
      const form = {
        ...createEmptyMocForm(),
        title: 'My MOC',
        description: 'A detailed description',
        author: 'JohnBuilder',
        setNumber: 'MOC-12345',
        partsCount: 500,
        theme: 'Technic',
      }
      expect(isFormValidForFinalize(form)).toBe(true)
    })

    it('returns false for invalid MOC form', () => {
      const form = createEmptyMocForm()
      expect(isFormValidForFinalize(form)).toBe(false)
    })
  })

  describe('getFormErrors', () => {
    it('returns empty object for valid form', () => {
      const form = {
        ...createEmptyMocForm(),
        title: 'My MOC',
        description: 'A detailed description',
        author: 'JohnBuilder',
        setNumber: 'MOC-12345',
        partsCount: 500,
        theme: 'Technic',
      }
      expect(getFormErrors(form)).toEqual({})
    })

    it('returns errors for invalid form', () => {
      const form = createEmptyMocForm()
      const errors = getFormErrors(form)
      expect(Object.keys(errors).length).toBeGreaterThan(0)
    })
  })
})
