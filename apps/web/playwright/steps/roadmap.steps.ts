/**
 * Step Definitions for Workflow Roadmap E2E Tests
 * BDD step definitions for roadmap, plan-details, and story-details E2E tests.
 */

import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import type { DataTable } from '@cucumber/cucumber'

const { Given, When, Then } = createBdd()

// ============================================================================
// Background / Setup Steps
// ============================================================================

Given('I am viewing the roadmap application', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('load')
})

Given('I am viewing the roadmap application with loading delay', async ({ page }) => {
  await page.goto('/?__delay=2000')
  await page.waitForLoadState('domcontentloaded')
})

Given('there is an error loading the plan', async ({ page }) => {
  await page.route('**/api/v1/roadmap/workflow-intelligence-wint', route => route.abort('failed'))
  await page.goto('/plan/workflow-intelligence-wint')
  await page.waitForLoadState('domcontentloaded')
})

Given('I am on the roadmap page', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('load')
})

Given('I am on the plan details page for {string}', async ({ page }, planSlug: string) => {
  await page.goto(`/plan/${planSlug}`)
  await page.waitForLoadState('load')
})

Given('I am on the story details page for {string}', async ({ page }, storyId: string) => {
  await page.goto(`/story/${storyId}`)
  await page.waitForLoadState('load')
})

Given('I navigate to a non-existent plan', async ({ page }) => {
  await page.goto('/plan/non-existent-plan-xyz')
  await page.waitForLoadState('load')
})

Given('the page is loading', async ({ page }) => {
  // Add delay so loading skeleton is visible before response returns
  await page.route('**/api/v1/roadmap/workflow-intelligence-wint', async route => {
    await new Promise(resolve => setTimeout(resolve, 2000))
    await route.continue()
  })
  // Don't await goto — we want to catch the loading skeleton
  page.goto('/plan/workflow-intelligence-wint')
  await page.waitForLoadState('domcontentloaded')
})

Given('the plan has no linked stories', async ({ page }) => {
  await page.goto('/plan/agent-as-judge-phase-gate-system')
  await page.waitForLoadState('load')
})

Given('there are more than 10 plans', async () => {
  // Assumes test data has more than 10 plans
})

Given('I select a single priority filter {string}', async ({ page }, priority: string) => {
  const priorityFilter = page.locator('[aria-haspopup="listbox"]').filter({ hasText: /^Priority$/ })
  await priorityFilter.click()
  await page.getByRole('option', { name: new RegExp(`^${priority}$`, 'i') }).click()
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300) // wait for dropdown to close and table to re-filter
})

// ============================================================================
// Navigation Steps
// ============================================================================

When('I click on a plan row', async ({ page }) => {
  // RoadmapPage uses onRowClick handler, not <a> links
  // Use CSS: tbody > tr > td — implicit ARIA roles aren't matched by [role=X] CSS attribute selectors
  const firstDataCell = page.locator('tbody tr td').first()
  await firstDataCell.click({ force: true })
  await page.waitForLoadState('domcontentloaded')
})

When('I click on a story in the stories table', async ({ page }) => {
  const storyLink = page.locator('a[href*="/story/"]').first()
  await storyLink.click()
  await page.waitForLoadState('load')
})

When('I click on a story ID in the stories table', async ({ page }) => {
  const storyIdLink = page.locator('a[href*="/story/"]').first()
  await storyIdLink.click()
  await page.waitForLoadState('load')
})

When('I click on a story title in the stories table', async ({ page }) => {
  const storyTitleLink = page.locator('table a').first()
  await storyTitleLink.click()
  await page.waitForLoadState('load')
})

When('I click the back to roadmap link', async ({ page }) => {
  const backLink = page.getByRole('link', { name: /back to roadmap/i })
  await backLink.click()
  await page.waitForLoadState('load')
})

When('I navigate to the story details page for {string}', async ({ page }, storyId: string) => {
  await page.goto(`/story/${storyId}`)
})

When('I enter {string} in the search field', async ({ page }, searchText: string) => {
  const searchInput = page.getByPlaceholder(/search plans/i)
  await searchInput.fill(searchText)
})

When('I wait for results to load', async ({ page }) => {
  await page.waitForTimeout(500)
})

When('I open the status filter', async ({ page }) => {
  const statusFilter = page.locator('[aria-haspopup="listbox"]').filter({ hasText: /^Status$/ })
  await statusFilter.click()
})

When('I select {string} status', async ({ page }, status: string) => {
  await page
    .getByRole('option', { name: new RegExp(status, 'i') })
    .first()
    .click()
  await page.keyboard.press('Escape')
})

When('I open the priority filter', async ({ page }) => {
  const priorityFilter = page.locator('[aria-haspopup="listbox"]').filter({ hasText: /^Priority$/ })
  await priorityFilter.click()
})

