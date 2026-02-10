/**
 * CloudWatch Audit Logger (WISH-20280)
 *
 * Lightweight CloudWatch-based audit logger for flag schedule operations.
 * Fire-and-forget pattern - errors don't block schedule operations.
 */

import { logger } from '@repo/logger'
import type { AuditLoggerPort } from './ports.js'
import type { AuditEventType, AuditEventMetadata } from './types.js'

/**
 * CloudWatch audit logger implementation
 */
export class AuditLogger implements AuditLoggerPort {
  /**
   * Log an audit event to CloudWatch with structured metadata
   *
   * Fire-and-forget: Errors are logged but don't propagate to caller
   */
  async logEvent(eventType: AuditEventType, metadata: AuditEventMetadata): Promise<void> {
    try {
      const logMessage = `Audit event: ${eventType}`
      const structuredMetadata = {
        eventType,
        timestamp: new Date().toISOString(),
        ...metadata,
      }

      if (eventType === 'flag_schedule.failed') {
        logger.error(logMessage, structuredMetadata)
      } else {
        logger.info(logMessage, structuredMetadata)
      }
    } catch (error) {
      // Fire-and-forget: Log the audit logging failure but don't fail the operation
      logger.error('Audit logging failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        eventType,
        metadata,
      })
    }
  }
}

/**
 * Create a new audit logger instance
 */
export function createAuditLogger(): AuditLogger {
  return new AuditLogger()
}
