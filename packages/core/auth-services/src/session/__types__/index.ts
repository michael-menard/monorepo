import { z } from 'zod'

/**
 * Schema for the user object returned in session responses
 */
export const SessionUserSchema = z.object({
  userId: z.string(),
  email: z.string().optional(),
})

export type SessionUser = z.infer<typeof SessionUserSchema>

/**
 * Schema for successful session API responses
 */
export const SessionResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  user: SessionUserSchema.optional(),
})

export type SessionResponse = z.infer<typeof SessionResponseSchema>

/**
 * Schema for session API error responses
 */
export const SessionErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
})

export type SessionError = z.infer<typeof SessionErrorSchema>

/**
 * Schema for session status check responses
 */
export const SessionStatusSchema = z.object({
  authenticated: z.boolean(),
  user: SessionUserSchema.optional(),
})

export type SessionStatus = z.infer<typeof SessionStatusSchema>
