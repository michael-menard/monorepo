/**
 * API Mocking Utilities for E2E Tests
 * Story 3.1.26: E2E + A11y + Performance
 *
 * Provides mock responses for upload API endpoints and S3 presigned URLs.
 */

import type { Page, Route } from '@playwright/test'

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
 * Setup mock API routes for upload flow
 */
export async function setupUploadMocks(
  page: Page,
  options: {
    presignError?: boolean
    finalizeError?: 'conflict' | 'rateLimit' | 'fileValidation' | 'auth'
    s3Error?: boolean
  } = {},
) {
  // Mock presign endpoint
  await page.route('**/api/mocs/uploads/sessions', async (route: Route) => {
    if (route.request().method() === 'POST') {
      if (options.presignError) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'INTERNAL_ERROR', message: 'Failed to create session' }),
        })
      } else {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(mockResponses.presign()),
        })
      }
    } else {
      await route.continue()
    }
  })

  // Mock file registration endpoint
  await page.route('**/api/mocs/uploads/sessions/*/files', async (route: Route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          fileId: `file-${Date.now()}`,
          uploadUrl: 'https://mock-s3.example.com/presigned-upload-url',
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
        }),
      })
    } else {
      await route.continue()
    }
  })

  // Mock finalize endpoint
  await page.route('**/api/mocs/uploads/sessions/*/finalize', async (route: Route) => {
    if (route.request().method() === 'POST') {
      switch (options.finalizeError) {
        case 'conflict':
          await route.fulfill({
            status: 409,
            contentType: 'application/json',
            body: JSON.stringify(mockResponses.conflict()),
          })
          break
        case 'rateLimit':
          await route.fulfill({
            status: 429,
            contentType: 'application/json',
            headers: { 'Retry-After': '60' },
            body: JSON.stringify(mockResponses.rateLimit()),
          })
          break
        case 'fileValidation':
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify(
              mockResponses.fileValidation([
                {
                  fileId: 'file-1',
                  filename: 'test.exe',
                  reason: 'type',
                  message: 'File type not allowed',
                },
              ]),
            ),
          })
          break
        case 'auth':
          await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'UNAUTHORIZED', message: 'Session expired' }),
          })
          break
        default: {
          const body = JSON.parse((await route.request().postData()) || '{}')
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockResponses.finalize(body.title)),
          })
        }
      }
    } else {
      await route.continue()
    }
  })

  // Mock S3 presigned URL uploads
  await page.route('**/mock-s3.example.com/**', async (route: Route) => {
    if (options.s3Error) {
      await route.fulfill({
        status: 403,
        contentType: 'application/xml',
        body: '<Error><Code>ExpiredToken</Code><Message>The provided token has expired.</Message></Error>',
      })
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    }
  })
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
 * Clear all mocks
 */
export async function clearMocks(page: Page) {
  await page.unroute('**/api/**')
  await page.unroute('**/mock-s3.example.com/**')
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
