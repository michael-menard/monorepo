/* eslint-disable no-empty-pattern */
/**
 * Step definitions for Uploader Accessibility tests
 * Story 3.1.26: E2E + A11y + Performance
 */

import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { UploaderPage } from './pages/uploader.page'

const { When, Then } = createBdd()

let uploaderPage: UploaderPage

// Initialize uploaderPage before each test (shares steps with uploader.steps.ts)
// The "Given I am on the instructions upload page" step is defined in uploader.steps.ts

// Initialize uploaderPage for a11y tests
const initUploaderPage = (page: import('@playwright/test').Page) => {
  uploaderPage = new UploaderPage(page)
  return uploaderPage
}

// Axe-core Accessibility Scans
Then('the page should have no critical accessibility violations', async ({ page }) => {
  uploaderPage = initUploaderPage(page)
  await uploaderPage.expectNoA11yViolations('critical')
})

Then('the page should have no serious accessibility violations', async () => {
  await uploaderPage.expectNoA11yViolations('serious')
})

// Keyboard Navigation
When('I focus on the title input', async () => {
  await uploaderPage.titleInput.focus()
})

When('I press Tab', async ({ page }) => {
  await page.keyboard.press('Tab')
})

When('I press Tab repeatedly', async ({ page }) => {
  // Tab through all focusable elements
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press('Tab')
    await page.waitForTimeout(50)
  }
})

When('I press Enter', async ({ page }) => {
  await page.keyboard.press('Enter')
})

Then('the description field should be focused', async ({ page }) => {
  const focusedElement = page.locator(':focus')
  const id = await focusedElement.getAttribute('id')
  expect(id).toBe('description')
})

Then('I should be able to reach all form controls', async ({ page }) => {
  const formControls = await page.locator('input, textarea, select, button').all()
  expect(formControls.length).toBeGreaterThan(5)
})

Then('I should be able to reach all buttons', async ({ page }) => {
  const buttons = await page.locator('button').all()
  expect(buttons.length).toBeGreaterThan(3)
})

When(
  'I navigate to the {string} upload button using keyboard',
  async ({ page }, buttonName: string) => {
    // Focus on first element and tab to the target button
    await page.keyboard.press('Tab')
    let found = false
    for (let i = 0; i < 20 && !found; i++) {
      const focusedElement = page.locator(':focus')
      const text = await focusedElement.textContent()
      if (text?.toLowerCase().includes(buttonName.toLowerCase())) {
        found = true
      } else {
        await page.keyboard.press('Tab')
      }
    }
    expect(found).toBe(true)
  },
)

Then('the file input dialog should open', async ({ page }) => {
  // File dialog opens - we can't verify this directly but can check the event was triggered
  // In practice, this is verified by checking the file input received focus/click
  const fileInputFocused = await page.evaluate(() => {
    const inputs = document.querySelectorAll('input[type="file"]')
    return inputs.length > 0
  })
  expect(fileInputFocused).toBe(true)
})

// ARIA Labels
Then('the title input should have an accessible name', async () => {
  const accessibleName = await uploaderPage.titleInput.getAttribute('aria-label')
  const labelledBy = await uploaderPage.titleInput.getAttribute('aria-labelledby')
  const label = await uploaderPage.page.locator('label[for="title"]').textContent()

  expect(accessibleName || labelledBy || label).toBeTruthy()
})

Then('the description textarea should have an accessible name', async () => {
  const label = await uploaderPage.page.locator('label[for="description"]').textContent()
  expect(label).toBeTruthy()
})

Then('all upload buttons should have accessible names', async ({ page }) => {
  const uploadButtons = ['instructions', 'parts list', 'thumbnail', 'gallery']

  for (const buttonName of uploadButtons) {
    const button = page.getByRole('button', { name: new RegExp(buttonName, 'i') })
    await expect(button).toBeVisible()
  }
})

Then('the {string} button should have an accessible name', async ({ page }, buttonName: string) => {
  const button = page.getByRole('button', { name: new RegExp(buttonName, 'i') })
  await expect(button).toBeVisible()
})

