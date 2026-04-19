import { z } from 'zod'

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  displayName: z.string().nullable(),
  bio: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  memberSince: z.string(),
  preferences: z.record(z.unknown()).default({}),
  createdAt: z.string(),
  updatedAt: z.string(),
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
  createdAt: z.string(),
})

export type ActivityEvent = z.infer<typeof ActivityEventSchema>

export const ActivityTypeIconMap = {
  added: 'Plus',
  progress: 'RefreshCw',
  wishlist_add: 'Heart',
  instruction_upload: 'Upload',
} as const

export type ActivityType = keyof typeof ActivityTypeIconMap
