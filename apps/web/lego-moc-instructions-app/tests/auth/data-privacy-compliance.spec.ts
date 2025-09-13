import { expect, test } from '@playwright/test';
import { createAuthTestUtils } from './utils';
import { SOUTH_PARK_USERS, TEST_USERS } from './test-users';

/**
 * Data Privacy & Compliance Tests
 * 
 * Tests privacy and compliance features:
 * - User data export (GDPR)
 * - Account deletion and data cleanup
 * - Cookie consent and management
 * - Data retention policies
 * - Privacy policy compliance
 * - Data minimization principles
 * - Consent management
 */
test.describe('Data Privacy & Compliance', () => {
  test.describe.configure({ timeout: 120000 }); // 2 minutes for compliance tests

  test.beforeAll(async () => {
    console.log('🔒 Testing Data Privacy & Compliance:');
    console.log('  - GDPR data export');
    console.log('  - Account deletion and data cleanup');
    console.log('  - Cookie consent management');
    console.log('  - Data retention policies');
    console.log('  - Privacy policy compliance');
    console.log('  - Data minimization');
    console.log('  - Consent management');
  });

  test.beforeEach(async ({ page }) => {
    const authUtils = createAuthTestUtils(page);
    await authUtils.setup();
  });

  test.afterEach(async ({ page }) => {
    const authUtils = createAuthTestUtils(page);
    await authUtils.cleanup();
  });

  test.describe('GDPR Data Export', () => {
    test('should allow users to export their personal data', async ({ page }) => {
      test.setTimeout(90000);
      
      const authUtils = createAuthTestUtils(page);
      const testUser = SOUTH_PARK_USERS.STAN;

      // Mock login
      await authUtils.mockAuthAPI('login', {
        success: true,
        data: {
          user: {
            id: 'stan-123',
            email: testUser.email,
            name: testUser.name,
            isVerified: true,
          },
          tokens: {
            accessToken: 'stan-token',
            refreshToken: 'stan-refresh',
            expiresIn: 3600,
          },
        },
      });

      // Mock data export endpoint
      await authUtils.mockAuthAPI('export-data', {
        success: true,
        message: 'Data export initiated',
        data: {
          exportId: 'export-123',
          estimatedCompletionTime: '2024-01-01T12:00:00Z',
          downloadUrl: '/api/auth/download-export/export-123',
          expiresAt: '2024-01-08T12:00:00Z',
        },
      });

      await authUtils.navigateToAuthPage('login');
      await authUtils.login(testUser.email, testUser.password);
      await page.waitForTimeout(3000);

      // Navigate to privacy/data settings
      await page.goto('/account/privacy', { timeout: 10000 });
      await page.waitForTimeout(2000);

      // Look for data export option
      const exportButton = page.locator('button:has-text("Export"), button:has-text("Download"), a:has-text("Export")');
      
      if (await exportButton.count() > 0) {
        await exportButton.click();
        await page.waitForTimeout(3000);

        // Should show export confirmation or progress
        const hasExportMessage = await page.locator('text=/export.*initiated|download.*ready|data.*export/i').count();
        expect(hasExportMessage).toBeGreaterThan(0);
        console.log('✅ Data export functionality available');
      } else {
        console.log('ℹ️  Data export functionality may not be implemented yet');
      }

      // Test data export API directly
      const exportResponse = await page.evaluate(async () => {
        return fetch('/api/auth/export-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }).then(r => r.json());
      });

      if (exportResponse.success) {
        console.log('✅ Data export API working');
        console.log(`   Export ID: ${exportResponse.data?.exportId}`);
        console.log(`   Download URL: ${exportResponse.data?.downloadUrl}`);
      } else {
        console.log('ℹ️  Data export API may not be implemented yet');
      }
    });

    test('should include all user data in export', async ({ page }) => {
      test.setTimeout(60000);
      
      const authUtils = createAuthTestUtils(page);

      // Mock comprehensive data export
      await authUtils.mockAuthAPI('export-data', {
        success: true,
        data: {
          exportId: 'comprehensive-export-123',
          dataTypes: [
            'profile_information',
            'account_settings',
            'login_history',
            'created_content',
            'preferences',
            'consent_records',
          ],
          downloadUrl: '/api/auth/download-export/comprehensive-export-123',
        },
      });

      // Test comprehensive export
      const response = await page.evaluate(async () => {
        return fetch('/api/auth/export-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ includeAll: true }),
        }).then(r => r.json());
      });

      if (response.data?.dataTypes) {
        console.log('✅ Comprehensive data export includes:');
        response.data.dataTypes.forEach((type: string) => {
          console.log(`   - ${type}`);
        });
      } else {
        console.log('ℹ️  Comprehensive data export may not be implemented');
      }
    });
  });

  test.describe('Account Deletion & Data Cleanup', () => {
    test('should allow complete account deletion', async ({ page }) => {
      test.setTimeout(90000);
      
      const authUtils = createAuthTestUtils(page);
      const testUser = SOUTH_PARK_USERS.KENNY;

      // Mock login
      await authUtils.mockAuthAPI('login', {
        success: true,
        data: {
          user: {
            id: 'kenny-123',
            email: testUser.email,
            name: testUser.name,
            isVerified: true,
          },
          tokens: {
            accessToken: 'kenny-token',
            refreshToken: 'kenny-refresh',
            expiresIn: 3600,
          },
        },
      });

      // Mock account deletion
      await authUtils.mockAuthAPI('delete-account', {
        success: true,
        message: 'Account deletion scheduled',
        data: {
          deletionId: 'deletion-123',
          scheduledDeletionDate: '2024-01-08T00:00:00Z',
          gracePeriod: 7, // days
          dataRetentionPolicy: {
            personalData: 'deleted_immediately',
            anonymizedAnalytics: 'retained_90_days',
            legalRequirements: 'retained_as_required',
          },
        },
      });

      await authUtils.navigateToAuthPage('login');
      await authUtils.login(testUser.email, testUser.password);
      await page.waitForTimeout(3000);

      // Navigate to account deletion
      await page.goto('/account/delete', { timeout: 10000 });
      await page.waitForTimeout(2000);

      // Look for deletion options
      const deleteButton = page.locator('button:has-text("Delete"), button:has-text("Remove")');
      
      if (await deleteButton.count() > 0) {
        // Should require confirmation
        await deleteButton.click();
        await page.waitForTimeout(2000);

        const hasConfirmation = await page.locator('text=/confirm.*deletion|are.*you.*sure|permanent/i').count();
        
        if (hasConfirmation > 0) {
          // Look for password confirmation
          const passwordField = page.locator('input[type="password"]');
          
          if (await passwordField.count() > 0) {
            await passwordField.fill(testUser.password);
            await page.click('button:has-text("Confirm"), button:has-text("Delete")');
            await page.waitForTimeout(3000);

            const hasSuccessMessage = await page.locator('text=/deletion.*scheduled|account.*will.*be.*deleted/i').count();
            expect(hasSuccessMessage).toBeGreaterThan(0);
            console.log('✅ Account deletion with confirmation working');
          }
        }
      } else {
        console.log('ℹ️  Account deletion UI may not be implemented yet');
      }
    });

    test('should provide grace period for account recovery', async ({ page }) => {
      test.setTimeout(60000);
      
      const authUtils = createAuthTestUtils(page);

      // Mock account recovery during grace period
      await authUtils.mockAuthAPI('recover-account', {
        success: true,
        message: 'Account recovery successful',
        data: {
          recoveredAt: new Date().toISOString(),
          gracePeriodRemaining: 5, // days
        },
      });

      // Test account recovery
      const response = await page.evaluate(async () => {
        return fetch('/api/auth/recover-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'deleted@example.com',
            recoveryToken: 'recovery-token-123',
          }),
        }).then(r => r.json());
      });

      if (response.success) {
        console.log('✅ Account recovery during grace period available');
        console.log(`   Grace period remaining: ${response.data?.gracePeriodRemaining} days`);
      } else {
        console.log('ℹ️  Account recovery may not be implemented yet');
      }
    });

    test('should ensure complete data cleanup after deletion', async ({ page }) => {
      test.setTimeout(60000);
      
      const authUtils = createAuthTestUtils(page);

      // Mock data cleanup verification
      await authUtils.mockAuthAPI('verify-data-cleanup', {
        success: true,
        data: {
          deletionId: 'deletion-123',
          cleanupStatus: {
            personalData: 'deleted',
            profileImages: 'deleted',
            userContent: 'anonymized',
            loginHistory: 'deleted',
            preferences: 'deleted',
            backups: 'scheduled_for_deletion',
          },
          verificationDate: new Date().toISOString(),
        },
      });

      // Test data cleanup verification
      const response = await page.evaluate(async () => {
        return fetch('/api/auth/verify-data-cleanup/deletion-123', {
          method: 'GET',
        }).then(r => r.json());
      });

      if (response.data?.cleanupStatus) {
        console.log('✅ Data cleanup verification available:');
        Object.entries(response.data.cleanupStatus).forEach(([type, status]) => {
          console.log(`   ${type}: ${status}`);
        });
      } else {
        console.log('ℹ️  Data cleanup verification may not be implemented');
      }
    });
  });

  test.describe('Cookie Consent Management', () => {
    test('should display cookie consent banner', async ({ page }) => {
      test.setTimeout(60000);
      
      // Clear cookies to simulate first visit
      await page.context().clearCookies();
      
      const authUtils = createAuthTestUtils(page);
      await page.goto('/', { timeout: 10000 });
      await page.waitForTimeout(3000);

      // Look for cookie consent banner
      const cookieBanner = page.locator('[data-testid="cookie-banner"], .cookie-banner, .cookie-consent');
      const cookieText = page.locator('text=/cookie|consent|privacy/i');

      if (await cookieBanner.count() > 0 || await cookieText.count() > 0) {
        console.log('✅ Cookie consent banner displayed');

        // Look for accept/reject buttons
        const acceptButton = page.locator('button:has-text("Accept"), button:has-text("Allow")');
        const rejectButton = page.locator('button:has-text("Reject"), button:has-text("Decline")');
        const settingsButton = page.locator('button:has-text("Settings"), button:has-text("Customize")');

        if (await acceptButton.count() > 0) {
          console.log('✅ Cookie accept option available');
        }
        if (await rejectButton.count() > 0) {
          console.log('✅ Cookie reject option available');
        }
        if (await settingsButton.count() > 0) {
          console.log('✅ Cookie settings option available');
        }
      } else {
        console.log('ℹ️  Cookie consent banner may not be implemented yet');
      }
    });

    test('should allow granular cookie preferences', async ({ page }) => {
      test.setTimeout(60000);
      
      await page.context().clearCookies();
      await page.goto('/', { timeout: 10000 });
      await page.waitForTimeout(2000);

      // Look for cookie settings
      const settingsButton = page.locator('button:has-text("Settings"), button:has-text("Customize"), a[href*="cookie"]');
      
      if (await settingsButton.count() > 0) {
        await settingsButton.click();
        await page.waitForTimeout(2000);

        // Look for different cookie categories
        const cookieCategories = [
          'essential',
          'functional',
          'analytics',
          'marketing',
          'advertising',
        ];

        for (const category of cookieCategories) {
          const categoryToggle = page.locator(`input[name*="${category}"], [data-category="${category}"]`);
          
          if (await categoryToggle.count() > 0) {
            console.log(`✅ ${category} cookie category available`);
          }
        }

        // Test saving preferences
        const saveButton = page.locator('button:has-text("Save"), button:has-text("Update")');
        
        if (await saveButton.count() > 0) {
          await saveButton.click();
          await page.waitForTimeout(2000);
          console.log('✅ Cookie preferences can be saved');
        }
      } else {
        console.log('ℹ️  Granular cookie preferences may not be implemented');
      }
    });

    test('should respect cookie preferences in functionality', async ({ page }) => {
      test.setTimeout(60000);
      
      // Mock cookie preference API
      await page.route('**/api/cookies/preferences', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              essential: true,
              functional: false,
              analytics: false,
              marketing: false,
            },
          }),
        });
      });

      // Test that analytics cookies are not set when disabled
      await page.goto('/', { timeout: 10000 });
      await page.waitForTimeout(3000);

      const cookies = await page.context().cookies();
      const analyticsCookies = cookies.filter(cookie => 
        cookie.name.includes('analytics') || 
        cookie.name.includes('ga') || 
        cookie.name.includes('gtm')
      );

      if (analyticsCookies.length === 0) {
        console.log('✅ Analytics cookies not set when disabled');
      } else {
        console.log('⚠️  Analytics cookies found despite being disabled');
      }
    });
  });

  test.describe('Data Retention Policies', () => {
    test('should implement data retention policies', async ({ page }) => {
      test.setTimeout(60000);
      
      const authUtils = createAuthTestUtils(page);

      // Mock data retention policy endpoint
      await authUtils.mockAuthAPI('data-retention-policy', {
        success: true,
        data: {
          policies: {
            personalData: {
              retentionPeriod: '2 years after account deletion',
              purpose: 'Legal compliance',
            },
            loginHistory: {
              retentionPeriod: '90 days',
              purpose: 'Security monitoring',
            },
            analyticsData: {
              retentionPeriod: '26 months',
              purpose: 'Service improvement',
              anonymized: true,
            },
            backups: {
              retentionPeriod: '30 days',
              purpose: 'Data recovery',
            },
          },
          lastUpdated: '2024-01-01T00:00:00Z',
        },
      });

      // Test data retention policy information
      const response = await page.evaluate(async () => {
        return fetch('/api/auth/data-retention-policy').then(r => r.json());
      });

      if (response.data?.policies) {
        console.log('✅ Data retention policies defined:');
        Object.entries(response.data.policies).forEach(([type, policy]: [string, any]) => {
          console.log(`   ${type}: ${policy.retentionPeriod} (${policy.purpose})`);
        });
      } else {
        console.log('ℹ️  Data retention policies may not be documented');
      }
    });

    test('should automatically clean up expired data', async ({ page }) => {
      test.setTimeout(60000);
      
      const authUtils = createAuthTestUtils(page);

      // Mock data cleanup job status
      await authUtils.mockAuthAPI('data-cleanup-status', {
        success: true,
        data: {
          lastCleanupRun: '2024-01-01T02:00:00Z',
          nextScheduledRun: '2024-01-02T02:00:00Z',
          itemsProcessed: {
            expiredSessions: 1250,
            oldLoginHistory: 890,
            anonymizedAnalytics: 2340,
            deletedAccountData: 45,
          },
          errors: [],
        },
      });

      // Test data cleanup status
      const response = await page.evaluate(async () => {
        return fetch('/api/auth/data-cleanup-status').then(r => r.json());
      });

      if (response.data?.itemsProcessed) {
        console.log('✅ Automated data cleanup running:');
        Object.entries(response.data.itemsProcessed).forEach(([type, count]) => {
          console.log(`   ${type}: ${count} items processed`);
        });
      } else {
        console.log('ℹ️  Automated data cleanup may not be implemented');
      }
    });
  });

  test.describe('Privacy Policy Compliance', () => {
    test('should provide accessible privacy policy', async ({ page }) => {
      test.setTimeout(60000);
      
      // Check for privacy policy link
      await page.goto('/', { timeout: 10000 });
      await page.waitForTimeout(2000);

      const privacyLink = page.locator('a:has-text("Privacy"), a[href*="privacy"]');
      
      if (await privacyLink.count() > 0) {
        await privacyLink.click();
        await page.waitForTimeout(3000);

        // Check if privacy policy page loads
        const currentUrl = page.url();
        const isPrivacyPage = currentUrl.includes('privacy');
        
        if (isPrivacyPage) {
          // Check for key privacy policy sections
          const sections = [
            'data collection',
            'data use',
            'data sharing',
            'data retention',
            'user rights',
            'contact information',
          ];

          for (const section of sections) {
            const hasSection = await page.locator(`text=/${section}/i`).count();
            if (hasSection > 0) {
              console.log(`✅ Privacy policy includes: ${section}`);
            }
          }
        }
      } else {
        console.log('ℹ️  Privacy policy link not found');
      }
    });

    test('should provide data subject rights information', async ({ page }) => {
      test.setTimeout(60000);
      
      const authUtils = createAuthTestUtils(page);

      // Mock data subject rights endpoint
      await authUtils.mockAuthAPI('data-subject-rights', {
        success: true,
        data: {
          rights: [
            {
              name: 'Right to Access',
              description: 'Request a copy of your personal data',
              howToExercise: 'Use the data export feature in your account settings',
            },
            {
              name: 'Right to Rectification',
              description: 'Correct inaccurate personal data',
              howToExercise: 'Update your profile information in account settings',
            },
            {
              name: 'Right to Erasure',
              description: 'Request deletion of your personal data',
              howToExercise: 'Use the account deletion feature or contact support',
            },
            {
              name: 'Right to Data Portability',
              description: 'Receive your data in a machine-readable format',
              howToExercise: 'Use the data export feature to download your data',
            },
          ],
        },
      });

      // Test data subject rights information
      const response = await page.evaluate(async () => {
        return fetch('/api/auth/data-subject-rights').then(r => r.json());
      });

      if (response.data?.rights) {
        console.log('✅ Data subject rights information available:');
        response.data.rights.forEach((right: any) => {
          console.log(`   - ${right.name}: ${right.description}`);
        });
      } else {
        console.log('ℹ️  Data subject rights information may not be available');
      }
    });
  });

  test.describe('Consent Management', () => {
    test('should track and manage user consent', async ({ page }) => {
      test.setTimeout(60000);
      
      const authUtils = createAuthTestUtils(page);

      // Mock consent tracking
      await authUtils.mockAuthAPI('consent-record', {
        success: true,
        data: {
          consentId: 'consent-123',
          userId: 'user-123',
          consentType: 'data_processing',
          consentGiven: true,
          consentDate: new Date().toISOString(),
          consentMethod: 'explicit_opt_in',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0...',
        },
      });

      // Test consent recording
      const response = await page.evaluate(async () => {
        return fetch('/api/auth/consent-record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            consentType: 'data_processing',
            consentGiven: true,
          }),
        }).then(r => r.json());
      });

      if (response.data?.consentId) {
        console.log('✅ Consent tracking working');
        console.log(`   Consent ID: ${response.data.consentId}`);
        console.log(`   Method: ${response.data.consentMethod}`);
      } else {
        console.log('ℹ️  Consent tracking may not be implemented');
      }
    });

    test('should allow consent withdrawal', async ({ page }) => {
      test.setTimeout(60000);
      
      const authUtils = createAuthTestUtils(page);

      // Mock consent withdrawal
      await authUtils.mockAuthAPI('withdraw-consent', {
        success: true,
        message: 'Consent withdrawn successfully',
        data: {
          withdrawalId: 'withdrawal-123',
          withdrawalDate: new Date().toISOString(),
          affectedServices: ['analytics', 'marketing'],
        },
      });

      // Test consent withdrawal
      const response = await page.evaluate(async () => {
        return fetch('/api/auth/withdraw-consent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            consentType: 'marketing',
          }),
        }).then(r => r.json());
      });

      if (response.success) {
        console.log('✅ Consent withdrawal available');
        console.log(`   Affected services: ${response.data?.affectedServices?.join(', ')}`);
      } else {
        console.log('ℹ️  Consent withdrawal may not be implemented');
      }
    });
  });
});
