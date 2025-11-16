/**
 * Profile Service
 *
 * Business logic for user profile operations including:
 * - Retrieving user profile from Cognito
 * - Aggregating user statistics from PostgreSQL
 * - Caching profile data in Redis
 */

import { count, eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { mocInstructions, galleryImages, wishlistItems } from '@/db/schema'
import {
  getCognitoUser,
  getCognitoAttribute,
  updateCognitoUserAttributes,
} from '@/lib/cognito/cognito-client'
import { getRedisClient } from '@/lib/cache/redis-client'
import { createLogger } from '@/lib/utils/logger'
import type { UpdateProfileRequest } from '@/lib/validation/profile-schemas'

const logger = createLogger('profile-service')

/**
 * User profile data structure
 */
export interface UserProfile {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  stats: {
    mocs: number
    images: number
    wishlistItems: number
  }
}

/**
 * Get user profile from Cognito User Pool
 *
 * @param userId - Cognito user ID (sub claim from JWT)
 * @returns User profile attributes or null if user not found
 */
export async function getCognitoProfile(userId: string): Promise<{
  sub: string
  email: string
  name: string | null
  picture: string | null
} | null> {
  try {
    const cognitoUser = await getCognitoUser(userId)

    if (!cognitoUser || !cognitoUser.UserAttributes) {
      logger.warn('Cognito user not found', { userId })
      return null
    }

    const attrs = cognitoUser.UserAttributes

    return {
      sub: getCognitoAttribute(attrs, 'sub') || userId,
      email: getCognitoAttribute(attrs, 'email') || '',
      name: getCognitoAttribute(attrs, 'name'),
      picture: getCognitoAttribute(attrs, 'picture'),
    }
  } catch (error) {
    logger.error('Failed to get Cognito profile', { userId, error })
    throw error
  }
}

/**
 * Get aggregated user statistics from PostgreSQL
 *
 * Queries the database for:
 * - Total MOC instructions count
 * - Total gallery images count
 * - Total wishlist items count
 *
 * @param userId - Cognito user ID
 * @returns User statistics
 */
export async function getProfileStats(userId: string): Promise<{
  mocs: number
  images: number
  wishlistItems: number
}> {
  try {
    // Execute all stat queries in parallel for better performance
    const [mocStats, imageStats, wishlistStats] = await Promise.all([
      db.select({ count: count() }).from(mocInstructions).where(eq(mocInstructions.userId, userId)),
      db.select({ count: count() }).from(galleryImages).where(eq(galleryImages.userId, userId)),
      db.select({ count: count() }).from(wishlistItems).where(eq(wishlistItems.userId, userId)),
    ])

    const stats = {
      mocs: Number(mocStats[0]?.count || 0),
      images: Number(imageStats[0]?.count || 0),
      wishlistItems: Number(wishlistStats[0]?.count || 0),
    }

    logger.debug('Retrieved profile stats', { userId, stats })
    return stats
  } catch (error) {
    logger.error('Failed to get profile stats', { userId, error })
    throw error
  }
}

/**
 * Get complete user profile with caching
 *
 * This function:
 * 1. Checks Redis cache first
 * 2. If cache miss, fetches from Cognito and PostgreSQL in parallel
 * 3. Caches the result for 10 minutes
 *
 * @param userId - Cognito user ID (sub claim from JWT)
 * @returns Complete user profile with statistics
 * @throws Error if user not found in Cognito
 */
export async function getUserProfile(userId: string): Promise<UserProfile> {
  const cacheKey = `profile:user:${userId}`

  try {
    // Check cache first
    const redis = await getRedisClient()
    const cached = await redis.get(cacheKey)

    if (cached) {
      logger.debug('Profile cache hit', { userId })
      return JSON.parse(cached) as UserProfile
    }

    logger.debug('Profile cache miss', { userId })

    // Fetch from Cognito and PostgreSQL in parallel
    const [cognitoProfile, stats] = await Promise.all([
      getCognitoProfile(userId),
      getProfileStats(userId),
    ])

    if (!cognitoProfile) {
      throw new Error('User not found in Cognito')
    }

    const profile: UserProfile = {
      id: cognitoProfile.sub,
      email: cognitoProfile.email,
      name: cognitoProfile.name,
      avatarUrl: cognitoProfile.picture,
      stats,
    }

    // Cache for 10 minutes (600 seconds)
    await redis.setEx(cacheKey, 600, JSON.stringify(profile))
    logger.info('Profile cached', { userId, ttl: 600 })

    return profile
  } catch (error) {
    logger.error('Failed to get user profile', { userId, error })
    throw error
  }
}

/**
 * Update user profile in Cognito and invalidate cache
 *
 * This function:
 * 1. Validates the update data (via Zod schema in handler)
 * 2. Updates user attributes in Cognito User Pool
 * 3. Invalidates the Redis cache for this user
 * 4. Fetches and returns the updated profile
 *
 * @param userId - Cognito user ID (sub claim from JWT)
 * @param updateData - Profile fields to update
 * @returns Updated user profile
 * @throws Error if Cognito update fails
 */
export async function updateUserProfile(
  userId: string,
  updateData: UpdateProfileRequest,
): Promise<UserProfile> {
  const cacheKey = `profile:user:${userId}`

  try {
    logger.info('Updating user profile', { userId, updateData })

    // Update Cognito user attributes
    const attributes = [
      {
        Name: 'name',
        Value: updateData.name,
      },
    ]

    const success = await updateCognitoUserAttributes(userId, attributes)

    if (!success) {
      throw new Error('Failed to update Cognito user attributes')
    }

    // Invalidate cache
    const redis = await getRedisClient()
    await redis.del(cacheKey)
    logger.info('Profile cache invalidated', { userId })

    // Fetch and return updated profile (this will re-cache)
    const updatedProfile = await getUserProfile(userId)
    logger.info('Profile updated successfully', { userId })

    return updatedProfile
  } catch (error) {
    logger.error('Failed to update user profile', { userId, error })
    throw error
  }
}
