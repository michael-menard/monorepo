/**
 * Unit tests for isValidStoryId
 *
 * Verifies the story ID validation pattern /^[A-Z]{2,10}-\d{3,4}$/
 * against valid formats, invalid formats, and edge cases.
 *
 * Pattern is backward-compatible with STORY_ID_REGEX in story-compatibility.
 */

import { describe, it, expect } from 'vitest'
import { isValidStoryId } from '../validation/index.js'

describe('isValidStoryId', () => {
  // =========================================================================
  // Valid story IDs
  // =========================================================================

  it('WINT-9010 → true', () => {
    expect(isValidStoryId('WINT-9010')).toBe(true)
  })

  it('KBAR-0030 → true', () => {
    expect(isValidStoryId('KBAR-0030')).toBe(true)
  })

  it('WINT-0090 → true', () => {
    expect(isValidStoryId('WINT-0090')).toBe(true)
  })

  it('TEST-9999 → true (4-digit suffix max)', () => {
    expect(isValidStoryId('TEST-9999')).toBe(true)
  })

  it('AB-123 → true (2-char prefix min, 3-digit suffix min)', () => {
    expect(isValidStoryId('AB-123')).toBe(true)
  })

  it('ABCDEFGHIJ-1234 → true (10-char prefix max)', () => {
    expect(isValidStoryId('ABCDEFGHIJ-1234')).toBe(true)
  })

  it('LNGG-0060 → true', () => {
    expect(isValidStoryId('LNGG-0060')).toBe(true)
  })

  it('XY-000 → true (minimum length story ID)', () => {
    expect(isValidStoryId('XY-000')).toBe(true)
  })

  // =========================================================================
  // Invalid: UUIDs
  // =========================================================================

  it('UUID → false', () => {
    expect(isValidStoryId('550e8400-e29b-41d4-a716-446655440000')).toBe(false)
  })

  // =========================================================================
  // Invalid: prefix constraints
  // =========================================================================

  it('A-1234 → false (prefix too short: 1 char)', () => {
    expect(isValidStoryId('A-1234')).toBe(false)
  })

  it('ABCDEFGHIJK-1234 → false (prefix too long: 11 chars)', () => {
    expect(isValidStoryId('ABCDEFGHIJK-1234')).toBe(false)
  })

  it('wint-9010 → false (lowercase prefix)', () => {
    expect(isValidStoryId('wint-9010')).toBe(false)
  })

  it('Wint-9010 → false (mixed case prefix)', () => {
    expect(isValidStoryId('Wint-9010')).toBe(false)
  })

  // =========================================================================
  // Invalid: suffix constraints
  // =========================================================================

  it('WINT-12 → false (suffix too short: 2 digits)', () => {
    expect(isValidStoryId('WINT-12')).toBe(false)
  })

  it('WINT-12345 → false (suffix too long: 5 digits)', () => {
    expect(isValidStoryId('WINT-12345')).toBe(false)
  })

  it('WINT-12A → false (non-numeric in suffix)', () => {
    expect(isValidStoryId('WINT-12A')).toBe(false)
  })

  // =========================================================================
  // Invalid: structural
  // =========================================================================

  it('empty string → false', () => {
    expect(isValidStoryId('')).toBe(false)
  })

  it('no separator → false', () => {
    expect(isValidStoryId('WINT9010')).toBe(false)
  })

  it('double separator → false', () => {
    expect(isValidStoryId('WINT--9010')).toBe(false)
  })

  it('trailing separator → false', () => {
    expect(isValidStoryId('WINT-')).toBe(false)
  })

  it('leading separator → false', () => {
    expect(isValidStoryId('-9010')).toBe(false)
  })

  it('space in ID → false', () => {
    expect(isValidStoryId('WINT 9010')).toBe(false)
  })

  it('underscore separator → false', () => {
    expect(isValidStoryId('WINT_9010')).toBe(false)
  })

  // =========================================================================
  // Returns boolean (not throws)
  // =========================================================================

  it('always returns boolean (does not throw for any string)', () => {
    const inputs = ['', '   ', 'null', 'undefined', '123-456', 'WINT-9010']
    for (const input of inputs) {
      expect(typeof isValidStoryId(input)).toBe('boolean')
    }
  })
})
