import { expect, test } from '@playwright/test'

/**
 * Debug Profile Page Test
 *
 * This test helps debug what's actually rendering on the profile page
 */
test.describe('Debug Profile Page', () => {
  test('should debug profile page elements', async ({ page }) => {
    // Navigate to profile page
    await page.goto('/profile')
    await page.waitForLoadState('networkidle')

    // If redirected to login, perform login
    if (page.url().includes('/login')) {
      console.log('🔐 Logging in...')

      // Wait for login form to be ready
      await page.waitForSelector('input[type="email"]', { timeout: 10000 })
      await page.waitForSelector('input[type="password"]', { timeout: 10000 })
      await page.waitForSelector('button[type="submit"]', { timeout: 10000 })

      // Fill login form
      await page.fill('input[type="email"]', 'test@example.com')
      await page.fill('input[type="password"]', 'TestPassword123!')

      // Click submit and wait for navigation
      await Promise.all([
        page.waitForNavigation({ timeout: 10000 }),
        page.click('button[type="submit"]'),
      ])

      console.log(`📍 After login URL: ${page.url()}`)

      // If still not on profile, try navigating again
      if (!page.url().includes('/profile')) {
        console.log('🔄 Redirecting to profile page...')
        await page.goto('/profile')
        await page.waitForLoadState('networkidle')
        console.log(`📍 Final URL: ${page.url()}`)
      }
    }

    console.log(`📍 Current URL: ${page.url()}`)

    // Debug: Check what's actually on the page
    const pageTitle = await page.title()
    console.log(`📄 Page title: ${pageTitle}`)

    // Look for any images
    const allImages = await page.locator('img').count()
    console.log(`🖼️  Total images on page: ${allImages}`)

    if (allImages > 0) {
      for (let i = 0; i < Math.min(allImages, 5); i++) {
        const img = page.locator('img').nth(i)
        const src = await img.getAttribute('src')
        const alt = await img.getAttribute('alt')
        const className = await img.getAttribute('class')
        console.log(`   Image ${i + 1}: src="${src}", alt="${alt}", class="${className}"`)
      }
    }

    // Look for avatar-related elements
    const avatarElements = await page
      .locator('[class*="avatar"], [data-testid*="avatar"], img[alt*="avatar"]')
      .count()
    console.log(`👤 Avatar-related elements: ${avatarElements}`)

    // Look for profile-related elements
    const profileElements = await page
      .locator('[class*="profile"], [data-testid*="profile"]')
      .count()
    console.log(`👤 Profile-related elements: ${profileElements}`)

    // Look for any buttons
    const allButtons = await page.locator('button').count()
    console.log(`🔘 Total buttons on page: ${allButtons}`)

    if (allButtons > 0) {
      for (let i = 0; i < Math.min(allButtons, 5); i++) {
        const button = page.locator('button').nth(i)
        const text = await button.textContent()
        const className = await button.getAttribute('class')
        console.log(`   Button ${i + 1}: text="${text?.trim()}", class="${className}"`)
      }
    }

    // Look for file inputs
    const fileInputs = await page.locator('input[type="file"]').count()
    console.log(`📁 File inputs on page: ${fileInputs}`)

    // Look for any upload-related elements
    const uploadElements = await page
      .locator('[class*="upload"], [data-testid*="upload"], button:has-text("Upload")')
      .count()
    console.log(`📤 Upload-related elements: ${uploadElements}`)

    // Check for any error messages
    const errorElements = await page.locator('.error, [role="alert"], .text-red-500').count()
    console.log(`❌ Error elements: ${errorElements}`)

    if (errorElements > 0) {
      const firstError = page.locator('.error, [role="alert"], .text-red-500').first()
      const errorText = await firstError.textContent()
      console.log(`   First error: "${errorText?.trim()}"`)
    }

    // Check the main content structure
    const mainContent = await page.locator('main, [role="main"], .main-content').count()
    console.log(`📋 Main content areas: ${mainContent}`)

    // Check for sidebar content
    const sidebarContent = await page.locator('aside, .sidebar, [class*="sidebar"]').count()
    console.log(`📋 Sidebar areas: ${sidebarContent}`)

    // Check for any React/component errors in console
    const consoleMessages: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        consoleMessages.push(`${msg.type()}: ${msg.text()}`)
      }
    })

    await page.waitForTimeout(2000)

    if (consoleMessages.length > 0) {
      console.log(`🚨 Console messages:`)
      consoleMessages.forEach(msg => console.log(`   ${msg}`))
    }

    // Take a screenshot for debugging
    await page.screenshot({ path: 'debug-profile-page.png', fullPage: true })
    console.log('📸 Screenshot saved as debug-profile-page.png')

    // Test passes if we can access the profile page
    expect(page.url()).toContain('/profile')
  })
})