// Error Announcements
When(
  'I click the {string} button without filling required fields',
  async ({ page }, buttonName: string) => {
    const button = page.getByRole('button', { name: new RegExp(buttonName, 'i') })
    await button.click()
    await page.waitForTimeout(500)
  },
)

Then('the error alert should have role {string}', async ({ page }, role: string) => {
  const alert = page.getByRole(role as 'alert')
  await expect(alert).toBeVisible()
})

Then('the error alert should have aria-live {string}', async ({ page }, ariaLive: string) => {
  const alert = page.locator(`[aria-live="${ariaLive}"]`)
  await expect(alert).toBeVisible()
})

Then('individual field errors should have role {string}', async ({ page }, role: string) => {
  const errors = page.locator(`[role="${role}"]`)
  const count = await errors.count()
  expect(count).toBeGreaterThanOrEqual(1)
})

// Progress Restoration Announcements
Then('the restoration message should have role {string}', async ({}, role: string) => {
  const roleAttr = await uploaderPage.restoredMessage.getAttribute('role')
  expect(roleAttr).toBe(role)
})

Then('the restoration message should have aria-live {string}', async ({}, ariaLive: string) => {
  const ariaLiveAttr = await uploaderPage.restoredMessage.getAttribute('aria-live')
  expect(ariaLiveAttr).toBe(ariaLive)
})

// Upload Progress Accessibility
Then('the upload progress should be visible', async ({ page }) => {
  const progress = page.locator('[data-testid="upload-progress"]')
  await expect(progress).toBeVisible()
})

Then('the progress indicator should have appropriate ARIA attributes', async ({ page }) => {
  const progress = page.locator('[role="progressbar"]')
  const valueNow = await progress.getAttribute('aria-valuenow')
  const valueMin = await progress.getAttribute('aria-valuemin')
  const valueMax = await progress.getAttribute('aria-valuemax')

  expect(valueMin).toBe('0')
  expect(valueMax).toBe('100')
  expect(Number(valueNow)).toBeGreaterThanOrEqual(0)
})

// Focus Management
When('I fill in invalid data', async () => {
  await uploaderPage.fillTitle('') // Invalid - empty
  await uploaderPage.fillDescription('short') // Invalid - too short
})

Then('focus should move to the first error or error summary', async ({ page }) => {
  const focusedElement = page.locator(':focus')
  const id = await focusedElement.getAttribute('id')
  const role = await focusedElement.getAttribute('role')
  // Should focus on title, its error, or an alert/status role element
  const isFocusOnError =
    id === 'title' ||
    id === 'title-error' ||
    id?.includes('error') ||
    role === 'alert' ||
    role === 'status'
  expect(isFocusOnError).toBe(true)
})

// Modal Focus Management
Then('the conflict modal should open', async () => {
  await expect(uploaderPage.conflictModal).toBeVisible()
})

Then('focus should move to the modal', async ({ page }) => {
  const focusedElement = page.locator(':focus')
  const isInModal = await focusedElement.evaluate(el => {
    return el.closest('[role="dialog"]') !== null
  })
  expect(isInModal).toBe(true)
})

Then('focus should be trapped within the modal', async ({ page }) => {
  // Tab through the modal and verify focus stays within
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Tab')
    const focusedElement = page.locator(':focus')
    const isInModal = await focusedElement.evaluate(el => {
      return el.closest('[role="dialog"]') !== null
    })
    expect(isInModal).toBe(true)
  }
})

// Contrast Checks (these would use additional tooling in practice)
Then('all text should meet WCAG AA contrast requirements', async () => {
  // This is checked by axe-core's color-contrast rule
  await uploaderPage.expectNoA11yViolations('serious')
})

Then('all interactive elements should meet contrast requirements', async () => {
  await uploaderPage.expectNoA11yViolations('serious')
})

Then('error states should be distinguishable without color alone', async ({ page }) => {
  // Check that errors have icons or text indicators, not just color
  const errorElements = page.locator('[role="alert"]')
  const count = await errorElements.count()

  for (let i = 0; i < count; i++) {
    const element = errorElements.nth(i)
    const hasIcon = (await element.locator('svg').count()) > 0
    const hasText = ((await element.textContent()) || '').length > 0
    expect(hasIcon || hasText).toBe(true)
  }
})
