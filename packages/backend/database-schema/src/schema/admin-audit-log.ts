import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

/**
 * Admin Audit Log Table
 *
 * Tracks all admin actions for compliance and security monitoring.
 * Every admin operation (search, view, block, unblock, revoke tokens)
 * is logged with full context for audit trail.
 */
export const adminAuditLog = pgTable(
  'admin_audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    /** Admin user ID (Cognito sub) who performed the action */
    adminUserId: text('admin_user_id').notNull(),

    /** Type of action performed */
    actionType: text('action_type').notNull(), // 'search', 'view', 'revoke_tokens', 'block', 'unblock'

    /** Target user ID (Cognito sub) of the action, if applicable */
    targetUserId: text('target_user_id'),

    /** Reason provided for the action (e.g., block reason) */
    reason: text('reason'),

    /** Additional action details as JSON */
    details: jsonb('details').$type<Record<string, unknown>>(),

    /** Result of the action */
    result: text('result').notNull(), // 'success', 'failure'

    /** Error message if action failed */
    errorMessage: text('error_message'),

    /** Client IP address for security auditing */
    ipAddress: text('ip_address'),

    /** User agent string for security auditing */
    userAgent: text('user_agent'),

    /** Timestamp of the action */
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  table => ({
    /** Index for querying by admin user */
    adminIdx: index('idx_admin_audit_log_admin').on(table.adminUserId),
    /** Index for querying by target user */
    targetIdx: index('idx_admin_audit_log_target').on(table.targetUserId),
    /** Index for filtering by action type */
    actionIdx: index('idx_admin_audit_log_action').on(table.actionType),
    /** Index for time-based queries and cleanup */
    createdIdx: index('idx_admin_audit_log_created').on(table.createdAt),
  }),
)

/** Admin action type union */
export type AdminActionType = 'search' | 'view' | 'revoke_tokens' | 'block' | 'unblock'

/** Admin action result union */
export type AdminActionResult = 'success' | 'failure'
