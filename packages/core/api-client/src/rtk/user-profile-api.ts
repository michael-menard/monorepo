/**
 * User Profile API Integration
 * RTK Query endpoints for user profile, preferences, avatar, and activity feed
 */

import { createApi } from '@reduxjs/toolkit/query/react'
import { z } from 'zod'
import { createLogger } from '@repo/logger'
import { SERVERLESS_ENDPOINTS } from '../config/endpoints'
import { createServerlessBaseQuery } from './base-query'

const logger = createLogger('api-client:user-profile')

// ─────────────────────────────────────────────────────────────────────────────
// Zod Schemas
// ─────────────────────────────────────────────────────────────────────────────

const UserProfileSchema = z.object({
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

export type UserProfileResponse = z.infer<typeof UserProfileSchema>

const ActivityEventSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  type: z.string(),
  title: z.string(),
  message: z.string().nullable(),
  relatedId: z.string().nullable(),
  metadata: z.record(z.unknown()).default({}),
  createdAt: z.string(),
})

export type ActivityEventResponse = z.infer<typeof ActivityEventSchema>

const ActivityFeedSchema = z.object({
  items: z.array(ActivityEventSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
})

export type ActivityFeedResponse = z.infer<typeof ActivityFeedSchema>

const PresignAvatarResponseSchema = z.object({
  uploadUrl: z.string(),
  imageUrl: z.string(),
  key: z.string(),
})

export type PresignAvatarResponse = z.infer<typeof PresignAvatarResponseSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Input Types
// ─────────────────────────────────────────────────────────────────────────────

export interface UpdateProfileInput {
  displayName?: string
  bio?: string
}

export interface UpdatePreferencesInput {
  preferences: Record<string, unknown>
}

export interface PresignAvatarInput {
  filename: string
  contentType: 'image/jpeg' | 'image/png' | 'image/webp'
}

export interface ListActivityInput {
  page?: number
  limit?: number
  type?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// API Slice
// ─────────────────────────────────────────────────────────────────────────────

export const userProfileApi = createApi({
  reducerPath: 'userProfileApi',
  baseQuery: createServerlessBaseQuery({
    enablePerformanceMonitoring: true,
    priority: 'medium',
  }),
  tagTypes: ['UserProfile', 'UserPreferences', 'UserActivity'],
  endpoints: builder => ({
    getUserProfile: builder.query<UserProfileResponse, void>({
      query: () => SERVERLESS_ENDPOINTS.USER.GET_PROFILE,
      providesTags: ['UserProfile'],
      transformResponse: (response: unknown) => {
        const validated = UserProfileSchema.parse(response)
        logger.debug('User profile fetched', undefined, { userId: validated.userId })
        return validated
      },
    }),

    updateUserProfile: builder.mutation<UserProfileResponse, UpdateProfileInput>({
      query: body => ({
        url: SERVERLESS_ENDPOINTS.USER.UPDATE_PROFILE,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['UserProfile'],
    }),

    getUserPreferences: builder.query<Record<string, unknown>, void>({
      query: () => SERVERLESS_ENDPOINTS.USER.GET_PREFERENCES,
      providesTags: ['UserPreferences'],
    }),

    updateUserPreferences: builder.mutation<UserProfileResponse, UpdatePreferencesInput>({
      query: body => ({
        url: SERVERLESS_ENDPOINTS.USER.UPDATE_PREFERENCES,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['UserPreferences', 'UserProfile'],
    }),

    presignAvatarUpload: builder.mutation<PresignAvatarResponse, PresignAvatarInput>({
      query: body => ({
        url: SERVERLESS_ENDPOINTS.USER.PRESIGN_AVATAR,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['UserProfile'],
    }),

    getUserActivity: builder.query<ActivityFeedResponse, ListActivityInput | void>({
      query: params => {
        const searchParams = new URLSearchParams()
        if (params?.page) searchParams.set('page', String(params.page))
        if (params?.limit) searchParams.set('limit', String(params.limit))
        if (params?.type) searchParams.set('type', params.type)
        const qs = searchParams.toString()
        return `${SERVERLESS_ENDPOINTS.USER.ACTIVITY}${qs ? `?${qs}` : ''}`
      },
      providesTags: ['UserActivity'],
    }),
  }),
})

export const {
  useGetUserProfileQuery,
  useUpdateUserProfileMutation,
  useGetUserPreferencesQuery,
  useUpdateUserPreferencesMutation,
  usePresignAvatarUploadMutation,
  useGetUserActivityQuery,
} = userProfileApi
