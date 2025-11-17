/**
 * WebSocket Utilities
 *
 * Central export for all WebSocket-related functionality.
 *
 * Story 4.5.5: WebSocket Server for Real-Time Updates
 */

export {
  broadcastToUser,
  broadcastToConnection,
  broadcastToConnections,
} from './broadcast'

export {
  createUploadProgressMessage,
  createNotificationMessage,
  createErrorMessage,
  type UploadProgressMessage,
  type NotificationMessage,
  type ErrorMessage,
  type WebSocketMessage,
  WebSocketMessageSchema,
} from './message-types'
