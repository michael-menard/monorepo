/**
 * WebSocket Message Type Definitions
 *
 * Defines all message types that can be sent over WebSocket connections.
 * Uses Zod for runtime validation and TypeScript type inference.
 *
 * Story 4.5.5: WebSocket Server for Real-Time Updates
 */

import { z } from 'zod'

/**
 * Upload Progress Message
 * Sent during file uploads (CSV, images, etc.) to show progress
 */
export const UploadProgressMessageSchema = z.object({
  type: z.literal('upload_progress'),
  data: z.object({
    uploadId: z.string(),
    fileName: z.string(),
    progress: z.number().min(0).max(100),
    currentRow: z.number().optional(),
    totalRows: z.number().optional(),
    message: z.string(),
  }),
})

export type UploadProgressMessage = z.infer<typeof UploadProgressMessageSchema>

/**
 * Notification Message
 * General notification system for in-app alerts
 */
export const NotificationMessageSchema = z.object({
  type: z.literal('notification'),
  data: z.object({
    title: z.string(),
    message: z.string(),
    severity: z.enum(['info', 'success', 'warning', 'error']),
    actionUrl: z.string().optional(),
    actionLabel: z.string().optional(),
  }),
})

export type NotificationMessage = z.infer<typeof NotificationMessageSchema>

/**
 * Error Message
 * Sent when an operation fails
 */
export const ErrorMessageSchema = z.object({
  type: z.literal('error'),
  data: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }),
})

export type ErrorMessage = z.infer<typeof ErrorMessageSchema>

/**
 * Generic WebSocket Message
 * Union of all possible message types
 */
export const WebSocketMessageSchema = z.discriminatedUnion('type', [
  UploadProgressMessageSchema,
  NotificationMessageSchema,
  ErrorMessageSchema,
])

export type WebSocketMessage = z.infer<typeof WebSocketMessageSchema> & {
  timestamp: string
}

/**
 * Helper function to create typed messages
 */
export function createUploadProgressMessage(
  uploadId: string,
  fileName: string,
  progress: number,
  message: string,
  currentRow?: number,
  totalRows?: number,
): Omit<UploadProgressMessage, 'timestamp'> {
  return {
    type: 'upload_progress',
    data: {
      uploadId,
      fileName,
      progress,
      message,
      currentRow,
      totalRows,
    },
  }
}

export function createNotificationMessage(
  title: string,
  message: string,
  severity: 'info' | 'success' | 'warning' | 'error',
  actionUrl?: string,
  actionLabel?: string,
): Omit<NotificationMessage, 'timestamp'> {
  return {
    type: 'notification',
    data: {
      title,
      message,
      severity,
      actionUrl,
      actionLabel,
    },
  }
}

export function createErrorMessage(
  code: string,
  message: string,
  details?: any,
): Omit<ErrorMessage, 'timestamp'> {
  return {
    type: 'error',
    data: {
      code,
      message,
      details,
    },
  }
}
