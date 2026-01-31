/**
 * Security Test Fixtures
 *
 * Mock data and utilities for testing file upload security validation.
 * Extends WISH-2011 test infrastructure for security testing.
 *
 * Story: WISH-2013 - File Upload Security Hardening
 */

import { z } from 'zod'
import { createMockFile } from './s3-mocks'

// ─────────────────────────────────────────────────────────────────────────────
// Virus Scan Response Schemas
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Clean scan result
 */
export const ScanResultCleanSchema = z.object({
  status: z.literal('clean'),
  scannedAt: z.string().datetime(),
})

/**
 * Infected scan result
 */
export const ScanResultInfectedSchema = z.object({
  status: z.literal('infected'),
  threats: z.array(z.string()).min(1),
  scannedAt: z.string().datetime(),
})

/**
 * Error scan result
 */
export const ScanResultErrorSchema = z.object({
  status: z.literal('error'),
  reason: z.string(),
  scannedAt: z.string().datetime(),
})

export const ScanResultSchema = z.discriminatedUnion('status', [
  ScanResultCleanSchema,
  ScanResultInfectedSchema,
  ScanResultErrorSchema,
])

export type ScanResult = z.infer<typeof ScanResultSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Virus Scan Mock Responses
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mock clean scan result
 */
export const mockScanClean: ScanResult = {
  status: 'clean',
  scannedAt: new Date().toISOString(),
}

/**
 * Mock infected scan result
 */
export const mockScanInfected: ScanResult = {
  status: 'infected',
  threats: ['EICAR-Test-File', 'Trojan.Generic.Test'],
  scannedAt: new Date().toISOString(),
}

/**
 * Mock scan error result (service unavailable)
 */
export const mockScanError: ScanResult = {
  status: 'error',
  reason: 'Virus scan service unavailable',
  scannedAt: new Date().toISOString(),
}

/**
 * Create a mock scan result with custom data
 */
export function createMockScanResult(
  overrides: Partial<ScanResult> & { status: ScanResult['status'] },
): ScanResult {
  const scannedAt = new Date().toISOString()

  switch (overrides.status) {
    case 'clean':
      return { status: 'clean', scannedAt }
    case 'infected':
      return {
        status: 'infected',
        threats: (overrides as { threats?: string[] }).threats ?? ['TestVirus.A'],
        scannedAt,
      }
    case 'error':
      return {
        status: 'error',
        reason: (overrides as { reason?: string }).reason ?? 'Unknown error',
        scannedAt,
      }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Malicious File Test Fixtures
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mock executable file (should be rejected by MIME type validation)
 */
export const mockExecutableFile = createMockFile('malware.exe', 'application/x-executable', 1024)

/**
 * Mock HTML file (should be rejected - potential XSS vector)
 */
export const mockHtmlFile = createMockFile('script.html', 'text/html', 512)

/**
 * Mock JavaScript file (should be rejected)
 */
export const mockJavaScriptFile = createMockFile('payload.js', 'application/javascript', 256)

/**
 * Mock PDF file (should be rejected - not in image whitelist)
 */
export const mockPdfFile = createMockFile('document.pdf', 'application/pdf', 2048)

/**
 * Mock SVG file (should be rejected - potential XSS via embedded scripts)
 */
export const mockSvgFile = createMockFile('vector.svg', 'image/svg+xml', 1024)

/**
 * Mock shell script file
 */
export const mockShellScriptFile = createMockFile('exploit.sh', 'application/x-sh', 256)

/**
 * Mock file with double extension (bypass attempt)
 */
export const mockDoubleExtensionFile = createMockFile('image.jpg.exe', 'application/x-executable', 1024)

/**
 * Mock file with mismatch between extension and MIME type
 */
export const mockMismatchedFile = createMockFile('image.jpg', 'application/x-executable', 1024)

// ─────────────────────────────────────────────────────────────────────────────
// File Size Test Fixtures
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maximum allowed file size (10MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024

/**
 * Create file exactly at size limit (boundary test)
 */
export function createExactLimitFile(): File {
  return createMockFile('exact-limit.jpg', 'image/jpeg', MAX_FILE_SIZE)
}

/**
 * Create file just over size limit (10MB + 1 byte)
 */
export function createJustOverLimitFile(): File {
  return createMockFile('just-over.jpg', 'image/jpeg', MAX_FILE_SIZE + 1)
}

/**
 * Create file way over size limit (50MB)
 */
export function createLargeOversizedFile(): File {
  return createMockFile('huge-file.jpg', 'image/jpeg', 50 * 1024 * 1024)
}

// ─────────────────────────────────────────────────────────────────────────────
// API Error Response Fixtures
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Invalid MIME type error response
 */
export const mockMimeTypeError = {
  error: 'INVALID_MIME_TYPE',
  message: 'Unsupported file type. Allowed: image/jpeg, image/png, image/webp',
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
}

/**
 * File too large error response
 */
export const mockFileTooLargeError = {
  error: 'FILE_TOO_LARGE',
  message: 'File size exceeds maximum limit of 10MB',
  maxSizeBytes: 10 * 1024 * 1024,
}

/**
 * File too small error response (empty file)
 */
export const mockFileTooSmallError = {
  error: 'FILE_TOO_SMALL',
  message: 'File cannot be empty (0 bytes)',
}

/**
 * Invalid extension error response
 */
export const mockInvalidExtensionError = {
  error: 'INVALID_EXTENSION',
  message: 'Invalid file extension. Allowed: jpg, jpeg, png, webp',
}

/**
 * Expired presigned URL error (S3 403)
 */
export const mockPresignExpiredError = {
  error: 'PRESIGN_EXPIRED',
  message: 'Your upload session has expired. Please try again.',
}

// ─────────────────────────────────────────────────────────────────────────────
// Security Event Log Fixtures
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a mock security log event
 */
export function createMockSecurityEvent(params: {
  userId: string
  fileName: string
  rejectionReason: string
  fileSize?: number
  mimeType?: string
  ipAddress?: string
  sourceMethod: string
}) {
  return {
    ...params,
    timestamp: new Date().toISOString(),
    category: 'validation_failure',
    namespace: 'security',
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MSW Handler Configuration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Error injection header for security error simulation
 */
export const MOCK_SECURITY_ERROR_HEADER = 'x-mock-security-error'

/**
 * Security error types for MSW injection
 */
export const SecurityErrorTypes = {
  INVALID_MIME_TYPE: 'invalid-mime-type',
  FILE_TOO_LARGE: 'file-too-large',
  FILE_TOO_SMALL: 'file-too-small',
  INVALID_EXTENSION: 'invalid-extension',
  VIRUS_DETECTED: 'virus-detected',
  SCAN_ERROR: 'scan-error',
  PRESIGN_EXPIRED: 'presign-expired',
} as const

export type SecurityErrorType = (typeof SecurityErrorTypes)[keyof typeof SecurityErrorTypes]
