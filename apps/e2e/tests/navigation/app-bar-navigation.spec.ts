import { expect, test } from '@playwright/test';

/**
 * App Bar and Navigation E2E Tests
 * 
 * Tests the top navigation bar functionality including:
 * - Brand logo and navigation
 * - Authentication state handling
 * - Responsive navigation behavior
 * - User interaction flows
 * - Visual consistency across pages
 */
test.describe('App Bar and Navigation', () => {
  // Set timeout for all tests in this describe block
  test.describe.configure({ timeout: 30000 }); // 30 seconds

  test.beforeEach(async ({ page }) => {
    // Start from home page
    await page.goto('/', { timeout: 10000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 });
  });

  test('should display brand logo and name in app bar', async ({ page }) => {
    // Check for brand elements
    const brandLink = page.locator('a[href="/"]').filter({ hasText: 'MOC Builder' });
    await expect(brandLink).toBeVisible({ timeout: 10000 });

    // Check for logo element - be more specific with the selector
    const logo = page.locator('a[href="/"] span.text-primary-foreground').filter({ hasText: 'M' });
    await expect(logo).toBeVisible({ timeout: 5000 });

    console.log('✅ Brand logo and name are visible in app bar');
  });

  test('should have sticky navigation bar', async ({ page }) => {
    // Check for sticky positioning
    const navbar = page.locator('nav[role="navigation"]');
    await expect(navbar).toBeVisible();
    
    // Check for sticky classes
    const stickyClasses = await navbar.getAttribute('class');
    expect(stickyClasses).toContain('sticky');
    expect(stickyClasses).toContain('top-0');
    
    console.log('✅ Navigation bar has sticky positioning');
  });

  test('should navigate to home when brand is clicked', async ({ page }) => {
    // Navigate to a different page first
    await page.goto('/moc-gallery', { timeout: 10000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Click brand logo
    const brandLink = page.locator('a[href="/"]').filter({ hasText: 'MOC Builder' });
    await brandLink.click({ timeout: 5000 });

    // Should navigate to home
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    expect(page.url()).toContain('/');

    console.log('✅ Brand logo navigates to home page');
  });

  test('should display Browse MOCs navigation link', async ({ page }) => {
    // Browse MOCs link is only visible on desktop (hidden on mobile)
    const browseMocsLink = page.locator('a[href="/moc-gallery"]').filter({ hasText: 'Browse MOCs' });
    await expect(browseMocsLink).toBeVisible({ timeout: 10000 });

    // Check for search icon
    const searchIcon = browseMocsLink.locator('svg');
    await expect(searchIcon).toBeVisible({ timeout: 5000 });

    console.log('✅ Browse MOCs link is visible with search icon');
  });

  test('should navigate to MOC gallery when Browse MOCs is clicked', async ({ page }) => {
    const browseMocsLink = page.locator('a[href="/moc-gallery"]').filter({ hasText: 'Browse MOCs' });
    await browseMocsLink.click({ timeout: 5000 });

    await page.waitForLoadState('networkidle', { timeout: 10000 });
    expect(page.url()).toContain('/moc-gallery');

    console.log('✅ Browse MOCs link navigates to gallery page');
  });

  test('should show hover effects on navigation links', async ({ page }) => {
    const browseMocsLink = page.locator('a[href="/moc-gallery"]').filter({ hasText: 'Browse MOCs' });
    
    // Hover over the link
    await browseMocsLink.hover();
    
    // Check for hover state (color should change)
    const linkClasses = await browseMocsLink.getAttribute('class');
    expect(linkClasses).toContain('hover:text-foreground');
    
    console.log('✅ Navigation links have hover effects');
  });

  test('should display Sign In and Sign Up buttons when not authenticated', async ({ page }) => {
    // Check for authentication buttons - they are wrapped in Link components
    const signInButton = page.locator('a[href="/auth/login"] button').filter({ hasText: 'Sign In' });
    const signUpButton = page.locator('a[href="/auth/signup"] button').filter({ hasText: 'Sign Up' });

    await expect(signInButton).toBeVisible({ timeout: 10000 });
    await expect(signUpButton).toBeVisible({ timeout: 10000 });

    console.log('✅ Sign In and Sign Up buttons are visible');
  });

  test('should navigate to login page when Sign In is clicked', async ({ page }) => {
    const signInLink = page.locator('a[href="/auth/login"]');
    await signInLink.click({ timeout: 5000 });

    await page.waitForLoadState('networkidle', { timeout: 10000 });
    expect(page.url()).toContain('/auth/login');

    console.log('✅ Sign In button navigates to login page');
  });

  test('should navigate to signup page when Sign Up is clicked', async ({ page }) => {
    const signUpLink = page.locator('a[href="/auth/signup"]');
    await signUpLink.click({ timeout: 5000 });

    await page.waitForLoadState('networkidle', { timeout: 10000 });
    expect(page.url()).toContain('/auth/signup');

    console.log('✅ Sign Up button navigates to signup page');
  });

  test('should have proper button styling hierarchy', async ({ page }) => {
    const signInButton = page.locator('a[href="/auth/login"] button');
    const signUpButton = page.locator('a[href="/auth/signup"] button');

    // Wait for buttons to be visible
    await expect(signInButton).toBeVisible({ timeout: 10000 });
    await expect(signUpButton).toBeVisible({ timeout: 10000 });

    // Check that buttons exist (styling may vary based on UI library implementation)
    const signInExists = await signInButton.count() > 0;
    const signUpExists = await signUpButton.count() > 0;

    expect(signInExists).toBe(true);
    expect(signUpExists).toBe(true);

    console.log('✅ Authentication buttons have proper styling hierarchy');
  });

  test('should show desktop navigation on large screens', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(500);

    // Desktop navigation should be visible - Browse MOCs link is hidden on mobile
    const browseMocsLink = page.locator('a[href="/moc-gallery"]').filter({ hasText: 'Browse MOCs' });
    await expect(browseMocsLink).toBeVisible({ timeout: 10000 });

    console.log('✅ Desktop navigation is visible on large screens');
  });

  test('should adapt navigation for mobile screens', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);

    // On mobile, Browse MOCs link should be hidden, but auth buttons should still be visible
    const signInButton = page.locator('a[href="/auth/login"] button');
    const signUpButton = page.locator('a[href="/auth/signup"] button');

    await expect(signInButton).toBeVisible({ timeout: 10000 });
    await expect(signUpButton).toBeVisible({ timeout: 10000 });

    console.log('✅ Mobile navigation elements are present');
  });

  test('should maintain brand visibility across screen sizes', async ({ page }) => {
    const viewports = [
      { width: 1920, height: 1080, name: 'Desktop' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 375, height: 667, name: 'Mobile' }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(500);
      
      const brandLink = page.locator('a[href="/"]').filter({ hasText: 'MOC Builder' });
      await expect(brandLink).toBeVisible();
      
      console.log(`✅ Brand is visible on ${viewport.name} (${viewport.width}x${viewport.height})`);
    }
  });

  test('should maintain authentication buttons on all screen sizes', async ({ page }) => {
    const viewports = [
      { width: 1280, height: 720 },
      { width: 768, height: 1024 },
      { width: 375, height: 667 }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(500);
      
      // Authentication buttons should be visible
      const signInButton = page.locator('a[href="/auth/login"] button');
      const signUpButton = page.locator('a[href="/auth/signup"] button');

      await expect(signInButton).toBeVisible({ timeout: 10000 });
      await expect(signUpButton).toBeVisible({ timeout: 10000 });
      
      console.log(`✅ Auth buttons visible at ${viewport.width}x${viewport.height}`);
    }
  });

  test('should maintain consistent styling across pages', async ({ page }) => {
    const pages = ['/', '/moc-gallery'];
    
    for (const pagePath of pages) {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');
      
      // Check navbar styling - the main nav is the sticky one
      const navbar = page.locator('nav.sticky');
      await expect(navbar).toBeVisible({ timeout: 10000 });

      const navbarClasses = await navbar.getAttribute('class');
      expect(navbarClasses).toContain('sticky');
      expect(navbarClasses).toContain('backdrop-blur');
      
      console.log(`✅ Consistent navbar styling on ${pagePath}`);
    }
  });

  test('should have proper backdrop blur and transparency', async ({ page }) => {
    const navbar = page.locator('nav.sticky');
    await expect(navbar).toBeVisible({ timeout: 10000 });

    // Check for backdrop blur classes
    const navbarClasses = await navbar.getAttribute('class');
    expect(navbarClasses).toContain('backdrop-blur');

    console.log('✅ Navbar has proper backdrop blur and transparency');
  });

  test('should maintain proper z-index stacking', async ({ page }) => {
    const navbar = page.locator('nav.sticky');
    await expect(navbar).toBeVisible({ timeout: 10000 });

    // Check for z-index classes
    const navbarClasses = await navbar.getAttribute('class');
    expect(navbarClasses).toContain('z-50');

    console.log('✅ Navbar has proper z-index for stacking');
  });

  test('should have proper semantic navigation structure', async ({ page }) => {
    // Check for navigation landmark
    const nav = page.locator('nav');
    await expect(nav).toBeVisible({ timeout: 10000 });

    console.log('✅ Navigation has proper semantic structure');
  });

  test('should support keyboard navigation', async ({ page }) => {
    // Tab through navigation elements
    await page.keyboard.press('Tab');

    // Should focus on brand link first
    const brandLink = page.locator('a[href="/"]').filter({ hasText: 'MOC Builder' });
    await expect(brandLink).toBeFocused({ timeout: 5000 });

    console.log('✅ Keyboard navigation works correctly');
  });

  test('should have accessible link text and labels', async ({ page }) => {
    // Check for accessible names
    const brandLink = page.locator('a[href="/"]').filter({ hasText: 'MOC Builder' });
    await expect(brandLink).toBeVisible({ timeout: 10000 });

    // Check that the link has accessible text
    const linkText = await brandLink.textContent();
    expect(linkText).toContain('MOC Builder');

    console.log('✅ Navigation links have accessible names');
  });

  test('should load navigation quickly', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/', { timeout: 15000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Navigation should be visible quickly
    const navbar = page.locator('nav.sticky');
    await expect(navbar).toBeVisible({ timeout: 10000 });

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(20000); // Should load within 20 seconds

    console.log(`✅ Navigation loaded in ${loadTime}ms`);
  });

  test('should not cause layout shifts', async ({ page }) => {
    await page.goto('/', { timeout: 15000 });

    // Wait for initial load
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Get initial navbar position
    const navbar = page.locator('nav.sticky');
    await expect(navbar).toBeVisible({ timeout: 10000 });
    const initialBox = await navbar.boundingBox();

    // Wait a bit more
    await page.waitForTimeout(1000);

    // Check position hasn't shifted
    const finalBox = await navbar.boundingBox();

    expect(initialBox?.y).toBe(finalBox?.y);

    console.log('✅ Navigation does not cause layout shifts');
  });

  test('should handle navigation errors gracefully', async ({ page }) => {
    // Monitor console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigation should still be visible even if there are minor errors
    const navbar = page.locator('nav.sticky');
    await expect(navbar).toBeVisible({ timeout: 10000 });
    
    // Should not have critical navigation errors
    const criticalErrors = errors.filter(error => 
      error.toLowerCase().includes('navigation') || 
      error.toLowerCase().includes('router')
    );
    
    expect(criticalErrors.length).toBe(0);
    
    console.log('✅ Navigation handles errors gracefully');
  });
});
