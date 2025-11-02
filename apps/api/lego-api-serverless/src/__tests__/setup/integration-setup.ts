/**
 * Integration Test Setup
 *
 * Sets up the test environment for integration tests.
 * - Configures test database connection
 * - Sets up Redis test instance
 * - Mocks external AWS services (S3, OpenSearch)
 */

import { beforeAll, afterAll, vi } from 'vitest'

// Set test environment variables
beforeAll(() => {
  process.env.NODE_ENV = 'development'
  process.env.STAGE = 'dev' // Must be 'dev', 'staging', or 'production'
  process.env.AWS_REGION = 'us-east-1'
  process.env.LOG_LEVEL = 'debug'

  // Mock AWS SDK clients for integration tests
  // Integration tests focus on our code, not AWS infrastructure
  vi.mock('@aws-sdk/client-s3', () => ({
    S3Client: vi.fn(() => ({
      send: vi.fn(),
    })),
    PutObjectCommand: vi.fn(),
    GetObjectCommand: vi.fn(),
    DeleteObjectsCommand: vi.fn(),
  }))

  vi.mock('@aws-sdk/s3-request-presigner', () => ({
    getSignedUrl: vi.fn(() => Promise.resolve('https://mock-presigned-url.s3.amazonaws.com')),
  }))
})

afterAll(() => {
  vi.restoreAllMocks()
})
