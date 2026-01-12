/**
 * API Mocking Utilities for E2E Tests
 * Story 3.1.26: E2E + A11y + Performance
 *
 * Provides mock responses for upload API endpoints and S3 presigned URLs.
 */

import type { Page } from '@playwright/test'

/**
 * Mock response types
 */
export interface PresignResponse {
  uploadSessionId: string
  files: Array<{
    fileId: string
    uploadUrl: string
    expiresAt: string
  }>
}

export interface FinalizeResponse {
  id: string
  slug: string
  title: string
  createdAt: string
}

export interface ConflictResponse {
  error: 'SLUG_CONFLICT'
  message: string
  suggestedSlug: string
}

export interface RateLimitResponse {
  error: 'RATE_LIMIT_EXCEEDED'
  message: string
  retryAfterSeconds: number
}

export interface FileValidationErrorResponse {
  error: 'FILE_VALIDATION_FAILED'
  message: string
  fileErrors: Array<{
    fileId: string
    filename: string
    reason: 'type' | 'size' | 'magic-bytes'
    message: string
  }>
}

/**
 * Default mock responses
 */
export const mockResponses = {
  presign: (): PresignResponse => ({
    uploadSessionId: `session-${Date.now()}`,
    files: [
      {
        fileId: `file-${Date.now()}`,
        uploadUrl: 'https://mock-s3.example.com/presigned-upload-url',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      },
    ],
  }),

  finalize: (title: string = 'Test MOC'): FinalizeResponse => ({
    id: `moc-${Date.now()}`,
    slug: title.toLowerCase().replace(/\s+/g, '-'),
    title,
    createdAt: new Date().toISOString(),
  }),

  conflict: (suggestedSlug: string = 'my-moc-2'): ConflictResponse => ({
    error: 'SLUG_CONFLICT',
    message: 'A MOC with this title already exists',
    suggestedSlug,
  }),

  rateLimit: (retryAfterSeconds: number = 60): RateLimitResponse => ({
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests. Please try again later.',
    retryAfterSeconds,
  }),

  fileValidation: (
    errors: FileValidationErrorResponse['fileErrors'],
  ): FileValidationErrorResponse => ({
    error: 'FILE_VALIDATION_FAILED',
    message: 'Some files failed validation',
    fileErrors: errors,
  }),
}


/**
 * Setup mock for session restoration
 */
export async function setupSessionMock(
  page: Page,
  sessionData: {
    title?: string
    description?: string
    files?: string[]
  } = {},
) {
  await page.evaluate(data => {
    const session = {
      title: data.title || 'Restored Session Title',
      description: data.description || 'Restored description',
      files: data.files || [],
      step: 'details',
      uploadToken: null,
      updatedAt: Date.now(),
      version: 1,
    }
    localStorage.setItem('uploader:/instructions/new', JSON.stringify(session))
  }, sessionData)
}


/**
 * Setup authenticated user mock
 */
export async function setupAuthMock(
  page: Page,
  user: { id: string; email: string; name: string } = {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
  },
) {
  await page.evaluate(userData => {
    // Mock Cognito/Amplify auth state
    localStorage.setItem(
      'auth:user',
      JSON.stringify({
        userId: userData.id,
        email: userData.email,
        name: userData.name,
        isAuthenticated: true,
      }),
    )
  }, user)
}
