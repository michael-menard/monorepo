/**
 * Compression Quality Presets E2E Tests - WISH-2046
 *
 * Tests for the compression quality preset selector in the wishlist form.
 * Covers AC5-13: Preset selection, persistence, and compression behavior.
 *
 * Prerequisites:
 * - User authenticated (MSW mocked or AUTH_BYPASS=true)
 */

import { test, expect } from '@playwright/test'

test.describe('Compression Quality Presets (WISH-2046)', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start fresh
    await page.goto('/wishlist')
    await page.evaluate(() => {
      localStorage.removeItem('wishlist:preferences:compressionPreset')
      localStorage.removeItem('wishlist:preferences:skipCompression')
    })
  })

  test.describe('AC5-8: Preset Selector UI', () => {
    test('AC5: Preset selector shows in upload form with all three presets', async ({ page }) => {
      // Navigate to add item page
      await page.goto('/wishlist/add')
      await page.waitForLoadState('networkidle')

      // Find the compression quality dropdown
      const presetSelector = page.locator('#compressionPreset')
      await expect(presetSelector).toBeVisible()

      // Open the dropdown and verify all three presets are available
      await presetSelector.click()

      // Check for all preset options
      await expect(page.getByRole('option', { name: /Low bandwidth/ })).toBeVisible()
      await expect(page.getByRole('option', { name: /Balanced/ })).toBeVisible()
      await expect(page.getByRole('option', { name: /High quality/ })).toBeVisible()
    })

    test('AC6: Preset selector shows estimated file size for each preset', async ({ page }) => {
      await page.goto('/wishlist/add')
      await page.waitForLoadState('networkidle')

      // Open the preset dropdown
      const presetSelector = page.locator('#compressionPreset')
      await presetSelector.click()

      // Check for estimated sizes in the options
      await expect(page.getByText('~300KB')).toBeVisible()
      await expect(page.getByText('~800KB')).toBeVisible()
      await expect(page.getByText('~1.5MB')).toBeVisible()
    })

    test('AC8: Default preset is "Balanced" when no preference stored', async ({ page }) => {
      await page.goto('/wishlist/add')
      await page.waitForLoadState('networkidle')

      // Check that Balanced is selected by default
      const presetSelector = page.locator('#compressionPreset')
      await expect(presetSelector).toContainText('Balanced')
    })

    test('Balanced preset shows "(recommended)" indicator', async ({ page }) => {
      await page.goto('/wishlist/add')
      await page.waitForLoadState('networkidle')

      // Open the dropdown
      const presetSelector = page.locator('#compressionPreset')
      await presetSelector.click()

      // Find the Balanced option and check for recommended indicator
      const balancedOption = page.getByRole('option', { name: /Balanced/ })
      await expect(balancedOption).toContainText('(recommended)')
    })
  })

  test.describe('AC7: localStorage Persistence', () => {
    test('Selected preset persists to localStorage', async ({ page }) => {
      await page.goto('/wishlist/add')
      await page.waitForLoadState('networkidle')

      // Select Low bandwidth preset
      const presetSelector = page.locator('#compressionPreset')
      await presetSelector.click()
      await page.getByRole('option', { name: /Low bandwidth/ }).click()

      // Check localStorage
      const storedPreset = await page.evaluate(() =>
        localStorage.getItem('wishlist:preferences:compressionPreset'),
      )
      expect(storedPreset).toBe('"low-bandwidth"')
    })

    test('Selected preset persists across page navigation', async ({ page }) => {
      await page.goto('/wishlist/add')
      await page.waitForLoadState('networkidle')

      // Select High quality preset
      const presetSelector = page.locator('#compressionPreset')
      await presetSelector.click()
      await page.getByRole('option', { name: /High quality/ }).click()

      // Navigate away and back
      await page.goto('/wishlist')
      await page.goto('/wishlist/add')
      await page.waitForLoadState('networkidle')

      // Check that High quality is still selected
      await expect(page.locator('#compressionPreset')).toContainText('High quality')
    })
  })

  test.describe('AC11: Skip Compression Checkbox', () => {
    test('Skip compression checkbox disables preset selector', async ({ page }) => {
      await page.goto('/wishlist/add')
      await page.waitForLoadState('networkidle')

      // Find and check the skip compression checkbox
      const skipCheckbox = page.locator('#skipCompression')
      await skipCheckbox.check()

      // Preset selector should be disabled
      const presetSelector = page.locator('#compressionPreset')
      await expect(presetSelector).toBeDisabled()
    })

    test('Unchecking skip compression re-enables preset selector', async ({ page }) => {
      await page.goto('/wishlist/add')
      await page.waitForLoadState('networkidle')

      // Check then uncheck skip compression
      const skipCheckbox = page.locator('#skipCompression')
      await skipCheckbox.check()
      await skipCheckbox.uncheck()

      // Preset selector should be enabled again
      const presetSelector = page.locator('#compressionPreset')
      await expect(presetSelector).not.toBeDisabled()
    })

    test('Skip compression preference persists to localStorage', async ({ page }) => {
      await page.goto('/wishlist/add')
      await page.waitForLoadState('networkidle')

      // Check skip compression
      await page.locator('#skipCompression').check()

      // Check localStorage
      const storedSkip = await page.evaluate(() =>
        localStorage.getItem('wishlist:preferences:skipCompression'),
      )
      expect(storedSkip).toBe('true')
    })
  })

  test.describe('Preset Description', () => {
    test('Shows description for selected preset', async ({ page }) => {
      await page.goto('/wishlist/add')
      await page.waitForLoadState('networkidle')

      // Default shows Balanced description
      await expect(page.getByText('Good quality, reasonable file size')).toBeVisible()

      // Select Low bandwidth
      const presetSelector = page.locator('#compressionPreset')
      await presetSelector.click()
      await page.getByRole('option', { name: /Low bandwidth/ }).click()

      // Should show Low bandwidth description
      await expect(page.getByText('Smallest file size, fastest upload')).toBeVisible()

      // Select High quality
      await presetSelector.click()
      await page.getByRole('option', { name: /High quality/ }).click()

      // Should show High quality description
      await expect(page.getByText('Best quality, larger file size')).toBeVisible()
    })
  })

  test.describe('Form Integration', () => {
    test('Preset selector and skip compression work together', async ({ page }) => {
      await page.goto('/wishlist/add')
      await page.waitForLoadState('networkidle')

      // Select High quality preset
      const presetSelector = page.locator('#compressionPreset')
      await presetSelector.click()
      await page.getByRole('option', { name: /High quality/ }).click()

      // Enable skip compression
      await page.locator('#skipCompression').check()

      // Preset selector should be disabled but retain selection
      await expect(presetSelector).toBeDisabled()
      await expect(presetSelector).toContainText('High quality')

      // Uncheck skip compression
      await page.locator('#skipCompression').uncheck()

      // Preset selector should be enabled and still show High quality
      await expect(presetSelector).not.toBeDisabled()
      await expect(presetSelector).toContainText('High quality')
    })
  })
})
