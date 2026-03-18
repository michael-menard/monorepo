/**
 * Story Details Test Utilities
 * Helper functions for story details E2E tests
 */

import { Page } from '@playwright/test'

export interface TestStoryData {
  storyId: string
  title: string
  description?: string
  state: string
  priority?: string
  epic?: string
  metadata?: {
    surfaces?: {
      backend?: boolean
      frontend?: boolean
      database?: boolean
      infra?: boolean
    }
    tags?: string[]
  }
}

export async function waitForStoryDetailsPage(page: Page, storyId: string): Promise<void> {
  await page.goto(`/story/${storyId}`)
  await page.waitForLoadState('networkidle')
}

export async function waitForPlanDetailsPage(page: Page, planSlug: string): Promise<void> {
  await page.goto(`/plan/${planSlug}`)
  await page.waitForLoadState('networkidle')
}

export async function getStoryTitle(page: Page): Promise<string> {
  return page.locator('h1').textContent() ?? ''
}

export async function getStoryBadges(page: Page): Promise<string[]> {
  const badges = page.locator('[class*="badge"]')
  const count = await badges.count()
  const texts: string[] = []
  for (let i = 0; i < count; i++) {
    texts.push((await badges.nth(i).textContent()) ?? '')
  }
  return texts
}

export async function hasErrorMessage(page: Page): Promise<boolean> {
  const errorLocator = page.locator('[class*="destructive"], text=/error|failed/i')
  return errorLocator
    .first()
    .isVisible()
    .catch(() => false)
}

export async function hasLoadingSkeleton(page: Page): Promise<boolean> {
  const skeleton = page.locator('.animate-pulse')
  return skeleton
    .first()
    .isVisible()
    .catch(() => false)
}
