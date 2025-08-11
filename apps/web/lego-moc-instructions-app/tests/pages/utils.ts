import { Page, expect } from '@playwright/test';

/**
 * Test utilities for page tests
 */

// Test user data
export const testUser = {
  email: 'test@example.com',
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'User',
  confirmPassword: 'TestPassword123!',
};

export const invalidUser = {
  email: 'invalid@example.com',
  password: 'wrongpassword',
  firstName: 'Invalid',
  lastName: 'User',
  confirmPassword: 'differentpassword',
};

// Viewport sizes for responsive testing
export const viewports = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1920, height: 1080 },
};

/**
 * Wait for page to be fully loaded
 */
export async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
}

/**
 * Navigate to a page and wait for it to load
 */
export async function navigateToPage(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await waitForPageLoad(page);
}

/**
 * Check if element is visible with timeout
 */
export async function waitForElement(page: Page, selector: string, timeout = 10000): Promise<void> {
  await page.waitForSelector(selector, { timeout });
}

/**
 * Check if element is not visible
 */
export async function waitForElementNotVisible(page: Page, selector: string, timeout = 10000): Promise<void> {
  await page.waitForSelector(selector, { state: 'hidden', timeout });
}

/**
 * Click element with retry logic
 */
export async function clickElement(page: Page, selector: string, retries = 3): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      await page.click(selector);
      return;
    } catch (error) {
      if (i === retries - 1) throw error;
      await page.waitForTimeout(1000);
    }
  }
}

/**
 * Fill form field with validation
 */
export async function fillFormField(page: Page, selector: string, value: string): Promise<void> {
  await page.fill(selector, value);
  await expect(page.locator(selector)).toHaveValue(value);
}

/**
 * Submit form and wait for response
 */
export async function submitForm(page: Page, formSelector: string): Promise<void> {
  await page.click(`${formSelector} button[type="submit"]`);
  await page.waitForLoadState('networkidle');
}

/**
 * Check for validation errors
 */
export async function checkValidationErrors(page: Page, expectedErrors: string[]): Promise<void> {
  for (const error of expectedErrors) {
    await expect(page.locator(`text=${error}`)).toBeVisible();
  }
}

/**
 * Test responsive design
 */
export async function testResponsiveDesign(page: Page, url: string): Promise<void> {
  for (const [name, viewport] of Object.entries(viewports)) {
    await page.setViewportSize(viewport);
    await navigateToPage(page, url);
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('h1')).toBeVisible();
  }
}

/**
 * Test keyboard navigation
 */
export async function testKeyboardNavigation(page: Page): Promise<void> {
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toBeVisible();
  
  await page.keyboard.press('ArrowDown');
  await expect(page.locator(':focus')).toBeVisible();
}

/**
 * Test loading states
 */
export async function testLoadingStates(page: Page, url: string): Promise<void> {
  await navigateToPage(page, url);
  
  // Check for loading indicator
  const loadingSelector = '[data-testid="loading"], [class*="loading"], [class*="spinner"]';
  const loadingElement = page.locator(loadingSelector);
  
  if (await loadingElement.isVisible()) {
    await expect(loadingElement).toBeVisible();
    await waitForElementNotVisible(page, loadingSelector);
  }
}

/**
 * Test error handling
 */
export async function testErrorHandling(page: Page, url: string, expectedError: string): Promise<void> {
  await navigateToPage(page, url);
  await expect(page.locator(`text=${expectedError}`)).toBeVisible();
}

/**
 * Test search functionality
 */
export async function testSearch(page: Page, searchTerm: string, expectedResults = true): Promise<void> {
  const searchInput = page.locator('input[placeholder*="search" i], [data-testid="search-input"]');
  
  if (await searchInput.isVisible()) {
    await searchInput.fill(searchTerm);
    await searchInput.press('Enter');
    await page.waitForLoadState('networkidle');
    
    if (expectedResults) {
      await expect(page.locator('[data-testid="search-results"], [class*="search-results"]')).toBeVisible();
    } else {
      await expect(page.locator('text=No results found, [data-testid="empty-state"]')).toBeVisible();
    }
  }
}

/**
 * Test pagination
 */
export async function testPagination(page: Page): Promise<void> {
  const pagination = page.locator('[data-testid="pagination"], [class*="pagination"], nav[aria-label*="pagination" i]');
  
  if (await pagination.isVisible()) {
    const nextButton = pagination.locator('text=Next, [aria-label*="next" i]');
    
    if (await nextButton.isVisible()) {
      await nextButton.click();
      await expect(page).toHaveURL(/page=2/);
      
      const prevButton = pagination.locator('text=Previous, [aria-label*="previous" i]');
      await expect(prevButton).toBeVisible();
    }
  }
}

/**
 * Test filtering
 */
