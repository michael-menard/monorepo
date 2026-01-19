/**
 * Story 3.1.16: Rebrickable MOC Parser
 *
 * Parses Rebrickable MOC pages to extract MOC metadata.
 * Uses HTML scraping with cheerio.
 */

import * as cheerio from 'cheerio'
import type { ImportedImage } from '../types'

// ============================================================================
// Parser Result
// ============================================================================

export interface RebrickableMocParseResult {
  title: string
  description?: string
  author?: string
  partsCount?: number
  theme?: string
  tags: string[]
  thumbnailUrl?: string
  sourcePlatform: {
    platform: 'rebrickable'
    externalId: string
    sourceUrl: string
    importedAt: string
  }
  images: ImportedImage[]
  warnings: string[]
}

// ============================================================================
// Parser Implementation
// ============================================================================

/**
 * Parse Rebrickable MOC page HTML to extract MOC data
 */
export function parseRebrickableMoc(
  html: string,
  sourceUrl: string,
  externalId: string,
): RebrickableMocParseResult {
  const $ = cheerio.load(html)
  const warnings: string[] = []

  // Extract title from h1
  const title = $('h1').first().text().trim() || 'Untitled MOC'

  // Extract author from author link
  const authorLink = $('.author-name a, a[href*="/users/"]').first()
  const author = authorLink.text().trim() || undefined

  // Extract parts count from stats
  let partsCount: number | undefined
  const partsText = $('.stats .parts-count, [data-parts-count]').text()
  const partsMatch = partsText.match(/(\d[\d,]*)\s*parts?/i)
  if (partsMatch) {
    partsCount = parseInt(partsMatch[1].replace(/,/g, ''), 10)
  } else {
    warnings.push('Could not extract parts count')
  }

  // Extract theme from breadcrumb
  const themeLink = $('.breadcrumb a[href*="/themes/"], nav a[href*="/themes/"]').last()
  const theme = themeLink.text().trim() || undefined
  if (!theme) {
    warnings.push('Could not extract theme')
  }

  // Extract description
  const description =
    $('.description, .moc-description, [data-description]').first().text().trim() || undefined

  // Extract tags
  const tags: string[] = []
  $('.tags a, .tag, [data-tag]').each((_, el) => {
    const tag = $(el).text().trim().toLowerCase()
    if (tag && !tags.includes(tag)) {
      tags.push(tag)
    }
  })

  // Extract images
  const images: ImportedImage[] = []

  // Main image
  const mainImg = $('.main-image img, .moc-image img, [data-main-image]').first()
  const mainImgSrc = mainImg.attr('src') || mainImg.attr('data-src')
  if (mainImgSrc) {
    images.push({
      url: mainImgSrc.startsWith('http') ? mainImgSrc : `https://rebrickable.com${mainImgSrc}`,
      alt: title,
    })
  }

  // Gallery images
  $('.gallery img, .moc-gallery img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src')
    if (src && !images.some(img => img.url === src)) {
      images.push({
        url: src.startsWith('http') ? src : `https://rebrickable.com${src}`,
        alt: $(el).attr('alt') || title,
      })
    }
  })

  // Thumbnail URL (use first image or og:image)
  const ogImage = $('meta[property="og:image"]').attr('content')
  const thumbnailUrl = ogImage || images[0]?.url

  return {
    title,
    description,
    author,
    partsCount,
    theme,
    tags,
    thumbnailUrl,
    sourcePlatform: {
      platform: 'rebrickable',
      externalId,
      sourceUrl,
      importedAt: new Date().toISOString(),
    },
    images,
    warnings,
  }
}
