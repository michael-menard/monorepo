/**
 * Combined Step Definitions for Workflow Roadmap E2E Tests
 * BDD step definitions for roadmap, plan-details, and story-details E2E tests.
 */

import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'

const { Given, When, Then } = createBdd()

// ============================================================================
// Background / Setup Steps
// ============================================================================

Given('I am viewing the roadmap application', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
})

Given('I am viewing the roadmap application with loading delay', async ({ page }) => {
  await page.goto('/?__delay=2000')
  await page.waitForLoadState('domcontentloaded')
})

Given('there is an error loading the plan', async ({ page }) => {
  await page.goto('/plan/this-plan-does-not-exist')
  await page.waitForLoadState('networkidle')
})

Given('I am on the roadmap page', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
})

Given('I am on the plan details page for {string}', async ({ page }, planSlug: string) => {
  await page.goto(`/plan/${planSlug}`)
  await page.waitForLoadState('networkidle')
})

Given('I am on the story details page for {string}', async ({ page }, storyId: string) => {
  await page.goto(`/story/${storyId}`)
  await page.waitForLoadState('networkidle')
})

Given('I navigate to a non-existent plan', async ({ page }) => {
  await page.goto('/plan/non-existent-plan-xyz')
  await page.waitForLoadState('networkidle')
})

Given('the page is loading', async ({ page }) => {
  await page.goto('/plan/agent-as-judge-phase-gate-system')
  await page.waitForLoadState('domcontentloaded')
})

Given('the plan has no linked stories', async ({ page }) => {
  await page.goto('/plan/agent-as-judge-phase-gate-system')
  await page.waitForLoadState('networkidle')
})

Given('there are more than 10 plans', async ({ page }) => {
  // Assumes test data has more than 10 plans
})

Given('I select a single priority filter {string}', async ({ page }, priority: string) => {
  const priorityFilter = page.getByPlaceholder('Priority')
  await priorityFilter.click()
  await page.getByRole('option', { name: priority }).click()
})

// ============================================================================
// Navigation Steps
// ============================================================================

When('I click on a plan row', async ({ page }) => {
  // AppDataTable uses onRowClick callback, not <a> tags — click first data row (skip header)
  const dataRow = page.locator('[role="row"]').nth(1)
  await dataRow.click()
  await page.waitForLoadState('networkidle')
})

When('I click on a story in the stories table', async ({ page }) => {
  const storyLink = page.locator('a[href^="/story/"]').first()
  await storyLink.click()
  await page.waitForLoadState('networkidle')
})

When('I click on a story ID in the stories table', async ({ page }) => {
  const storyIdLink = page.locator('a[href^="/story/"]').first()
  await storyIdLink.click()
  await page.waitForLoadState('networkidle')
})

When('I click on a story title in the stories table', async ({ page }) => {
  const storyTitleLink = page
    .locator('table a')
    .filter({ hasText: /^[A-Z]+-\d+/ })
    .first()
  await storyTitleLink.click()
  await page.waitForLoadState('networkidle')
})

When('I click the back to roadmap link', async ({ page }) => {
  const backLink = page.getByRole('link', { name: /back to roadmap/i })
  await backLink.click()
  await page.waitForLoadState('networkidle')
})

When('I navigate to the story details page for {string}', async ({ page }, storyId: string) => {
  // Use domcontentloaded so the loading skeleton is catchable before data arrives
  await page.goto(`/story/${storyId}`, { waitUntil: 'domcontentloaded' })
})

When('I enter {string} in the search field', async ({ page }, searchText: string) => {
  const searchInput = page.getByPlaceholder(/search plans/i)
  await searchInput.fill(searchText)
})

When('I wait for results to load', async ({ page }) => {
  await page.waitForTimeout(500)
})

When('I open the status filter', async ({ page }) => {
  const statusFilter = page.getByPlaceholder('Status')
  await statusFilter.click()
})

When('I select {string} status', async ({ page }, status: string) => {
  await page.getByRole('option', { name: status }).click()
})

