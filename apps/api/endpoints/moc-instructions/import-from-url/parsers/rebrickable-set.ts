/**
 * Story 3.1.16: Rebrickable Set Parser
 *
 * Parses Rebrickable Set pages to extract set metadata.
 * Uses HTML scraping with cheerio.
 */

import * as cheerio from 'cheerio'
import type { ImportedImage } from '../types'

// ============================================================================
// Parser Result
// ============================================================================

export interface RebrickableSetParseResult {
  title: string
  description?: string
  brand?: string
  setNumber: string
  partsCount?: number
  minifigCount?: number
  theme?: string
  releaseYear?: number
  retired?: boolean
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
 * Parse Rebrickable Set page HTML to extract set data
 */
export function parseRebrickableSet(
  html: string,
  sourceUrl: string,
  externalId: string,
): RebrickableSetParseResult {
  const $ = cheerio.load(html)
  const warnings: string[] = []

  // Extract title from h1
  const title = $('h1').first().text().trim() || 'Untitled Set'

  // Extract set number from the page or URL
  const setNumber = externalId

  // Extract parts count
  let partsCount: number | undefined
  const partsText = $('.stats .parts-count, [data-parts-count], .set-parts').text()
  const partsMatch = partsText.match(/(\d[\d,]*)\s*parts?/i)
  if (partsMatch) {
    partsCount = parseInt(partsMatch[1].replace(/,/g, ''), 10)
  } else {
    warnings.push('Could not extract parts count')
  }

  // Extract minifig count
  let minifigCount: number | undefined
  const minifigText = $('.stats .minifig-count, [data-minifig-count], .set-minifigs').text()
  const minifigMatch = minifigText.match(/(\d+)\s*minifig/i)
  if (minifigMatch) {
    minifigCount = parseInt(minifigMatch[1], 10)
  }

  // Extract theme from breadcrumb
  const themeLink = $('.breadcrumb a[href*="/themes/"], nav a[href*="/themes/"]').last()
  const theme = themeLink.text().trim() || undefined
  if (!theme) {
    warnings.push('Could not extract theme')
  }

  // Extract year
  let releaseYear: number | undefined
  const yearText = $('.set-year, [data-year], .stats').text()
  const yearMatch = yearText.match(/\b(19\d{2}|20\d{2})\b/)
  if (yearMatch) {
    releaseYear = parseInt(yearMatch[1], 10)
  }

  // Check if retired
  const retiredText = $('body').text().toLowerCase()
  const retired = retiredText.includes('retired') || retiredText.includes('discontinued')

  // Extract description
  const description =
    $('.description, .set-description, [data-description]').first().text().trim() || undefined

  // Default brand to LEGO for Rebrickable sets
  const brand = 'LEGO'

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
  const mainImg = $('.main-image img, .set-image img, [data-main-image]').first()
  const mainImgSrc = mainImg.attr('src') || mainImg.attr('data-src')
  if (mainImgSrc) {
    images.push({
      url: mainImgSrc.startsWith('http') ? mainImgSrc : `https://rebrickable.com${mainImgSrc}`,
      alt: title,
    })
  }

  // Thumbnail URL
  const ogImage = $('meta[property="og:image"]').attr('content')
  const thumbnailUrl = ogImage || images[0]?.url

  return {
    title,
    description,
    brand,
    setNumber,
    partsCount,
    minifigCount,
    theme,
    releaseYear,
    retired,
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
