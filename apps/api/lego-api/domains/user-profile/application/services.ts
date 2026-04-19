import type { Result, PaginatedResult, PaginationInput } from '@repo/api-core'
import { ok, err } from '@repo/api-core'
import type {
  UserProfileRepository,
  ActivityEventRepository,
  AvatarStorage,
} from '../ports/index.js'
import type { UserProfile, ActivityEvent, UpdateProfileInput, UserProfileError } from '../types.js'
import { generateAvatarKey } from '../adapters/storage.js'

export interface UserProfileServiceDeps {
  profileRepo: UserProfileRepository
  activityRepo: ActivityEventRepository
  avatarStorage: AvatarStorage
}

export function createUserProfileService(deps: UserProfileServiceDeps) {
  const { profileRepo, activityRepo, avatarStorage } = deps

  return {
    async getProfile(userId: string): Promise<Result<UserProfile, UserProfileError>> {
      const result = await profileRepo.findByUserId(userId)
      if (!result.ok) {
        // Auto-create profile on first access
        const profile = await profileRepo.upsert(userId, {})
        return ok(profile)
      }
      return result
    },

    async updateProfile(
      userId: string,
      input: UpdateProfileInput,
    ): Promise<Result<UserProfile, UserProfileError>> {
      const profile = await profileRepo.upsert(userId, input)
      return ok(profile)
    },

    async updatePreferences(
      userId: string,
      preferences: Record<string, unknown>,
    ): Promise<Result<UserProfile, UserProfileError>> {
      // Ensure profile exists first
      const existing = await profileRepo.findByUserId(userId)
      if (!existing.ok) {
        await profileRepo.upsert(userId, {})
      }
      const result = await profileRepo.updatePreferences(userId, preferences)
      if (!result.ok) return err('NOT_FOUND')
      return result
    },

    async getPreferences(
      userId: string,
    ): Promise<Result<Record<string, unknown>, UserProfileError>> {
      const result = await profileRepo.findByUserId(userId)
      if (!result.ok) {
        return ok({}) // Default empty preferences
      }
      return ok(result.data.preferences)
    },

    async presignAvatarUpload(
      userId: string,
      filename: string,
      contentType: string,
    ): Promise<Result<{ uploadUrl: string; imageUrl: string; key: string }, UserProfileError>> {
      const key = generateAvatarKey(userId, filename)
      const result = await avatarStorage.generatePresignedUrl(key, contentType)
      if (!result.ok) return err('UPLOAD_FAILED')

      // Update profile with new avatar URL
      await profileRepo.upsert(userId, { avatarUrl: result.data.imageUrl })

      return ok({ ...result.data, key })
    },

    async listActivity(
      userId: string,
      pagination: PaginationInput,
      typeFilter?: string,
    ): Promise<PaginatedResult<ActivityEvent>> {
      return activityRepo.findByUserId(userId, pagination, typeFilter)
    },

    async recordActivity(
      userId: string,
      type: string,
      title: string,
      message?: string,
      relatedId?: string,
      metadata?: Record<string, unknown>,
    ): Promise<ActivityEvent> {
      return activityRepo.insert({
        userId,
        type,
        title,
        message: message ?? null,
        relatedId: relatedId ?? null,
        metadata: metadata ?? {},
      })
    },
  }
}

export type UserProfileService = ReturnType<typeof createUserProfileService>
