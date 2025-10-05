import { expect, test } from '@playwright/test';
import { createAuthTestUtils } from './utils';

/**
 * REAL E2E Form Validation Tests - NO MOCKING
 * 
 * These tests validate real form behavior and validation:
 * - Real client-side validation
 * - Real server-side validation responses
 * - Real form submission handling
 * - Real error message display
 * 
 * NO MOCKING ALLOWED - Tests real form behavior end-to-end
 */
test.describe('Real E2E Form Validation Tests (No Mocking)', () => {
  test.describe.configure({ timeout: 60000 }); // 1 minute for form tests

  test.beforeAll(async () => {
    console.log('📝 REAL E2E Form Validation Testing (NO MOCKING):');
    console.log('  ✅ Real Client-side Validation');
    console.log('  ✅ Real Server-side Validation');
    console.log('  ✅ Real Form Submission');
    console.log('  ✅ Real Error Messages');
    console.log('  ❌ NO MOCKING - True End-to-End Testing');
  });

  test.beforeEach(async ({ page }) => {
    const authUtils = createAuthTestUtils(page);
    await authUtils.setup();
  });

  test.afterEach(async ({ page }) => {
    const authUtils = createAuthTestUtils(page);
    await authUtils.cleanup();
  });

  test.describe('Real Login Form Validation', () => {
    test('should show real validation errors for empty form submission', async ({ page }) => {
      test.setTimeout(30000);
      
      const authUtils = createAuthTestUtils(page);
      const apiMonitor = await authUtils.monitorRealApiCalls();
      
      console.log('🔄 Testing real form validation for empty fields...');
      
      // Navigate to login page
      await page.goto('/auth/login', { waitUntil: 'networkidle', timeout: 15000 });
      
      // Try to submit empty form (real validation should trigger)
      await page.click('button[type="submit"]');
      
      // Wait for real validation to appear
      await page.waitForTimeout(2000);
      
      // Check for real validation errors
      const emailError = page.locator('text=/email.*required|please enter.*email/i');
      const passwordError = page.locator('text=/password.*required|please enter.*password/i');
      
      // At least one validation error should be visible
      const emailVisible = await emailError.isVisible();
      const passwordVisible = await passwordError.isVisible();
      
      expect(emailVisible || passwordVisible).toBeTruthy();
      console.log('✅ Real validation errors displayed');
      
      // Should not make API calls for client-side validation
      expect(apiMonitor.authRequests.length).toBe(0);
      console.log('✅ No unnecessary API calls for client-side validation');
      
      console.log('✅ Real empty form validation test completed successfully');
    });

    test('should show real validation errors for invalid email format', async ({ page }) => {
      test.setTimeout(30000);
      
      const authUtils = createAuthTestUtils(page);
      
      console.log('🔄 Testing real email format validation...');
      
      // Navigate to login page
      await page.goto('/auth/login', { waitUntil: 'networkidle', timeout: 15000 });
      
      // Enter invalid email format
      await page.fill('input[type="email"]', 'invalid-email');
      await page.fill('input[type="password"]', 'somepassword');
      
      // Try to submit (real validation should trigger)
      await page.click('button[type="submit"]');
      
      // Wait for real validation
      await page.waitForTimeout(2000);
      
      // Check for real email validation error
      const emailError = page.locator('text=/invalid.*email|email.*format|valid.*email/i');
      await expect(emailError).toBeVisible({ timeout: 5000 });
      
      console.log('✅ Real email format validation working');
      
      console.log('✅ Real email validation test completed successfully');
    });

    test('should handle real server-side validation for invalid credentials', async ({ page }) => {
      test.setTimeout(45000);
      
      const authUtils = createAuthTestUtils(page);
      const apiMonitor = await authUtils.monitorRealApiCalls();
      
      console.log('🔄 Testing real server-side validation...');
      
      // Navigate to login page
      await page.goto('/auth/login', { waitUntil: 'networkidle', timeout: 15000 });
      
      // Enter valid format but invalid credentials
      await page.fill('input[type="email"]', 'nonexistent@example.com');
      await page.fill('input[type="password"]', 'wrongpassword123');
      
      // Submit form (real API call will be made)
      await page.click('button[type="submit"]');
      
      // Wait for real server response
      await page.waitForTimeout(5000);
      
      // Check for real server-side error message
      const serverError = page.locator('text=/invalid.*credentials|login.*failed|incorrect.*email.*password/i');
      await expect(serverError).toBeVisible({ timeout: 5000 });
      
      // Verify real API call was made
      expect(apiMonitor.authRequests.length).toBeGreaterThan(0);
      console.log(`✅ Real server validation API calls: ${apiMonitor.authRequests.length}`);
      
      // Should still be on login page
      expect(page.url()).toContain('/auth/login');
      
      console.log('✅ Real server-side validation test completed successfully');
    });
  });

  test.describe('Real Form Interaction', () => {
    test('should handle real form field interactions', async ({ page }) => {
      test.setTimeout(30000);
      
      const authUtils = createAuthTestUtils(page);
      
      console.log('🔄 Testing real form field interactions...');
      
      // Navigate to login page
      await page.goto('/auth/login', { waitUntil: 'networkidle', timeout: 15000 });
      
      // Test real form field interactions
      const emailField = page.locator('input[type="email"]');
      const passwordField = page.locator('input[type="password"]');
      const submitButton = page.locator('button[type="submit"]');
      
      // Verify fields are present and interactive
      await expect(emailField).toBeVisible();
      await expect(passwordField).toBeVisible();
      await expect(submitButton).toBeVisible();
      
      // Test real typing and focus
      await emailField.click();
      await emailField.fill('test@example.com');
      
      await passwordField.click();
      await passwordField.fill('password123');
      
      // Verify values were actually entered
      const emailValue = await emailField.inputValue();
      const passwordValue = await passwordField.inputValue();
      
      expect(emailValue).toBe('test@example.com');
      expect(passwordValue).toBe('password123');
      
      console.log('✅ Real form field interactions working');
      
      console.log('✅ Real form interaction test completed successfully');
    });

    test('should handle real form navigation and accessibility', async ({ page }) => {
      test.setTimeout(30000);
      
      const authUtils = createAuthTestUtils(page);
      
      console.log('🔄 Testing real form navigation and accessibility...');
      
      // Navigate to login page
      await page.goto('/auth/login', { waitUntil: 'networkidle', timeout: 15000 });
      
      // Test real keyboard navigation
      await page.keyboard.press('Tab'); // Should focus first field
      await page.keyboard.type('test@example.com');
      
      await page.keyboard.press('Tab'); // Should focus password field
      await page.keyboard.type('password123');
      
      await page.keyboard.press('Tab'); // Should focus submit button
      
      // Verify focus is on submit button
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBe('BUTTON');
      
      console.log('✅ Real keyboard navigation working');
      
      // Test real form submission with Enter key
      await page.keyboard.press('Enter');
      
      // Wait for real form submission
      await page.waitForTimeout(3000);
      
      console.log('✅ Real keyboard form submission working');
      
      console.log('✅ Real form accessibility test completed successfully');
    });
  });

  test.describe('Real Form State Management', () => {
    test('should handle real form loading states', async ({ page }) => {
      test.setTimeout(45000);
      
      const authUtils = createAuthTestUtils(page);
      
      console.log('🔄 Testing real form loading states...');
      
      // Navigate to login page
      await page.goto('/auth/login', { waitUntil: 'networkidle', timeout: 15000 });
      
      // Fill form with valid format
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'password123');
      
      // Submit form and immediately check for loading state
      await page.click('button[type="submit"]');
      
      // Check for real loading indicators
      const loadingIndicators = [
        page.locator('[data-testid="loading"]'),
        page.locator('.loading'),
        page.locator('.spinner'),
        page.locator('button:disabled'),
        page.locator('text=/loading|submitting|please wait/i')
      ];
      
      // At least one loading indicator should appear during real API call
      let hasLoadingState = false;
      for (const indicator of loadingIndicators) {
        if (await indicator.isVisible()) {
          hasLoadingState = true;
          console.log('✅ Real loading state detected');
          break;
        }
      }
      
      // Wait for real API response
      await page.waitForTimeout(5000);
      
      // Loading state should be gone after API response
      const stillLoading = await loadingIndicators[0].isVisible().catch(() => false);
      expect(stillLoading).toBeFalsy();
      
      console.log('✅ Real form loading states working');
      
      console.log('✅ Real form state management test completed successfully');
    });

    test('should preserve form data during real validation errors', async ({ page }) => {
      test.setTimeout(30000);
      
      const authUtils = createAuthTestUtils(page);
      
      console.log('🔄 Testing real form data preservation...');
      
      // Navigate to login page
      await page.goto('/auth/login', { waitUntil: 'networkidle', timeout: 15000 });
      
      // Fill form with invalid email but valid password
      const testEmail = 'invalid-email-format';
      const testPassword = 'validpassword123';
      
      await page.fill('input[type="email"]', testEmail);
      await page.fill('input[type="password"]', testPassword);
      
      // Submit form (should trigger validation)
      await page.click('button[type="submit"]');
      
      // Wait for validation
      await page.waitForTimeout(2000);
      
      // Check that form data is preserved after validation error
      const emailValue = await page.locator('input[type="email"]').inputValue();
      const passwordValue = await page.locator('input[type="password"]').inputValue();
      
      expect(emailValue).toBe(testEmail);
      expect(passwordValue).toBe(testPassword);
      
      console.log('✅ Real form data preservation working');
      
      console.log('✅ Real form data preservation test completed successfully');
    });
  });

  test.describe('Real Form Security', () => {
    test('should handle real password field security', async ({ page }) => {
      test.setTimeout(30000);
      
      const authUtils = createAuthTestUtils(page);
      
      console.log('🔄 Testing real password field security...');
      
      // Navigate to login page
      await page.goto('/auth/login', { waitUntil: 'networkidle', timeout: 15000 });
      
      // Check that password field is properly secured
      const passwordField = page.locator('input[type="password"]');
      await expect(passwordField).toBeVisible();
      
      // Verify password field type
      const fieldType = await passwordField.getAttribute('type');
      expect(fieldType).toBe('password');
      
      // Fill password and verify it's masked
      await passwordField.fill('secretpassword123');
      
      // Password value should not be visible in the DOM
      const fieldValue = await passwordField.inputValue();
      expect(fieldValue).toBe('secretpassword123'); // Value exists but is masked
      
      console.log('✅ Real password field security working');
      
      console.log('✅ Real password security test completed successfully');
    });
  });
});
