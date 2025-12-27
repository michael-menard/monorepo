/**
 * Page Object for Instructions Uploader page
 * Story 3.1.26: E2E + A11y + Performance tests
 */

import { expect, type Page, type Locator } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

export class UploaderPage {
  readonly page: Page

  // Form elements
  readonly titleInput: Locator
  readonly descriptionTextarea: Locator
  readonly authorInput: Locator
  readonly mocIdInput: Locator
  readonly partsCountInput: Locator
  readonly themeInput: Locator

  // Upload buttons
  readonly instructionsButton: Locator
  readonly partsListButton: Locator
  readonly thumbnailButton: Locator
  readonly galleryButton: Locator

  // File inputs (hidden)
  readonly instructionsFileInput: Locator
  readonly partsListFileInput: Locator
  readonly thumbnailFileInput: Locator
  readonly galleryFileInput: Locator

  // Action buttons
  readonly cancelButton: Locator
  readonly resetButton: Locator
  readonly finalizeButton: Locator

  // Error elements
  readonly titleError: Locator
  readonly descriptionError: Locator
  readonly errorAlert: Locator

  // State elements
  readonly restoredMessage: Locator
  readonly rateLimitBanner: Locator
  readonly sessionExpiredBanner: Locator
  readonly conflictModal: Locator
  readonly uploadList: Locator

  // Accordion
  readonly detailsAccordion: Locator
  readonly detailsTrigger: Locator

  constructor(page: Page) {
    this.page = page

    // Form elements
    this.titleInput = page.getByRole('textbox', { name: /title/i })
    this.descriptionTextarea = page.locator('#description')
    this.authorInput = page.getByRole('textbox', { name: /author/i })
    this.mocIdInput = page.getByRole('textbox', { name: /moc id/i })
    this.partsCountInput = page.getByRole('spinbutton', { name: /parts count/i })
    this.themeInput = page.getByRole('textbox', { name: /theme/i })

    // Upload buttons
    this.instructionsButton = page.getByRole('button', { name: /instructions/i })
    this.partsListButton = page.getByRole('button', { name: /parts list/i })
    this.thumbnailButton = page.getByRole('button', { name: /thumbnail/i })
    this.galleryButton = page.getByRole('button', { name: /gallery/i })

    // File inputs (hidden, accessed programmatically)
    this.instructionsFileInput = page.locator('input[type="file"][accept*="pdf"]')
    this.partsListFileInput = page.locator('input[type="file"][accept*="csv"]')
    this.thumbnailFileInput = page.locator('input[type="file"][accept*="image"]').first()
    this.galleryFileInput = page.locator('input[type="file"][accept*="image"][multiple]')

    // Action buttons
    this.cancelButton = page.getByRole('button', { name: /cancel/i })
    this.resetButton = page.getByRole('button', { name: /reset/i })
    this.finalizeButton = page.getByRole('button', { name: /finalize/i })

    // Error elements
    this.titleError = page.locator('#title-error')
    this.descriptionError = page.locator('#description-error')
    this.errorAlert = page.getByRole('alert')

    // State elements
    this.restoredMessage = page.getByRole('status').filter({ hasText: /restored/i })
    this.rateLimitBanner = page.locator('[data-testid="rate-limit-banner"]')
    this.sessionExpiredBanner = page.locator('[data-testid="session-expired-banner"]')
    this.conflictModal = page.getByRole('dialog', { name: /conflict/i })
    this.uploadList = page.locator('[data-testid="upload-list"]')

    // Accordion
    this.detailsAccordion = page.getByRole('region', { name: /details/i })
    this.detailsTrigger = page.getByRole('button', { name: /moc details|set details/i })
  }

  async goto() {
    await this.page.goto('/instructions/new')
    await this.page.waitForLoadState('networkidle')
  }

  async fillTitle(title: string) {
    await this.titleInput.fill(title)
  }

  async fillDescription(description: string) {
    await this.descriptionTextarea.fill(description)
  }

  async expandDetails() {
    const isExpanded = await this.detailsTrigger.getAttribute('aria-expanded')
    if (isExpanded !== 'true') {
      await this.detailsTrigger.click()
    }
  }

  async fillAuthor(author: string) {
    await this.expandDetails()
    await this.authorInput.fill(author)
  }

  async fillMocId(mocId: string) {
    await this.mocIdInput.fill(mocId)
  }

  async fillPartsCount(count: string) {
    await this.partsCountInput.fill(count)
  }

  async fillTheme(theme: string) {
    await this.themeInput.fill(theme)
  }

  async fillCompleteForm(data: {
    title: string
    description: string
    author: string
    mocId: string
    partsCount: string
    theme: string
  }) {
    await this.fillTitle(data.title)
    await this.fillDescription(data.description)
    await this.expandDetails()
    await this.fillAuthor(data.author)
    await this.fillMocId(data.mocId)
    await this.fillPartsCount(data.partsCount)
    await this.fillTheme(data.theme)
  }

  async uploadPdfInstruction(filePath: string) {
    await this.instructionsFileInput.setInputFiles(filePath)
  }

  async uploadPartsList(filePath: string) {
    await this.partsListFileInput.setInputFiles(filePath)
  }

  async uploadThumbnail(filePath: string) {
    await this.thumbnailFileInput.setInputFiles(filePath)
  }

  async uploadGalleryImages(filePaths: string[]) {
    await this.galleryFileInput.setInputFiles(filePaths)
  }

  async clickFinalize() {
    await this.finalizeButton.click()
  }

  async clickCancel() {
    await this.cancelButton.click()
  }

  async clickReset() {
    await this.resetButton.click()
  }

  async getUploadFileCount(): Promise<number> {
    const items = this.page.locator('[data-testid="upload-item"]')
    return items.count()
  }

  async waitForUploadComplete() {
    // Wait for all uploads to show success status
    await this.page.waitForFunction(() => {
      const items = document.querySelectorAll('[data-testid="upload-item"]')
      return (
        items.length > 0 &&
        Array.from(items).every(item => item.getAttribute('data-status') === 'success')
      )
    })
  }

  /**
   * Run axe-core accessibility scan
   */
  async runAccessibilityScan() {
    const results = await new AxeBuilder({ page: this.page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    return results
  }

  /**
   * Check for critical accessibility violations
   */
  async expectNoA11yViolations(
    severity: 'critical' | 'serious' | 'moderate' | 'minor' = 'serious',
  ) {
    const results = await this.runAccessibilityScan()

    const violations = results.violations.filter(v => {
      const impactOrder = ['critical', 'serious', 'moderate', 'minor']
      const severityIndex = impactOrder.indexOf(severity)
      const violationIndex = impactOrder.indexOf(v.impact ?? 'minor')
      return violationIndex <= severityIndex
    })

    if (violations.length > 0) {
      const violationSummary = violations
        .map(v => `${v.impact}: ${v.id} - ${v.description} (${v.nodes.length} instances)`)
        .join('\n')

      throw new Error(`Accessibility violations found:\n${violationSummary}`)
    }
  }

  /**
   * Measure Time to Interactive
   */
  async measureTTI(): Promise<number> {
    const startTime = Date.now()

    // Wait for the page to be interactive (title input is visible and interactable)
    await this.titleInput.waitFor({ state: 'visible' })
    await expect(this.titleInput).toBeEnabled()

    return Date.now() - startTime
  }

  /**
   * Check if uploader module is loaded
   */
  async isUploaderModuleLoaded(): Promise<boolean> {
    return this.page.evaluate(() => {
      // Check if the uploader component is in the DOM
      return document.querySelector('[data-testid="uploader-page"]') !== null
    })
  }
}
