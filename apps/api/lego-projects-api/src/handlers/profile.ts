import {Request, Response} from 'express'
import {count, desc, eq} from 'drizzle-orm'
import {db} from '../db/client'
import {galleryAlbums, galleryImages, mocInstructions, wishlistItems,} from '../db/schema'
import {uploadAvatar as uploadAvatarFile,} from '../storage/avatar-storage'
import { createLogger } from '../utils/logger'

const logger = createLogger('profile-handler')

// Profile aggregates user's LEGO-related data from various tables
// User authentication data is managed in the auth service

export const handleUploadError = (error: any, req: Request, res: Response, next: any) => {
  if (error && error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large. Maximum size is 20MB.' })
  }
  if (error && error.message === 'Only JPEG, PNG, and HEIC files are supported') {
    return res
      .status(400)
      .json({ error: 'Invalid file format. Only JPEG, PNG, and HEIC files are supported.' })
  }
  if (error) {
    return res.status(500).json({ error: 'Upload failed', details: error.message })
  }
  next()
}

export const getProfile = async (req: Request, res: Response) => {
  const { id: userId } = req.params

  try {
    // Aggregate profile data from various tables
    const [mocsCount] = await db
      .select({ count: count() })
      .from(mocInstructions)
      .where(eq(mocInstructions.userId, userId))

    const [imagesCount] = await db
      .select({ count: count() })
      .from(galleryImages)
      .where(eq(galleryImages.userId, userId))

    const [albumsCount] = await db
      .select({ count: count() })
      .from(galleryAlbums)
      .where(eq(galleryAlbums.userId, userId))

    const [wishlistCount] = await db
      .select({ count: count() })
      .from(wishlistItems)
      .where(eq(wishlistItems.userId, userId))

    // Get recent MOCs
    const recentMocs = await db
      .select()
      .from(mocInstructions)
      .where(eq(mocInstructions.userId, userId))
      .orderBy(desc(mocInstructions.createdAt))
      .limit(5)

    // Get recent images
    const recentImages = await db
      .select()
      .from(galleryImages)
      .where(eq(galleryImages.userId, userId))
      .orderBy(desc(galleryImages.createdAt))
      .limit(5)

    const profile = {
      userId,
      stats: {
        mocsCount: mocsCount.count,
        imagesCount: imagesCount.count,
        albumsCount: albumsCount.count,
        wishlistCount: wishlistCount.count,
      },
      recentMocs,
      recentImages,
    }

    res.json(profile)
  } catch (error) {
    logger.error({ err: error }, 'Error fetching profile')
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const createProfile = async (req: Request, res: Response) => {
  // Profile is created implicitly when user creates their first MOC, image, etc.
  // No separate profile table needed
  res.status(200).json({ message: 'Profile will be created when you add your first content' })
}

export const updateProfile = async (req: Request, res: Response) => {
  // Profile updates would be handled by updating individual content items
  res.status(200).json({ message: 'Profile updated through individual content updates' })
}

export const uploadAvatar = async (req: Request, res: Response) => {
  const { id: userId } = req.params
  const { file } = req

  if (!file) {
    return res.status(400).json({ error: 'Avatar file is required' })
  }

  try {
    // Upload avatar to storage
    const avatarUrl = await uploadAvatarFile(userId, file)

    res.json({
      message: 'Avatar uploaded successfully',
      avatarUrl,
    })
  } catch (error) {
    logger.error({ err: error }, 'uploadAvatar error')
    res.status(500).json({
      error: 'Upload failed',
      details: (error as Error).message,
    })
  }
}

export const deleteAvatar = async (req: Request, res: Response) => {
  const { id: userId } = req.params

  try {
    // Note: We don't store avatar URLs in the database since there's no users table
    // This would need to be coordinated with the auth service
    res.json({ message: 'Avatar deletion should be handled through auth service' })
  } catch (error) {
    res.status(500).json({ error: 'Database error', details: (error as Error).message })
  }
}
