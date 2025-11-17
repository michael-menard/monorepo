/**
 * Unit tests for WebSocket message types and Zod schemas
 * Story 4.5.5.1: Add automated tests for WebSocket server
 */

import { describe, it, expect } from 'vitest'
import {
  UploadProgressMessageSchema,
  NotificationMessageSchema,
  ErrorMessageSchema,
  WebSocketMessageSchema,
  createUploadProgressMessage,
  createNotificationMessage,
  createErrorMessage,
} from '../message-types'

describe('WebSocket Message Types', () => {
  describe('UploadProgressMessageSchema', () => {
    it('should validate valid upload progress message', () => {
      const message = {
        type: 'upload_progress',
        data: {
          uploadId: 'upload-123',
          fileName: 'test.jpg',
          progress: 50,
          message: 'Uploading...',
          currentRow: 100,
          totalRows: 200,
        },
      }

      const result = UploadProgressMessageSchema.safeParse(message)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.type).toBe('upload_progress')
        expect(result.data.data.progress).toBe(50)
      }
    })

    it('should validate upload progress message without optional fields', () => {
      const message = {
        type: 'upload_progress',
        data: {
          uploadId: 'upload-123',
          fileName: 'test.jpg',
          progress: 75,
          message: 'Nearly done...',
        },
      }

      const result = UploadProgressMessageSchema.safeParse(message)
      expect(result.success).toBe(true)
    })

    it('should reject invalid progress values', () => {
      const message = {
        type: 'upload_progress',
        data: {
          uploadId: 'upload-123',
          fileName: 'test.jpg',
          progress: 150, // Invalid: > 100
          message: 'Uploading...',
        },
      }

      const result = UploadProgressMessageSchema.safeParse(message)
      expect(result.success).toBe(false)
    })

    it('should reject negative progress values', () => {
      const message = {
        type: 'upload_progress',
        data: {
          uploadId: 'upload-123',
          fileName: 'test.jpg',
          progress: -10, // Invalid: < 0
          message: 'Uploading...',
        },
      }

      const result = UploadProgressMessageSchema.safeParse(message)
      expect(result.success).toBe(false)
    })

    it('should create valid upload progress message using helper', () => {
      const message = createUploadProgressMessage(
        'upload-456',
        'image.png',
        25,
        'Processing...',
        50,
        100
      )

      const result = UploadProgressMessageSchema.safeParse(message)
      expect(result.success).toBe(true)
      expect(message.data.uploadId).toBe('upload-456')
      expect(message.data.progress).toBe(25)
      expect(message.data.currentRow).toBe(50)
      expect(message.data.totalRows).toBe(100)
    })
  })

  describe('NotificationMessageSchema', () => {
    it('should validate valid notification message', () => {
      const message = {
        type: 'notification',
        data: {
          title: 'Upload Complete',
          message: 'Your file has been uploaded successfully',
          severity: 'success',
          actionUrl: '/dashboard',
          actionLabel: 'View Dashboard',
        },
      }

      const result = NotificationMessageSchema.safeParse(message)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.data.severity).toBe('success')
        expect(result.data.data.title).toBe('Upload Complete')
      }
    })

    it('should validate all severity levels', () => {
      const severities = ['info', 'success', 'warning', 'error'] as const

      severities.forEach((severity) => {
        const message = {
          type: 'notification',
          data: {
            title: 'Test',
            message: `Test ${severity} message`,
            severity,
          },
        }

        const result = NotificationMessageSchema.safeParse(message)
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid severity', () => {
      const message = {
        type: 'notification',
        data: {
          title: 'Test',
          message: 'Test message',
          severity: 'critical', // Invalid severity
        },
      }

      const result = NotificationMessageSchema.safeParse(message)
      expect(result.success).toBe(false)
    })

    it('should validate notification without optional fields', () => {
      const message = {
        type: 'notification',
        data: {
          title: 'Simple Notification',
          message: 'This is a simple message',
          severity: 'info',
        },
      }

      const result = NotificationMessageSchema.safeParse(message)
      expect(result.success).toBe(true)
    })

    it('should create valid notification message using helper', () => {
      const message = createNotificationMessage(
        'Success',
        'Operation completed',
        'success',
        '/results',
        'View Results'
      )

      const result = NotificationMessageSchema.safeParse(message)
      expect(result.success).toBe(true)
      expect(message.data.title).toBe('Success')
      expect(message.data.actionUrl).toBe('/results')
    })
  })

  describe('ErrorMessageSchema', () => {
    it('should validate valid error message', () => {
      const message = {
        type: 'error',
        data: {
          code: 'UPLOAD_FAILED',
          message: 'Failed to upload file',
          details: {
            fileName: 'test.jpg',
            reason: 'File too large',
          },
        },
      }

      const result = ErrorMessageSchema.safeParse(message)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.data.code).toBe('UPLOAD_FAILED')
        expect(result.data.data.details).toBeDefined()
      }
    })

    it('should validate error message without details', () => {
      const message = {
        type: 'error',
        data: {
          code: 'NETWORK_ERROR',
          message: 'Network connection lost',
        },
      }

      const result = ErrorMessageSchema.safeParse(message)
      expect(result.success).toBe(true)
    })

    it('should create valid error message using helper', () => {
      const message = createErrorMessage('AUTH_FAILED', 'Authentication failed', {
        userId: 'user-123',
      })

      const result = ErrorMessageSchema.safeParse(message)
      expect(result.success).toBe(true)
      expect(message.data.code).toBe('AUTH_FAILED')
      expect(message.data.details).toEqual({ userId: 'user-123' })
    })
  })

  describe('WebSocketMessageSchema (Union Type)', () => {
    it('should validate all message types using discriminated union', () => {
      const messages = [
        {
          type: 'upload_progress',
          data: {
            uploadId: 'up-1',
            fileName: 'file.txt',
            progress: 50,
            message: 'Uploading',
          },
        },
        {
          type: 'notification',
          data: {
            title: 'Alert',
            message: 'Important notification',
            severity: 'warning',
          },
        },
        {
          type: 'error',
          data: {
            code: 'ERR_001',
            message: 'Something went wrong',
          },
        },
      ]

      messages.forEach((message) => {
        const result = WebSocketMessageSchema.safeParse(message)
        expect(result.success).toBe(true)
      })
    })

    it('should reject message with invalid type', () => {
      const message = {
        type: 'invalid_type',
        data: {},
      }

      const result = WebSocketMessageSchema.safeParse(message)
      expect(result.success).toBe(false)
    })

    it('should use discriminator to validate correct data structure', () => {
      // Upload progress with notification data should fail
      const invalidMessage = {
        type: 'upload_progress',
        data: {
          title: 'Wrong structure',
          message: 'This is notification data',
          severity: 'info',
        },
      }

      const result = WebSocketMessageSchema.safeParse(invalidMessage)
      expect(result.success).toBe(false)
    })
  })

  describe('Helper Functions', () => {
    it('should create upload progress message with all fields', () => {
      const message = createUploadProgressMessage(
        'id-1',
        'file.csv',
        80,
        'Almost done',
        800,
        1000
      )

      expect(message.type).toBe('upload_progress')
      expect(message.data.uploadId).toBe('id-1')
      expect(message.data.fileName).toBe('file.csv')
      expect(message.data.progress).toBe(80)
      expect(message.data.message).toBe('Almost done')
      expect(message.data.currentRow).toBe(800)
      expect(message.data.totalRows).toBe(1000)
    })

    it('should create upload progress message without optional fields', () => {
      const message = createUploadProgressMessage('id-2', 'file.txt', 30, 'Processing')

      expect(message.data.currentRow).toBeUndefined()
      expect(message.data.totalRows).toBeUndefined()
    })

    it('should create notification message with action', () => {
      const message = createNotificationMessage('Title', 'Message', 'error', '/error', 'View')

      expect(message.type).toBe('notification')
      expect(message.data.actionUrl).toBe('/error')
      expect(message.data.actionLabel).toBe('View')
    })

    it('should create notification message without action', () => {
      const message = createNotificationMessage('Info', 'Information', 'info')

      expect(message.data.actionUrl).toBeUndefined()
      expect(message.data.actionLabel).toBeUndefined()
    })

    it('should create error message with details', () => {
      const details = { context: 'test', timestamp: Date.now() }
      const message = createErrorMessage('CODE_123', 'Error occurred', details)

      expect(message.type).toBe('error')
      expect(message.data.code).toBe('CODE_123')
      expect(message.data.details).toEqual(details)
    })

    it('should create error message without details', () => {
      const message = createErrorMessage('SIMPLE_ERROR', 'Simple error')

      expect(message.data.details).toBeUndefined()
    })
  })
})
