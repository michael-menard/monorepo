import { Page, ConsoleMessage } from '@playwright/test'

/**
 * MSW request inspection utility for debugging.
 * Captures intercepted requests logged by MSW.
 *
 * Story: WISH-2121 (AC22)
 */
export class MswRequestInspector {
  private interceptedRequests: Array<{
    method: string
    url: string
    timestamp: number
  }> = []

  private consoleMessages: ConsoleMessage[] = []

  constructor(private page: Page) {}

  /** Start listening for MSW-intercepted requests */
  async start() {
    this.page.on('console', msg => {
      this.consoleMessages.push(msg)
      const text = msg.text()
      if (text.includes('[MSW]')) {
        // Parse MSW log messages for request info
        const match = text.match(/\[MSW\]\s+(\w+)\s+(.+)/)
        if (match) {
          this.interceptedRequests.push({
            method: match[1],
            url: match[2],
            timestamp: Date.now(),
          })
        }
      }
    })

    // Also track network requests that were intercepted by service worker
    this.page.on('request', request => {
      const sw = request.serviceWorker()
      if (sw) {
        this.interceptedRequests.push({
          method: request.method(),
          url: request.url(),
          timestamp: Date.now(),
        })
      }
    })
  }

  /** Get all intercepted requests */
  getInterceptedRequests() {
    return [...this.interceptedRequests]
  }

  /** Get requests matching a URL pattern */
  getRequestsByPattern(pattern: string | RegExp) {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern
    return this.interceptedRequests.filter(r => regex.test(r.url))
  }

  /** Check if a specific request was intercepted */
  hasRequest(method: string, urlPattern: string | RegExp) {
    const regex = typeof urlPattern === 'string' ? new RegExp(urlPattern) : urlPattern
    return this.interceptedRequests.some(r => r.method === method && regex.test(r.url))
  }

  /** Clear recorded requests */
  clear() {
    this.interceptedRequests = []
    this.consoleMessages = []
  }
}