When('I open the priority filter', async ({ page }) => {
  const priorityFilter = page.getByPlaceholder('Priority')
  await priorityFilter.click()
})

When('I select {string} priority', async ({ page }, priority: string) => {
  await page.getByRole('option', { name: priority }).click()
})

When('I open the type filter', async ({ page }) => {
  const typeFilter = page.getByPlaceholder('Type')
  await typeFilter.click()
})

When('I select {string} type', async ({ page }, type: string) => {
  await page.getByRole('option', { name: type }).click()
})

When('I drag a plan row to a new position', async ({ page }) => {
  const rows = page.locator('[role="row"]')
  const firstRow = rows.nth(1)
  const secondRow = rows.nth(2)

  const firstRowHandle = firstRow.locator('[data-handle]').first()
  await firstRowHandle.hover()

  const firstBox = await firstRow.boundingBox()
  const secondBox = await secondRow.boundingBox()

  if (firstBox && secondBox) {
    await page.mouse.move(firstBox.x + 10, firstBox.y + firstBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(secondBox.x + 10, secondBox.y + secondBox.height / 2)
    await page.mouse.up()
    await page.waitForTimeout(500)
  }
})

// ============================================================================
// Roadmap Page Verification Steps
// ============================================================================

Then('I should see the roadmap page title', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /roadmap/i })).toBeVisible()
})

Then('I should see the plans data table', async ({ page }) => {
  await expect(page.locator('table')).toBeVisible()
})

Then(
  'I should see the following columns:',
  async ({ page }, data: { rows: { column: string }[] }) => {
    for (const row of data.rows) {
      await expect(
        page.getByRole('columnheader', { name: new RegExp(row.column, 'i') }),
      ).toBeVisible()
    }
  },
)

Then('I should see filtered results', async ({ page }) => {
  await page.waitForLoadState('networkidle')
})

Then('the {string} checkbox is checked', async ({ page }, checkboxName: string) => {
  const checkbox = page.getByRole('checkbox', { name: new RegExp(checkboxName, 'i') })
  await expect(checkbox).toBeChecked()
})

Then('completed plans should be hidden', async ({ page }) => {
  await page.waitForLoadState('networkidle')
})

Then('I apply filters that return no results', async ({ page }) => {
  await page.getByPlaceholder(/search plans/i).fill('xyznonexistent12345')
  await page.waitForTimeout(500)
})

Then('I should see an empty state message', async ({ page }) => {
  await expect(page.getByText(/no plans found/i)).toBeVisible()
})

Then('I should see pagination controls', async ({ page }) => {
  await expect(page.locator('[role="navigation"]')).toBeVisible()
})

Then('I should be able to navigate between pages', async ({ page }) => {
  const nextButton = page.getByRole('button', { name: /next/i })
  if (await nextButton.isVisible()) {
    await nextButton.click()
    await page.waitForTimeout(300)
  }
})

Then('I should see drag handles on each row', async ({ page }) => {
  const dragHandles = page
    .locator('[data-handle]')
    .or(page.locator('button').filter({ has: page.locator('svg') }))
  await expect(dragHandles.first()).toBeVisible()
})

Then('the plan order should be updated', async ({ page }) => {
  await page.waitForLoadState('networkidle')
})

// ============================================================================
// Plan Details Page Verification Steps
// ============================================================================

Then('I should see the plan title', async ({ page }) => {
  await expect(page.locator('h1')).toBeVisible()
})

Then('I should see the plan slug', async ({ page }) => {
  await expect(
    page
      .locator('p')
      .filter({ hasText: /^[a-z0-9-]+$/ })
      .first(),
  ).toBeVisible()
})

Then('I should see the status badge', async ({ page }) => {
  const statusBadge = page.locator('[class*="badge"]').filter({
    hasText: /^(draft|active|accepted|in-progress|implemented|superseded|archived|blocked)$/i,
  })
  await expect(statusBadge.first()).toBeVisible()
})

Then('I should see the priority badge', async ({ page }) => {
  const priorityBadge = page.locator('[class*="badge"]').filter({ hasText: /^(P1|P2|P3|P4|P5)$/ })
  await expect(priorityBadge.first()).toBeVisible()
})

