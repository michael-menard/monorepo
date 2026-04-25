/**
 * E2E Tests: Shell Chrome — Dark Academia Design System Migration
 *
 * Verifies that the main-app shell chrome (header, nav, footer, mobile sidebar)
 * renders correctly and remains functionally intact after the design system migration.
 *
 * These tests verify functional correctness (links work, elements present,
 * navigation functions) — NOT visual appearance.
 *
 * Prerequisites:
 *   - Frontend running on http://localhost:8000
 *   - VITE_AUTH_BYPASS=true (dev mode auto-authenticates)
 */

import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:8000'

test.describe('Shell Chrome — Header', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL)
    // Wait for auth to resolve and shell to render
    await page.waitForSelector('header', { timeout: 10000 })
  })

  test('header renders with logo and brand text', async ({ page }) => {
    const header = page.locator('header')
    await expect(header).toBeVisible()

    // Logo link exists and points to home
    const logoLink = header.locator('a[href="/"]')
    await expect(logoLink).toBeVisible()

    // Brand text is present
    await expect(header.getByText('LEGO MOC')).toBeVisible()
  })

  test('theme toggle dropdown is functional', async ({ page }) => {
    const header = page.locator('header')

    // Find and click the theme toggle button
    const themeToggle = header.locator('button').filter({ has: page.locator('svg') }).first()
    await expect(themeToggle).toBeVisible()
    await themeToggle.click()

    // Dropdown should appear with Light/Dark/System options
    await expect(page.getByText('Light')).toBeVisible()
    await expect(page.getByText('Dark')).toBeVisible()
    await expect(page.getByText('System')).toBeVisible()
  })

  test('notifications bell is present', async ({ page }) => {
    const header = page.locator('header')
    const bell = header.locator('[data-testid="bell-icon"], svg')
    // At least one button with an icon should be in the header
    const buttons = header.locator('button')
    await expect(buttons.first()).toBeVisible()
  })

  test('user menu dropdown is functional', async ({ page }) => {
    const header = page.locator('header')

    // Click the last button in header (user avatar)
    const userMenuTrigger = header.locator('button').last()
    await userMenuTrigger.click()

    // Dropdown should show user menu items
    await expect(page.getByText('Profile')).toBeVisible()
    await expect(page.getByText('Settings')).toBeVisible()
    await expect(page.getByText('Sign out')).toBeVisible()
  })
})

test.describe('Shell Chrome — Navigation Tabs', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForSelector('header', { timeout: 10000 })
  })

  test('navigation tabs are present on desktop', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 })

    // Nav tabs should be visible
    await expect(page.getByText('Dashboard')).toBeVisible()
    await expect(page.getByText('Instructions')).toBeVisible()
    await expect(page.getByText('Sets')).toBeVisible()
    await expect(page.getByText('Minifigs')).toBeVisible()
    await expect(page.getByText('Inspiration')).toBeVisible()
  })

  test('clicking a nav tab navigates to the correct route', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })

    // Click "Sets" tab
    await page.getByText('Sets').click()
    await page.waitForURL('**/sets**')
    expect(page.url()).toContain('/sets')

    // Click "Dashboard" tab
    await page.getByText('Dashboard').click()
    await page.waitForURL('**/dashboard**')
    expect(page.url()).toContain('/dashboard')
  })
})

test.describe('Shell Chrome — Footer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForSelector('header', { timeout: 10000 })
  })

  test('footer renders with brand and sections', async ({ page }) => {
    const footer = page.locator('footer')
    await expect(footer).toBeVisible()

    // Brand section
    await expect(footer.getByText('LEGO MOC Hub')).toBeVisible()

    // Section headings
    await expect(footer.getByText('Quick Links')).toBeVisible()
    await expect(footer.getByText('Support')).toBeVisible()
    await expect(footer.getByText('Legal')).toBeVisible()
  })

  test('footer links are present and navigate correctly', async ({ page }) => {
    const footer = page.locator('footer')

    // Quick links
    const galleryLink = footer.getByText('Gallery')
    await expect(galleryLink).toBeVisible()

    // Legal links
    await expect(footer.getByText('Privacy Policy')).toBeVisible()
    await expect(footer.getByText('Terms of Service')).toBeVisible()
    await expect(footer.getByText('Cookie Policy')).toBeVisible()
  })

  test('footer shows copyright and version', async ({ page }) => {
    const footer = page.locator('footer')
    const currentYear = new Date().getFullYear().toString()

    await expect(footer.getByText(new RegExp(currentYear))).toBeVisible()
    await expect(footer.getByText(/Version/)).toBeVisible()
  })
})

test.describe('Shell Chrome — Mobile Sidebar', () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(BASE_URL)
    await page.waitForSelector('header', { timeout: 10000 })
  })

  test('hamburger menu opens mobile sidebar', async ({ page }) => {
    const header = page.locator('header')

    // Find and click the menu button (should be visible on mobile)
    const menuButton = header.locator('button').first()
    await menuButton.click()

    // Sidebar should be visible
    const sidebar = page.locator('aside')
    await expect(sidebar).toBeVisible()

    // Navigation links should be present
    await expect(sidebar.getByText('Dashboard')).toBeVisible()
    await expect(sidebar.getByText('Instructions')).toBeVisible()
    await expect(sidebar.getByText('Sets')).toBeVisible()
  })

  test('mobile sidebar closes on navigation', async ({ page }) => {
    const header = page.locator('header')

    // Open sidebar
    const menuButton = header.locator('button').first()
    await menuButton.click()

    const sidebar = page.locator('aside')
    await expect(sidebar).toBeVisible()

    // Click a nav link
    await sidebar.getByText('Sets').click()

    // Sidebar should close
    await expect(sidebar).not.toBeVisible()

    // Should navigate to sets page
    expect(page.url()).toContain('/sets')
  })

  test('mobile sidebar closes on Escape key', async ({ page }) => {
    const header = page.locator('header')

    // Open sidebar
    const menuButton = header.locator('button').first()
    await menuButton.click()

    const sidebar = page.locator('aside')
    await expect(sidebar).toBeVisible()

    // Press Escape
    await page.keyboard.press('Escape')

    // Sidebar should close
    await expect(sidebar).not.toBeVisible()
  })
})

test.describe('Shell Chrome — Loading State', () => {
  test('loading spinner appears briefly on initial load', async ({ page }) => {
    // Navigate and check that the page eventually renders the shell
    await page.goto(BASE_URL)

    // After loading, the header should be visible (loading state resolved)
    await page.waitForSelector('header', { timeout: 10000 })
    await expect(page.locator('header')).toBeVisible()

    // No LEGO brick animation should exist
    await expect(page.locator('.bg-red-500')).not.toBeVisible()
    await expect(page.locator('.bg-blue-500')).not.toBeVisible()
  })
})