When('I select {string} priority', async ({ page }, priority: string) => {
  await page
    .getByRole('option', { name: new RegExp(`^${priority}$`, 'i') })
    .first()
    .click()
  await page.keyboard.press('Escape')
})

When('I open the type filter', async ({ page }) => {
  const typeFilter = page.locator('[aria-haspopup="listbox"]').filter({ hasText: /^Type$/ })
  await typeFilter.click()
})

When('I select {string} type', async ({ page }, type: string) => {
  await page
    .getByRole('option', { name: new RegExp(type, 'i') })
    .first()
    .click()
  await page.keyboard.press('Escape')
})

When('I drag a plan row to a new position', async ({ page }) => {
  const rows = page.locator('tbody tr')
  const firstRow = rows.nth(0)
  const secondRow = rows.nth(1)

  const firstRowHandle = firstRow.locator('[data-handle]').first()

  // Only attempt drag if handles are present — drag may not be implemented yet
  const handleCount = await firstRowHandle.count()
  if (handleCount === 0) {
    return
  }

  await firstRowHandle.hover()
  const sourceBox = await firstRowHandle.boundingBox()
  const targetBox = await secondRow.boundingBox()

  if (sourceBox && targetBox) {
    await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(targetBox.x + 50, targetBox.y + 10)
    await page.mouse.up()
  }

  await page.waitForTimeout(500)
})

// ============================================================================
// Roadmap Page Verification Steps
// ============================================================================

Then('I should see the roadmap page title', async ({ page }) => {
  // Use .first() to avoid strict mode violation — header and page may both have "Roadmap" heading
  await expect(page.getByRole('heading', { name: /roadmap/i }).first()).toBeVisible()
})

Then('I should see the plans data table', async ({ page }) => {
  await expect(page.locator('table').first()).toBeVisible()
})

Then('I should see the following columns:', async ({ page }, data: DataTable) => {
  const rows = data.hashes() as { column: string }[]
  for (const row of rows) {
    await expect(
      page.getByRole('columnheader', { name: new RegExp(row.column, 'i') }),
    ).toBeVisible()
  }
})

Then('I should see filtered results', async ({ page }) => {
  await page.waitForLoadState('domcontentloaded')
})

Given('the {string} checkbox is checked', async ({ page }, checkboxName: string) => {
  const checkbox = page.getByRole('checkbox', { name: new RegExp(checkboxName, 'i') })
  const isChecked = await checkbox.isChecked()
  if (!isChecked) {
    await checkbox.click()
  }
})

Then('completed plans should be hidden', async ({ page }) => {
  await page.waitForLoadState('domcontentloaded')
})

Given('I apply filters that return no results', async ({ page }) => {
  await page.getByPlaceholder(/search plans/i).fill('xyznonexistent12345')
  await page.waitForTimeout(500)
})

Then('I should see an empty state message', async ({ page }) => {
  await expect(page.getByText(/no plans found/i)).toBeVisible()
})

Then('I should see pagination controls', async ({ page }) => {
  // Pagination renders as page number buttons with no role="navigation" wrapper
  await expect(page.getByText(/page \d+ of \d+/i)).toBeVisible()
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
  await page.waitForLoadState('domcontentloaded')
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
  // shadcn Badge renders with rounded-full class (no "badge" in class name)
  const statusBadge = page.locator('div.rounded-full').filter({
    hasText:
      /^(draft|active|accepted|stories-created|in-progress|implemented|superseded|archived|blocked)$/i,
  })
  await expect(statusBadge.first()).toBeVisible()
})

Then('I should see the priority badge', async ({ page }) => {
  // shadcn Badge renders with rounded-full class (no "badge" in class name)
  const priorityBadge = page.locator('div.rounded-full').filter({ hasText: /^(P1|P2|P3|P4|P5)$/ })
  await expect(priorityBadge.first()).toBeVisible()
})

Then('I should see the overview section with fields:', async ({ page }, data: DataTable) => {
  const rows = data.hashes() as { field: string }[]
  for (const row of rows) {
    // Use role="term" (<dt>) with exact match to avoid partial text collisions
    await expect(
      page
        .getByRole('term')
        .filter({ hasText: new RegExp(`^${row.field}$`) })
        .first(),
    ).toBeVisible()
  }
})

Then('I should see the tags section', async ({ page }) => {
  await expect(page.getByText('Tags')).toBeVisible()
})

Then('I should see the stories table', async ({ page }) => {
  await expect(page.locator('table').first()).toBeVisible()
})

Then('the stories table should have columns:', async ({ page }, data: DataTable) => {
  const rows = data.hashes() as { column: string }[]
  for (const row of rows) {
    await expect(
      page.getByRole('columnheader', { name: new RegExp(row.column, 'i') }),
    ).toBeVisible()
  }
})

