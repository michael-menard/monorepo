import { z } from 'zod'
import { logger } from '@repo/logger'

// Schemas for type safety
const BrickLinkMinifigImageDataSchema = z.object({
  mainImage: z.string().url(),
  thumbnails: z.array(z.string().url()),
})

const BrickLinkMinifigItemInfoSchema = z.object({
  yearReleased: z.string(),
  weight: z.string(),
  dimensions: z.string(),
  instructions: z.boolean(),
  category: z.string(),
  description: z.string(),
  partsCount: z.number(),
  lotsForSale: z.number(),
  wantedListsCount: z.number(),
})

const BrickLinkMinifigScrapeResultSchema = z.object({
  success: z.boolean(),
  minifigNumber: z.string(),
  name: z.string(),
  scrapedAt: z.string().datetime(),
  images: BrickLinkMinifigImageDataSchema,
  itemInfo: BrickLinkMinifigItemInfoSchema,
})

export type BrickLinkMinifigScrapeResult = z.infer<typeof BrickLinkMinifigScrapeResultSchema>

const BrickLinkMinifigListItemSchema = z.object({
  minifigNumber: z.string(),
  name: z.string(),
  imageUrl: z.string().url(),
  href: z.string().url(),
})

export type BrickLinkMinifigListItem = z.infer<typeof BrickLinkMinifigListItemSchema>

/**
 * Scrapes a BrickLink catalog list page for minifigures
 * @param catalogUrl - The catalog list URL (e.g., "https://www.bricklink.com/catalogList.asp?catType=M&catString=746.753")
 * @returns Array of minifigures found on the page
 */
export async function scrapeBrickLinkMinifigCatalogList(catalogUrl: string) {
  logger.info(`Scraping BrickLink minifig catalog list: ${catalogUrl}`)

  try {
    await page.goto(catalogUrl, {
      waitUntil: 'networkidle',
      timeout: 30000,
    })

    await page.waitForTimeout(2000)

    const result = await page.evaluate(() => {
      const items: Array<{ minifigNumber: string; name: string; imageUrl: string; href: string }> =
        []

      // Find all minifigure links (pattern: catalogitem.page?M=XXXXX)
      const itemLinks = document.querySelectorAll('a[href*="catalogitem.page?M="]')

      itemLinks.forEach(link => {
        const href = link.href
        const text = (link.textContent || '').trim()

        // Extract minifig number from URL
        const match = href.match(/[?&]M=([^&]+)/)
        if (!match) return

        const minifigNumber = match[1]

        // Skip if already added
        if (items.some(item => item.minifigNumber === minifigNumber)) return

        // Get image from closest row
        const row = link.closest('tr') || link.closest('div')
        const img = row?.querySelector('img')
        const imageUrl = img?.src || ''

        // Skip if no image or if it looks like a header/printer icon
        if (!imageUrl || imageUrl.includes('printer') || imageUrl.includes('spacer')) return

        items.push({
          minifigNumber,
          name: text,
          imageUrl,
          href,
        })
      })

      return items
    })

    logger.info(`Found ${result.length} minifigures in catalog`)
    return result
  } catch (error) {
    logger.error(`Failed to scrape catalog list:`, error)
    return []
  }
}

/**
 * Scrapes a BrickLink minifigure catalog item page
 * @param minifigNumber - The minifigure number (e.g., "col003", "idea083")
 * @returns Structured data about the minifigure
 */
