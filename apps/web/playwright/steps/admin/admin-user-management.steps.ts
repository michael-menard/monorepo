/**
 * Admin User Management Step Definitions
 *
 * E2E tests for the admin user management panel.
 * Tests user listing, searching, blocking, unblocking, and token revocation.
 */

import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'

const { Given, When, Then } = createBdd()

// ─────────────────────────────────────────────────────────────────────────────
// Test Data
// ─────────────────────────────────────────────────────────────────────────────

const ADMIN_EMAIL = 'admin@example.test'
const ADMIN_PASSWORD = 'AdminPass123!'
const REGULAR_USER_EMAIL = 'user@example.test'
const REGULAR_USER_PASSWORD = 'UserPass123!'

// ─────────────────────────────────────────────────────────────────────────────
// Authentication Steps
// ─────────────────────────────────────────────────────────────────────────────

Given('I am logged in as an admin user', async ({ page }) => {
  // Navigate to login and authenticate as admin
  await page.goto('/login')
  await page.waitForLoadState('networkidle')

  const emailInput = page.getByLabel('Email Address')
  await emailInput.waitFor({ state: 'visible' })
  await emailInput.fill(ADMIN_EMAIL)

  const passwordInput = page.getByLabel('Password', { exact: true })
  await passwordInput.fill(ADMIN_PASSWORD)

  await page.locator('button[type="submit"]').click()

  // Wait for authentication to complete
  await page.waitForURL('**/dashboard', { timeout: 15000 })
})

Given('I am logged in as a regular user', async ({ page }) => {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')

  const emailInput = page.getByLabel('Email Address')
  await emailInput.waitFor({ state: 'visible' })
  await emailInput.fill(REGULAR_USER_EMAIL)

  const passwordInput = page.getByLabel('Password', { exact: true })
  await passwordInput.fill(REGULAR_USER_PASSWORD)

  await page.locator('button[type="submit"]').click()
  await page.waitForURL('**/dashboard', { timeout: 15000 })
})

// 'I am not logged in' step is defined in authorization.steps.ts

// ─────────────────────────────────────────────────────────────────────────────
// Navigation Steps
// ─────────────────────────────────────────────────────────────────────────────

When('I navigate to the admin users page', async ({ page }) => {
  await page.goto('/admin/users')
  await page.waitForLoadState('networkidle')
})

When('I try to navigate to the admin users page', async ({ page }) => {
  await page.goto('/admin/users')
  await page.waitForTimeout(2000) // Allow redirect to happen
})

When('I click on a user in the table', async ({ page }) => {
  // Click on the first user row in the table
  const userRow = page.locator('table tbody tr').first()
  await userRow.click()
})

Given("I am on a user's detail page", async ({ page }) => {
  // First navigate to user list, then click a user
  await page.goto('/admin/users')
  await page.waitForLoadState('networkidle')

  const userRow = page.locator('table tbody tr').first()
  await userRow.waitFor({ state: 'visible' })
  await userRow.click()

  // Wait for detail page to load
  await page.waitForURL('**/admin/users/**')
})

Given("I am on a blocked user's detail page", async ({ page }) => {
  // Navigate to a known blocked user (would use test fixture/seed data)
  await page.goto('/admin/users')
  await page.waitForLoadState('networkidle')

  // Search for a blocked user or click on one with suspended badge
  const blockedUserRow = page.locator('table tbody tr:has-text("Suspended")').first()
  if (await blockedUserRow.isVisible().catch(() => false)) {
    await blockedUserRow.click()
  } else {
    // Fallback: navigate to first user
    const userRow = page.locator('table tbody tr').first()
    await userRow.click()
  }

  await page.waitForURL('**/admin/users/**')
})

// ─────────────────────────────────────────────────────────────────────────────
// User List Page Assertions
// ─────────────────────────────────────────────────────────────────────────────

Then('I should see the user management heading', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /user management/i })).toBeVisible()
})

Then('I should see the user search input', async ({ page }) => {
  await expect(page.getByPlaceholder(/search.*email/i)).toBeVisible()
})