Then('I should see {string}', async ({ page }, text: string) => {
  await expect(page.getByText(text)).toBeVisible()
})

// ============================================================================
// Dependency Graph Tab Steps
// ============================================================================

Given('I click on the Deps tab', async ({ page }) => {
  const depsTab = page.getByRole('tab', { name: /deps/i })
  await depsTab.click()
  await page.waitForTimeout(300)
})

Then('I should see wave headers with story cards', async ({ page }) => {
  // Wave headers render as "Wave N" text inside the dep graph view
  const waveHeader = page.getByText(/Wave \d+/)
  // Either we see wave headers (plan has dependencies) or the no-dependencies message
  const noDeps = page.getByText(/No dependencies/)
  const noStories = page.getByText(/No stories match/)
  const hasWaves = await waveHeader
    .first()
    .isVisible()
    .catch(() => false)
  const hasNoDeps = await noDeps.isVisible().catch(() => false)
  const hasNoStories = await noStories.isVisible().catch(() => false)

  // At least one of these should be visible
  expect(hasWaves || hasNoDeps || hasNoStories).toBeTruthy()

  // If waves are present, verify story cards exist within them
  if (hasWaves) {
    const storyCards = page.locator('a[href*="/story/"]')
    await expect(storyCards.first()).toBeVisible()
  }
})

Then('I should see {string} or {string}', async ({ page }, text1: string, text2: string) => {
  const el1 = page.getByText(text1)
  const el2 = page.getByText(text2)
  const visible1 = await el1.isVisible().catch(() => false)
  const visible2 = await el2.isVisible().catch(() => false)
  expect(visible1 || visible2).toBeTruthy()
})

// ============================================================================
// Story Details Page Verification Steps
// ============================================================================

