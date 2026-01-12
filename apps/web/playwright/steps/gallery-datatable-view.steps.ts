import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'

const { Given, When, Then } = createBdd()

// NOTE: These steps are intended for true end-to-end flows.
// They do NOT use Playwright page.route() or any API mocking utilities.
// Test data (user + wishlist contents) must be provided by the real backend.

// ---------------------------------------------------------------------------
// Background / Authentication
// ---------------------------------------------------------------------------

Given('I am logged in as a real gallery user', async ({ page }) => {
  const username = process.env.E2E_USERNAME
  const password = process.env.E2E_PASSWORD

  if (!username || !password) {
    throw new Error('E2E_USERNAME and E2E_PASSWORD must be set in the environment for real login')
  }

  await page.goto('/login')

  await page.getByLabel(/email/i).fill(username)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole('button', { name: /sign in|log in/i }).click()

  // Wait for post-login redirect; assume wishlist or dashboard becomes available
  await page.waitForLoadState('networkidle')
})

// Re-use existing mobile viewport step text would conflict, so define specific one if needed
Given('I am using a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
})

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

When('I navigate to the wishlist gallery page', async ({ page }) => {
  await page.goto('/wishlist')
  await page.waitForLoadState('networkidle')
})

When('I reload the wishlist gallery page', async ({ page }) => {
  await page.reload()
  await page.waitForLoadState('networkidle')
})

// ---------------------------------------------------------------------------
// View Toggle & Mode Assertions
// ---------------------------------------------------------------------------

Then('I should see the gallery view toggle', async ({ page }) => {
  // Prefer role+label over testid; fall back to testid which GalleryViewToggle already exposes
  const toggleGroup = page.getByRole('group', { name: /view mode selector/i })
  await expect(toggleGroup).toBeVisible()
})

Then('I should not see the gallery view toggle', async ({ page }) => {
  const toggleGroup = page.getByRole('group', { name: /view mode selector/i })
  await expect(toggleGroup).toHaveCount(0)
})

Then('the gallery should be in grid view', async ({ page }) => {
  // Grid is rendered via GalleryGrid with role="list" and "Gallery grid" label
  const grid = page.getByRole('list', { name: /gallery grid/i })
  await expect(grid).toBeVisible()
})

Then('the gallery should be in table view', async ({ page }) => {
  // Datatable uses semantic table markup via GalleryDataTable
  const table = page.getByRole('table', { name: /wishlist items table|gallery items table/i })
  await expect(table).toBeVisible()
})

Then('the gallery grid should not be visible', async ({ page }) => {
  const grid = page.getByRole('list', { name: /gallery grid/i })
  await expect(grid).toHaveCount(0)
})

When('I switch the gallery to table view', async ({ page }) => {
  // GalleryViewToggle renders two buttons with aria-labels "Grid view" and "Table view"
  const tableButton = page.getByRole('button', { name: /table view/i })
  await tableButton.click()
})

When('I navigate to the wishlist gallery page as a first-time viewer', async ({ page }) => {
  // Clear localStorage entry for view mode to simulate first visit for this gallery
  await page.context().clearCookies()
  await page.goto('/wishlist')
  await page.waitForLoadState('networkidle')
})

Then('I should see a {string} tooltip for the gallery view toggle', async ({ page }, text: string) => {
  const tooltip = page.getByText(new RegExp(text, 'i'))
  await expect(tooltip).toBeVisible()
})

Then(
  'the gallery view preference for {string} should be stored',
  async ({ page }, galleryKey: string) => {
    // Check that a view mode key exists in localStorage for this gallery type
    const hasPreference = await page.evaluate(key => {
      const storageKey = `gallery_view_mode_${key}`
      return !!window.localStorage.getItem(storageKey)
    }, galleryKey)

    expect(hasPreference).toBeTruthy()
  },
)

// ---------------------------------------------------------------------------
// Table Columns & Rows
// ---------------------------------------------------------------------------

Then('I should see a gallery table column header {string}', async ({ page }, header: string) => {
  const table = page.getByRole('table', { name: /wishlist items table|gallery items table/i })
  await expect(table).toBeVisible()

  const columnHeader = table.getByRole('columnheader', { name: new RegExp(header, 'i') })
  await expect(columnHeader).toBeVisible()
})

When('I click the first gallery table row', async ({ page }) => {
  const table = page.getByRole('table', { name: /wishlist items table|gallery items table/i })
  const dataRows = table.getByRole('row')
  // Skip the header row; focus on the first data row
  await expect(dataRows.nth(1)).toBeVisible()
  await dataRows.nth(1).click()
})

