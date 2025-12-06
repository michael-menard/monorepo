/**
 * Serverless API Response Types
 * TypeScript definitions for all serverless API responses
 */

import { z } from 'zod'

/**
 * Standard serverless API response wrapper
 */
export const ServerlessResponseSchema = z.object({
  data: z.any(),
  meta: z.object({
    requestId: z.string(),
    timestamp: z.string(),
    version: z.string().optional(),
  }),
  pagination: z
    .object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
    })
    .optional(),
})

export type ServerlessResponse<T = any> = {
  data: T
  meta: {
    requestId: string
    timestamp: string
    version?: string
  }
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

/**
 * Gallery API Response Types
 */
export const GalleryImageSchema = z.object({
  id: z.string(),
  url: z.string(),
  thumbnailUrl: z.string(),
  title: z.string(),
  description: z.string().optional(),
  tags: z.array(z.string()),
  metadata: z.object({
    width: z.number(),
    height: z.number(),
    fileSize: z.number(),
    format: z.string(),
    uploadedAt: z.string(),
    uploadedBy: z.string(),
  }),
  mocId: z.string().optional(),
})

export type GalleryImage = z.infer<typeof GalleryImageSchema>

export const GallerySearchResponseSchema = ServerlessResponseSchema.extend({
  data: z.object({
    images: z.array(GalleryImageSchema),
    filters: z.object({
      categories: z.array(z.string()),
      tags: z.array(z.string()),
    }),
  }),
})

export type GallerySearchResponse = z.infer<typeof GallerySearchResponseSchema>

/**
 * Wishlist API Response Types
 */
export const WishlistItemSchema = z.object({
  id: z.string(),
  mocId: z.string(),
  title: z.string(),
  imageUrl: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']),
  notes: z.string().optional(),
  addedAt: z.string(),
  estimatedCost: z.number().optional(),
  partCount: z.number().optional(),
  tags: z.array(z.string()),
})

export type WishlistItem = z.infer<typeof WishlistItemSchema>

export const WishlistResponseSchema = ServerlessResponseSchema.extend({
  data: z.object({
    items: z.array(WishlistItemSchema),
    summary: z.object({
      totalItems: z.number(),
      totalEstimatedCost: z.number(),
      priorityCounts: z.object({
        low: z.number(),
        medium: z.number(),
        high: z.number(),
      }),
    }),
  }),
})

export type WishlistResponse = z.infer<typeof WishlistResponseSchema>

/**
 * MOC Instructions API Response Types
 */
export const MOCInstructionSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
  estimatedTime: z.number(), // minutes
  partCount: z.number(),
  stepCount: z.number(),
  category: z.string(),
  tags: z.array(z.string()),
  images: z.array(
    z.object({
      url: z.string(),
      thumbnailUrl: z.string(),
      caption: z.string().optional(),
    }),
  ),
  author: z.object({
    id: z.string(),
    name: z.string(),
    avatar: z.string().optional(),
  }),
  createdAt: z.string(),
  updatedAt: z.string(),
  downloadUrl: z.string().optional(),
  isPublic: z.boolean(),
})

export type MOCInstruction = z.infer<typeof MOCInstructionSchema>

export const MOCSearchResponseSchema = ServerlessResponseSchema.extend({
  data: z.object({
    instructions: z.array(MOCInstructionSchema),
    filters: z.object({
      categories: z.array(z.string()),
      difficulties: z.array(z.string()),
      tags: z.array(z.string()),
    }),
  }),
})

export type MOCSearchResponse = z.infer<typeof MOCSearchResponseSchema>

/**
 * User Profile API Response Types
 */
export const UserProfileSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  avatar: z.string().optional(),
  preferences: z.object({
    theme: z.enum(['light', 'dark', 'system']),
    language: z.string(),
    notifications: z.object({
      email: z.boolean(),
      push: z.boolean(),
    }),
  }),
  stats: z.object({
    mocCount: z.number(),
    wishlistCount: z.number(),
    galleryCount: z.number(),
  }),
  createdAt: z.string(),
  lastLoginAt: z.string(),
})

export type UserProfile = z.infer<typeof UserProfileSchema>

export const UserProfileResponseSchema = ServerlessResponseSchema.extend({
  data: UserProfileSchema,
})

export type UserProfileResponse = z.infer<typeof UserProfileResponseSchema>

/**
 * Health Check Response Types
 */
export const HealthCheckResponseSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  timestamp: z.string(),
  version: z.string(),
  services: z.record(
    z.object({
      status: z.enum(['up', 'down']),
      responseTime: z.number(),
    }),
  ),
})

export type HealthCheckResponse = z.infer<typeof HealthCheckResponseSchema>