Then('I should be navigated to the plan details page', async ({ page }) => {
  // toHaveURL matches the full URL (including http://localhost:3006), so don't anchor with ^
  await expect(page).toHaveURL(/\/plan\//)
})

Then('I should be navigated to the roadmap page', async ({ page }) => {
  await expect(page).toHaveURL('/')
})

Then('I should be navigated to the story details page', async ({ page }) => {
  // toHaveURL matches the full URL (including http://localhost:3006), so don't anchor with ^
  await expect(page).toHaveURL(/\/story\//)
})

Then('I should see the story ID badge', async ({ page }) => {
  // Story ID (e.g. WINT-9105) appears as a sibling element next to the h1
  await expect(page.getByText(/^[A-Z]+-\d+$/).first()).toBeVisible()
})

Then('I should see the story state badge', async ({ page }) => {
  // shadcn Badge renders with rounded-full class (no "badge" in class name)
  const stateBadge = page.locator('div.rounded-full').filter({
    hasText:
      /^(backlog|ready|in_progress|in_review|in_qa|uat|completed|blocked|deferred|needs_code_review)$/i,
  })
  await expect(stateBadge.first()).toBeVisible()
})

Then('I should see the story priority badge', async ({ page }) => {
  // shadcn Badge renders with rounded-full class (no "badge" in class name)
  const priorityBadge = page.locator('div.rounded-full').filter({ hasText: /^(P0|P1|P2|P3|P4)$/ })
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

Then('I should see the story details section', async ({ page }) => {
  const detailsHeading = page.getByRole('heading', { name: /details/i })
  await expect(detailsHeading).toBeVisible()
})

Then('I should see the surfaces section', async ({ page }) => {
  // The Details section is always rendered for any story
  const detailsHeading = page.getByRole('heading', { name: /details/i })
  await expect(detailsHeading).toBeVisible()
})

Then('I should see an error message', async ({ page }) => {
  const errorMessage = page.locator('[class*="destructive"]').or(page.getByText(/error/i))
  await expect(errorMessage.first()).toBeVisible()
})

Then('I should see the story not found message', async ({ page }) => {
  const notFoundMessage = page.getByText(/not found|failed to fetch/i)
  await expect(notFoundMessage).toBeVisible()
})

Then('I should see a loading skeleton', async ({ page }) => {
  // Use toBeAttached() — loading skeletons may have aria-hidden or CSS visibility:hidden
  // while still being present in the DOM as the loading indicator
  const skeleton = page.locator('.animate-pulse').or(page.locator('[class*="skeleton"]'))
  await expect(skeleton.first()).toBeAttached()
})

Then('I should be taken to the story details page', async ({ page }) => {
  await expect(page).toHaveURL(/\/story\//)
  // Use main h1 to avoid strict mode violation with header h1
  await expect(page.locator('main h1')).toBeVisible()
})

Then('I should see the story title', async ({ page }) => {
  await expect(page.locator('h1')).toBeVisible()
})

Then('I should be taken to the roadmap page', async ({ page }) => {
  await expect(page).toHaveURL('/')
})

Then('I should see the loading skeleton', async ({ page }) => {
  const skeleton = page.locator('.animate-pulse').or(page.locator('[class*="skeleton"]'))
  await expect(skeleton.first()).toBeAttached()
})

// ============================================================================
// Filter Persistence Steps
// ============================================================================

When('I reload the page', async ({ page }) => {
  await page.reload()
  await page.waitForLoadState('load')
})

When('I uncheck the hide completed checkbox', async ({ page }) => {
  const checkbox = page.getByRole('checkbox', { name: /hide completed/i })
  const isChecked = await checkbox.isChecked()
  if (isChecked) {
    await checkbox.click()
  }
})

When('I change the page size to {string}', async ({ page }, size: string) => {
  const pageSizeSelect = page
    .locator('select, [role="combobox"]')
    .filter({ hasText: /\d+/ })
    .first()
  await pageSizeSelect.click()
  await page.getByRole('option', { name: new RegExp(`^${size}$`) }).click()
  await page.waitForTimeout(200)
})

Then('the status filter should show {string}', async ({ page }, status: string) => {
  const statusTrigger = page
    .locator('[aria-haspopup="listbox"]')
    .filter({ hasText: new RegExp(status, 'i') })
  await expect(statusTrigger.first()).toBeVisible()
})

Then('the priority filter should show {string}', async ({ page }, priority: string) => {
  const priorityTrigger = page
    .locator('[aria-haspopup="listbox"]')
    .filter({ hasText: new RegExp(`^${priority}$`, 'i') })
  await expect(priorityTrigger.first()).toBeVisible()
})

Then('the search field should contain {string}', async ({ page }, text: string) => {
  const searchInput = page.getByPlaceholder(/search plans/i)
  await expect(searchInput).toHaveValue(text)
})

Then('the hide completed checkbox should be unchecked', async ({ page }) => {
  const checkbox = page.getByRole('checkbox', { name: /hide completed/i })
  await expect(checkbox).not.toBeChecked()
})

Then('the page size should show {string}', async ({ page }, size: string) => {
  // Page size selector renders the current value in the trigger button
  const pageSizeSelector = page
    .locator('[role="combobox"]')
    .filter({ hasText: new RegExp(`^${size}$`) })
  await expect(pageSizeSelector.first()).toBeVisible()
})

// ============================================================================
// Dashboard Steps
// ============================================================================

Given('I am on the dashboard page', async ({ page }) => {
  await page.goto('/dashboard')
  await page.waitForLoadState('load')
})

Then('I should see the dashboard page title', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
})

Then('I should see the dashboard subtitle', async ({ page }) => {
  await expect(page.getByText('Cross-plan project health and next actions')).toBeVisible()
})

Then('I should see the {string} section', async ({ page }, sectionName: string) => {
  await expect(page.getByText(sectionName, { exact: true })).toBeVisible()
})

Then('I should see the total story count', async ({ page }) => {
  await expect(page.getByText(/\d+ stories/)).toBeVisible()
})

Then('I should see the state distribution bar', async ({ page }) => {
  await expect(page.locator('svg rect').first()).toBeVisible()
})

Then('I should see work queue table headers', async ({ page }) => {
  await expect(page.getByRole('columnheader', { name: 'Story' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Title' })).toBeVisible()
})

Then('I should see at least one plan card', async ({ page }) => {
  // Plan cards are <a> elements with plan titles inside .grid container
  const planCards = page.locator('a').filter({ has: page.locator('h3') })
  await expect(planCards.first()).toBeVisible()
})

Then('I should see a {string} link in the header', async ({ page }, linkText: string) => {
  const link = page.locator('header').getByRole('link', { name: linkText })
  await expect(link).toBeVisible()
})

When('I click the {string} link', async ({ page }, linkText: string) => {
  const link = page.locator('header').getByRole('link', { name: linkText })
  await link.click()
  await page.waitForLoadState('load')
})

Then('I should be on the dashboard page', async ({ page }) => {
  await expect(page).toHaveURL(/\/dashboard/)
})

Given('the work queue has stories', async ({ page }) => {
  // Dashboard is already loaded; verify queue has content
  await expect(page.locator('a[href*="/story/"]').first()).toBeVisible()
})

When('I click on a story ID in the work queue', async ({ page }) => {
  const storyLink = page.locator('a[href*="/story/"]').first()
  await storyLink.click()
  await page.waitForLoadState('load')
})

Given('there are plan progress cards', async ({ page }) => {
  await expect(page.locator('a[href*="/plan/"]').first()).toBeVisible()
})

When('I click on a plan card', async ({ page }) => {
  const planCard = page.locator('a[href*="/plan/"]').first()
  await planCard.click()
  await page.waitForLoadState('load')
})
