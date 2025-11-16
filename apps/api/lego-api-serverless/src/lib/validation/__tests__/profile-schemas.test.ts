/**
 * Profile Validation Schemas Tests
 *
 * Unit tests for profile validation schemas including:
 * - UpdateProfileSchema validation rules
 * - Edge cases for name field validation
 */

import { describe, it, expect } from 'vitest'
import { UpdateProfileSchema } from '../profile-schemas'

describe('UpdateProfileSchema', () => {
  describe('valid inputs', () => {
    it('should accept a valid name with letters only', () => {
      const result = UpdateProfileSchema.safeParse({
        name: 'John Doe',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('John Doe')
      }
    })

    it('should accept a name with letters and numbers', () => {
      const result = UpdateProfileSchema.safeParse({
        name: 'Jane Smith 123',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Jane Smith 123')
      }
    })

    it('should accept a name with multiple spaces', () => {
      const result = UpdateProfileSchema.safeParse({
        name: 'Mary Jane Watson',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Mary Jane Watson')
      }
    })

    it('should accept a single character name', () => {
      const result = UpdateProfileSchema.safeParse({
        name: 'A',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('A')
      }
    })

    it('should accept a name with exactly 100 characters', () => {
      const longName = 'A'.repeat(100)
      const result = UpdateProfileSchema.safeParse({
        name: longName,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe(longName)
      }
    })
  })

  describe('invalid inputs - empty or too short', () => {
    it('should reject an empty string', () => {
      const result = UpdateProfileSchema.safeParse({
        name: '',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Name is required')
      }
    })

    it('should reject missing name field', () => {
      const result = UpdateProfileSchema.safeParse({})

      expect(result.success).toBe(false)
      if (!result.success) {
        // Zod returns a type error for missing required field
        expect(result.error.issues[0].code).toBe('invalid_type')
      }
    })
  })

  describe('invalid inputs - too long', () => {
    it('should reject a name with 101 characters', () => {
      const longName = 'A'.repeat(101)
      const result = UpdateProfileSchema.safeParse({
        name: longName,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Name must be less than 100 characters')
      }
    })

    it('should reject a name with 200 characters', () => {
      const veryLongName = 'A'.repeat(200)
      const result = UpdateProfileSchema.safeParse({
        name: veryLongName,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Name must be less than 100 characters')
      }
    })
  })

  describe('invalid inputs - special characters', () => {
    it('should reject a name with special characters (!)', () => {
      const result = UpdateProfileSchema.safeParse({
        name: 'John!Doe',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'Name can only contain letters, numbers, and spaces',
        )
      }
    })

    it('should reject a name with special characters (@)', () => {
      const result = UpdateProfileSchema.safeParse({
        name: 'user@example.com',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'Name can only contain letters, numbers, and spaces',
        )
      }
    })

    it('should reject a name with special characters (#, $, %)', () => {
      const result = UpdateProfileSchema.safeParse({
        name: 'Name#$%',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'Name can only contain letters, numbers, and spaces',
        )
      }
    })

    it('should reject a name with underscores', () => {
      const result = UpdateProfileSchema.safeParse({
        name: 'John_Doe',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'Name can only contain letters, numbers, and spaces',
        )
      }
    })

    it('should reject a name with hyphens', () => {
      const result = UpdateProfileSchema.safeParse({
        name: 'Mary-Jane',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'Name can only contain letters, numbers, and spaces',
        )
      }
    })

    it('should reject a name with periods', () => {
      const result = UpdateProfileSchema.safeParse({
        name: 'Dr. Smith',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'Name can only contain letters, numbers, and spaces',
        )
      }
    })

    it('should reject a name with emojis', () => {
      const result = UpdateProfileSchema.safeParse({
        name: 'John 😊',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'Name can only contain letters, numbers, and spaces',
        )
      }
    })
  })

  describe('invalid inputs - wrong type', () => {
    it('should reject a number instead of string', () => {
      const result = UpdateProfileSchema.safeParse({
        name: 12345,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].code).toBe('invalid_type')
      }
    })

    it('should reject null', () => {
      const result = UpdateProfileSchema.safeParse({
        name: null,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].code).toBe('invalid_type')
      }
    })

    it('should reject undefined', () => {
      const result = UpdateProfileSchema.safeParse({
        name: undefined,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        // Zod returns a type error for undefined
        expect(result.error.issues[0].code).toBe('invalid_type')
      }
    })
  })
})
