import robotsParser from 'robots-parser'
import { logger } from '@repo/logger'

let robotsTxt: ReturnType<typeof robotsParser> | null = null

export async function loadRobotsTxt(baseUrl: string): Promise<void> {
  const robotsUrl = `${baseUrl}/robots.txt`
  try {
    const response = await fetch(robotsUrl)
    if (response.ok) {
      const body = await response.text()
      robotsTxt = robotsParser(robotsUrl, body)
      logger.info('[robots] robots.txt loaded successfully')

      const crawlDelay = robotsTxt.getCrawlDelay('*')
      if (crawlDelay) {
        logger.info(`[robots] Crawl-delay: ${crawlDelay}s`)
      }
    } else {
      logger.warn(`[robots] Failed to fetch robots.txt (${response.status}), proceeding without`)
      robotsTxt = null
    }
  } catch (error) {
    logger.warn('[robots] Could not fetch robots.txt, proceeding without', {
      error: error instanceof Error ? error.message : String(error),
    })
    robotsTxt = null
  }
}

export function isAllowed(url: string, ignoreRobots = false): boolean {
  if (ignoreRobots) {
    logger.warn(`[robots] Ignoring robots.txt for ${url}`)
    return true
  }

  if (!robotsTxt) {
    return true
  }

  const allowed = robotsTxt.isAllowed(url, '*')
  if (allowed === false) {
    logger.warn(`[robots] URL disallowed by robots.txt: ${url}`)
  }
  return allowed !== false
}

export function getCrawlDelay(): number | undefined {
  if (!robotsTxt) return undefined
  return robotsTxt.getCrawlDelay('*') ?? undefined
}
