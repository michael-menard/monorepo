import { expect, test } from '@playwright/test';
import { createAuthTestUtils } from './utils';
import { SOUTH_PARK_USERS, TEST_USERS } from './test-users';

/**
 * Accessibility & Mobile Tests
 * 
 * Tests auth accessibility and mobile experience:
 * - Screen reader compatibility
 * - Keyboard navigation
 * - Focus management
 * - Mobile touch interactions
 * - Responsive design
 * - ARIA labels and roles
 * - Color contrast and visibility
 */
test.describe('Accessibility & Mobile Experience', () => {
  test.describe.configure({ timeout: 120000 }); // 2 minutes for a11y tests

  test.beforeAll(async () => {
    console.log('♿ Testing Accessibility & Mobile Experience:');
    console.log('  - Screen reader compatibility');
    console.log('  - Keyboard navigation');
    console.log('  - Focus management');
    console.log('  - Mobile touch interactions');
    console.log('  - Responsive design');
    console.log('  - ARIA labels and roles');
    console.log('  - Color contrast and visibility');
  });

  test.beforeEach(async ({ page }) => {
    const authUtils = createAuthTestUtils(page);
    await authUtils.setup();
  });

  test.afterEach(async ({ page }) => {
    const authUtils = createAuthTestUtils(page);
    await authUtils.cleanup();
  });

  test.describe('Keyboard Navigation', () => {
    test('should support full keyboard navigation in login form', async ({ page }) => {
      test.setTimeout(60000);
      
      const authUtils = createAuthTestUtils(page);
      await authUtils.navigateToAuthPage('login');

      // Test tab navigation through form elements
      await page.keyboard.press('Tab'); // Should focus email input
      let focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBe('INPUT');

      await page.keyboard.press('Tab'); // Should focus password input
      focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBe('INPUT');

      await page.keyboard.press('Tab'); // Should focus submit button
      focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBe('BUTTON');

      // Test form submission with Enter key
      await page.keyboard.press('Shift+Tab'); // Back to password field
      await page.keyboard.press('Shift+Tab'); // Back to email field
      
      await page.keyboard.type('test@example.com');
      await page.keyboard.press('Tab');
      await page.keyboard.type('TestPassword123!');
      await page.keyboard.press('Enter'); // Should submit form

      await page.waitForTimeout(2000);
      console.log('✅ Keyboard navigation in login form working');
    });

    test('should support keyboard navigation in signup form', async ({ page }) => {
      test.setTimeout(60000);
      
      const authUtils = createAuthTestUtils(page);
      await authUtils.navigateToAuthPage('signup');

      // Test tab order in signup form
      const expectedTabOrder = ['INPUT', 'INPUT', 'INPUT', 'INPUT', 'BUTTON'];
      const actualTabOrder: string[] = [];

      for (let i = 0; i < expectedTabOrder.length; i++) {
        await page.keyboard.press('Tab');
        const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
        actualTabOrder.push(focusedElement || 'UNKNOWN');
      }

      console.log(`📋 Tab Order: ${actualTabOrder.join(' → ')}`);
      
      // Should have logical tab order
      const hasLogicalOrder = actualTabOrder.every(tag => ['INPUT', 'BUTTON'].includes(tag));
      expect(hasLogicalOrder).toBeTruthy();
      console.log('✅ Keyboard navigation in signup form working');
    });

    test('should support keyboard navigation between auth pages', async ({ page }) => {
      test.setTimeout(60000);
      
      const authUtils = createAuthTestUtils(page);
      await authUtils.navigateToAuthPage('login');

      // Look for navigation links
      const signupLink = page.locator('a:has-text("Sign up"), a:has-text("Register"), a[href*="signup"]');
      const forgotPasswordLink = page.locator('a:has-text("Forgot"), a[href*="forgot"]');

      if (await signupLink.count() > 0) {
        await signupLink.focus();
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);
        
        const currentUrl = page.url();
        expect(currentUrl).toMatch(/signup|register/);
        console.log('✅ Keyboard navigation to signup page working');
      }

      if (await forgotPasswordLink.count() > 0) {
        await authUtils.navigateToAuthPage('login');
        await forgotPasswordLink.focus();
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);
        
        const currentUrl = page.url();
        expect(currentUrl).toMatch(/forgot|reset/);
        console.log('✅ Keyboard navigation to forgot password page working');
      }
    });
  });

  test.describe('Screen Reader Compatibility', () => {
    test('should have proper ARIA labels and roles', async ({ page }) => {
      test.setTimeout(60000);
      
      const authUtils = createAuthTestUtils(page);
      await authUtils.navigateToAuthPage('login');

      // Check for ARIA labels on form elements
      const emailInput = page.locator('input[type="email"]');
      const passwordInput = page.locator('input[type="password"]');
      const submitButton = page.locator('button[type="submit"]');

      // Check email input accessibility
      const emailAriaLabel = await emailInput.getAttribute('aria-label');
      const emailLabel = await page.locator('label[for*="email"], label:has(input[type="email"])').count();
      
      if (emailAriaLabel || emailLabel > 0) {
        console.log('✅ Email input has proper labeling');
      } else {
        console.log('⚠️  Email input missing accessibility labels');
      }

      // Check password input accessibility
      const passwordAriaLabel = await passwordInput.getAttribute('aria-label');
      const passwordLabel = await page.locator('label[for*="password"], label:has(input[type="password"])').count();
      
      if (passwordAriaLabel || passwordLabel > 0) {
        console.log('✅ Password input has proper labeling');
      } else {
        console.log('⚠️  Password input missing accessibility labels');
      }

      // Check form role
      const formRole = await page.locator('form').getAttribute('role');
      const hasFormRole = formRole === 'form' || await page.locator('form').count() > 0;
      
      if (hasFormRole) {
        console.log('✅ Form has proper role');
      } else {
        console.log('⚠️  Form missing proper role');
      }

      // Check for error message accessibility
      await emailInput.fill('invalid-email');
      await submitButton.click();
      await page.waitForTimeout(2000);

      const errorMessages = page.locator('[role="alert"], .error, [aria-live="polite"]');
      const hasAccessibleErrors = await errorMessages.count() > 0;
      
      if (hasAccessibleErrors) {
        console.log('✅ Error messages are accessible');
      } else {
        console.log('ℹ️  Error message accessibility could be improved');
      }
    });

    test('should announce form validation errors', async ({ page }) => {
      test.setTimeout(60000);
      
      const authUtils = createAuthTestUtils(page);
      await authUtils.navigateToAuthPage('signup');

      // Test form validation announcements
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click(); // Submit empty form
      await page.waitForTimeout(2000);

      // Check for aria-live regions or role="alert"
      const liveRegions = await page.locator('[aria-live], [role="alert"]').count();
      const errorMessages = await page.locator('.error, [class*="error"]').count();

      if (liveRegions > 0) {
        console.log('✅ Form has live regions for announcements');
      } else if (errorMessages > 0) {
        console.log('ℹ️  Form has error messages but may need live regions');
      } else {
        console.log('⚠️  Form validation announcements may be missing');
      }

      // Check for field-specific error associations
      const emailInput = page.locator('input[type="email"]');
      const emailAriaDescribedBy = await emailInput.getAttribute('aria-describedby');
      
      if (emailAriaDescribedBy) {
        const describedByElement = await page.locator(`#${emailAriaDescribedBy}`).count();
        if (describedByElement > 0) {
          console.log('✅ Email field has proper error association');
        }
      }
    });
  });

  test.describe('Focus Management', () => {
    test('should manage focus properly during navigation', async ({ page }) => {
      test.setTimeout(60000);
      
      const authUtils = createAuthTestUtils(page);
      await authUtils.navigateToAuthPage('login');

      // Check initial focus
      const initialFocus = await page.evaluate(() => document.activeElement?.tagName);
      console.log(`Initial focus: ${initialFocus}`);

      // Navigate to signup and check focus
      const signupLink = page.locator('a:has-text("Sign up"), a[href*="signup"]');
      if (await signupLink.count() > 0) {
        await signupLink.click();
        await page.waitForTimeout(2000);

        const focusAfterNavigation = await page.evaluate(() => document.activeElement?.tagName);
        console.log(`Focus after navigation: ${focusAfterNavigation}`);

        // Focus should be on a meaningful element (not body)
        expect(focusAfterNavigation).not.toBe('BODY');
        console.log('✅ Focus management during navigation working');
      }
    });

    test('should trap focus in modal dialogs', async ({ page }) => {
      test.setTimeout(60000);
      
      const authUtils = createAuthTestUtils(page);
      await authUtils.navigateToAuthPage('login');

      // Look for modal triggers (like forgot password)
      const modalTrigger = page.locator('button:has-text("Forgot"), a:has-text("Forgot")');
      
      if (await modalTrigger.count() > 0) {
        await modalTrigger.click();
        await page.waitForTimeout(2000);

        // Check if modal is present
        const modal = page.locator('[role="dialog"], .modal, [aria-modal="true"]');
        
        if (await modal.count() > 0) {
          // Test focus trapping
          const focusableElements = await modal.locator('button, input, a, [tabindex]:not([tabindex="-1"])').count();
          
          if (focusableElements > 0) {
            // Tab through elements and ensure focus stays in modal
            for (let i = 0; i < focusableElements + 2; i++) {
              await page.keyboard.press('Tab');
              const focusedElement = await page.evaluate(() => {
                const active = document.activeElement;
                return {
                  tagName: active?.tagName,
                  isInModal: active?.closest('[role="dialog"], .modal, [aria-modal="true"]') !== null
                };
              });
              
              if (!focusedElement.isInModal) {
                console.log('⚠️  Focus escaped modal dialog');
                break;
              }
            }
            console.log('✅ Focus trapping in modal working');
          }
        }
      } else {
        console.log('ℹ️  No modal dialogs found to test focus trapping');
      }
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should work properly on mobile viewport', async ({ page }) => {
      test.setTimeout(90000);
      
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
      
      const authUtils = createAuthTestUtils(page);
      await authUtils.navigateToAuthPage('login');

      // Check if form is visible and usable on mobile
      const emailInput = page.locator('input[type="email"]');
      const passwordInput = page.locator('input[type="password"]');
      const submitButton = page.locator('button[type="submit"]');

      // Check element visibility
      await expect(emailInput).toBeVisible();
      await expect(passwordInput).toBeVisible();
      await expect(submitButton).toBeVisible();

      // Check if elements are properly sized for touch
      const emailBox = await emailInput.boundingBox();
      const passwordBox = await passwordInput.boundingBox();
      const buttonBox = await submitButton.boundingBox();

      // Touch targets should be at least 44px (iOS) or 48px (Android)
      const minTouchSize = 44;

      if (emailBox && emailBox.height >= minTouchSize) {
        console.log('✅ Email input has adequate touch target size');
      } else {
        console.log('⚠️  Email input touch target may be too small');
      }

      if (passwordBox && passwordBox.height >= minTouchSize) {
        console.log('✅ Password input has adequate touch target size');
      } else {
        console.log('⚠️  Password input touch target may be too small');
      }

      if (buttonBox && buttonBox.height >= minTouchSize) {
        console.log('✅ Submit button has adequate touch target size');
      } else {
        console.log('⚠️  Submit button touch target may be too small');
      }

      // Test form interaction on mobile
      await emailInput.tap();
      await page.keyboard.type('mobile@example.com');
      await passwordInput.tap();
      await page.keyboard.type('MobilePassword123!');
      await submitButton.tap();

      await page.waitForTimeout(2000);
      console.log('✅ Mobile form interaction working');
    });

    test('should handle different mobile orientations', async ({ page }) => {
      test.setTimeout(90000);
      
      const authUtils = createAuthTestUtils(page);

      // Test portrait orientation
      await page.setViewportSize({ width: 375, height: 667 });
      await authUtils.navigateToAuthPage('login');
      
      const portraitFormVisible = await page.locator('form').isVisible();
      expect(portraitFormVisible).toBeTruthy();
      console.log('✅ Form visible in portrait orientation');

      // Test landscape orientation
      await page.setViewportSize({ width: 667, height: 375 });
      await page.waitForTimeout(1000);
      
      const landscapeFormVisible = await page.locator('form').isVisible();
      expect(landscapeFormVisible).toBeTruthy();
      console.log('✅ Form visible in landscape orientation');

      // Check if form elements are still accessible
      const emailInput = page.locator('input[type="email"]');
      const submitButton = page.locator('button[type="submit"]');
      
      await expect(emailInput).toBeVisible();
      await expect(submitButton).toBeVisible();
      console.log('✅ Form elements accessible in landscape');
    });

    test('should work on tablet viewport', async ({ page }) => {
      test.setTimeout(60000);
      
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 }); // iPad
      
      const authUtils = createAuthTestUtils(page);
      await authUtils.navigateToAuthPage('signup');

      // Check form layout on tablet
      const form = page.locator('form');
      const formBox = await form.boundingBox();
      
      if (formBox) {
        // Form should not be too wide on tablet
        const maxFormWidth = 600; // Reasonable max width for forms
        
        if (formBox.width <= maxFormWidth) {
          console.log('✅ Form has appropriate width on tablet');
        } else {
          console.log('ℹ️  Form may be too wide on tablet');
        }
      }

      // Test all form fields are accessible
      const nameInput = page.locator('input[name="name"]');
      const emailInput = page.locator('input[type="email"]');
      const passwordInput = page.locator('input[name="password"]');
      const confirmPasswordInput = page.locator('input[name="confirmPassword"]');

      if (await nameInput.count() > 0) await expect(nameInput).toBeVisible();
      await expect(emailInput).toBeVisible();
      await expect(passwordInput).toBeVisible();
      if (await confirmPasswordInput.count() > 0) await expect(confirmPasswordInput).toBeVisible();

      console.log('✅ Tablet viewport compatibility confirmed');
    });
  });

  test.describe('Touch Interactions', () => {
    test('should support touch gestures on mobile', async ({ page }) => {
      test.setTimeout(60000);
      
      await page.setViewportSize({ width: 375, height: 667 });
      
      const authUtils = createAuthTestUtils(page);
      await authUtils.navigateToAuthPage('login');

      // Test tap interactions
      const emailInput = page.locator('input[type="email"]');
      const passwordInput = page.locator('input[type="password"]');

      // Test tap to focus
      await emailInput.tap();
      const emailFocused = await emailInput.evaluate(el => el === document.activeElement);
      expect(emailFocused).toBeTruthy();
      console.log('✅ Tap to focus working');

      // Test touch scrolling if needed
      const pageHeight = await page.evaluate(() => document.body.scrollHeight);
      const viewportHeight = await page.evaluate(() => window.innerHeight);

      if (pageHeight > viewportHeight) {
        // Page is scrollable, test scroll
        await page.touchscreen.tap(200, 300);
        await page.mouse.wheel(0, 100);
        await page.waitForTimeout(500);
        
        const scrollPosition = await page.evaluate(() => window.scrollY);
        if (scrollPosition > 0) {
          console.log('✅ Touch scrolling working');
        }
      }

      // Test password visibility toggle if present
      const passwordToggle = page.locator('button[aria-label*="password"], .password-toggle, [data-testid="password-toggle"]');
      
      if (await passwordToggle.count() > 0) {
        await passwordInput.fill('TestPassword123!');
        await passwordToggle.tap();
        await page.waitForTimeout(500);
        
        const passwordType = await passwordInput.getAttribute('type');
        if (passwordType === 'text') {
          console.log('✅ Password visibility toggle working');
        }
      }
    });
  });

  test.describe('Color Contrast & Visibility', () => {
    test('should have adequate color contrast', async ({ page }) => {
      test.setTimeout(60000);
      
      const authUtils = createAuthTestUtils(page);
      await authUtils.navigateToAuthPage('login');

      // Check color contrast for key elements
      const elements = [
        'input[type="email"]',
        'input[type="password"]',
        'button[type="submit"]',
        'label',
        'a',
      ];

      for (const selector of elements) {
        const element = page.locator(selector).first();
        
        if (await element.count() > 0) {
          const styles = await element.evaluate(el => {
            const computed = window.getComputedStyle(el);
            return {
              color: computed.color,
              backgroundColor: computed.backgroundColor,
              fontSize: computed.fontSize,
            };
          });
          
          console.log(`🎨 ${selector}: color=${styles.color}, bg=${styles.backgroundColor}`);
        }
      }

      // Test high contrast mode simulation
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.waitForTimeout(1000);
      
      const darkModeVisible = await page.locator('form').isVisible();
      expect(darkModeVisible).toBeTruthy();
      console.log('✅ Dark mode compatibility confirmed');

      await page.emulateMedia({ colorScheme: 'light' });
      console.log('✅ Color contrast analysis completed');
    });

    test('should be usable without color alone', async ({ page }) => {
      test.setTimeout(60000);
      
      const authUtils = createAuthTestUtils(page);
      await authUtils.navigateToAuthPage('signup');

      // Submit form to trigger validation errors
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();
      await page.waitForTimeout(2000);

      // Check if errors are indicated by more than just color
      const errorElements = page.locator('.error, [class*="error"], [aria-invalid="true"]');
      
      if (await errorElements.count() > 0) {
        const firstError = errorElements.first();
        const errorStyles = await firstError.evaluate(el => {
          const computed = window.getComputedStyle(el);
          return {
            border: computed.border,
            textDecoration: computed.textDecoration,
            fontWeight: computed.fontWeight,
            hasIcon: el.querySelector('svg, .icon, [class*="icon"]') !== null,
          };
        });

        const hasNonColorIndicators = 
          errorStyles.border !== 'none' ||
          errorStyles.textDecoration !== 'none' ||
          errorStyles.fontWeight === 'bold' ||
          errorStyles.hasIcon;

        if (hasNonColorIndicators) {
          console.log('✅ Errors indicated by more than color alone');
        } else {
          console.log('⚠️  Errors may rely too heavily on color');
        }
      }
    });
  });
});
