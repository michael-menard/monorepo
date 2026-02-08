import { z } from 'zod'

/**
 * Admin Domain Types
 *
 * Zod schemas for validation + type inference.
 * Used for admin user management operations.
 */

// ─────────────────────────────────────────────────────────────────────────
// Block Reason Types
// ─────────────────────────────────────────────────────────────────────────

/**
 * Reason for blocking a user account
 */
export const BlockReasonSchema = z.enum([
  'security_incident',
  'policy_violation',
  'account_compromise',
  'other',
])

export type BlockReason = z.infer<typeof BlockReasonSchema>

// ─────────────────────────────────────────────────────────────────────────
// Cognito User Types
// ─────────────────────────────────────────────────────────────────────────

/**
 * User status from Cognito
 */
export const CognitoUserStatusSchema = z.enum([
  'UNCONFIRMED',
  'CONFIRMED',
  'ARCHIVED',
  'COMPROMISED',
  'UNKNOWN',
  'RESET_REQUIRED',
  'FORCE_CHANGE_PASSWORD',
])

export type CognitoUserStatus = z.infer<typeof CognitoUserStatusSchema>

/**
 * Basic Cognito user information
 */
export const CognitoUserSchema = z.object({
  userId: z.string(),
  email: z.string().email().nullable(),
  username: z.string(),
  userStatus: CognitoUserStatusSchema.nullable(),
  enabled: z.boolean(),
  createdAt: z.date().nullable(),
})

export type CognitoUser = z.infer<typeof CognitoUserSchema>

/**
 * Detailed user information combining Cognito and database data
 */
export const UserDetailSchema = CognitoUserSchema.extend({
  // Database fields from user_quotas
  tier: z.string().nullable(),
  isSuspended: z.boolean(),
  suspendedAt: z.date().nullable(),
  suspendedReason: z.string().nullable(),
})

export type UserDetail = z.infer<typeof UserDetailSchema>

// ─────────────────────────────────────────────────────────────────────────
// API Input/Output Types
// ─────────────────────────────────────────────────────────────────────────

/**
 * Input for blocking a user
 */
export const BlockUserInputSchema = z.object({
  reason: BlockReasonSchema,
  notes: z.string().max(1000).optional(),
})

export type BlockUserInput = z.infer<typeof BlockUserInputSchema>

/**
 * Query parameters for listing users
 */
export const ListUsersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(60).default(20),
  paginationToken: z.string().optional(),
  email: z.string().optional(), // Email prefix search
})

export type ListUsersQuery = z.infer<typeof ListUsersQuerySchema>

/**
 * Query parameters for audit log
 */
export const ListAuditLogQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  targetUserId: z.string().optional(),
  actionType: z.string().optional(),
})

export type ListAuditLogQuery = z.infer<typeof ListAuditLogQuerySchema>

/**
 * Response for paginated user list
 */
export const UserListResponseSchema = z.object({
  users: z.array(CognitoUserSchema),
  paginationToken: z.string().nullable(),
})

export type UserListResponse = z.infer<typeof UserListResponseSchema>

// ─────────────────────────────────────────────────────────────────────────
// Audit Log Types
// ─────────────────────────────────────────────────────────────────────────

/**
 * Audit log action type
 */
export const AuditActionTypeSchema = z.enum(['search', 'view', 'revoke_tokens', 'block', 'unblock'])

export type AuditActionType = z.infer<typeof AuditActionTypeSchema>

/**
 * Audit log result
 */
export const AuditResultSchema = z.enum(['success', 'failure'])

export type AuditResult = z.infer<typeof AuditResultSchema>

/**
 * Audit log entry
 */
export const AuditLogEntrySchema = z.object({
  id: z.string().uuid(),
  adminUserId: z.string(),
  actionType: AuditActionTypeSchema,
  targetUserId: z.string().nullable(),
  reason: z.string().nullable(),
  details: z.record(z.unknown()).nullable(),
  result: AuditResultSchema,
  errorMessage: z.string().nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: z.date(),
})

export type AuditLogEntry = z.infer<typeof AuditLogEntrySchema>

// ─────────────────────────────────────────────────────────────────────────
// Error Types
// ─────────────────────────────────────────────────────────────────────────

export type AdminError =
  | 'NOT_FOUND'
  | 'COGNITO_ERROR'
  | 'DB_ERROR'
  | 'VALIDATION_ERROR'
  | 'USER_ALREADY_BLOCKED'
  | 'USER_NOT_BLOCKED'
