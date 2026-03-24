/**
 * Unit tests for context/ module
 *
 * Tests buildContextQuery with domain+taskType, with optional role, with empty inputs.
 * Tests buildBlockerQuery with domain and edge cases.
 */

import { describe, it, expect } from 'vitest'
import { buildContextQuery, buildBlockerQuery } from '../context/index.js'

describe('buildContextQuery', () => {
  // =========================================================================
  // Standard usage: domain + taskType
  // =========================================================================

  it('builds query from domain and taskType', () => {
    expect(buildContextQuery('backend', 'api endpoint')).toBe('backend api endpoint patterns')
  })

  it('builds query for frontend component', () => {
    expect(buildContextQuery('frontend', 'react component')).toBe('frontend react component patterns')
  })

  it('builds query for database migration', () => {
    expect(buildContextQuery('database', 'migration')).toBe('database migration patterns')
  })

  // =========================================================================
  // With optional role
  // =========================================================================

  it('includes role when provided', () => {
    expect(buildContextQuery('frontend', 'react component', 'dev')).toBe(
      'dev frontend react component patterns',
    )
  })

  it('includes role for pm queries', () => {
    expect(buildContextQuery('wishlist', 'story patterns sizing', 'pm')).toBe(
      'pm wishlist story patterns sizing patterns',
    )
  })

  it('includes role for qa queries', () => {
    expect(buildContextQuery('test coverage', 'e2e', 'qa')).toBe('qa test coverage e2e patterns')
  })

  // =========================================================================
  // Edge cases: empty inputs
  // =========================================================================

  it('returns "patterns" when both domain and taskType are empty', () => {
    expect(buildContextQuery('', '')).toBe('patterns')
  })

  it('returns "patterns" when all three are empty', () => {
    expect(buildContextQuery('', '', '')).toBe('patterns')
  })

  it('handles whitespace-only domain', () => {
    expect(buildContextQuery('  ', 'api')).toBe('api patterns')
  })

  it('handles whitespace-only taskType', () => {
    expect(buildContextQuery('backend', '  ')).toBe('backend patterns')
  })

  it('handles whitespace-only role (ignores it)', () => {
    expect(buildContextQuery('backend', 'api', '  ')).toBe('backend api patterns')
  })

  it('trims whitespace from parts', () => {
    expect(buildContextQuery('  backend  ', '  api endpoint  ')).toBe('backend api endpoint patterns')
  })

  // =========================================================================
  // No role provided — role is undefined
  // =========================================================================

  it('omits role when undefined', () => {
    expect(buildContextQuery('backend', 'api', undefined)).toBe('backend api patterns')
  })
})

describe('buildBlockerQuery', () => {
  // =========================================================================
  // Standard usage
  // =========================================================================

  it('builds blocker query for backend domain', () => {
    expect(buildBlockerQuery('backend')).toBe('backend blockers lessons')
  })

  it('builds blocker query for database domain', () => {
    expect(buildBlockerQuery('database')).toBe('database blockers lessons')
  })

  it('builds blocker query for frontend domain', () => {
    expect(buildBlockerQuery('frontend')).toBe('frontend blockers lessons')
  })

  // =========================================================================
  // Edge cases: empty domain
  // =========================================================================

  it('returns "blockers lessons" when domain is empty string', () => {
    expect(buildBlockerQuery('')).toBe('blockers lessons')
  })

  it('handles whitespace-only domain', () => {
    expect(buildBlockerQuery('   ')).toBe('blockers lessons')
  })

  it('trims whitespace from domain', () => {
    expect(buildBlockerQuery('  backend  ')).toBe('backend blockers lessons')
  })
})
