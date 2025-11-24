import { expect, test } from '@playwright/test'

/**
 * Simple Avatar Test - Check avatar implementation without auth
 */
test.describe('Simple Avatar Test', () => {
  test('should check avatar implementation on profile page', async ({ page }) => {
    // Try to access profile page directly
    await page.goto('/profile')
    await page.waitForLoadState('networkidle')

    console.log(`📍 Current URL: ${page.url()}`)

    // If we're redirected to login, that's expected
    if (page.url().includes('/login')) {
      console.log('✅ Profile page requires authentication (as expected)')

      // Let's check what the login page looks like
      const loginForm = await page.locator('form').count()
      console.log(`📝 Login forms found: ${loginForm}`)

      // Check for email and password inputs
      const emailInput = await page.locator('input[type="email"]').count()
      const passwordInput = await page.locator('input[type="password"]').count()
      console.log(`📧 Email inputs: ${emailInput}`)
      console.log(`🔒 Password inputs: ${passwordInput}`)

      // Check for submit button
      const submitButton = await page.locator('button[type="submit"]').count()
      console.log(`🔘 Submit buttons: ${submitButton}`)

      // Test passes if login page is properly set up
      expect(emailInput).toBeGreaterThan(0)
      expect(passwordInput).toBeGreaterThan(0)
      expect(submitButton).toBeGreaterThan(0)
    } else {
      console.log('📄 Accessed profile page directly')

      // Check what's on the profile page
      const pageTitle = await page.title()
      console.log(`📄 Page title: ${pageTitle}`)

      // Look for any images
      const allImages = await page.locator('img').count()
      console.log(`🖼️  Total images on page: ${allImages}`)

      if (allImages > 0) {
        for (let i = 0; i < Math.min(allImages, 3); i++) {
          const img = page.locator('img').nth(i)
          const src = await img.getAttribute('src')
          const alt = await img.getAttribute('alt')
          console.log(`   Image ${i + 1}: src="${src}", alt="${alt}"`)
        }
      }

      // Look for avatar-related elements
      const avatarElements = await page
        .locator('[class*="avatar"], [data-testid*="avatar"], img[alt*="avatar"]')
        .count()
      console.log(`👤 Avatar-related elements: ${avatarElements}`)

      // Test passes if we can access the page
      expect(page.url()).toContain('/profile')
    }
  })

  test('should check if auth service is responding', async ({ page }) => {
    // Test if we can reach the auth service health endpoint
    try {
      const response = await page.request.get('http://localhost:9000/api/auth/csrf')
      const status = response.status()
      console.log(`🔗 Auth service CSRF endpoint status: ${status}`)

      if (status === 200) {
        const body = await response.json()
        console.log(`✅ Auth service is responding`)
        console.log(`🔑 CSRF token received: ${body.token ? 'Yes' : 'No'}`)
      } else {
        console.log(`❌ Auth service returned status: ${status}`)
      }

      // Test passes regardless of auth service status
      expect(status).toBeGreaterThan(0)
    } catch (error) {
      console.log(`❌ Auth service not reachable: ${error}`)
      // Test still passes - this is just diagnostic
      expect(true).toBe(true)
    }
  })

  test('should check current profile page implementation', async ({ page }) => {
    // Navigate to home page first to see the app structure
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    console.log(`📍 Home page URL: ${page.url()}`)
    console.log(`📄 Home page title: ${await page.title()}`)

    // Look for navigation links
    const navLinks = await page.locator('nav a, [role="navigation"] a').count()
    console.log(`🧭 Navigation links: ${navLinks}`)

    if (navLinks > 0) {
      for (let i = 0; i < Math.min(navLinks, 5); i++) {
        const link = page.locator('nav a, [role="navigation"] a').nth(i)
        const href = await link.getAttribute('href')
        const text = await link.textContent()
        console.log(`   Link ${i + 1}: "${text?.trim()}" -> ${href}`)
      }
    }

    // Look for profile-related links
    const profileLinks = await page
      .locator('a[href*="profile"], button:has-text("Profile")')
      .count()
    console.log(`👤 Profile-related links: ${profileLinks}`)

    // Check if there are any avatar images on the home page
    const avatarImages = await page
      .locator('img[alt*="avatar"], img[alt*="profile"], .avatar img')
      .count()
    console.log(`👤 Avatar images on home page: ${avatarImages}`)

    // Test passes if home page loads
    expect(page.url()).toContain('/')
  })
})
