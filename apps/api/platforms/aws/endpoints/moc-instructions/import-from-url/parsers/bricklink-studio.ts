/**
 * Story 3.1.16: BrickLink Studio Parser
 *
 * Parses BrickLink Studio design pages to extract MOC metadata.
 * BrickLink embeds model data in JavaScript: blapp.models.set([...])
 */

import * as cheerio from 'cheerio'
import type { ImportedImage } from '../types'

// ============================================================================
// BrickLink Data Types
// ============================================================================

interface BrickLinkUserStats {
  nPublicCreations?: number
  nPublicViews?: number
  nPublicLikes?: number
  nStaffPicked?: number
}

interface BrickLinkUser {
  strUsername?: string
  strDisplayName?: string
  strAvatar?: string
  stats?: BrickLinkUserStats
}

interface BrickLinkImage {
  url?: string
  n2ImageWidth?: number
  n2ImageHeight?: number
}

interface BrickLinkEventBadge {
  eventId?: string
  eventName?: string
  badgeType?: string
  badgeImageUrl?: string
}

interface BrickLinkModel {
  idModel?: number
  strModelName?: string
  strDescriptionLegacy?: string
  strModelNameTags?: string
  idModelCategory?: number
  nUploadedFrom?: number
  idModelFrom?: number | null
  udtCreate?: string
  udtPublish?: string
  dmUserBuilder?: BrickLinkUser
  dmMainImage?: BrickLinkImage
  dmMainThumb?: BrickLinkImage
  listEventBadges?: BrickLinkEventBadge[]
  bStaffPicked?: boolean
  udtStaffPicked?: string
}

// ============================================================================
// Parser Result
// ============================================================================

export interface BrickLinkParseResult {
  title: string
  description?: string
  author?: string
  tags: string[]
  thumbnailUrl?: string
  platformCategoryId?: number
  designer?: {
    username: string
    displayName?: string
    avatarUrl?: string
    stats?: {
      publicCreationsCount?: number
      totalPublicViews?: number
      totalPublicLikes?: number
      staffPickedCount?: number
    }
  }
  sourcePlatform: {
    platform: 'bricklink'
    externalId: string
    sourceUrl: string
    uploadSource?: 'web' | 'desktop_app' | 'mobile_app' | 'unknown'
    forkedFromId?: string
    importedAt: string
  }
  eventBadges: Array<{
    eventId: string
    eventName: string
    badgeType?: string
    badgeImageUrl?: string
  }>
  images: ImportedImage[]
}

// ============================================================================
// Parser Implementation
// ============================================================================

const UPLOAD_SOURCE_MAP: Record<number, 'web' | 'desktop_app' | 'mobile_app'> = {
  1: 'web',
  2: 'desktop_app',
  3: 'mobile_app',
}

/**
 * Parse BrickLink Studio page HTML to extract MOC data
 */
export function parseBrickLinkStudio(html: string, sourceUrl: string): BrickLinkParseResult {
  const $ = cheerio.load(html)

  // Find the script containing blapp.models.set([...])
  let foundModelData: BrickLinkModel | null = null

  $('script').each((_, el) => {
    const content = $(el).html() || ''
    const match = content.match(/blapp\.models\.set\(\s*\[([\s\S]*?)\]\s*\)/)
    if (match) {
      try {
        // Parse the JSON array - first element is the model
        const models = JSON.parse(`[${match[1]}]`)
        foundModelData = models[0] as BrickLinkModel
      } catch {
        // Parse error - will throw below
      }
    }
  })

  if (!foundModelData) {
    throw new Error('Could not find model data in BrickLink page')
  }

  // Assign to a const for proper type narrowing
  const modelData: BrickLinkModel = foundModelData

  // Parse tags from comma-separated string
  const tags =
    modelData.strModelNameTags
      ?.split(',')
      .map(t => t.trim().toLowerCase())
      .filter(Boolean) ?? []

  // Build result
  const result: BrickLinkParseResult = {
    title: modelData.strModelName || 'Untitled',
    description: modelData.strDescriptionLegacy,
    author: modelData.dmUserBuilder?.strUsername,
    tags,
    thumbnailUrl: modelData.dmMainThumb?.url || modelData.dmMainImage?.url,
    platformCategoryId: modelData.idModelCategory,
    sourcePlatform: {
      platform: 'bricklink',
      externalId: String(modelData.idModel || ''),
      sourceUrl,
      uploadSource: modelData.nUploadedFrom
        ? UPLOAD_SOURCE_MAP[modelData.nUploadedFrom] || 'unknown'
        : undefined,
      forkedFromId: modelData.idModelFrom ? String(modelData.idModelFrom) : undefined,
      importedAt: new Date().toISOString(),
    },
    eventBadges: [],
    images: [],
  }

  // Add designer info if available
  if (modelData.dmUserBuilder) {
    const user = modelData.dmUserBuilder
    result.designer = {
      username: user.strUsername || '',
      displayName: user.strDisplayName,
      avatarUrl: user.strAvatar,
    }

    if (user.stats) {
      result.designer.stats = {
        publicCreationsCount: user.stats.nPublicCreations,
        totalPublicViews: user.stats.nPublicViews,
        totalPublicLikes: user.stats.nPublicLikes,
        staffPickedCount: user.stats.nStaffPicked,
      }
    }
  }

  // Add event badges if available
  if (modelData.listEventBadges && modelData.listEventBadges.length > 0) {
    result.eventBadges = modelData.listEventBadges
      .filter(badge => badge.eventId && badge.eventName)
      .map(badge => ({
        eventId: badge.eventId!,
        eventName: badge.eventName!,
        badgeType: badge.badgeType,
        badgeImageUrl: badge.badgeImageUrl,
      }))
  }

  // Add main image to gallery
  if (modelData.dmMainImage?.url) {
    result.images.push({
      url: modelData.dmMainImage.url,
      width: modelData.dmMainImage.n2ImageWidth,
      height: modelData.dmMainImage.n2ImageHeight,
      alt: modelData.strModelName,
    })
  }

  return result
}
