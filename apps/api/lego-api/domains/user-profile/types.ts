import { z } from 'zod'

// ─────────────────────────────────────────────────────────────────────────────
// Entity Schemas
// ─────────────────────────────────────────────────────────────────────────────

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  displayName: z.string().nullable(),
  bio: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  memberSince: z.date(),
  preferences: z.record(z.unknown()).default({}),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type UserProfile = z.infer<typeof UserProfileSchema>

export const ActivityEventSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  type: z.string(),
  title: z.string(),
  message: z.string().nullable(),
  relatedId: z.string().nullable(),
  metadata: z.record(z.unknown()).default({}),
  createdAt: z.date(),
})

export type ActivityEvent = z.infer<typeof ActivityEventSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Input Schemas
// ─────────────────────────────────────────────────────────────────────────────

export const UpdateProfileInputSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
})

export type UpdateProfileInput = z.infer<typeof UpdateProfileInputSchema>

export const UpdatePreferencesInputSchema = z.object({
  preferences: z.record(z.unknown()),
})

export type UpdatePreferencesInput = z.infer<typeof UpdatePreferencesInputSchema>

export const AvatarUploadInputSchema = z.object({
  filename: z.string().min(1),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
})

export type AvatarUploadInput = z.infer<typeof AvatarUploadInputSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Query Schemas
// ─────────────────────────────────────────────────────────────────────────────

export const ListActivityQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.string().optional(),
})

export type ListActivityQuery = z.infer<typeof ListActivityQuerySchema>

// ─────────────────────────────────────────────────────────────────────────────
// Error Types
// ─────────────────────────────────────────────────────────────────────────────

export type UserProfileError =
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'UPLOAD_FAILED'
  | 'INVALID_FILE'
  | 'DB_ERROR'
