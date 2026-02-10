import { test as base, expect } from '@playwright/test'

/**
 * Playwright fixture that verifies MSW is active in the browser context.
 * Used with the chromium-mocked project where VITE_ENABLE_MSW=true.
 *
 * Story: WISH-2121
 */
export const test = base.extend<{
  mswReady: void
}>({
  mswReady: [
    async ({ page }, use) => {
      // Navigate and wait for MSW to be ready
      // MSW logs "[MSW] Mocking enabled." when service worker starts
      const mswReady = page.waitForEvent('console', {
        predicate: msg => msg.text().includes('[MSW] Mocking enabled'),
        timeout: 15000,
      })

      // The page needs to navigate for the service worker to activate
      await page.goto('/')

      try {
        await mswReady
      } catch {
        // MSW may have already started before we attached the listener
        // Verify by checking service worker registrations
        const swRegistrations = await page.evaluate(() =>
          navigator.serviceWorker.getRegistrations().then(regs => regs.length),
        )
        expect(swRegistrations).toBeGreaterThan(0)
      }

      await use()
    },
    { auto: false },
  ],
})
