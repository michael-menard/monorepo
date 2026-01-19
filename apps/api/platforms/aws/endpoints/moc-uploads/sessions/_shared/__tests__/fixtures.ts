/**
 * Test fixtures for upload session handlers
 *
 * Story 3.1.27: Deploy Multipart Upload Session Endpoints
 */

import { vi } from 'vitest'

// ============================================
// Mock JWT Claims
// ============================================
export const mockJwtClaims = {
  user1: { sub: 'user-123', email: 'user1@example.com' },
  user2: { sub: 'user-456', email: 'user2@example.com' },
}

// ============================================
// Mock Upload Sessions (using valid UUIDs)
// ============================================
export const SESSION_IDS = {
  active: '11111111-1111-1111-1111-111111111111',
  expired: '22222222-2222-2222-2222-222222222222',
  completed: '33333333-3333-3333-3333-333333333333',
  otherUser: '44444444-4444-4444-4444-444444444444',
}

export const mockSessions = {
  activeSession: {
    id: SESSION_IDS.active,
    userId: 'user-123',
    status: 'active',
    partSizeBytes: 5 * 1024 * 1024,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min from now
    finalizedAt: null,
    finalizingAt: null,
    mocInstructionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  expiredSession: {
    id: SESSION_IDS.expired,
    userId: 'user-123',
    status: 'active',
    partSizeBytes: 5 * 1024 * 1024,
    expiresAt: new Date(Date.now() - 60 * 1000), // Expired 1 min ago
    finalizedAt: null,
    finalizingAt: null,
    mocInstructionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  completedSession: {
    id: SESSION_IDS.completed,
    userId: 'user-123',
    status: 'completed',
    partSizeBytes: 5 * 1024 * 1024,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    finalizedAt: new Date(),
    finalizingAt: null,
    mocInstructionId: 'moc-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  otherUserSession: {
    id: SESSION_IDS.otherUser,
    userId: 'user-456',
    status: 'active',
    partSizeBytes: 5 * 1024 * 1024,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    finalizedAt: null,
    finalizingAt: null,
    mocInstructionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
}

// ============================================
// Mock Session Files (using valid UUIDs)
// ============================================
export const FILE_IDS = {
  pending: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  uploading: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  completed: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
}

export const mockSessionFiles = {
  pendingFile: {
    id: FILE_IDS.pending,
    sessionId: SESSION_IDS.active,
    category: 'instruction',
    name: 'test.pdf',
    size: 1024 * 1024,
    mimeType: 'application/pdf',
    extension: 'pdf',
    s3Key: `dev/moc-instructions/user-123/${SESSION_IDS.active}/instruction/${FILE_IDS.pending}.pdf`,
    uploadId: 'upload-id-123',
    status: 'pending',
    fileUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  uploadingFile: {
    id: FILE_IDS.uploading,
    sessionId: SESSION_IDS.active,
    category: 'instruction',
    name: 'test.pdf',
    size: 10 * 1024 * 1024,
    mimeType: 'application/pdf',
    extension: 'pdf',
    s3Key: `dev/moc-instructions/user-123/${SESSION_IDS.active}/instruction/${FILE_IDS.uploading}.pdf`,
    uploadId: 'upload-id-456',
    status: 'uploading',
    fileUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  completedFile: {
    id: FILE_IDS.completed,
    sessionId: SESSION_IDS.active,
    category: 'instruction',
    name: 'test.pdf',
    size: 1024 * 1024,
    mimeType: 'application/pdf',
    extension: 'pdf',
    s3Key: `dev/moc-instructions/user-123/${SESSION_IDS.active}/instruction/${FILE_IDS.completed}.pdf`,
    uploadId: 'upload-id-789',
    status: 'completed',
    fileUrl: `https://bucket.s3.us-east-1.amazonaws.com/dev/moc-instructions/user-123/${SESSION_IDS.active}/instruction/${FILE_IDS.completed}.pdf`,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
}

// ============================================
// Mock Session Parts
// ============================================
export const mockSessionParts = {
  part1: { fileId: FILE_IDS.uploading, partNumber: 1, etag: '"abc123"', size: 5 * 1024 * 1024, status: 'uploaded' },
  part2: { fileId: FILE_IDS.uploading, partNumber: 2, etag: '"def456"', size: 5 * 1024 * 1024, status: 'uploaded' },
}

// ============================================
// Valid Request Bodies
// ============================================
export const validRequests = {
  createSession: {
    files: [
      { category: 'instruction', name: 'test.pdf', size: 1024 * 1024, type: 'application/pdf', ext: 'pdf' },
    ],
  },
  createSessionMultiFile: {
    files: [
      { category: 'instruction', name: 'test.pdf', size: 1024 * 1024, type: 'application/pdf', ext: 'pdf' },
      { category: 'image', name: 'photo.jpg', size: 512 * 1024, type: 'image/jpeg', ext: 'jpg' },
    ],
  },
  registerFile: {
    category: 'instruction',
    name: 'test.pdf',
    size: 1024 * 1024,
    type: 'application/pdf',
    ext: 'pdf',
  },
  completeFile: {
    parts: [
      { partNumber: 1, etag: '"abc123"' },
      { partNumber: 2, etag: '"def456"' },
    ],
  },
  finalizeSession: {
    uploadSessionId: SESSION_IDS.active, // Valid UUID
    title: 'My LEGO MOC',
    description: 'A cool MOC',
    tags: ['castle', 'medieval'],
  },
}

// ============================================
// Mock Event Factory
// ============================================
export function createMockEvent(options: {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  pathParameters?: Record<string, string>
  body?: unknown
  userId?: string
  isBase64Encoded?: boolean
}): unknown {
  const userId = options.userId || 'user-123'
  const claims = userId === 'user-123' ? mockJwtClaims.user1 : mockJwtClaims.user2

  return {
    version: '2.0',
    routeKey: `${options.method} ${options.path}`,
    rawPath: options.path,
    headers: { 'content-type': 'application/json' },
    pathParameters: options.pathParameters || {},
    requestContext: {
      requestId: `test-request-${Date.now()}`,
      http: { method: options.method, path: options.path },
      authorizer: { jwt: { claims } },
    },
    body: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : null,
    isBase64Encoded: options.isBase64Encoded || false,
  }
}

export function createUnauthorizedEvent(options: {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  pathParameters?: Record<string, string>
  body?: unknown
}): unknown {
  return {
    version: '2.0',
    routeKey: `${options.method} ${options.path}`,
    rawPath: options.path,
    headers: { 'content-type': 'application/json' },
    pathParameters: options.pathParameters || {},
    requestContext: {
      requestId: `test-request-${Date.now()}`,
      http: { method: options.method, path: options.path },
      // No authorizer
    },
    body: options.body ? JSON.stringify(options.body) : null,
    isBase64Encoded: false,
  }
}

