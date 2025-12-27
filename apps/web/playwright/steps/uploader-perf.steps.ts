/* eslint-disable no-empty-pattern */
/**
 * Step definitions for Uploader Performance tests
 * Story 3.1.26: E2E + A11y + Performance
 */

import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { UploaderPage } from './pages/uploader.page'

const { When, Then } = createBdd()

let uploaderPage: UploaderPage
let navigationStartTime: number

// Navigation with timing
When('I navigate to the instructions upload page', async ({ page }) => {
  uploaderPage = new UploaderPage(page)
  navigationStartTime = Date.now()
  await page.goto('/instructions/new')
})

When('I am on the dashboard', async ({ page }) => {
  await page.goto('/dashboard')
  await page.waitForLoadState('networkidle')
})

// TTI Checks
Then('the page should be interactive within {int}ms', async ({}, maxMs: number) => {
  // Wait for title input to be interactive
  await uploaderPage.titleInput.waitFor({ state: 'visible' })
  await expect(uploaderPage.titleInput).toBeEnabled()

  const tti = Date.now() - navigationStartTime
  // eslint-disable-next-line no-console
  console.log(`TTI: ${tti}ms (budget: ${maxMs}ms)`)
  expect(tti).toBeLessThanOrEqual(maxMs)
})

Then('the title input should be visible within {int}ms', async ({}, maxMs: number) => {
  const elapsed = Date.now() - navigationStartTime
  await expect(uploaderPage.titleInput).toBeVisible()
  // eslint-disable-next-line no-console
  console.log(`Title input visible at: ${elapsed}ms (budget: ${maxMs}ms)`)
  expect(elapsed).toBeLessThanOrEqual(maxMs)
})

// Bundle Size / Lazy Loading
Then('the uploader module should not be loaded', async ({ page }) => {
  const uploaderComponentExists = await page.evaluate(() => {
    // Check if uploader-specific code is in the page
    return document.querySelector('[data-component="uploader"]') !== null
  })
  expect(uploaderComponentExists).toBe(false)
})

Then('the uploader module should be loaded', async ({ page }) => {
  await page.waitForLoadState('networkidle')
  // The uploader page content should be visible
  await expect(uploaderPage.titleInput).toBeVisible()
})

// LCP Check
Then('the LCP should be under {int}ms', async ({ page }, maxMs: number) => {
  // Use Performance API to get LCP
  const lcp = await page.evaluate(
    () =>
      new Promise<number>(resolve => {
        let lcpValue = 0

        const observer = new PerformanceObserver(list => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1]
          lcpValue = lastEntry.startTime
        })

        observer.observe({ type: 'largest-contentful-paint', buffered: true })

        // Give it a moment to capture LCP, then resolve
        setTimeout(() => {
          observer.disconnect()
          resolve(lcpValue)
        }, 1000)
      }),
  )

  // eslint-disable-next-line no-console
  console.log(`LCP: ${lcp}ms (budget: ${maxMs}ms)`)
  expect(lcp).toBeLessThanOrEqual(maxMs)
})

// CLS Check
When('I wait for the page to stabilize', async ({ page }) => {
  await page.waitForLoadState('networkidle')
  // Additional wait for any late-loading content
  await page.waitForTimeout(500)
})

Then('the CLS should be under {float}', async ({ page }, maxCls: number) => {
  const cls = await page.evaluate(
    () =>
      new Promise<number>(resolve => {
        let clsValue = 0

        const observer = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            if (!(entry as PerformanceEntry & { hadRecentInput?: boolean }).hadRecentInput) {
              clsValue += (entry as PerformanceEntry & { value: number }).value
            }
          }
        })

        observer.observe({ type: 'layout-shift', buffered: true })

        setTimeout(() => {
          observer.disconnect()
          resolve(clsValue)
        }, 1000)
      }),
  )

  // eslint-disable-next-line no-console
  console.log(`CLS: ${cls} (budget: ${maxCls})`)
  expect(cls).toBeLessThanOrEqual(maxCls)
})

// Helper for measuring specific metrics (exported for future use)
export async function measureWebVitals(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    return new Promise<{
      fcp: number
      lcp: number
      cls: number
      fid: number
    }>(resolve => {
      const metrics = {
        fcp: 0,
        lcp: 0,
        cls: 0,
        fid: 0,
      }

      // First Contentful Paint
      const fcpObserver = new PerformanceObserver(list => {
        const entries = list.getEntries()
        if (entries.length > 0) {
          metrics.fcp = entries[0].startTime
        }
      })
      fcpObserver.observe({ type: 'paint', buffered: true })

      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver(list => {
        const entries = list.getEntries()
        if (entries.length > 0) {
          metrics.lcp = entries[entries.length - 1].startTime
        }
      })
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })

      // Cumulative Layout Shift
      const clsObserver = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (!(entry as PerformanceEntry & { hadRecentInput?: boolean }).hadRecentInput) {
            metrics.cls += (entry as PerformanceEntry & { value: number }).value
          }
        }
      })
      clsObserver.observe({ type: 'layout-shift', buffered: true })

      // First Input Delay
      const fidObserver = new PerformanceObserver(list => {
        const entries = list.getEntries()
        if (entries.length > 0) {
          metrics.fid =
            (entries[0] as PerformanceEntry & { processingStart: number }).processingStart -
            entries[0].startTime
        }
      })
      fidObserver.observe({ type: 'first-input', buffered: true })

      // Wait and resolve
      setTimeout(() => {
        fcpObserver.disconnect()
        lcpObserver.disconnect()
        clsObserver.disconnect()
        fidObserver.disconnect()
        resolve(metrics)
      }, 2000)
    })
  })
}
