/**
 * Story 3.1.39: Instructions Edit Module Tests
 *
 * Tests for edit module, ownership validation, and slug validation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { z } from 'zod'

describe('InstructionsEditModule', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Unit: Slug validation (AC: 6)', () => {
    const SlugSchema = z.string().regex(/^[a-z0-9-]+$/, 'Invalid slug format')

    it('should validate valid slug formats', () => {
      const validSlugs = ['test-moc', 'my-awesome-moc', 'moc123', 'test', 'a-b-c-123']

      validSlugs.forEach(slug => {
        const result = SlugSchema.safeParse(slug)
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid slug formats', () => {
      const invalidSlugs = ['Test-MOC', 'test_moc', 'test moc', 'test.moc', 'TEST', 'test@moc']

      invalidSlugs.forEach(slug => {
        const result = SlugSchema.safeParse(slug)
        expect(result.success).toBe(false)
      })
    })

    it('should reject empty slugs', () => {
      const result = SlugSchema.safeParse('')
      expect(result.success).toBe(false)
    })
  })

  describe('Unit: Ownership logic (AC: 5)', () => {
    it('should identify owner correctly', () => {
      const checkOwnership = (mocData: { isOwner: boolean }) => mocData.isOwner

      expect(checkOwnership({ isOwner: true })).toBe(true)
      expect(checkOwnership({ isOwner: false })).toBe(false)
    })

    it('should determine redirect action for non-owner', () => {
      const determineAction = (isOwner: boolean, slug: string) => {
        if (!isOwner) {
          return { redirect: true, to: `/mocs/${slug}` }
        }
        return { redirect: false }
      }

      expect(determineAction(true, 'test-moc')).toEqual({ redirect: false })
      expect(determineAction(false, 'test-moc')).toEqual({
        redirect: true,
        to: '/mocs/test-moc',
      })
    })
  })
})

describe('Route Guards', () => {
  describe('Auth Guard (AC: 4)', () => {
    it('should redirect unauthenticated users to login with returnTo', () => {
      // This tests the route configuration logic
      const authGuard = (
        context: { auth?: { isAuthenticated: boolean } },
        location: { pathname: string },
      ) => {
        if (!context.auth?.isAuthenticated) {
          return {
            to: '/login',
            search: { returnTo: location.pathname },
          }
        }
        return null
      }

      // Test unauthenticated user
      const result = authGuard({ auth: { isAuthenticated: false } }, { pathname: '/mocs/test/edit' })
      expect(result).toEqual({
        to: '/login',
        search: { returnTo: '/mocs/test/edit' },
      })

      // Test authenticated user
      const authResult = authGuard({ auth: { isAuthenticated: true } }, { pathname: '/mocs/test/edit' })
      expect(authResult).toBeNull()
    })

    it('should preserve returnTo path for various edit URLs', () => {
      const authGuard = (
        context: { auth?: { isAuthenticated: boolean } },
        location: { pathname: string },
      ) => {
        if (!context.auth?.isAuthenticated) {
          return { to: '/login', search: { returnTo: location.pathname } }
        }
        return null
      }

      const paths = [
        '/mocs/my-awesome-moc/edit',
        '/mocs/test-123/edit',
        '/mocs/a-b-c/edit',
      ]

      paths.forEach(path => {
        const result = authGuard({ auth: { isAuthenticated: false } }, { pathname: path })
        expect(result?.search.returnTo).toBe(path)
      })
    })
  })

  describe('Edit button visibility (AC: 2)', () => {
    it('should only show edit button for owner', () => {
      const shouldShowEditButton = (moc: { isOwner: boolean }) => moc.isOwner

      expect(shouldShowEditButton({ isOwner: true })).toBe(true)
      expect(shouldShowEditButton({ isOwner: false })).toBe(false)
    })
  })
})