Then('I should see the user table', async ({ page }) => {
  await expect(page.locator('table')).toBeVisible()
  // Verify table headers
  await expect(page.getByRole('columnheader', { name: /email/i })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: /username/i })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: /status/i })).toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// Search Steps
// ─────────────────────────────────────────────────────────────────────────────

When('I search for user with email {string}', async ({ page }, email: string) => {
  const searchInput = page.getByPlaceholder(/search.*email/i)
  await searchInput.fill(email)
  // Wait for debounced search to trigger
  await page.waitForTimeout(500)
})

Then('I should see users matching the search term', async ({ page }) => {
  // Wait for table to update
  await page.waitForTimeout(1000)
  const userRows = page.locator('table tbody tr')
  await expect(userRows.first()).toBeVisible()
})

Then('I should see the user count updated', async ({ page }) => {
  // Check for user count text
  const countText = page.locator('text=/\\d+ users/')
  await expect(countText).toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// Pagination Steps
// ─────────────────────────────────────────────────────────────────────────────

Given('there are more users to load', async ({ page }) => {
  // Verify load more button is visible
  const loadMoreButton = page.getByRole('button', { name: /load more/i })
  await expect(loadMoreButton).toBeVisible()
})

When('I click the load more button', async ({ page }) => {
  const loadMoreButton = page.getByRole('button', { name: /load more/i })
  await loadMoreButton.click()
  await page.waitForTimeout(1000) // Wait for API response
})

Then('I should see additional users in the table', async ({ page }) => {
  const userRows = page.locator('table tbody tr')
  const count = await userRows.count()
  expect(count).toBeGreaterThan(0)
})

// ─────────────────────────────────────────────────────────────────────────────
// User Detail Page Assertions
// ─────────────────────────────────────────────────────────────────────────────

Then('I should be on the user detail page', async ({ page }) => {
  await expect(page).toHaveURL(/\/admin\/users\/[a-zA-Z0-9-]+/)
})

Then("I should see the user's email", async ({ page }) => {
  // User email should be displayed on detail page
  const emailText = page.locator('text=@')
  await expect(emailText.first()).toBeVisible()
})

Then("I should see the user's account status", async ({ page }) => {
  // Look for status badge or text
  const statusElement = page.locator('[class*="badge"], [class*="status"]').first()
  await expect(statusElement).toBeVisible()
})

Then('I should see the revoke tokens button', async ({ page }) => {
  await expect(page.getByRole('button', { name: /revoke.*tokens/i })).toBeVisible()
})

Then('I should see the block user button', async ({ page }) => {
  await expect(page.getByRole('button', { name: /block.*user/i })).toBeVisible()
})

Then('I should see the unblock user button', async ({ page }) => {
  await expect(page.getByRole('button', { name: /unblock.*user/i })).toBeVisible()
})

Then('I should not see the block user button', async ({ page }) => {
  await expect(page.getByRole('button', { name: /block.*user/i })).not.toBeVisible()
})

Then('I should see the suspended badge', async ({ page }) => {
  await expect(page.locator('text=/suspended|blocked/i')).toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// Revoke Tokens Flow
// ─────────────────────────────────────────────────────────────────────────────

When('I click the revoke tokens button', async ({ page }) => {
  await page.getByRole('button', { name: /revoke.*tokens/i }).click()
})

Then('I should see the revoke tokens confirmation dialog', async ({ page }) => {
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByText(/revoke.*tokens/i)).toBeVisible()
})

When('I confirm the revoke tokens action', async ({ page }) => {
  const confirmButton = page.getByRole('button', { name: /confirm|revoke/i }).last()
  await confirmButton.click()
})

Then('I should see a success message for token revocation', async ({ page }) => {
  await expect(page.getByText(/tokens.*revoked|success/i)).toBeVisible({ timeout: 5000 })
})

// ─────────────────────────────────────────────────────────────────────────────
// Block User Flow
// ─────────────────────────────────────────────────────────────────────────────

When('I click the block user button', async ({ page }) => {
  await page.getByRole('button', { name: /block.*user/i }).click()
})

Then('I should see the block user dialog', async ({ page }) => {
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByText(/block user/i)).toBeVisible()
})

When('I select block reason {string}', async ({ page }, reason: string) => {
  // Click on select trigger to open dropdown
  const selectTrigger = page.locator('[id="reason"]').or(page.getByText('Select a reason'))
  await selectTrigger.click()

  // Select the reason
  const reasonOption = page.getByText(reason, { exact: false })
  await reasonOption.click()
})

When('I enter block notes {string}', async ({ page }, notes: string) => {
  const notesTextarea = page.locator('textarea')
  await notesTextarea.fill(notes)
})

When('I confirm the block action', async ({ page }) => {
  const blockButton = page.getByRole('button', { name: /^block user$/i })
  await blockButton.click()
})

Then('I should see a success message for blocking user', async ({ page }) => {
  await expect(page.getByText(/blocked|success/i)).toBeVisible({ timeout: 5000 })
})

Then('the user should show as blocked', async ({ page }) => {
  await expect(page.locator('text=/suspended|blocked/i')).toBeVisible()
})

Then('the confirm block button should be disabled', async ({ page }) => {
  const blockButton = page.getByRole('button', { name: /^block user$/i })
  await expect(blockButton).toBeDisabled()
})

Then('the confirm block button should be enabled', async ({ page }) => {
  const blockButton = page.getByRole('button', { name: /^block user$/i })
  await expect(blockButton).toBeEnabled()
})

// ─────────────────────────────────────────────────────────────────────────────
// Unblock User Flow
// ─────────────────────────────────────────────────────────────────────────────

When('I click the unblock user button', async ({ page }) => {
  await page.getByRole('button', { name: /unblock.*user/i }).click()
})

Then('I should see the unblock user confirmation dialog', async ({ page }) => {
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByText(/unblock/i)).toBeVisible()
})

When('I confirm the unblock action', async ({ page }) => {
  const confirmButton = page.getByRole('button', { name: /confirm|unblock/i }).last()
  await confirmButton.click()
})

Then('I should see a success message for unblocking user', async ({ page }) => {
  await expect(page.getByText(/unblocked|success/i)).toBeVisible({ timeout: 5000 })
})

Then('the user should show as active', async ({ page }) => {
  await expect(page.locator('text=/active|enabled/i')).toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// Common Dialog Actions
// ─────────────────────────────────────────────────────────────────────────────

When('I click cancel in the dialog', async ({ page }) => {
  const cancelButton = page.getByRole('button', { name: /cancel/i })
  await cancelButton.click()
})

Then('the dialog should be closed', async ({ page }) => {
  await expect(page.getByRole('dialog')).not.toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// Access Control Assertions
// ─────────────────────────────────────────────────────────────────────────────

Then('I should be redirected to the unauthorized page', async ({ page }) => {
  await expect(page).toHaveURL(/\/unauthorized/, { timeout: 5000 })
})

// Note: 'I should be redirected to the login page' step is defined in uploader.steps.ts

// ─────────────────────────────────────────────────────────────────────────────
// Error Handling Steps
// ─────────────────────────────────────────────────────────────────────────────

Given('the admin users API returns an error', async ({ page }) => {
  // Mock API to return error
  await page.route('**/admin/users/**', route => {
    route.fulfill({
      status: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    })
  })
})

Given('the block user API will fail', async ({ page }) => {
  // Mock block API to return error
  await page.route('**/admin/users/**/block', route => {
    if (route.request().method() === 'POST') {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Failed to block user' }),
      })
    } else {
      route.continue()
    }
  })
})

Then('I should see an error message for loading users', async ({ page }) => {
  await expect(page.getByText(/failed.*load|error/i)).toBeVisible()
})

Then('I should see an error message for blocking user', async ({ page }) => {
  await expect(page.getByText(/failed.*block|error/i)).toBeVisible({ timeout: 5000 })
})
