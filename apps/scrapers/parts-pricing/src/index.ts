/**
 * Parts Pricing Scraper — CLI Entry Point
 *
 * Unified scraper app for fetching LEGO parts pricing from multiple marketplaces.
 *
 * Usage:
 *   pnpm tsx apps/scrapers/parts-pricing/src/index.ts --parts "3001:Red,3002:Blue" --source bricklink
 *   pnpm tsx apps/scrapers/parts-pricing/src/index.ts --parts-file parts.csv --source all
 */

import { logger } from '@repo/logger'
import { BrickLinkAdapter } from './adapters/bricklink.js'
import type { MarketplaceAdapter, ScrapedListing } from './adapters/types.js'
import { convertToUsd } from './currency/index.js'

// Available adapters
const adapters: Record<string, MarketplaceAdapter> = {
  bricklink: new BrickLinkAdapter(),
  // brickowl: new BrickOwlAdapter(),  // Phase 2
  // webrick: new WebrickAdapter(),      // Phase 2
}

interface PartRequest {
  partNumber: string
  color: string
}

interface PricedListing extends ScrapedListing {
  priceUsd: string
  exchangeRate: string
}

/**
 * Fetch pricing for a list of parts from specified sources
 */
export async function fetchPricing(
  parts: PartRequest[],
  sources: string[] = ['bricklink'],
): Promise<{
  listings: PricedListing[]
  errors: Array<{ partNumber: string; color: string; source: string; error: string }>
}> {
  const listings: PricedListing[] = []
  const errors: Array<{ partNumber: string; color: string; source: string; error: string }> = []

  for (const source of sources) {
    const adapter = adapters[source]
    if (!adapter) {
      logger.warn('Unknown source, skipping', { source })
      continue
    }

    const available = await adapter.isAvailable()
    if (!available) {
      logger.warn('Source unavailable, skipping', { source })
      for (const part of parts) {
        errors.push({
          partNumber: part.partNumber,
          color: part.color,
          source,
          error: 'Source unavailable',
        })
      }
      continue
    }

    for (const part of parts) {
      try {
        const raw = await adapter.fetchPartListings(part.partNumber, part.color)

        for (const listing of raw) {
          const { priceUsd, exchangeRate } = await convertToUsd(
            parseFloat(listing.priceOriginal),
            listing.currencyOriginal,
          )

          listings.push({
            ...listing,
            priceUsd: priceUsd.toFixed(4),
            exchangeRate: exchangeRate.toString(),
          })
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error'
        logger.error('Scraper error', {
          partNumber: part.partNumber,
          color: part.color,
          source,
          error: msg,
        })
        errors.push({ partNumber: part.partNumber, color: part.color, source, error: msg })
      }
    }
  }

  return { listings, errors }
}

// CLI entry point
if (import.meta.main) {
  const args = process.argv.slice(2)
  const partsArg = args.find(a => a.startsWith('--parts='))?.split('=')[1]
  const sourceArg = args.find(a => a.startsWith('--source='))?.split('=')[1] ?? 'bricklink'

  if (!partsArg) {
    logger.error('Usage: --parts="3001:Red,3002:Blue" --source=bricklink')
    process.exit(1)
  }

  const parts: PartRequest[] = partsArg.split(',').map(p => {
    const [partNumber, color] = p.split(':')
    return { partNumber, color }
  })

  const sources = sourceArg === 'all' ? Object.keys(adapters) : [sourceArg]

  logger.info('Starting price fetch', { parts: parts.length, sources })
  const result = await fetchPricing(parts, sources)
  logger.info('Price fetch complete', {
    listings: result.listings.length,
    errors: result.errors.length,
  })

  if (result.errors.length > 0) {
    logger.warn('Errors:', result.errors)
  }
}
