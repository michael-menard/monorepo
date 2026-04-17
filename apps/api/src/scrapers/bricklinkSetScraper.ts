import { z } from 'zod'
import { logger } from '@repo/logger'

// Schemas for type safety
const BrickLinkImageDataSchema = z.object({
  mainImage: z.string().url(),
  thumbnails: z.array(z.string().url()),
})

const BrickLinkMinifigureSchema = z.object({
  imageUrl: z.string().url(),
  name: z.string(),
  quantity: z.number(),
})

const BrickLinkItemInfoSchema = z.object({
  yearReleased: z.string(),
  weight: z.string(),
  dimensions: z.string(),
  instructions: z.boolean(),
  partsCount: z.number(),
  minifiguresCount: z.number(),
  minifigures: z.array(BrickLinkMinifigureSchema),
  lotsForSale: z.number(),
  wantedListsCount: z.number(),
  collectionsCount: z.number(),
})

const BrickLinkScrapeResultSchema = z.object({
  success: z.boolean(),
  setNumber: z.string(),
  name: z.string(),
  scrapedAt: z.string().datetime(),
  images: BrickLinkImageDataSchema,
  itemInfo: BrickLinkItemInfoSchema,
})

export type BrickLinkScrapeResult = z.infer<typeof BrickLinkScrapeResultSchema>

/**
 * Extracts minifigure details from the inventory page after clicking the minifigures link
 */
export async function scrapeBrickLinkMinifigures(setNumber: string) {
  logger.info(`Extracting minifigures for set ${setNumber}`)

  await page.waitForSelector('img[src*="/M/idea"]', { timeout: 10000 })
  await page.waitForTimeout(1000)

  return await page.evaluate(() => {
    const minifigures = []
    const minifigImages = document.querySelectorAll('img[src*="/M/idea"]')

    minifigImages.forEach(img => {
      const row = img.closest('tr') || img.closest('td') || img.parentElement
      if (!row) return

      const rowText = row.textContent || ''

      // Skip header printer icons
      if (rowText.includes('Catalog: Sets:') && !rowText.includes('idea')) return

      const qtyMatch = rowText.match(/^(\d+)\s/)
      const quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : 1

      let name = rowText.trim()

      // Remove common prefixes and normalize whitespace for clean minifigure name extraction
      // Patterns: "1 idea083 (Inv)Name", "Catalog: Minifigures: Name | ..."
      name = name.replace(/^\d+\s*/, '')
      name = name.replace(/^idea0\d{2}\s*\(?Inv\)?/i, '')
      name = name.replace(/^Catalog:\s*Minifigures:/i, '')
      name = name.replace(/\s*\|\s*$/, '')
      name = name.replace(/\s+/g, ' ').trim()

      const cleanName = name.split('Catalog:')[0].trim()

      if (
        cleanName.length > 5 &&
        !cleanName.includes('Qty') &&
        img.src.includes('//img.bricklink.com/M/')
      ) {
        minifigures.push({
          imageUrl: img.src,
          name: cleanName,
          quantity: quantity,
        })
      }
    })

    return minifigures
  })
}

/**
 * Scrapes a BrickLink catalog item page for set information including minifigures
 * @param setNumber - The LEGO set number (e.g., "21325-1")
 * @param includeMinifigures - Whether to also scrape detailed minifigure data (default: false)
 * @returns Structured data about the set
 */
