/**
 * Audit Logger Port (WISH-20280)
 *
 * Interface for audit logging to support dependency injection.
 * Follows hexagonal architecture pattern - service layer depends on port, not concrete implementation.
 */

import type { AuditEventType, AuditEventMetadata } from './types.js'

/**
 * Port interface for audit logging
 */
export interface AuditLoggerPort {
  /**
   * Log an audit event with metadata
   *
   * Fire-and-forget: implementations must not throw errors.
   */
  logEvent(eventType: AuditEventType, metadata: AuditEventMetadata): Promise<void>
}
