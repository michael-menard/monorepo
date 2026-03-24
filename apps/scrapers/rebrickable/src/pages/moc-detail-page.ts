import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { logger } from '@repo/logger'
import { BasePage } from './base-page.js'
import { humanWait } from '../scraper/human-behavior.js'
import { ScrapedPartSchema, ScrapedMocDetailSchema } from '../__types__/index.js'
import type { ScrapedMocDetail, ScrapedPart } from '../__types__/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DOWNLOAD_DIR = resolve(__dirname, '../../data/downloads')

export interface PartsExport {
  format: 'rebrickable_csv' | 'lego_pab_csv' | 'bricklink_xml'
  label: string
  url: string
  filePath: string | null
}

export interface PartsExportResult {
  exports: PartsExport[]
  parts: ScrapedPart[]
}

// Selectors based on actual DOM inspection 2026-03-23
const SELECTORS = {
  // Title: <h4 class="mb-0">Hermit Crab Ocean Themed Bar</h4>
  title: 'h4.mb-0',
  titleAlt: '.hidden-xs h4',

  // Author: <div class="mb-10">by <a href="/users/Caesar12138/mocs/">Caesar12138</a></div>
  authorLink: '.mb-10 a[href*="/users/"]',
  authorLinkAlt: 'div.mb-10 a.js-hover-card',

  // Parts count: <a href="#parts_scroll">1559 parts</a>
  partsLink: 'a[href="#parts_scroll"]',

  // MOC info line: "MOC-194994 • 1559 parts • City > Harbor"
  mocInfo: '.hidden-xs .mb-30',
  mocInfoAlt: '.mb-30',

  // Download file links — these trigger a modal, not a direct download
  // <a href="#" class="trunc js-load-page-modal" data-url="/users/.../purchases/...">filename.pdf</a>
  downloadFileLink: 'a.js-load-page-modal[data-url*="/purchases/"]',
  downloadFileLinkAlt: 'a[data-modaltitle="Download Purchase"]',

  // Inventory tab
  inventoryTab: '.nav-tabs a:has-text("Inventory")',
  inventoryTabAlt: 'a[href*="#bi"]',

  // Parts table within inventory tab
  partsTable: 'table tbody tr',
}

export interface ScrapedFile {
  fileName: string
  downloadDataUrl: string
  fileSize: string
  uploadDate: string
}

export interface ScrapedImage {
  url: string
  filePath: string
}

export class MocDetailPage extends BasePage {
  async navigate(url: string): Promise<void> {
    await this.withScreenshotOnError('moc-detail-navigate', async () => {
      await this.page.goto(url, { waitUntil: 'networkidle' })
      logger.info(`[moc-detail] Navigated to ${url}`)
    })
  }