export async function scrapeBrickLinkSet(
  setNumber: string,
  includeMinifigures: boolean = false,
): Promise<BrickLinkScrapeResult> {
  logger.info(
    `Starting BrickLink scrape for set ${setNumber}${includeMinifigures ? ' with minifigures' : ''}`,
  )

  try {
    // Navigate to BrickLink set page
    await page.goto(`https://www.bricklink.com/v2/catalog/catalogitem.page?S=${setNumber}#T=I`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    })

    // Wait for main image to load
    await page.waitForSelector('img.pciImageMain', { timeout: 10000 })

    // Additional wait for dynamic content
    await page.waitForTimeout(2000)

    const result = await page.evaluate(
      async (setNum, shouldGetMinifigs) => {
        // Validate page structure
        if (!document.querySelector('img.pciImageMain')) {
          throw new Error('Main image not found - page structure may have changed')
        }

        // Extract images
        const mainImage = document.querySelector('img.pciImageMain')
        const thumbnailImages = document.querySelectorAll('.pciThumbImgBox img')

        const imageData = {
          mainImage: mainImage?.src || '',
          thumbnails: Array.from(thumbnailImages)
            .map(img => img.src)
            .filter(src => src && src.startsWith('http') && !src.includes('Large Images')),
        }

        // Extract item info from all font elements
        const itemInfo = {
          yearReleased: '',
          weight: '',
          dimensions: '',
          instructions: false,
          partsCount: 0,
          minifiguresCount: 0,
          minifigures: [],
          lotsForSale: 0,
          wantedListsCount: 0,
          collectionsCount: 0,
        }

        // Get all font elements with Tahoma,Arial
        const fontElements = document.querySelectorAll('font[face="Tahoma,Arial"]')

        fontElements.forEach(fontElem => {
          const textContent = (fontElem.textContent || '').trim()

          // Year Released
          const yearMatch = textContent.match(/Year Released:\s*(\d{4})/)
          if (yearMatch) itemInfo.yearReleased = yearMatch[1]

          // Weight
          const weightMatch = textContent.match(/Weight:\s*([^\n<]+)/)
          if (weightMatch) itemInfo.weight = weightMatch[1].trim()

          // Dimensions
          const dimMatch = textContent.match(/Item Dim\.:\s*([^\n<]+)/)
          if (dimMatch) itemInfo.dimensions = dimMatch[1].trim()

          // Instructions
          if (textContent.includes('Instructions: Yes')) {
            itemInfo.instructions = true
          }
        })

        // Extract parts and minifigures from inventory links
        const inventoryLinks = document.querySelectorAll('a.links[href*="catalogItemInv.asp"]')

        inventoryLinks.forEach(link => {
          const linkText = (link.textContent || '').trim()

          // Parts count
          const partsMatch = linkText.match(/([\d,]+)\s+Parts/)
          if (partsMatch) {
            itemInfo.partsCount = parseInt(partsMatch[1].replace(/,/g, ''), 10)
          }

          // Minifigures count
          const minifigMatch = linkText.match(/([\d,]+)\s+Minifigures/)
          if (minifigMatch) {
            itemInfo.minifiguresCount = parseInt(minifigMatch[1].replace(/,/g, ''), 10)
          }
        })

        // If requested, click the minifigures link and get detailed data
        let minifigures = []
        if (shouldGetMinifigs) {
          const minifigLink = document.querySelector('a[href*="viewItemType=M"]')
          if (minifigLink) {
            minifigLink.click()

            // Wait a bit for the page to load
            await new Promise(resolve => setTimeout(resolve, 2000))

            // Now extract minifigure data
            const minifigImages = document.querySelectorAll('img[src*="/M/idea"]')

            minifigImages.forEach(img => {
              const row = img.closest('tr') || img.closest('td') || img.parentElement
              if (!row) return

              const rowText = row.textContent || ''

              // Skip header printer icons
              if (rowText.includes('Catalog: Sets:') && !rowText.includes('idea')) return

              // Extract quantity
              const qtyMatch = rowText.match(/^(\d+)\s/)
              const quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : 1

              // Clean up the name
              let name = rowText.trim()
              name = name.replace(/^\d+\s*/, '')
              name = name.replace(/^idea0\d{2}\s*\(?Inv\)?/i, '')
              name = name.replace(/^Catalog:\s*Minifigures:/i, '')
              name = name.replace(/\s*\|\s*$/, '')
              name = name.replace(/\s+/g, ' ').trim()
              const cleanName = name.split('Catalog:')[0].trim()

              if (
                cleanName.length > 5 &&
                !cleanName.includes('Qty') &&
                img.src.includes('//img.bricklink.com/M/')
              ) {
                minifigures.push({
                  imageUrl: img.src,
                  name: cleanName,
                  quantity: quantity,
                })
              }
            })
          }
        }

        itemInfo.minifigures = minifigures

        // Extract community stats from 33% width cells
        const statCells = document.querySelectorAll('td[width="33%"], td[style*="width: 33%"]')

        statCells.forEach(cell => {
          const cellText = (cell.textContent || '').trim()

          // Lots for sale
          const lotsMatch = cellText.match(/(\d+)\s+Lots For Sale/)
          if (lotsMatch) itemInfo.lotsForSale = parseInt(lotsMatch[1], 10)

          // Wanted lists
          const wantedMatch = cellText.match(/On\s+(\d+)\s+Wanted Lists/)
          if (wantedMatch) itemInfo.wantedListsCount = parseInt(wantedMatch[1], 10)

          // Collections
          const collectionMatch = cellText.match(/In\s+(\d+)\s+Collections/)
          if (collectionMatch) itemInfo.collectionsCount = parseInt(collectionMatch[1], 10)
        })

        // Get set name from title
        const setName = document.title.split(' : ')[0].trim()

        return {
          success: true,
          setNumber: setNum,
          name: setName,
          scrapedAt: new Date().toISOString(),
          images: imageData,
          itemInfo,
        }
      },
      setNumber,
      includeMinifigures,
    )

    // Validate and return the result
    const validatedResult = BrickLinkScrapeResultSchema.parse(result)
    logger.info(`Successfully scraped data for set ${setNumber}`)
    return validatedResult
  } catch (error) {
    logger.error(`Failed to scrape BrickLink for set ${setNumber}:`, error)

    // Return error result if validation fails
    return {
      success: false,
      setNumber,
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
        partsCount: 0,
        minifiguresCount: 0,
        minifigures: [],
        lotsForSale: 0,
        wantedListsCount: 0,
        collectionsCount: 0,
      },
    }
  }
}

/**
 * Example usage - scrape a specific set
 */
export async function exampleScrape() {
  try {
    logger.info('Starting BrickLink scraper example...')

    const result = await scrapeBrickLinkSet('21325-1')

    if (result.success) {
      logger.info('Scrape successful!', {
        setNumber: result.setNumber,
        name: result.name,
        parts: result.itemInfo.partsCount,
        minifigures: result.itemInfo.minifiguresCount,
      })

      return result
    } else {
      logger.error('Scrape failed for unknown reasons')
      return result
    }
  } catch (error) {
    logger.error('Example scrape failed:', error)
    throw error
  }
}

// Export types for use in other files
export type { BrickLinkScrapeResult }
