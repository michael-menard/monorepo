import { logger } from '@repo/logger'

/**
 * Currency Conversion
 *
 * Converts prices from source currency to USD.
 * Uses daily exchange rate snapshots (not real-time).
 */

// Fallback rates when API is unavailable
const FALLBACK_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 1.08,
  GBP: 1.27,
  CAD: 0.74,
  AUD: 0.66,
  SEK: 0.096,
  DKK: 0.145,
  NOK: 0.094,
  PLN: 0.25,
  CZK: 0.044,
}

let cachedRates: Record<string, number> | null = null
let cacheExpiry: Date | null = null

/**
 * Fetch current exchange rates from a free API.
 * Falls back to hardcoded rates if API is unavailable.
 */
export async function getExchangeRates(): Promise<Record<string, number>> {
  // Return cached rates if still valid
  if (cachedRates && cacheExpiry && new Date() < cacheExpiry) {
    return cachedRates
  }

  try {
    // Free exchange rate API (no key required)
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      throw new Error(`Exchange rate API returned ${response.status}`)
    }

    const data = (await response.json()) as { rates: Record<string, number> }

    // Invert rates: API gives "1 USD = X currency", we want "1 currency = X USD"
    const rates: Record<string, number> = { USD: 1.0 }
    for (const [currency, rate] of Object.entries(data.rates)) {
      rates[currency] = 1 / rate
    }

    cachedRates = rates
    cacheExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    logger.info('Exchange rates updated', { currencies: Object.keys(rates).length })
    return rates
  } catch (error) {
    logger.warn('Failed to fetch exchange rates, using fallback', { error })
    return FALLBACK_RATES
  }
}

/**
 * Convert a price from source currency to USD
 */
export async function convertToUsd(
  price: number,
  currency: string,
): Promise<{ priceUsd: number; exchangeRate: number }> {
  if (currency === 'USD') {
    return { priceUsd: price, exchangeRate: 1.0 }
  }

  const rates = await getExchangeRates()
  const rate = rates[currency]

  if (!rate) {
    logger.warn('Unknown currency, using 1:1 rate', { currency })
    return { priceUsd: price, exchangeRate: 1.0 }
  }

  return {
    priceUsd: Math.round(price * rate * 100) / 100,
    exchangeRate: rate,
  }
}