export async function scrapeBrickLinkMinifig(
  minifigNumber: string,
): Promise<BrickLinkMinifigScrapeResult> {
  logger.info(`Starting BrickLink scrape for minifig ${minifigNumber}`)

  try {
    await page.goto(
      `https://www.bricklink.com/v2/catalog/catalogitem.page?M=${minifigNumber}#T=S`,
      {
        waitUntil: 'networkidle',
        timeout: 30000,
      },
    )

    await page.waitForSelector('img.pciImageMain', { timeout: 10000 })
    await page.waitForTimeout(2000)

    const result = await page.evaluate(minifigNum => {
      if (!document.querySelector('img.pciImageMain')) {
        throw new Error('Main image not found - page structure may have changed')
      }

      const imageData = {
        mainImage: '',
        thumbnails: [] as string[],
      }

      const mainImage = document.querySelector('img.pciImageMain')
      if (mainImage) {
        imageData.mainImage = mainImage.src
      }

      const thumbnailImages = document.querySelectorAll('.pciThumbImgBox img')
      thumbnailImages.forEach(img => {
        if (img.src && img.src.startsWith('http') && !img.src.includes('Large Images')) {
          imageData.thumbnails.push(img.src)
        }
      })

      const itemInfo = {
        yearReleased: '',
        weight: '',
        dimensions: '',
        instructions: false,
        category: '',
        description: '',
        partsCount: 0,
        lotsForSale: 0,
        wantedListsCount: 0,
      }

      const fontElements = document.querySelectorAll('font[face="Tahoma,Arial"]')

      fontElements.forEach(fontElem => {
        const textContent = (fontElem.textContent || '').trim()

        if (textContent.includes('Year Released:')) {
          const yearMatch = textContent.match(/Year Released:\s*(\d{4})/)
          if (yearMatch) itemInfo.yearReleased = yearMatch[1]
        }

        if (textContent.includes('Weight:')) {
          const weightMatch = textContent.match(/Weight:\s*([^\n<]+)/)
          if (weightMatch) itemInfo.weight = weightMatch[1].trim()
        }

        if (textContent.includes('Item Dim.:')) {
          const dimMatch = textContent.match(/Item Dim\.:\s*([^\n<]+)/)
          if (dimMatch) itemInfo.dimensions = dimMatch[1].trim()
        }

        if (textContent.includes('Instructions:')) {
          itemInfo.instructions = textContent.includes('Yes')
        }

        if (textContent.includes('Category:')) {
          const catMatch = textContent.match(/Category:\s*([^\n<]+)/)
          if (catMatch) itemInfo.category = catMatch[1].trim()
        }
      })

      const nameEl = document.querySelector(
        'td.pciMainImageHolder ~ td font[face="Tahoma,Arial"] strong',
      )
      if (nameEl) {
        itemInfo.description = nameEl.textContent || ''
      }

      const statCells = document.querySelectorAll('td[width="33%"], td[style*="width: 33%"]')
      statCells.forEach(cell => {
        const cellText = (cell.textContent || '').trim()

        const lotsMatch = cellText.match(/(\d+)\s+Lots For Sale/)
        if (lotsMatch) itemInfo.lotsForSale = parseInt(lotsMatch[1], 10)

        const wantedMatch = cellText.match(/On\s+(\d+)\s+Wanted Lists/)
        if (wantedMatch) itemInfo.wantedListsCount = parseInt(wantedMatch[1], 10)
      })

      const partsLinks = document.querySelectorAll('a[href*="catalogItemInv.asp"][href*="M="]')
      partsLinks.forEach(link => {
        const text = (link.textContent || '').trim()
        const partsMatch = text.match(/(\d+)\s+Parts/)
        if (partsMatch) {
          itemInfo.partsCount = parseInt(partsMatch[1].replace(/,/g, ''), 10)
        }
      })

      const setName = document.title.split(' : ')[0].trim()

      return {
        success: true,
        minifigNumber: minifigNum,
        name: setName,
        scrapedAt: new Date().toISOString(),
        images: imageData,
        itemInfo,
      }
    }, minifigNumber)

    const validatedResult = BrickLinkMinifigScrapeResultSchema.parse(result)
    logger.info(`Successfully scraped minifig ${minifigNumber}`)
    return validatedResult
  } catch (error) {
    logger.error(`Failed to scrape minifig ${minifigNumber}:`, error)

    return {
      success: false,
      minifigNumber,
      name: '',
      scrapedAt: new Date().toISOString(),
      images: {
        mainImage: '',
        thumbnails: [],
      },
      itemInfo: {
        yearReleased: '',
        weight: '',
        dimensions: '',
        instructions: false,
        category: '',
        description: '',
        partsCount: 0,
        lotsForSale: 0,
        wantedListsCount: 0,
      },
    }
  }
}

/**
 * Scrapes all minifigures from a catalog list page
 * @param catalogUrl - The catalog list URL
 * @param scrapeDetails - Whether to also scrape detailed info for each minifig
 * @returns Array of minifigure data
 */
export async function scrapeAllBrickLinkMinifigsFromCatalog(
  catalogUrl: string,
  scrapeDetails: boolean = false,
) {
  logger.info(`Starting to scrape all minifigures from catalog: ${catalogUrl}`)

  const listItems = await scrapeBrickLinkMinifigCatalogList(catalogUrl)
  logger.info(`Found ${listItems.length} minifigures to process`)

  const results = []

  for (const item of listItems) {
    if (scrapeDetails) {
      logger.info(`Scraping details for minifig ${item.minifigNumber}...`)
      const details = await scrapeBrickLinkMinifig(item.minifigNumber)
      results.push(details)
    } else {
      results.push({
        success: true,
        minifigNumber: item.minifigNumber,
        name: item.name,
        scrapedAt: new Date().toISOString(),
        images: {
          mainImage: '',
          thumbnails: [item.imageUrl],
        },
        itemInfo: {
          yearReleased: '',
          weight: '',
          dimensions: '',
          instructions: false,
          category: '',
          description: '',
          partsCount: 0,
          lotsForSale: 0,
          wantedListsCount: 0,
        },
      })
    }
  }

  return results
}

// Export types for use in other files
export type { BrickLinkMinifigScrapeResult, BrickLinkMinifigListItem }