export async function testFiltering(page: Page, filterType: string, filterValue: string): Promise<void> {
  const filterButton = page.locator('text=Filter, button[aria-label*="filter" i], [data-testid="filter-button"]');
  
  if (await filterButton.isVisible()) {
    await filterButton.click();
    await expect(page.locator(`text=${filterType}, [data-testid="${filterType.toLowerCase()}-filter"]`)).toBeVisible();
    
    await page.click(`text=${filterValue}`);
    await expect(page.locator('[data-testid="active-filter"], [class*="active-filter"]')).toBeVisible();
  }
}

/**
 * Test sorting
 */
export async function testSorting(page: Page, sortOption: string): Promise<void> {
  const sortButton = page.locator('text=Sort, button[aria-label*="sort" i], [data-testid="sort-button"]');
  
  if (await sortButton.isVisible()) {
    await sortButton.click();
    await expect(page.locator(`text=${sortOption}`)).toBeVisible();
    
    await page.click(`text=${sortOption}`);
    await expect(page.locator('[data-testid="active-sort"], [class*="active-sort"]')).toBeVisible();
  }
}

/**
 * Test authentication flow
 */
export async function testAuthenticationFlow(page: Page, isLogin = true): Promise<void> {
  const url = isLogin ? '/auth/login' : '/auth/signup';
  await navigateToPage(page, url);
  
  if (isLogin) {
    await fillFormField(page, 'input[type="email"]', testUser.email);
    await fillFormField(page, 'input[type="password"]', testUser.password);
  } else {
    await fillFormField(page, 'input[name="firstName"]', testUser.firstName);
    await fillFormField(page, 'input[name="lastName"]', testUser.lastName);
    await fillFormField(page, 'input[type="email"]', testUser.email);
    await fillFormField(page, 'input[type="password"]', testUser.password);
    await fillFormField(page, 'input[name="confirmPassword"]', testUser.confirmPassword);
  }
  
  await submitForm(page, 'form');
}

/**
 * Test wishlist functionality
 */
export async function testWishlistFunctionality(page: Page): Promise<void> {
  const wishlistButton = page.locator('[data-testid="wishlist-button"], [class*="wishlist"], text=Add to Wishlist');
  
  if (await wishlistButton.isVisible()) {
    await wishlistButton.click();
    await expect(page.locator('text=Added to Wishlist, [data-testid="wishlist-added"]')).toBeVisible();
    
    const removeButton = page.locator('text=Remove from Wishlist, [data-testid="wishlist-remove"]');
    if (await removeButton.isVisible()) {
      await removeButton.click();
      await expect(page.locator('text=Add to Wishlist')).toBeVisible();
    }
  }
}

/**
 * Test sharing functionality
 */
export async function testSharingFunctionality(page: Page): Promise<void> {
  const shareButton = page.locator('[data-testid="share-button"], [class*="share"], text=Share');
  
  if (await shareButton.isVisible()) {
    await shareButton.click();
    await expect(page.locator('[data-testid="share-options"], [class*="share-options"]')).toBeVisible();
  }
}

/**
 * Test file upload
 */
export async function testFileUpload(page: Page, filePath: string): Promise<void> {
  const fileInput = page.locator('input[type="file"]');
  
  if (await fileInput.isVisible()) {
    await fileInput.setInputFiles(filePath);
    await expect(page.locator('[data-testid="upload-progress"], [class*="upload-progress"]')).toBeVisible();
  }
}

/**
 * Test cache functionality
 */
export async function testCacheFunctionality(page: Page): Promise<void> {
  const clearButton = page.locator('text=Clear Cache, [data-testid="clear-cache"]');
  
  if (await clearButton.isVisible()) {
    await clearButton.click();
    await expect(page.locator('[data-testid="cache-cleared"], [class*="cache-cleared"], text=Cache cleared')).toBeVisible();
  }
}

/**
 * Generate random test data
 */
export function generateRandomEmail(): string {
  return `test-${Date.now()}@example.com`;
}

export function generateRandomString(length = 10): string {
  return Math.random().toString(36).substring(2, length + 2);
}

/**
 * Check if element exists
 */
export async function elementExists(page: Page, selector: string): Promise<boolean> {
  return await page.locator(selector).count() > 0;
}

/**
 * Wait for network idle with custom timeout
 */
export async function waitForNetworkIdle(page: Page, timeout = 10000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Take screenshot for debugging
 */
export async function takeScreenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `test-results/${name}-${Date.now()}.png` });
}

/**
 * Log test step
 */
export function logStep(step: string): void {
  console.log(`[TEST STEP] ${step}`);
}

/**
 * Test accessibility basics
 */
export async function testAccessibilityBasics(page: Page): Promise<void> {
  // Check for proper heading structure
  const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
  expect(headings.length).toBeGreaterThan(0);
  
  // Check for alt text on images
  const images = await page.locator('img').all();
  for (const img of images) {
    const alt = await img.getAttribute('alt');
    expect(alt).toBeTruthy();
  }
  
  // Test keyboard navigation
  await testKeyboardNavigation(page);
} 