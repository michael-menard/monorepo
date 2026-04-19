import type { Result, PaginatedResult, PaginationInput } from '@repo/api-core'
import type { UserProfile, ActivityEvent } from '../types.js'

export interface UserProfileRepository {
  findByUserId(userId: string): Promise<Result<UserProfile, 'NOT_FOUND'>>
  upsert(
    userId: string,
    data: Partial<Pick<UserProfile, 'displayName' | 'bio' | 'avatarUrl' | 'preferences'>>,
  ): Promise<UserProfile>
  updatePreferences(
    userId: string,
    preferences: Record<string, unknown>,
  ): Promise<Result<UserProfile, 'NOT_FOUND'>>
}

export interface ActivityEventRepository {
  findByUserId(
    userId: string,
    pagination: PaginationInput,
    typeFilter?: string,
  ): Promise<PaginatedResult<ActivityEvent>>
  insert(event: Omit<ActivityEvent, 'id' | 'createdAt'>): Promise<ActivityEvent>
}

export interface AvatarStorage {
  generatePresignedUrl(
    key: string,
    contentType: string,
  ): Promise<Result<{ uploadUrl: string; imageUrl: string }, 'PRESIGN_FAILED'>>
  delete(key: string): Promise<Result<void, 'DELETE_FAILED'>>
}
