import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { logger } from '@repo/logger'
import { BasePage } from './base-page.js'
import { humanWait } from '../scraper/human-behavior.js'
import { ScrapedPartSchema, ScrapedMocDetailSchema, SourceSetSchema } from '../__types__/index.js'
import type { ScrapedMocDetail, ScrapedPart, SourceSet } from '../__types__/index.js'

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

  // Details tab content (default active tab)
  detailsContent: '#details, .tab-pane.active',

  // Date added metadata in sidebar
  dateAdded: 'time, .mb-10 small',

  // Tags — Rebrickable uses ?tag= query params, e.g. /mocs/?tag=city
  tagLinks: 'a[href*="/tags/"], a[href*="?tag="], a[href*="&tag="]',

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
      let authorProfileUrl = ''
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
        for (const sel of [
          'a[href*="/mocs/"][href$="/mocs/"]',
          SELECTORS.authorLink,
          SELECTORS.authorLinkAlt,
        ]) {
          const text = await this.extractText(sel)
          if (text && text !== 'Browse MOCs') {
            author = text.replace(/^(MOCs\s+by\s+|by\s+)/i, '').trim()
            logger.info(`[moc-detail] Author found with selector "${sel}": "${author}"`)
            break
          }
        }
      }

      // Author profile URL: extract href from the author link
      for (const sel of [SELECTORS.authorLink, SELECTORS.authorLinkAlt]) {
        try {
          const href = await this.page.$eval(sel, el => el.getAttribute('href') || '')
          if (href) {
            authorProfileUrl = href.startsWith('http') ? href : `https://rebrickable.com${href}`
            logger.info(`[moc-detail] Author profile URL: "${authorProfileUrl}"`)
            break
          }
        } catch {
          // try next selector
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
      const downloadUrl =
        files.length > 0 ? `https://rebrickable.com${files[0].downloadDataUrl}` : undefined

      // Determine file type from filename
      const fileType =
        files.length > 0
          ? files[0].fileName.match(/\.(pdf|io|studio|ldr|mpd|lxf)$/i)?.[1]?.toUpperCase() || 'PDF'
          : ''

      // Scrape details tab description text
      const { description, descriptionHtml } = await this.scrapeDetailsText()

      // Scrape date added
      const dateAdded = await this.scrapeDateAdded()

      // Scrape tags
      const tags = await this.scrapeTags()

      // Scrape "Alternate Build of" source sets
      const sourceSets = await this.scrapeSourceSets()

      const detail = ScrapedMocDetailSchema.parse({
        mocNumber,
        title,
        author,
        partsCount,
        downloadUrl,
        fileType,
        description,
        descriptionHtml,
        dateAdded,
        authorProfileUrl,
        tags,
        sourceSets,
      })

      logger.info(
        `[moc-detail] MOC-${mocNumber}: "${detail.title}" by ${detail.author} (${detail.partsCount} parts, ${files.length} files)`,
      )

      return detail
    })
  }

  /**
   * Scrape "Alternate Build of the following" source sets from the Details tab.
   * These are LEGO sets that the MOC is built from, shown as thumbnail cards
   * with links to rebrickable.com/sets/{set_number}/...
   */
  async scrapeSourceSets(): Promise<SourceSet[]> {
    try {
      const sets = await this.page.evaluate(() => {
        const results: Array<{ setNumber: string; name: string; url: string }> = []

        // Find the "Alternate Build of the following" text
        const pane =
          document.querySelector('#details') ||
          document.querySelector('.tab-pane.active') ||
          document.querySelector('.tab-pane:first-child')

        if (!pane) return results

        const bodyText = pane.textContent || ''
        if (
          !bodyText.includes('Alternate Build') &&
          !bodyText.includes('alternate build') &&
          !bodyText.includes('Can Build From')
        ) {
          return results
        }

        // Find all links to sets pages within the details pane
        const setLinks = pane.querySelectorAll('a[href*="/sets/"]')

        for (const link of setLinks) {
          const href = (link as HTMLAnchorElement).href || link.getAttribute('href') || ''
          const name = (link.textContent || '').trim()

          // Extract set number from URL: /sets/76342-1/... or /sets/10305-1/...
          const match = href.match(/\/sets\/(\d+-\d+)/)
          if (!match) continue

          const setNumber = match[1]
          if (results.some(r => r.setNumber === setNumber)) continue

          results.push({
            setNumber,
            name,
            url: href.startsWith('http') ? href : `https://rebrickable.com${href}`,
          })
        }

        return results
      })

      if (sets.length > 0) {
        logger.info(
          `[moc-detail] Found ${sets.length} source set(s): ${sets.map(s => s.setNumber).join(', ')}`,
        )
      }

      return sets.map(s => SourceSetSchema.parse(s))
    } catch (e) {
      logger.warn('[moc-detail] Failed to scrape source sets', { error: e })
      return []
    }
  }

  /**
   * Scrape the Details tab description text.
   * The Details tab is active by default, so the content is already in the DOM.
   */
  async scrapeDetailsText(): Promise<{ description: string; descriptionHtml: string }> {
    try {
      const result = await this.page.evaluate(() => {
        // The Details tab content is in the first .tab-pane or #details
        const pane =
          document.querySelector('#details') ||
          document.querySelector('.tab-pane.active') ||
          document.querySelector('.tab-pane:first-child')

        if (!pane) return { description: '', descriptionHtml: '' }

        // Clone to strip ads and non-content elements
        const clone = pane.cloneNode(true) as HTMLElement
        clone
          .querySelectorAll('script, style, iframe, .ad, .adsbygoogle, ins, [class*="sponsor"]')
          .forEach(el => el.remove())

        return {
          description: clone.innerText?.trim() || clone.textContent?.trim() || '',
          descriptionHtml: clone.innerHTML?.trim() || '',
        }
      })

      if (result.description) {
        logger.info(`[moc-detail] Description extracted: ${result.description.length} chars`)
      }
      return result
    } catch {
      logger.info('[moc-detail] Could not extract details tab text')
      return { description: '', descriptionHtml: '' }
    }
  }

  /**
   * Scrape the date the MOC was added from sidebar metadata.
   * Looks for <time> elements or date patterns in small text.
   */
  async scrapeDateAdded(): Promise<string | undefined> {
    try {
      // Try <time> element first (has datetime attribute)
      const timeDate = await this.page
        .$eval('time[datetime]', el => el.getAttribute('datetime') || '')
        .catch(() => '')

      if (timeDate) {
        logger.info(`[moc-detail] Date added from <time>: "${timeDate}"`)
        return timeDate
      }

      // Look for fa-plus icon with title="Added" — date is in the parent <small>
      // HTML: <small><i class="fa fa-fw fa-plus" title="Added"></i> April 13, 2026, 6:28 p.m. by <a>...</a></small>
      const iconDate = await this.page.evaluate(() => {
        const icon = document.querySelector('i.fa-plus[title="Added"], i[title="Added"]')
        if (!icon) return ''
        const parent = icon.parentElement
        if (!parent) return ''
        const text = parent.textContent?.trim() || ''
        // Extract "Month DD, YYYY" — strip everything after the year
        const match = text.match(/(\w+\s+\d{1,2},?\s+\d{4})/)
        return match ? match[1] : ''
      })

      if (iconDate) {
        const parsed = new Date(iconDate)
        if (!isNaN(parsed.getTime())) {
          const iso = parsed.toISOString()
          logger.info(`[moc-detail] Date added: "${iconDate}" → ${iso}`)
          return iso
        }
      }

      return undefined
    } catch {
      return undefined
    }
  }

  /**
   * Scrape tags from the MOC detail page.
   * Rebrickable renders tags as links with href containing ?tag= or /tags/.
   * Falls back to inspecting all links in the details tab for tag-shaped hrefs.
   */
  async scrapeTags(): Promise<string[]> {
    try {
      // Primary: href-based selectors (covers /tags/ and ?tag= patterns)
      let tags = await this.page.$$eval(SELECTORS.tagLinks, links =>
        links
          .map(a =>
            (a.textContent || '')
              .replace(/[\n\r\t]+/g, ' ')
              .replace(/\s{2,}/g, ' ')
              .trim()
              .replace(/\s+\d[\d,]*$/, ''),
          )
          .filter(t => t.length > 0 && t.length < 100),
      )

      // Fallback: scan all links in the details tab for ?tag= or /tags/ in href
      if (tags.length === 0) {
        tags = await this.page.$$eval('#details a, .tab-pane.active a, .tab-content a', links =>
          links
            .filter(a => {
              const href = a.getAttribute('href') || ''
              return href.includes('/tags/') || href.includes('tag=')
            })
            .map(a =>
              (a.textContent || '')
                .replace(/[\n\r\t]+/g, ' ')
                .replace(/\s{2,}/g, ' ')
                .trim()
                .replace(/\s+\d[\d,]*$/, ''),
            )
            .filter(t => t.length > 0 && t.length < 100),
        )
        if (tags.length > 0) {
          logger.info(`[moc-detail] Tags found via fallback selector: ${tags.join(', ')}`)
        } else {
          // Debug: log all unique href patterns in the details tab to diagnose selector misses
          const sampleHrefs = await this.page
            .$$eval('#details a, .tab-pane.active a, .tab-content a', links =>
              [
                ...new Set(links.map(a => a.getAttribute('href') || '').filter(h => h.length > 0)),
              ].slice(0, 20),
            )
            .catch(() => [] as string[])
          logger.info(
            `[moc-detail] No tags found. Sample hrefs in details: ${sampleHrefs.join(' | ')}`,
          )
        }
      }

      const unique = [...new Set(tags)]
      if (unique.length > 0) {
        logger.info(`[moc-detail] Tags found: ${unique.join(', ')}`)
      } else {
        logger.info('[moc-detail] No tags found')
      }
      return unique
    } catch {
      logger.info('[moc-detail] No tags found')
      return []
    }
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
        links
          .map(link => {
            const row = link.closest('.row')
            const smallEls = row ? Array.from(row.querySelectorAll('small')) : []

            return {
              fileName: link.textContent?.trim() || '',
              downloadDataUrl: link.getAttribute('data-url') || '',
              fileSize: smallEls.length > 1 ? smallEls[1]?.textContent?.trim() || '' : '',
              uploadDate: smallEls.length > 0 ? smallEls[0]?.textContent?.trim() || '' : '',
            }
          })
          .filter(f => f.downloadDataUrl),
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
   *
   * Self-heals on modal timeout: reloads the page between attempts to clear stale
   * AJAX/session state (the common cause of mid-batch cascade failures).
   */
  async triggerDownload(fileLink: ScrapedFile, mocNumber?: string): Promise<string | null> {
    const MAX_ATTEMPTS = 3

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      // On retries, reload the page to reset CSRF tokens, rate-limit windows, and
      // stale Bootstrap modal state — the most common cause of cascade failures.
      if (attempt > 1) {
        const backoffMs = attempt === 2 ? 5000 : 30000
        logger.warn(
          `[moc-detail] Retrying download for ${fileLink.fileName} (attempt ${attempt}/${MAX_ATTEMPTS}), ` +
            `waiting ${backoffMs}ms then reloading page...`,
        )
        await this.page.waitForTimeout(backoffMs)
        await this.page.goto(this.page.url(), { waitUntil: 'networkidle' })
        await this.page.waitForTimeout(2000)

        // If the reload redirected us to the login page, the session expired.
        // Return null immediately so the pipeline's consecutive-failure handler
        // can re-authenticate before wasting another 10s modal timeout.
        if (this.page.url().includes('/login')) {
          logger.warn('[moc-detail] Session expired — reload redirected to login page')
          return null
        }
      }

      const result = await this.attemptDownload(fileLink, mocNumber, attempt)
      if (result !== null) return result
    }

    logger.warn(
      `[moc-detail] All ${MAX_ATTEMPTS} download attempts failed for ${fileLink.fileName}`,
    )
    return null
  }

  private async attemptDownload(
    fileLink: ScrapedFile,
    mocNumber?: string,
    attempt = 1,
  ): Promise<string | null> {
    const tag = `[moc-detail][MOC-${mocNumber ?? '?'}][attempt ${attempt}]`
    const linkSelector = `a.js-load-page-modal[data-url="${fileLink.downloadDataUrl}"]`

    logger.info(`${tag} Starting download: "${fileLink.fileName}"`, {
      dataUrl: fileLink.downloadDataUrl,
      pageUrl: this.page.url(),
    })

    // Step 0: Dismiss any stale modal before clicking
    await this.dismissModal()

    // Step 1: Click the file link to open the download modal
    try {
      await this.click(linkSelector)
      logger.info(`${tag} Clicked file link — waiting for modal`)
    } catch (err) {
      logger.warn(`${tag} FAIL step 1 — could not click file link selector`, {
        selector: linkSelector,
        pageUrl: this.page.url(),
        error: err instanceof Error ? err.message : String(err),
      })
      return null
    }

    // Step 2: Wait for the modal overlay
    try {
      await this.page.waitForSelector('.modal.in, .modal.show, .modal[style*="display: block"]', {
        timeout: 10000,
      })
      logger.info(`${tag} Modal visible`)
    } catch (err) {
      logger.warn(`${tag} FAIL step 2 — modal did not appear within 10s`, {
        pageUrl: this.page.url(),
        error: err instanceof Error ? err.message : String(err),
      })
      await this.dismissModal()
      return null
    }

    // Step 3: Wait for AJAX-loaded download button inside modal
    const downloadBtnSelector = 'button.js-post-button[data-url*="/download/"]'
    try {
      await this.page.waitForSelector(downloadBtnSelector, { timeout: 10000 })
      logger.info(`${tag} Download button found`)
    } catch (err) {
      await this.screenshot(`modal-no-btn-${mocNumber}-attempt${attempt}`, 'discovery')
      const modalText = await this.page.evaluate(() => {
        const modal = document.querySelector(
          '.modal.in, .modal.show, .modal[style*="display: block"]',
        )
        if (!modal) return '(no modal in DOM)'
        // Text content is more readable than raw HTML for diagnosing "not purchased" / rate-limit messages
        return (
          (modal as HTMLElement).innerText?.trim().substring(0, 600) ||
          modal.innerHTML.substring(0, 600)
        )
      })
      logger.warn(`${tag} FAIL step 3 — download button not found in modal after 10s`, {
        pageUrl: this.page.url(),
        modalContent: modalText,
        error: err instanceof Error ? err.message : String(err),
      })
      await this.dismissModal()
      return null
    }

    // Step 4: Extract the download URL from the button
    const downloadUrl = await this.page
      .$eval(downloadBtnSelector, el => el.getAttribute('data-url') || '')
      .catch(() => '')

    if (!downloadUrl) {
      logger.warn(`${tag} FAIL step 4 — download button has no data-url attribute`)
      await this.dismissModal()
      return null
    }

    const fullUrl = downloadUrl.startsWith('http')
      ? downloadUrl
      : `https://rebrickable.com${downloadUrl}`

    // Log the expiry so we can diagnose expired tokens
    const expireMatch = fullUrl.match(/[?&]expire=(\d+)/)
    const expireTs = expireMatch ? parseInt(expireMatch[1], 10) : null
    const expireInfo = expireTs
      ? `expires ${new Date(expireTs * 1000).toISOString()} (${expireTs - Math.floor(Date.now() / 1000)}s from now)`
      : 'no expiry param'

    logger.info(`${tag} Download URL acquired`, { fullUrl, expireInfo })

    // Step 5: Click button and wait for browser download event
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let download: any
    try {
      ;[download] = await Promise.all([
        this.page.waitForEvent('download', { timeout: 30000 }),
        this.page.click(downloadBtnSelector),
      ])
      logger.info(`${tag} Download event fired: "${download.suggestedFilename()}"`)
    } catch (err) {
      logger.warn(`${tag} FAIL step 5 — no download event within 30s`, {
        pageUrl: this.page.url(),
        downloadUrl: fullUrl,
        error: err instanceof Error ? err.message : String(err),
      })
      await this.dismissModal()
      return null
    }

    // Step 6: Save file to disk
    const suggestedFilename = download.suggestedFilename()
    const mocDir = mocNumber ? resolve(DOWNLOAD_DIR, `MOC-${mocNumber}`) : DOWNLOAD_DIR
    if (!existsSync(mocDir)) {
      mkdirSync(mocDir, { recursive: true })
    }
    const filePath = resolve(mocDir, suggestedFilename)

    try {
      await download.saveAs(filePath)
    } catch (err) {
      const failureReason = await download.failure().catch(() => 'unknown')
      logger.warn(`${tag} FAIL step 6 — could not save file to disk`, {
        suggestedFilename,
        filePath,
        playwrightFailure: failureReason,
        error: err instanceof Error ? err.message : String(err),
      })
      await this.dismissModal()
      return null
    }

    // Sanity-check: non-zero file size
    const { statSync } = await import('fs')
    const fileSize = statSync(filePath).size
    if (fileSize === 0) {
      logger.warn(`${tag} FAIL step 6 — file saved but is 0 bytes`, { filePath })
      await this.dismissModal()
      return null
    }

    logger.info(`${tag} SUCCESS — saved "${suggestedFilename}" (${fileSize} bytes) → ${filePath}`)
    await this.dismissModal()
    return filePath
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

        // Fallback 1: if no thumbnails found, try hero images from FlexSlider
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

        // Fallback 2: single-image MOCs have no carousel at all — just a standalone
        // <img> with src containing /media/thumbs/mocs/ at 1000x800 size
        if (urls.size === 0) {
          document.querySelectorAll('img[src*="/media/thumbs/mocs/"]').forEach(img => {
            const src = (img as HTMLImageElement).src
            if (src && !src.includes('spinner') && src.includes('/1000x800')) {
              urls.add(src)
            }
          })
        }

        return Array.from(urls)
      })

      const uniqueUrls = [...new Set(imageUrls)]
      logger.info(`[moc-detail] Found ${uniqueUrls.length} images from thumbnail strip`)

      // Download each image using Node fetch with browser cookies.
      // Playwright's page.context().request can be prematurely disposed
      // by playwright-extra, so we use native fetch instead.
      const cookies = await this.page.context().cookies()
      const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ')
      const userAgent = await this.page.evaluate(() => navigator.userAgent)
      const referer = this.page.url()

      for (let i = 0; i < uniqueUrls.length; i++) {
        const url = uniqueUrls[i]
        const maxAttempts = 3
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            logger.info(
              `[moc-detail] Downloading image ${i + 1}/${uniqueUrls.length}${attempt > 1 ? ` (attempt ${attempt})` : ''}: ${url.substring(0, 100)}...`,
            )
            const response = await fetch(url, {
              headers: {
                'User-Agent': userAgent,
                Cookie: cookieHeader,
                Accept: 'image/*,*/*',
                Referer: referer,
              },
            })
            if (!response.ok) {
              logger.warn(`[moc-detail] Image fetch failed (${response.status}): ${url}`)
              break // don't retry HTTP errors (404, 403, etc.)
            }

            const buffer = Buffer.from(await response.arrayBuffer())
            const contentType = response.headers.get('content-type') || ''
            const ext = this.getImageExtension(url, contentType)
            const fileName = `image-${String(i + 1).padStart(2, '0')}.${ext}`
            const filePath = resolve(imgDir, fileName)

            writeFileSync(filePath, buffer)
            images.push({ url, filePath })
            logger.info(`[moc-detail] Saved image: ${fileName} (${buffer.length} bytes)`)
            break // success
          } catch (error) {
            if (attempt === maxAttempts) {
              logger.warn(
                `[moc-detail] Failed to download image after ${maxAttempts} attempts: ${url}`,
                {
                  error: error instanceof Error ? error.message : String(error),
                },
              )
            } else {
              // Brief pause before retry
              await new Promise(r => setTimeout(r, 1000 * attempt))
            }
          }
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
          await this.page
            .waitForSelector('.spinner', { state: 'hidden', timeout: 5000 })
            .catch(() => {})

          // Wait for actual inventory content — the Export Parts button or parts table
          // The .js-export-parts-list container holds the Export dropdown
          await this.page.waitForSelector('.js-export-parts-list, #parts_standard, table.table', {
            timeout: 30000,
          })

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
      const exportContainer = await this.page.waitForSelector('.js-export-parts-list', {
        timeout: 10000,
      })
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
      await this.page
        .waitForSelector('.js-export-parts-list .dropdown-menu, .dropdown-menu.show', {
          state: 'visible',
          timeout: 5000,
        })
        .catch(() => {})
      await this.page.waitForTimeout(500)

      await this.screenshot('export-dropdown-open', 'discovery')

      // Extract ALL links from the dropdown menu
      const allLinks = await this.page.$$eval(
        '.js-export-parts-list .dropdown-menu a[href]',
        links =>
          links.map(a => ({
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
          content = await this.page.evaluate(async url => {
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
      const blLink = await this.page.$(
        '.js-export-parts-list .dropdown-menu a:has-text("BrickLink")',
      )
      if (!blLink) {
        logger.warn('[moc-detail] Could not find BrickLink XML link in dropdown')
        return ''
      }

      // Set up download listener before clicking
      const downloadPromise = this.page
        .waitForEvent('download', { timeout: 5000 })
        .catch(() => null)

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
        const modals = document.querySelectorAll(
          '.modal.in, .modal.show, .modal[style*="display: block"]',
        )
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
      const notifLink = await this.page.$(
        '.alert a[href*="bricklink"], .notification a, a[href*="xml"]',
      )
      if (notifLink) {
        const href = await notifLink.evaluate(
          el => (el as HTMLAnchorElement).getAttribute('href') || '',
        )
        if (href && href !== '#') {
          const url = href.startsWith('http') ? href : `https://rebrickable.com${href}`
          logger.info(`[moc-detail] Following BrickLink notification link: ${url}`)
          const content = await this.page.evaluate(async fetchUrl => {
            const res = await fetch(fetchUrl, { credentials: 'same-origin' })
            return res.text()
          }, url)
          return content
        }
      }

      // Dump page HTML near the notification for debugging
      const notifHtml = await this.page.evaluate(() => {
        // Look for notification/alert elements
        const alerts = document.querySelectorAll(
          '.alert, [class*="notif"], [class*="toast"], [class*="message"]',
        )
        return Array.from(alerts)
          .map(el => el.outerHTML)
          .join('\n---\n')
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

  // ── Free MOC Instructions ──────────────────────────────────────────────

  /**
   * Check whether this MOC detail page offers free downloadable instructions.
   * Free MOCs display "Download the free Building Instructions:" text in the sidebar.
   */
  async hasFreeInstructions(): Promise<boolean> {
    try {
      const has = await this.page.evaluate(() =>
        document.body.innerText.includes('Download the free Building Instructions'),
      )
      logger.info(`[moc-detail] Free instructions: ${has ? 'yes' : 'no'}`)
      return has
    } catch {
      return false
    }
  }

  /**
   * Scrape the list of downloadable files from a free MOC detail page.
   * Free MOCs use direct <a href="/users/.../download/..."> links rather than
   * the modal-based js-load-page-modal flow used by purchased MOCs.
   */
  async scrapeFreeFileList(): Promise<ScrapedFile[]> {
    try {
      const rawFiles = await this.page.evaluate(() => {
        const results: Array<{
          fileName: string
          downloadDataUrl: string
          fileSize: string
          uploadDate: string
        }> = []

        // Find the container holding free download links — it's a .pb-30 div
        // with max-height, appearing after "Download the free Building Instructions:" text
        const links = document.querySelectorAll('a[href*="/download/"]')

        for (const link of links) {
          const href = link.getAttribute('href') || ''
          // Skip links that aren't in the instructions section (e.g. changelog links)
          if (!href.includes('/mocs/purchases/download/') && !href.includes('/mocs/download/')) {
            continue
          }

          const fileName =
            link.querySelector('.trunc')?.textContent?.trim() || link.textContent?.trim() || ''
          if (!fileName) continue

          // Extract file size and upload date from sibling <small> elements
          const row = link.closest('.row')
          const smallEls = row ? Array.from(row.querySelectorAll('small')) : []

          results.push({
            fileName,
            downloadDataUrl: href,
            fileSize: smallEls.length > 1 ? smallEls[1]?.textContent?.trim() || '' : '',
            uploadDate: smallEls.length > 0 ? smallEls[0]?.textContent?.trim() || '' : '',
          })
        }

        // Deduplicate by URL
        const seen = new Map<string, (typeof results)[number]>()
        for (const r of results) {
          if (
            !seen.has(r.downloadDataUrl) ||
            (!seen.get(r.downloadDataUrl)!.fileName && r.fileName)
          ) {
            seen.set(r.downloadDataUrl, r)
          }
        }

        return Array.from(seen.values())
      })

      logger.info(`[moc-detail] Found ${rawFiles.length} free download file(s)`)
      return rawFiles
    } catch {
      logger.info('[moc-detail] No free download links found')
      return []
    }
  }

  /**
   * Download a free instruction file by clicking its direct link.
   * Unlike purchased MOCs (which use a modal flow), free MOCs have plain <a href> links
   * that trigger a direct file download.
   *
   * Falls back to the modal-based triggerDownload() if the direct click doesn't
   * produce a download event (defensive against page variations).
   */
  async downloadFreeFile(file: ScrapedFile, mocNumber?: string): Promise<string | null> {
    const tag = `[moc-detail][MOC-${mocNumber ?? '?'}]`
    const fullUrl = file.downloadDataUrl.startsWith('http')
      ? file.downloadDataUrl
      : `https://rebrickable.com${file.downloadDataUrl}`

    logger.info(`${tag} Downloading free file: "${file.fileName}"`, { url: fullUrl })

    // Create download directory
    const mocDir = mocNumber ? resolve(DOWNLOAD_DIR, `MOC-${mocNumber}`) : DOWNLOAD_DIR
    if (!existsSync(mocDir)) {
      mkdirSync(mocDir, { recursive: true })
    }

    // Attempt 1: Click the direct download link
    try {
      const linkSelector = `a[href="${file.downloadDataUrl}"]`
      const linkEl = await this.page.$(linkSelector)

      if (linkEl) {
        const [download] = await Promise.all([
          this.page.waitForEvent('download', { timeout: 30000 }),
          linkEl.click(),
        ])

        const suggestedFilename = download.suggestedFilename()
        const filePath = resolve(mocDir, suggestedFilename)
        await download.saveAs(filePath)

        // Verify non-zero file size
        const { statSync } = await import('fs')
        const fileSize = statSync(filePath).size
        if (fileSize === 0) {
          logger.warn(`${tag} Free file saved but is 0 bytes: ${filePath}`)
          return null
        }

        logger.info(
          `${tag} FREE download SUCCESS — "${suggestedFilename}" (${fileSize} bytes) → ${filePath}`,
        )

        // Navigate back to the MOC page if the download triggered a navigation
        if (!this.page.url().includes(`MOC-${mocNumber}`)) {
          await this.page.goBack({ waitUntil: 'networkidle' }).catch(() => {})
        }

        return filePath
      }
    } catch (err) {
      logger.warn(`${tag} Direct download failed, trying modal fallback`, {
        error: err instanceof Error ? err.message : String(err),
      })
    }

    // Attempt 2: Fall back to the modal-based download flow
    logger.info(`${tag} Falling back to modal download for "${file.fileName}"`)
    return this.triggerDownload(file, mocNumber)
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
