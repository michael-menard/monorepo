import { z } from 'zod'

/**
 * Admin API Schemas
 *
 * Zod schemas for admin user management operations.
 * Used for runtime validation and type inference.
 */

// ─────────────────────────────────────────────────────────────────────────
// Block Reason Types
// ─────────────────────────────────────────────────────────────────────────

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

export const CognitoUserSchema = z.object({
  userId: z.string(),
  email: z.string().email().nullable(),
  username: z.string(),
  userStatus: CognitoUserStatusSchema.nullable(),
  enabled: z.boolean(),
  createdAt: z.string().datetime().nullable(),
})

export type CognitoUser = z.infer<typeof CognitoUserSchema>

export const UserDetailSchema = CognitoUserSchema.extend({
  tier: z.string().nullable(),
  isSuspended: z.boolean(),
  suspendedAt: z.string().datetime().nullable(),
  suspendedReason: z.string().nullable(),
})

export type UserDetail = z.infer<typeof UserDetailSchema>

// ─────────────────────────────────────────────────────────────────────────
// API Response Types
// ─────────────────────────────────────────────────────────────────────────

export const UserListResponseSchema = z.object({
  users: z.array(CognitoUserSchema),
  paginationToken: z.string().nullable(),
})

export type UserListResponse = z.infer<typeof UserListResponseSchema>

export const SuccessResponseSchema = z.object({
  success: z.boolean(),
})

export type SuccessResponse = z.infer<typeof SuccessResponseSchema>

// ─────────────────────────────────────────────────────────────────────────
// API Input Types
// ─────────────────────────────────────────────────────────────────────────

export const BlockUserInputSchema = z.object({
  reason: BlockReasonSchema,
  notes: z.string().max(1000).optional(),
})

export type BlockUserInput = z.infer<typeof BlockUserInputSchema>

export const ListUsersQuerySchema = z.object({
  limit: z.number().int().min(1).max(60).optional(),
  paginationToken: z.string().optional(),
  email: z.string().optional(),
})

export type ListUsersQuery = z.infer<typeof ListUsersQuerySchema>

// ─────────────────────────────────────────────────────────────────────────
// Audit Log Types
// ─────────────────────────────────────────────────────────────────────────

export const AuditActionTypeSchema = z.enum(['search', 'view', 'revoke_tokens', 'block', 'unblock'])

export type AuditActionType = z.infer<typeof AuditActionTypeSchema>

export const AuditResultSchema = z.enum(['success', 'failure'])

export type AuditResult = z.infer<typeof AuditResultSchema>

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
  createdAt: z.string().datetime(),
})

export type AuditLogEntry = z.infer<typeof AuditLogEntrySchema>

export const AuditLogResponseSchema = z.object({
  entries: z.array(AuditLogEntrySchema),
})

export type AuditLogResponse = z.infer<typeof AuditLogResponseSchema>

export const ListAuditLogQuerySchema = z.object({
  limit: z.number().int().min(1).max(100).optional(),
  targetUserId: z.string().optional(),
  actionType: z.string().optional(),
})

export type ListAuditLogQuery = z.infer<typeof ListAuditLogQuerySchema>