Then('I should be navigated to the wishlist item detail page', async ({ page }) => {
  await page.waitForLoadState('networkidle')
  await expect(page).toHaveURL(/\/wishlist\//)
})

// ---------------------------------------------------------------------------
// Loading, Empty, Error States (observed via real backend behavior)
// ---------------------------------------------------------------------------

Then('I should see the gallery table loading skeleton while data is loading', async ({ page }) => {
  // When datatable is loading and has more pages, GalleryDataTable renders a status region
  // with aria-live="polite" and aria-label="Loading more items" plus a spinning Loader2 icon.
  const loadingRegion = page.getByRole('status', { name: /loading more items/i })
  await expect(loadingRegion).toBeVisible()
})

Then('after the gallery table finishes loading I should see table rows', async ({ page }) => {
  const table = page.getByRole('table', { name: /wishlist items table|gallery items table/i })
  const rows = table.getByRole('row')
  await expect(rows.nth(1)).toBeVisible({ timeout: 15000 })
})

Then('I should see the gallery table empty state', async ({ page }) => {
  // GalleryTableEmpty renders a status region with data-testid="gallery-table-empty" and
  // title text "Your wishlist is empty" or "No results match your filters".
  const emptyRegion = page.getByTestId('gallery-table-empty')
  await expect(emptyRegion).toBeVisible()

  const title = page.getByTestId('gallery-table-empty-title')
  await expect(title).toHaveText(/your wishlist is empty|no results match your filters/i)
})

Then('I should see the gallery table error state', async ({ page }) => {
  // GalleryTableError renders a region with data-testid="gallery-table-error" and
  // a fixed title "Failed to load items" and description text.
  const errorRegion = page.getByTestId('gallery-table-error')
  await expect(errorRegion).toBeVisible()

  const title = page.getByTestId('gallery-table-error-title')
  await expect(title).toHaveText('Failed to load items')
})

Given('the wishlist for the real user has no items', async () => {
  // Precondition: backend test data must ensure this user has an empty wishlist.
  // This step is declarative and does not perform mutations in the UI.
})

Given('the wishlist backend is unreachable or returns an error', async () => {
  // Precondition: environment or backend must be configured to simulate failure.
  // This step is declarative; it documents the expectation but does not mock.
})

Given(
  'the wishlist for the real user has items that do not match the active filters',
  async () => {
    // Precondition: backend test data or environment configuration must ensure that
    // for this user, the table filters configured in the app result in zero matches.
    // This step is declarative; no UI or network mocking is performed here.
  },
)

Then(
  'the datatable empty title should be {string}',
  async ({ page }, expectedTitle: string) => {
    const title = page.getByTestId('gallery-table-empty-title')
    await expect(title).toHaveText(expectedTitle)
  },
)

Then('I should see the datatable clear filters button', async ({ page }) => {
  // GalleryTableEmpty renders a Clear Filters button with data-testid="gallery-table-empty-clear-filters"
  // when variant is "no-results" and onClearFilters is provided.
  const clearFiltersButton = page
    .getByTestId('gallery-table-empty-clear-filters')
    .or(page.getByRole('button', { name: /clear filters/i }))
  await expect(clearFiltersButton.first()).toBeVisible()
})

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

When('I sort the gallery table by column {string}', async ({ page }, header: string) => {
  const table = page.getByRole('table', { name: /wishlist items table|gallery items table/i })
  const columnHeader = table.getByRole('columnheader', { name: new RegExp(header, 'i') })
  await columnHeader.click()
})

Then(
  'the gallery table should indicate that column {string} is sorted ascending',
  async ({ page }, header: string) => {
    const table = page.getByRole('table', { name: /wishlist items table|gallery items table/i })
    const columnHeader = table.getByRole('columnheader', { name: new RegExp(header, 'i') })

    await expect(columnHeader).toHaveAttribute('aria-sort', 'ascending')
  },
)

Then(
  'the gallery table should indicate that column {string} is sorted descending',
  async ({ page }, header: string) => {
    const table = page.getByRole('table', { name: /wishlist items table|gallery items table/i })
    const columnHeader = table.getByRole('columnheader', { name: new RegExp(header, 'i') })

    await expect(columnHeader).toHaveAttribute('aria-sort', 'descending')
  },
)

Then(
  'the gallery table should indicate that column {string} is the primary sort',
  async ({ page }, header: string) => {
    const table = page.getByRole('table', { name: /wishlist items table|gallery items table/i })
    const columnHeader = table.getByRole('columnheader', { name: new RegExp(header, 'i') })

    // SortableHeader encodes priority into aria-label: "..., primary sort ascending|descending"
    await expect(columnHeader).toHaveAttribute(
      'aria-label',
      expect.stringMatching(/primary sort (ascending|descending)/i),
    )
  },
)

Then(
  'the gallery table should indicate that column {string} is the secondary sort',
  async ({ page }, header: string) => {
    const table = page.getByRole('table', { name: /wishlist items table|gallery items table/i })
    const columnHeader = table.getByRole('columnheader', { name: new RegExp(header, 'i') })

    // SortableHeader encodes priority into aria-label: "..., secondary sort ascending|descending"
    await expect(columnHeader).toHaveAttribute(
      'aria-label',
      expect.stringMatching(/secondary sort (ascending|descending)/i),
    )
  },
)

Then('the gallery table should not allow more than 2 active sort columns', async ({ page }) => {
  const table = page.getByRole('table', { name: /wishlist items table|gallery items table/i })
  const headers = await table.getByRole('columnheader').all()

  const sortedCount = await Promise.all(
    headers.map(async header => {
      const ariaSort = await header.getAttribute('aria-sort')
      return ariaSort === 'ascending' || ariaSort === 'descending' ? 1 : 0
    }),
  ).then(values => values.reduce((sum, v) => sum + v, 0))

  expect(sortedCount).toBeLessThanOrEqual(2)
})

When('I click the {string} button', async ({ page }, label: string) => {
  const button = page.getByRole('button', { name: new RegExp(label, 'i') })
  await button.click()
})

Then(
  'the gallery table should indicate that column {string} is sorted ascending by default',
  async ({ page }, header: string) => {
    const table = page.getByTestId('gallery-table')
    const columnHeader = table.getByRole('columnheader', { name: new RegExp(header, 'i') })

    const ascIcon = columnHeader.getByTestId('sort-indicator-asc').or(
      columnHeader.getByText(/↑₁|↑/),
    )
    await expect(ascIcon.first()).toBeVisible()
  },
)