  async scrapeDetail(mocNumber: string): Promise<ScrapedMocDetail> {
    return this.withScreenshotOnError(`moc-detail-${mocNumber}`, async () => {
      await this.screenshot(`moc-${mocNumber}`, 'discovery')
      await humanWait('reading')

      // Title: <h4 class="mb-0"> or from page header "MOC-XXXXX - Title"
      let title = await this.extractText(SELECTORS.title)
      if (!title) {
        title = await this.extractText(SELECTORS.titleAlt)
      }
      if (!title) {
        // Fallback: extract from page heading h1
        const h1 = await this.extractText('h1')
        title = h1 ? h1.replace(/^MOC-\d+\s*[-–—]\s*/, '').trim() : `MOC-${mocNumber}`
      }
      logger.info(`[moc-detail] Title extracted: "${title}"`)

      // Author: extract from the URL path which is /mocs/MOC-{id}/{author}/{slug}/
      // or from breadcrumb "MOCs by {author}" or from sidebar "by {author}"
      let author = ''
      try {
        // Method 1: Extract from current URL path
        const urlMatch = this.page.url().match(/\/mocs\/MOC-\d+\/([^/]+)\//)
        if (urlMatch) {
          author = decodeURIComponent(urlMatch[1])
          logger.info(`[moc-detail] Author from URL: "${author}"`)
        }
      } catch {
        // fallback
      }
      if (!author) {
        // Method 2: Try extracting from breadcrumb link "MOCs by {author}"
        for (const sel of ['a[href*="/mocs/"][href$="/mocs/"]', SELECTORS.authorLink, SELECTORS.authorLinkAlt]) {
          const text = await this.extractText(sel)
          if (text && text !== 'Browse MOCs') {
            author = text.replace(/^(MOCs\s+by\s+|by\s+)/i, '').trim()
            logger.info(`[moc-detail] Author found with selector "${sel}": "${author}"`)
            break
          }
        }
      }

      // Parts count: <a href="#parts_scroll">1559 parts</a>
      // Also try the info line "MOC-XXXXX • 1559 parts • Category"
      let partsCount = 0
      for (const sel of [SELECTORS.partsLink, SELECTORS.mocInfo, SELECTORS.mocInfoAlt]) {
        const text = await this.extractText(sel)
        if (text) {
          const match = text.match(/(\d[\d,]*)\s*parts/i)
          if (match) {
            partsCount = parseInt(match[1].replace(/,/g, ''), 10)
            logger.info(`[moc-detail] Parts count found with selector "${sel}": ${partsCount}`)
            break
          }
        }
      }

      // Scrape download file info from the page
      const files = await this.scrapeFileList()
      logger.info(`[moc-detail] Found ${files.length} download files`)

      // Use first file's data-url as the download trigger
      const downloadUrl = files.length > 0
        ? `https://rebrickable.com${files[0].downloadDataUrl}`
        : undefined

      // Determine file type from filename
      const fileType = files.length > 0
        ? files[0].fileName.match(/\.(pdf|io|studio|ldr|mpd|lxf)$/i)?.[1]?.toUpperCase() || 'PDF'
        : ''

      const detail = ScrapedMocDetailSchema.parse({
        mocNumber,
        title,
        author,
        partsCount,
        downloadUrl,
        fileType,
      })

      logger.info(
        `[moc-detail] MOC-${mocNumber}: "${detail.title}" by ${detail.author} (${detail.partsCount} parts, ${files.length} files)`,
      )

      return detail
    })
  }

  /**
   * Scrape the list of downloadable files from the MOC detail page.
   * Files are listed as <a class="js-load-page-modal" data-url="...">filename.pdf</a>
   */
  async scrapeFileList(): Promise<ScrapedFile[]> {
    try {
      const selector = [SELECTORS.downloadFileLink, SELECTORS.downloadFileLinkAlt].join(', ')
      await this.page.waitForSelector(selector, { timeout: 5000 })

      const rawFiles = await this.page.$$eval(SELECTORS.downloadFileLink, links =>
        links.map(link => {
          const row = link.closest('.row')
          const smallEls = row ? Array.from(row.querySelectorAll('small')) : []

          return {
            fileName: link.textContent?.trim() || '',
            downloadDataUrl: link.getAttribute('data-url') || '',
            fileSize: smallEls.length > 1 ? smallEls[1]?.textContent?.trim() || '' : '',
            uploadDate: smallEls.length > 0 ? smallEls[0]?.textContent?.trim() || '' : '',
          }
        }).filter(f => f.downloadDataUrl),
      )

      // Deduplicate by downloadDataUrl — the DOM has two <a> elements per file
      // (one with the filename text, one as a download icon with no text).
      // Keep the entry with a non-empty fileName when duplicates exist.
      const seen = new Map<string, ScrapedFile>()
      for (const file of rawFiles) {
        const existing = seen.get(file.downloadDataUrl)
        if (!existing || (!existing.fileName && file.fileName)) {
          seen.set(file.downloadDataUrl, file)
        }
      }

      return Array.from(seen.values())
    } catch {
      logger.info('[moc-detail] No download file links found')
      return []
    }
  }

  /**
   * Click a download file link to open the modal, then click the Download button
   * which has data-url="/users/.../download/{id}/{hash}/?expire=..."
   * This triggers a POST that initiates the file download.
   */
  async triggerDownload(fileLink: ScrapedFile, mocNumber?: string): Promise<string | null> {
    try {
      // Step 0: Ensure no stale modals/backdrops are lingering before clicking a new file link
      await this.dismissModal()

      // Step 1: Click the file link to open the download modal
      const linkSelector = `a.js-load-page-modal[data-url="${fileLink.downloadDataUrl}"]`
      await this.click(linkSelector)
      logger.info(`[moc-detail] Clicked file link to open modal: ${fileLink.fileName}`)

      // Step 2: Wait for the modal to appear and its AJAX content to load
      await this.page.waitForSelector('.modal.in, .modal.show, .modal[style*="display: block"]', {
        timeout: 10000,
      })
      logger.info(`[moc-detail] Modal visible, waiting for download button...`)

      // Wait for the Download button — AJAX-loaded content inside the modal
      const downloadBtnSelector = 'button.js-post-button[data-url*="/download/"]'
      try {
        await this.page.waitForSelector(downloadBtnSelector, { timeout: 10000 })
      } catch {
        // Debug: capture what's in the modal
        await this.screenshot(`modal-debug-${fileLink.fileName}`, 'discovery')
        const modalHtml = await this.page.evaluate(() => {
          const modal = document.querySelector('.modal.in, .modal.show, .modal[style*="display: block"]')
          return modal ? modal.innerHTML.substring(0, 2000) : '(no modal found)'
        })
        logger.warn(`[moc-detail] Download button not found in modal. HTML: ${modalHtml.substring(0, 500)}`)
        return null
      }

      // Step 3: Extract the download URL from the button's data-url
      const downloadUrl = await this.page.$eval(
        downloadBtnSelector,
        el => el.getAttribute('data-url') || '',
      )

      if (!downloadUrl) {
        logger.warn(`[moc-detail] Download button found but no data-url`)
        return null
      }

      const fullUrl = downloadUrl.startsWith('http')
        ? downloadUrl
        : `https://rebrickable.com${downloadUrl}`

      logger.info(`[moc-detail] Download URL: ${fullUrl}`)

      // Step 4: Set up download listener, then click the button
      const [download] = await Promise.all([
        this.page.waitForEvent('download', { timeout: 30000 }),
        this.page.click(downloadBtnSelector),
      ])

      // Step 5: Save the downloaded file into MOC-specific directory
      const suggestedFilename = download.suggestedFilename()
      const mocDir = mocNumber ? resolve(DOWNLOAD_DIR, `MOC-${mocNumber}`) : DOWNLOAD_DIR
      if (!existsSync(mocDir)) {
        mkdirSync(mocDir, { recursive: true })
      }
      const filePath = resolve(mocDir, suggestedFilename)
      await download.saveAs(filePath)
      logger.info(`[moc-detail] Downloaded: ${suggestedFilename} → ${filePath}`)

      // Close modal and fully reset Bootstrap modal state before returning
      await this.dismissModal()

      return filePath
    } catch (error) {
      logger.warn(`[moc-detail] Could not download ${fileLink.fileName}`, {
        error: error instanceof Error ? error.message : String(error),
      })

      // Try to close modal
      await this.dismissModal()

      return null
    }
  }

  /**
   * Fully dismiss any open Bootstrap modal, including removing the backdrop
   * and resetting body classes. Without this, alternating modal opens fail
   * because Bootstrap's internal state gets stuck.
   */
  private async dismissModal(): Promise<void> {
    try {
      // Try clicking close button first
      await this.page.click('.modal .close, [data-dismiss="modal"]').catch(() => {})

      // Force-remove modal via Bootstrap's jQuery API and clean up DOM artifacts
      await this.page.evaluate(() => {
        // Use Bootstrap's modal('hide') if jQuery is available
        const $ = (window as any).jQuery || (window as any).$
        if ($) {
          $('.modal').modal('hide')
        }

        // Remove backdrop manually (Bootstrap sometimes leaves it)
        document.querySelectorAll('.modal-backdrop').forEach(el => el.remove())

        // Reset body state
        document.body.classList.remove('modal-open')
        document.body.style.removeProperty('padding-right')
        document.body.style.removeProperty('overflow')

        // Hide all modals via style
        document.querySelectorAll('.modal').forEach(el => {
          ;(el as HTMLElement).style.display = 'none'
          el.classList.remove('in', 'show')
          el.removeAttribute('aria-modal')
          el.setAttribute('aria-hidden', 'true')
        })
      })

      await this.page.waitForTimeout(500)
    } catch {
      // Best effort
    }
  }

  /**
   * Navigate to Inventory tab, open the Export dropdown, and download all export formats.
   * Call this after scrapeDetail() — it's separate because the inventory tab is AJAX-loaded.
   * Downloads: Rebrickable CSV, LEGO Pick-a-Brick CSV, BrickLink XML.
   */
  async scrapePartsFromInventory(mocNumber?: string): Promise<PartsExportResult> {
    try {
      await this.navigateToInventoryTab()
      return await this.scrapeParts(mocNumber)
    } catch (error) {
      logger.warn(`[moc-detail] Could not scrape parts from inventory`, {
        error: error instanceof Error ? error.message : String(error),
      })
      return { exports: [], parts: [] }
    }
  }

  /**
   * Download the full-size hero/carousel images from the MOC detail page.
   * The thumbnails are just smaller versions of these same images.
   * Saves to data/downloads/MOC-{id}/images/.
   */
  async scrapeImages(mocNumber: string): Promise<ScrapedImage[]> {
    const images: ScrapedImage[] = []
    const imgDir = resolve(DOWNLOAD_DIR, `MOC-${mocNumber}`, 'images')
    if (!existsSync(imgDir)) {
      mkdirSync(imgDir, { recursive: true })
    }

    try {
      // Rebrickable uses FlexSlider for the image carousel.
      // The main viewport lazy-loads slides so only ~3 are in DOM at a time.
      // The thumbnail strip (.flex-control-nav.flex-control-thumbs) has ALL images
      // at 200x160c size. We swap the size suffix to 1000x800 for full-size versions.
      const imageUrls = await this.page.evaluate(() => {
        const urls = new Set<string>()

        // Primary source: thumbnail strip has ALL images
        document.querySelectorAll('.flex-control-nav.flex-control-thumbs img').forEach(img => {
          const src = (img as HTMLImageElement).src
          if (src && src.includes('/media/') && !src.includes('spinner')) {
            // Swap thumbnail size (200x160c) to full size (1000x800)
            // URL format: .../437970.png/200x160c.png?timestamp
            // Handle both .png and .jpg thumbnail URLs
            const fullSizeUrl = src.replace(/\/\d+x\d+c?\.(png|jpg|jpeg)(\?.*)?$/, '/1000x800.$1')
            urls.add(fullSizeUrl)
          }
        })

        // Fallback: if no thumbnails found, try hero images (less complete)
        if (urls.size === 0) {
          document.querySelectorAll('.flex-viewport .slides img').forEach(img => {
            const parent = img.parentElement
            if (parent?.classList.contains('clone')) return

            const src = (img as HTMLImageElement).src
            if (src && src.includes('/media/') && !src.includes('spinner')) {
              urls.add(src)
            }
          })
        }

        return Array.from(urls)
      })

      const uniqueUrls = [...new Set(imageUrls)]
      logger.info(`[moc-detail] Found ${uniqueUrls.length} images from thumbnail strip`)

      // Download each image using Playwright's API request context (avoids CORS)
      for (let i = 0; i < uniqueUrls.length; i++) {
        const url = uniqueUrls[i]
        try {
          logger.info(`[moc-detail] Downloading image ${i + 1}/${uniqueUrls.length}: ${url.substring(0, 100)}...`)
          const response = await this.page.context().request.get(url)
          if (!response.ok()) {
            logger.warn(`[moc-detail] Image fetch failed (${response.status()}): ${url}`)
            continue
          }

          const buffer = await response.body()
          const contentType = response.headers()['content-type'] || ''
          const ext = this.getImageExtension(url, contentType)
          const fileName = `image-${String(i + 1).padStart(2, '0')}.${ext}`
          const filePath = resolve(imgDir, fileName)

          writeFileSync(filePath, buffer)
          images.push({ url, filePath })
          logger.info(`[moc-detail] Saved image: ${fileName} (${buffer.length} bytes)`)
        } catch (error) {
          logger.warn(`[moc-detail] Failed to download image: ${url}`, {
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }
    } catch (error) {
      logger.warn(`[moc-detail] Error scraping images`, {
        error: error instanceof Error ? error.message : String(error),
      })
    }

    logger.info(`[moc-detail] Downloaded ${images.length} images for MOC-${mocNumber}`)
    return images
  }

  private getImageExtension(url: string, contentType: string): string {
    if (contentType.includes('png')) return 'png'
    if (contentType.includes('webp')) return 'webp'
    if (contentType.includes('gif')) return 'gif'
    const urlExt = url.match(/\.(jpg|jpeg|png|webp|gif)/i)
    return urlExt ? urlExt[1].toLowerCase() : 'jpg'
  }

  private async navigateToInventoryTab(): Promise<void> {
    const tabSelectors = [SELECTORS.inventoryTab, SELECTORS.inventoryTabAlt]

    for (const selector of tabSelectors) {
      try {
        const tab = await this.page.waitForSelector(selector, { timeout: 3000 })
        if (tab) {
          // Scroll the tab into view first — it may be below the fold
          await tab.scrollIntoViewIfNeeded()
          await this.page.waitForTimeout(500)

          await this.click(selector)

          // Inventory content is lazy-loaded via AJAX
          logger.info(`[moc-detail] Clicked inventory tab, waiting for content to load...`)

          // Wait for any spinner/loading indicator to disappear
          await this.page.waitForSelector('.spinner', { state: 'hidden', timeout: 5000 }).catch(() => {})

          // Wait for actual inventory content — the Export Parts button or parts table
          // The .js-export-parts-list container holds the Export dropdown
          await this.page.waitForSelector(
            '.js-export-parts-list, #parts_standard, table.table',
            { timeout: 30000 },
          )

          // Small additional wait for any remaining AJAX to settle
          await this.page.waitForTimeout(1000)

          logger.info(`[moc-detail] Inventory content loaded`)
          await this.screenshot('inventory-content', 'discovery')
          return
        }
      } catch {
        // try next
      }
    }

    logger.info('[moc-detail] No inventory tab found')
  }

  /**
   * Open the Export Parts dropdown and extract all export URLs.
   * Known formats:
   *   - Rebrickable CSV:     ?format=rbpartscsv
   *   - LEGO Pick-a-Brick:   ?format=legopabcsv
   *   - BrickLink XML:       ?format=bricklinkxml
   */
  async getExportUrls(): Promise<PartsExport[]> {
    const exports: PartsExport[] = []

    try {
      // Wait for the Export Parts dropdown container
      const exportContainer = await this.page.waitForSelector('.js-export-parts-list', { timeout: 10000 })
      if (!exportContainer) {
        logger.info('[moc-detail] No .js-export-parts-list container found')
        return exports
      }

      // Click the dropdown toggle
      const btnSelectors = [
        '.js-export-parts-list .dropdown-toggle',
        '.js-export-parts-list button',
        '.js-export-parts-list .btn',
      ]

      let clicked = false
      for (const sel of btnSelectors) {
        const btn = await this.page.$(sel)
        if (btn) {
          await btn.click()
          clicked = true
          logger.info(`[moc-detail] Clicked Export dropdown with selector: ${sel}`)
          break
        }
      }

      if (!clicked) {
        logger.info('[moc-detail] Could not find Export dropdown button')
        await this.screenshot('export-btn-missing', 'discovery')
        return exports
      }

      // Wait for dropdown menu to appear
      await this.page.waitForSelector('.js-export-parts-list .dropdown-menu, .dropdown-menu.show', {
        state: 'visible',
        timeout: 5000,
      }).catch(() => {})
      await this.page.waitForTimeout(500)

      await this.screenshot('export-dropdown-open', 'discovery')

      // Extract ALL links from the dropdown menu
      const allLinks = await this.page.$$eval(
        '.js-export-parts-list .dropdown-menu a[href]',
        links => links.map(a => ({
          href: a.getAttribute('href') || '',
          text: a.textContent?.trim() || '',
        })),
      )

      logger.info(`[moc-detail] Export dropdown links: ${JSON.stringify(allLinks)}`)

      // Map known formats — match by href param or link text
      const formatMap: Array<{
        hrefMatch?: string
        textMatch?: string
        format: PartsExport['format']
        label: string
      }> = [
        { hrefMatch: 'rbpartscsv', format: 'rebrickable_csv', label: 'Rebrickable CSV' },
        { hrefMatch: 'legopab', format: 'lego_pab_csv', label: 'LEGO Pick-a-Brick CSV' },
        { textMatch: 'bricklink', format: 'bricklink_xml', label: 'BrickLink XML' },
      ]

      for (const link of allLinks) {
        for (const fm of formatMap) {
          const hrefMatches = fm.hrefMatch && link.href.includes(fm.hrefMatch)
          const textMatches = fm.textMatch && link.text.toLowerCase().includes(fm.textMatch)

          if (hrefMatches || textMatches) {
            const url = link.href.startsWith('http')
              ? link.href
              : link.href === '#'
                ? '' // BrickLink XML uses JS, not a direct URL
                : `https://rebrickable.com${link.href}`
            exports.push({ format: fm.format, label: fm.label, url, filePath: null })
            logger.info(`[moc-detail] Found export: ${fm.label} → ${url || '(JS-triggered)'}`)
          }
        }
      }

      // Close dropdown
      await this.page.click('body').catch(() => {})
    } catch (error) {
      logger.warn('[moc-detail] Error getting export URLs', {
        error: error instanceof Error ? error.message : String(error),
      })
    }

    if (exports.length === 0) {
      logger.info('[moc-detail] No export links found in dropdown')
    }
    return exports
  }

  /**
   * Download all three export formats and save to data/downloads/MOC-{id}/.
   * Also parses the Rebrickable CSV into ScrapedPart array.
   */
  private async scrapeParts(mocNumber?: string): Promise<PartsExportResult> {
    const result: PartsExportResult = { exports: [], parts: [] }
    const exportUrls = await this.getExportUrls()
    if (exportUrls.length === 0) return result

    // Create MOC-specific download directory
    const mocDir = resolve(DOWNLOAD_DIR, mocNumber ? `MOC-${mocNumber}` : 'unknown')
    if (!existsSync(mocDir)) {
      mkdirSync(mocDir, { recursive: true })
    }

    for (const exp of exportUrls) {
      try {
        let content: string

        if (exp.format === 'bricklink_xml' && !exp.url) {
          // BrickLink XML is triggered via JS click — need to re-open dropdown and click the link
          content = await this.downloadBrickLinkXml()
          if (!content) {
            logger.warn(`[moc-detail] BrickLink XML download returned empty`)
            continue
          }
        } else if (!exp.url) {
          logger.warn(`[moc-detail] No URL for ${exp.label}, skipping`)
          continue
        } else {
          // Fetch using the page's authenticated session
          content = await this.page.evaluate(async (url) => {
            const res = await fetch(url, { credentials: 'same-origin' })
            return res.text()
          }, exp.url)
        }

        // Determine filename
        const ext = exp.format === 'bricklink_xml' ? 'xml' : 'csv'
        const fileName = `parts-${exp.format}.${ext}`
        const filePath = resolve(mocDir, fileName)

        writeFileSync(filePath, content, 'utf-8')
        exp.filePath = filePath
        logger.info(`[moc-detail] Saved ${exp.label}: ${filePath} (${content.length} bytes)`)

        // Parse Rebrickable CSV into structured parts
        if (exp.format === 'rebrickable_csv') {
          result.parts = this.parseCsv(content)
        }
      } catch (error) {
        logger.warn(`[moc-detail] Failed to download ${exp.label}`, {
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    result.exports = exportUrls
    return result
  }

  /**
   * BrickLink XML export uses href="#" and is triggered via JS.
   * Re-open the Export dropdown, click the BrickLink XML link.
   * Rebrickable shows a small notification bar with the XML content or a link.
   * We also listen for a download event in case it triggers a file download.
   */
  private async downloadBrickLinkXml(): Promise<string> {
    try {
      // Re-open the Export dropdown
      const btnSelectors = [
        '.js-export-parts-list .dropdown-toggle',
        '.js-export-parts-list button',
        '.js-export-parts-list .btn',
      ]
      for (const sel of btnSelectors) {
        const btn = await this.page.$(sel)
        if (btn) {
          await btn.click()
          break
        }
      }
      await this.page.waitForTimeout(500)

      // Click the BrickLink XML link — listen for download or page changes
      const blLink = await this.page.$('.js-export-parts-list .dropdown-menu a:has-text("BrickLink")')
      if (!blLink) {
        logger.warn('[moc-detail] Could not find BrickLink XML link in dropdown')
        return ''
      }

      // Set up download listener before clicking
      const downloadPromise = this.page.waitForEvent('download', { timeout: 5000 }).catch(() => null)

      await blLink.click()
      await this.page.waitForTimeout(2000)

      // Take screenshot to see what happened
      await this.screenshot('bricklink-xml-after-click', 'discovery')

      // Check if a download was triggered
      const download = await downloadPromise
      if (download) {
        const filePath = resolve(DOWNLOAD_DIR, download.suggestedFilename() || 'bricklink.xml')
        await download.saveAs(filePath)
        const { readFileSync } = await import('fs')
        const content = readFileSync(filePath, 'utf-8')
        logger.info(`[moc-detail] BrickLink XML from download: ${content.length} chars`)
        return content
      }

      // Check for a notification bar, alert, or inline element with XML
      // Rebrickable shows "Export BrickLink XML." in a notification area
      const xmlContent = await this.page.evaluate(() => {
        // Search for XML content anywhere on the page
        const allElements = document.querySelectorAll(
          'textarea, pre, code, .alert, .notification, .js-notification, [class*="export"], [class*="xml"]',
        )
        for (const el of allElements) {
          const text = el instanceof HTMLTextAreaElement ? el.value : el.textContent || ''
          if (text.includes('<INVENTORY>') || text.includes('<?xml') || text.includes('<ITEM>')) {
            return text
          }
        }

        // Also check for any modal or overlay
        const modals = document.querySelectorAll('.modal.in, .modal.show, .modal[style*="display: block"]')
        for (const modal of modals) {
          const text = modal.textContent || ''
          if (text.includes('<INVENTORY>') || text.includes('<ITEM>')) {
            return text
          }
        }

        return ''
      })

      if (xmlContent) {
        logger.info(`[moc-detail] BrickLink XML from page element: ${xmlContent.length} chars`)
        return xmlContent
      }

      // Last resort: check if there's a notification bar with a link we can follow
      const notifLink = await this.page.$('.alert a[href*="bricklink"], .notification a, a[href*="xml"]')
      if (notifLink) {
        const href = await notifLink.evaluate(el => (el as HTMLAnchorElement).getAttribute('href') || '')
        if (href && href !== '#') {
          const url = href.startsWith('http') ? href : `https://rebrickable.com${href}`
          logger.info(`[moc-detail] Following BrickLink notification link: ${url}`)
          const content = await this.page.evaluate(async (fetchUrl) => {
            const res = await fetch(fetchUrl, { credentials: 'same-origin' })
            return res.text()
          }, url)
          return content
        }
      }

      // Dump page HTML near the notification for debugging
      const notifHtml = await this.page.evaluate(() => {
        // Look for notification/alert elements
        const alerts = document.querySelectorAll('.alert, [class*="notif"], [class*="toast"], [class*="message"]')
        return Array.from(alerts).map(el => el.outerHTML).join('\n---\n')
      })
      if (notifHtml) {
        logger.info(`[moc-detail] Notification HTML found: ${notifHtml.substring(0, 500)}`)
      }

      logger.warn('[moc-detail] Could not capture BrickLink XML content')
      return ''
    } catch (error) {
      logger.warn('[moc-detail] Error downloading BrickLink XML', {
        error: error instanceof Error ? error.message : String(error),
      })
      return ''
    }
  }

  /**
   * Parse Rebrickable CSV format into ScrapedPart array.
   * CSV columns vary but typically: Part, Color, Quantity, Is Spare, and more.
   */
  private parseCsv(csvText: string): ScrapedPart[] {
    const parts: ScrapedPart[] = []
    const lines = csvText.trim().split('\n')
    if (lines.length < 2) return []

    // Parse header row
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    logger.info(`[moc-detail] CSV headers: ${headers.join(', ')}`)

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i])
      const row: Record<string, string> = {}
      headers.forEach((h, idx) => {
        row[h] = values[idx] || ''
      })

      const partNumber = row['part'] || row['part_num'] || row['partnumber'] || ''
      if (!partNumber) continue

      const parsed = ScrapedPartSchema.safeParse({
        partNumber,
        name: row['name'] || row['part_name'] || '',
        color: row['color'] || row['color_name'] || '',
        category: row['category'] || row['part_category'] || '',
        quantity: parseInt(row['quantity'] || row['qty'] || '1', 10) || 1,
        isSpare: parseInt(row['is spare'] || row['is_spare'] || '0', 10) || 0,
        imageUrl: row['part_img_url'] || row['image'] || '',
      })

      if (parsed.success) {
        parts.push(parsed.data)
      }
    }

    logger.info(`[moc-detail] Parsed ${parts.length} parts from CSV`)
    return parts
  }

  private parseCsvLine(line: string): string[] {
    const values: string[] = []
    let current = ''
    let inQuotes = false

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    values.push(current.trim())
    return values
  }
}
