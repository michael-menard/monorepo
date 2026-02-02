import { describe, expect, it } from 'vitest'

import { createScope, inferRiskFlags, inferScopeFromContent, ScopeSchema } from '../scope'

describe('ScopeSchema', () => {
  describe('schema validation', () => {
    it('validates a minimal valid scope', () => {
      const scope = {
        schema: 1,
        story_id: 'WISH-001',
        timestamp: '2026-02-01T12:00:00.000Z',
        touches: {
          backend: false,
          frontend: false,
          packages: false,
          db: false,
          contracts: false,
          ui: false,
          infra: false,
        },
        touched_paths_globs: [],
        risk_flags: {
          auth: false,
          payments: false,
          migrations: false,
          external_apis: false,
          security: false,
          performance: false,
        },
      }

      const result = ScopeSchema.parse(scope)
      expect(result).toMatchObject(scope)
    })

    it('validates a scope with all fields populated', () => {
      const scope = {
        schema: 1,
        story_id: 'WISH-001',
        timestamp: '2026-02-01T12:00:00.000Z',
        touches: {
          backend: true,
          frontend: true,
          packages: false,
          db: true,
          contracts: true,
          ui: true,
          infra: false,
        },
        touched_paths_globs: ['apps/api/**/*.ts', 'apps/web/**/*.tsx'],
        risk_flags: {
          auth: true,
          payments: false,
          migrations: true,
          external_apis: false,
          security: true,
          performance: false,
        },
        summary: 'Adding user authentication with database migrations',
      }

      const result = ScopeSchema.parse(scope)
      expect(result.touches.backend).toBe(true)
      expect(result.risk_flags.auth).toBe(true)
      expect(result.summary).toBe('Adding user authentication with database migrations')
    })

    it('rejects invalid schema version', () => {
      const scope = {
        schema: 2,
        story_id: 'WISH-001',
        timestamp: '2026-02-01T12:00:00.000Z',
        touches: {
          backend: false,
          frontend: false,
          packages: false,
          db: false,
          contracts: false,
          ui: false,
          infra: false,
        },
        touched_paths_globs: [],
        risk_flags: {
          auth: false,
          payments: false,
          migrations: false,
          external_apis: false,
          security: false,
          performance: false,
        },
      }

      expect(() => ScopeSchema.parse(scope)).toThrow()
    })
  })

  describe('createScope', () => {
    it('creates an empty scope', () => {
      const scope = createScope('WISH-001')

      expect(scope.schema).toBe(1)
      expect(scope.story_id).toBe('WISH-001')
      expect(scope.touches.backend).toBe(false)
      expect(scope.touches.frontend).toBe(false)
      expect(scope.risk_flags.auth).toBe(false)
      expect(scope.touched_paths_globs).toEqual([])
    })

    it('creates a valid scope that passes schema validation', () => {
      const scope = createScope('WISH-001')

      expect(() => ScopeSchema.parse(scope)).not.toThrow()
    })
  })

  describe('inferScopeFromContent', () => {
    it('detects backend keywords', () => {
      const result = inferScopeFromContent('This story adds an API endpoint for uploading files')

      expect(result.backend).toBe(true)
    })

    it('detects frontend keywords', () => {
      const result = inferScopeFromContent('Add a React component with Tailwind styling')

      expect(result.frontend).toBe(true)
    })

    it('detects database keywords', () => {
      const result = inferScopeFromContent('Add a migration for the new users table in postgres')

      expect(result.db).toBe(true)
    })

    it('detects UI keywords', () => {
      const result = inferScopeFromContent('Add a modal dialog with a submit button')

      expect(result.ui).toBe(true)
    })

    it('detects multiple areas', () => {
      const result = inferScopeFromContent(
        'Create API endpoint and React component with database migration',
      )

      expect(result.backend).toBe(true)
      expect(result.frontend).toBe(true)
      expect(result.db).toBe(true)
    })

    it('returns false for unrelated content', () => {
      const result = inferScopeFromContent('This is just a readme update')

      expect(result.backend).toBe(false)
      expect(result.frontend).toBe(false)
      expect(result.db).toBe(false)
    })
  })

  describe('inferRiskFlags', () => {
    it('detects auth keywords', () => {
      const result = inferRiskFlags('Add Cognito authentication with JWT tokens')

      expect(result.auth).toBe(true)
    })

    it('detects payment keywords', () => {
      const result = inferRiskFlags('Integrate Stripe for subscription billing')

      expect(result.payments).toBe(true)
    })

    it('detects migration keywords', () => {
      const result = inferRiskFlags('Add migration to alter table and add column')

      expect(result.migrations).toBe(true)
    })

    it('detects security keywords', () => {
      const result = inferRiskFlags('Add XSS protection and sanitize user input')

      expect(result.security).toBe(true)
    })

    it('detects performance keywords', () => {
      const result = inferRiskFlags('Optimize query performance by adding cache and index')

      expect(result.performance).toBe(true)
    })

    it('detects external API keywords', () => {
      const result = inferRiskFlags('Integrate with external API via webhook')

      expect(result.external_apis).toBe(true)
    })

    it('returns false for low-risk content', () => {
      const result = inferRiskFlags('Fix typo in documentation')

      expect(result.auth).toBe(false)
      expect(result.payments).toBe(false)
      expect(result.migrations).toBe(false)
      expect(result.security).toBe(false)
    })
  })
})
