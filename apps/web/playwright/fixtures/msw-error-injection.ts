import { Page } from '@playwright/test'

/**
 * Error injection helpers for MSW in Playwright E2E tests.
 * These work by setting custom headers that MSW handlers check.
 *
 * Story: WISH-2121 (AC21)
 */

/** Inject presign endpoint error by intercepting requests and adding error header */
export async function injectPresignError(page: Page, errorCode: '500' | '403' | 'timeout') {
  await page.route('**/api/wishlist/images/presign', async route => {
    const request = route.request()
    const headers = {
      ...request.headers(),
      'x-mock-error': errorCode,
    }
    await route.continue({ headers })
  })
}

/** Inject S3 upload error by intercepting requests and adding error header */
export async function injectS3Error(page: Page, errorCode: '403' | '500' | 'timeout') {
  await page.route('**/*.s3.amazonaws.com/**', async route => {
    const request = route.request()
    const headers = {
      ...request.headers(),
      'x-mock-error': errorCode,
    }
    await route.continue({ headers })
  })
}

/** Clear all injected errors by removing route handlers */
export async function clearInjectedErrors(page: Page) {
  await page.unrouteAll({ behavior: 'ignoreErrors' })
}