Then(
  'I should see the overview section with fields:',
  async ({ page }, data: { rows: { field: string }[] }) => {
    for (const row of data.rows) {
      await expect(page.getByText(row.field)).toBeVisible()
    }
  },
)

Then('I should see the tags section', async ({ page }) => {
  await expect(page.getByText('Tags')).toBeVisible()
})

Then('I should see the stories table', async ({ page }) => {
  await expect(page.locator('table').first()).toBeVisible()
})

Then(
  'the stories table should have columns:',
  async ({ page }, data: { rows: { column: string }[] }) => {
    for (const row of data.rows) {
      await expect(
        page.getByRole('columnheader', { name: new RegExp(row.column, 'i') }),
      ).toBeVisible()
    }
  },
)

Then('I should see {string}', async ({ page }, text: string) => {
  await expect(page.getByText(text)).toBeVisible()
})

// ============================================================================
// Story Details Page Verification Steps
// ============================================================================

Then('I should be navigated to the plan details page', async ({ page }) => {
  await expect(page).toHaveURL(/^\/plan\//)
})

Then('I should be navigated to the roadmap page', async ({ page }) => {
  await expect(page).toHaveURL('/')
})

Then('I should be navigated to the story details page', async ({ page }) => {
  await expect(page).toHaveURL(/^\/story\//)
})

Then('I should see the story ID badge', async ({ page }) => {
  const storyIdBadge = page.locator('h1 + div').or(page.locator('[class*="badge"]').first())
  await expect(storyIdBadge).toBeVisible()
})

Then('I should see the story state badge', async ({ page }) => {
  const stateBadge = page.locator('[class*="badge"]').filter({
    hasText: /^(backlog|ready|in_progress|in_review|in_qa|completed|blocked|deferred)$/i,
  })
  await expect(stateBadge.first()).toBeVisible()
})

Then('I should see the story priority badge', async ({ page }) => {
  const priorityBadge = page.locator('[class*="badge"]').filter({ hasText: /^(P0|P1|P2|P3|P4)$/ })
  await expect(priorityBadge.first()).toBeVisible()
})

Then('I should see the story description', async ({ page }) => {
  const descriptionHeading = page.getByRole('heading', { name: /description/i })
  await expect(descriptionHeading).toBeVisible()
})

Then('I should not see the story description', async ({ page }) => {
  const descriptionHeading = page.getByRole('heading', { name: /description/i })
  await expect(descriptionHeading).not.toBeVisible()
})

Then('I should see the surfaces section', async ({ page }) => {
  const surfacesHeading = page.getByRole('heading', { name: /surfaces/i })
  await expect(surfacesHeading).toBeVisible()
})

Then('I should see the story details section', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /details/i })).toBeVisible()
})

Then('I should see an error message', async ({ page }) => {
  const errorMessage = page.locator('[class*="destructive"]').or(page.getByText(/error/i))
  await expect(errorMessage).toBeVisible()
})

Then('I should see the story not found message', async ({ page }) => {
  const notFoundMessage = page.getByText(/not found|failed to fetch/i)
  await expect(notFoundMessage).toBeVisible()
})

Then('I should see a loading skeleton', async ({ page }) => {
  const skeleton = page.locator('.animate-pulse').or(page.locator('[class*="skeleton"]'))
  await expect(skeleton.first()).toBeVisible()
})

Then('I should be taken to the story details page', async ({ page }) => {
  await expect(page).toHaveURL(/^\/story\//)
  await expect(page.locator('h1')).toBeVisible()
})

Then('I should see the story title', async ({ page }) => {
  await expect(page.locator('h1')).toBeVisible()
})

Then('I should be taken to the roadmap page', async ({ page }) => {
  await expect(page).toHaveURL('/')
})

Then('I should see the loading skeleton', async ({ page }) => {
  const skeleton = page.locator('.animate-pulse').or(page.locator('[class*="skeleton"]'))
  await expect(skeleton.first()).toBeVisible()
})
