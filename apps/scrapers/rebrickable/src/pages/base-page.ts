import type { Page, ElementHandle } from 'playwright'
import { humanClick, humanType, humanScroll } from '../scraper/human-behavior.js'
import { screenshotOnError, takeScreenshot } from '../utils/screenshots.js'

export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  protected async findElement(
    primary: string,
    ...fallbacks: string[]
  ): Promise<ElementHandle> {
    const selectors = [primary, ...fallbacks]

    for (const selector of selectors) {
      try {
        const element = await this.page.waitForSelector(selector, { timeout: 5000 })
        if (element) return element
      } catch {
        // Try next selector
      }
    }

    throw new Error(
      `Element not found with any selector: ${selectors.join(', ')}`,
    )
  }

  protected async extractText(selector: string): Promise<string | null> {
    try {
      const element = await this.page.waitForSelector(selector, { timeout: 5000 })
      if (!element) return null
      return (await element.textContent())?.trim() ?? null
    } catch {
      return null
    }
  }

  protected async extractAllTexts(selector: string): Promise<string[]> {
    try {
      await this.page.waitForSelector(selector, { timeout: 5000 })
      return this.page.$$eval(selector, els =>
        els.map(el => el.textContent?.trim() ?? '').filter(Boolean),
      )
    } catch {
      return []
    }
  }

  protected async click(selector: string): Promise<void> {
    await humanClick(this.page, selector)
  }

  protected async type(selector: string, text: string): Promise<void> {
    await humanType(this.page, selector, text)
  }

  protected async scroll(direction: 'down' | 'up', amount: number): Promise<void> {
    await humanScroll(this.page, direction, amount)
  }

  protected async withScreenshotOnError<T>(label: string, fn: () => Promise<T>): Promise<T> {
    return screenshotOnError(this.page, label, fn)
  }

  async screenshot(label: string, subdirectory?: string): Promise<string> {
    return takeScreenshot(this.page, label, subdirectory)
  }

  async waitForNavigation(url?: string | RegExp): Promise<void> {
    if (url) {
      await this.page.waitForURL(url, { timeout: 30000 })
    } else {
      await this.page.waitForLoadState('networkidle', { timeout: 30000 })
    }
  }

  getCurrentUrl(): string {
    return this.page.url()
  }

  async isOnPage(urlPattern: RegExp): Promise<boolean> {
    return urlPattern.test(this.page.url())
  }
}
