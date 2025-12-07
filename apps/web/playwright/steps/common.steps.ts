/**
 * Common shared step definitions used across multiple feature files
 */

import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'

const { Then } = createBdd()

// Common UI Element visibility steps
Then('I should see the page title {string}', async ({ page }, title: string) => {
  const heading = page.getByRole('heading', { name: title })
  await expect(heading).toBeVisible()
})

Then('I should see a {string} button', async ({ page }, buttonText: string) => {
  // Use exact: true to avoid matching buttons that contain the text
  const button = page.getByRole('button', { name: buttonText, exact: true })
  await expect(button).toBeVisible()
})

Then('I should see a {string} link', async ({ page }, linkText: string) => {
  const link = page.getByRole('link', { name: new RegExp(linkText, 'i') })
  await expect(link).toBeVisible()
})

// Common navigation steps
Then('I should be redirected to the registration page', async ({ page }) => {
  await page.waitForURL(/\/register/, { timeout: 5000 })
  expect(page.url()).toContain('/register')
})

Then('I should be on the registration page', async ({ page }) => {
  await page.waitForURL(/\/register/)
  expect(page.url()).toContain('/register')
})
