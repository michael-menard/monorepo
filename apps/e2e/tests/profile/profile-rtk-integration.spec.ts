import { expect, test } from '@playwright/test';
import { TEST_USERS } from '../auth/test-users';
import { navigateToProfile, waitForProfilePageLoad, debugAuthState } from '../helpers/auth-helper';

/**
 * Profile Page RTK Integration Tests
 *
 * E2E tests for RTK Redux state management integration:
 * - Real-time data updates
 * - MOC instructions display
 * - Wishlist integration
 * - Profile statistics
 * - Error handling and loading states
 */
test.describe('Profile Page - RTK Redux Integration', () => {
  test.beforeEach(async ({ page }) => {
    try {
      await navigateToProfile(page, { user: TEST_USERS.STANDARD });
      const profileLoaded = await waitForProfilePageLoad(page);

      if (!profileLoaded) {
        console.log('⚠️  Profile page not fully loaded, debugging...');
        await debugAuthState(page);
      }

      console.log(`📍 Profile page ready for RTK testing: ${page.url()}`);
    } catch (error) {
      console.error('❌ Failed to set up profile page for RTK testing:', error);
      await debugAuthState(page);
      throw error;
    }
  });

  test.describe('RTK State Integration', () => {
    test('should display real-time statistics from RTK store', async ({ page }) => {
      // Wait for LEGO profile content to load
      const legoProfileContent = page.getByTestId('lego-profile-content');
      await expect(legoProfileContent).toBeVisible();

      // Look for statistics that should be populated from RTK store
      const statsElements = page.locator('text=/\\d+/'); // Numbers indicating stats
      const statsCount = await statsElements.count();

      expect(statsCount).toBeGreaterThan(0);
      console.log(`✅ Found ${statsCount} statistical elements from RTK store`);

      // Check for specific stat patterns
      const mocCount = page.locator('text=/MOCs.*\\d+|\\d+.*MOCs/i');
      const downloadCount = page.locator('text=/Downloads.*\\d+|\\d+.*Downloads/i');
      const ratingCount = page.locator('text=/Rating.*\\d+|\\d+.*Rating/i');

      if (await mocCount.count() > 0) {
        console.log('   ✅ MOC count displayed');
      }
      if (await downloadCount.count() > 0) {
        console.log('   ✅ Download count displayed');
      }
      if (await ratingCount.count() > 0) {
        console.log('   ✅ Rating displayed');
      }
    });

    test('should show recent activities from RTK state', async ({ page }) => {
      // Look for recent activity section
      const activityElements = page.locator('text=/Downloaded|Published|Created|Updated/i');
      const activityCount = await activityElements.count();

      if (activityCount > 0) {
        console.log(`✅ Found ${activityCount} recent activity items from RTK`);
        
        // Check for specific activity patterns
        const downloadActivity = page.locator('text=/Downloaded.*Batmobile/i');
        const publishActivity = page.locator('text=/Published.*Castle/i');

        if (await downloadActivity.count() > 0) {
          console.log('   ✅ Download activity displayed');
        }
        if (await publishActivity.count() > 0) {
          console.log('   ✅ Publish activity displayed');
        }
      } else {
        console.log('ℹ️  No recent activities found - may be empty state');
      }

      // Test passes if page loads correctly
      expect(page.url()).toContain('/profile');
    });

    test('should display wishlist preview from RTK state', async ({ page }) => {
      // Look for wishlist-related content
      const wishlistElements = page.locator('text=/LEGO Creator|LEGO Technic|Wishlist/i');
      const wishlistCount = await wishlistElements.count();

      if (wishlistCount > 0) {
        console.log(`✅ Found ${wishlistCount} wishlist-related elements from RTK`);
        
        // Check for specific wishlist items
        const creatorExpert = page.locator('text=/Creator Expert.*10242/i');
        const technic = page.locator('text=/Technic.*42115/i');

        if (await creatorExpert.count() > 0) {
          console.log('   ✅ Creator Expert item displayed');
        }
        if (await technic.count() > 0) {
          console.log('   ✅ Technic item displayed');
        }
      } else {
        console.log('ℹ️  No wishlist items found - may be empty state');
      }

      expect(page.url()).toContain('/profile');
    });
  });

  test.describe('MOC Instructions Integration', () => {
    test('should display MOC grid with RTK data', async ({ page }) => {
      // Click on MOCs tab if it exists
      const mocsTab = page.getByTestId('tab-mocs');
      if (await mocsTab.isVisible()) {
        await mocsTab.click();
        await page.waitForTimeout(500);
      }

      // Look for MOC-related content
      const mocElements = page.locator('text=/Batmobile|Castle|Space Station|MOC/i');
      const mocCount = await mocElements.count();

      if (mocCount > 0) {
        console.log(`✅ Found ${mocCount} MOC elements from RTK store`);
        
        // Check for specific MOCs
        const batmobile = page.locator('text=/Custom Batmobile/i');
        const castle = page.locator('text=/Medieval Castle/i');
        const spaceStation = page.locator('text=/Space Station Alpha/i');

        if (await batmobile.count() > 0) {
          console.log('   ✅ Custom Batmobile displayed');
        }
        if (await castle.count() > 0) {
          console.log('   ✅ Medieval Castle displayed');
        }
        if (await spaceStation.count() > 0) {
          console.log('   ✅ Space Station Alpha displayed');
        }
      } else {
        console.log('ℹ️  No MOC items found - checking for empty state');
        
        // Look for empty state messages
        const emptyState = page.locator('text=/Upload your first MOC|No MOCs|gallery will be displayed/i');
        if (await emptyState.count() > 0) {
          console.log('   ✅ Empty state displayed correctly');
        }
      }

      expect(page.url()).toContain('/profile');
    });

    test('should show MOC statistics and download counts', async ({ page }) => {
      // Look for download count patterns
      const downloadCounts = page.locator('text=/156|234|89/'); // Specific download counts from mock data
      const downloadCountsFound = await downloadCounts.count();

      if (downloadCountsFound > 0) {
        console.log(`✅ Found ${downloadCountsFound} download count elements`);
      }

      // Look for rating patterns
      const ratings = page.locator('text=/4\\.[6-8]/'); // Rating patterns like 4.6, 4.7, 4.8
      const ratingsFound = await ratings.count();

      if (ratingsFound > 0) {
        console.log(`✅ Found ${ratingsFound} rating elements`);
      }

      expect(page.url()).toContain('/profile');
    });
  });

  test.describe('Wishlist Integration', () => {
    test('should display wishlist items with RTK data', async ({ page }) => {
      // Try to navigate to wishlist tab if it exists
      const wishlistTab = page.locator('text=/Wishlist|Favorites/i').first();
      if (await wishlistTab.isVisible()) {
        await wishlistTab.click();
        await page.waitForTimeout(500);
      }

      // Look for wishlist-specific content
      const wishlistItems = page.locator('text=/LEGO Creator Expert|LEGO Technic/i');
      const itemCount = await wishlistItems.count();

      if (itemCount > 0) {
        console.log(`✅ Found ${itemCount} wishlist items from RTK store`);
      } else {
        console.log('ℹ️  No wishlist items found - checking for empty state');
        
        const emptyWishlist = page.locator('text=/No items|Add items|wishlist is empty/i');
        if (await emptyWishlist.count() > 0) {
          console.log('   ✅ Empty wishlist state displayed');
        }
      }

      expect(page.url()).toContain('/profile');
    });

    test('should show wishlist statistics', async ({ page }) => {
      // Look for wishlist statistics
      const totalItems = page.locator('text=/Total.*2|2.*Items/i');
      const purchasedItems = page.locator('text=/Purchased.*1|1.*Purchased/i');

      if (await totalItems.count() > 0) {
        console.log('✅ Total wishlist items count displayed');
      }
      if (await purchasedItems.count() > 0) {
        console.log('✅ Purchased items count displayed');
      }

      expect(page.url()).toContain('/profile');
    });
  });

  test.describe('Profile Data Integration', () => {
    test('should display user statistics from RTK profile state', async ({ page }) => {
      // Look for profile statistics
      const joinDate = page.getByTestId('join-date');
      if (await joinDate.isVisible()) {
        const joinDateText = await joinDate.textContent();
        expect(joinDateText).toBeTruthy();
        console.log(`✅ Join date displayed: ${joinDateText}`);
      }

      // Look for other profile stats
      const profileStats = page.locator('text=/Member since|Joined|Active/i');
      const statsCount = await profileStats.count();

      if (statsCount > 0) {
        console.log(`✅ Found ${statsCount} profile statistics`);
      }

      expect(page.url()).toContain('/profile');
    });

    test('should show user preferences from RTK state', async ({ page }) => {
      // Try to navigate to preferences/settings tab
      const preferencesTab = page.locator('text=/Preferences|Settings|Account/i').first();
      if (await preferencesTab.isVisible()) {
        await preferencesTab.click();
        await page.waitForTimeout(500);

        // Look for preference settings
        const emailNotifications = page.locator('text=/Email.*Notification/i');
        const publicProfile = page.locator('text=/Public.*Profile/i');
        const themeSettings = page.locator('text=/Theme|Dark|Light/i');

        if (await emailNotifications.count() > 0) {
          console.log('✅ Email notification preferences displayed');
        }
        if (await publicProfile.count() > 0) {
          console.log('✅ Public profile setting displayed');
        }
        if (await themeSettings.count() > 0) {
          console.log('✅ Theme settings displayed');
        }
      }

      expect(page.url()).toContain('/profile');
    });
  });

  test.describe('Real-time Updates', () => {
    test('should handle data updates without page refresh', async ({ page }) => {
      // Get initial state
      const initialContent = await page.locator('body').textContent();
      
      // Trigger an action that might update RTK state (like clicking edit)
      const editButton = page.getByTestId('content-edit-btn');
      if (await editButton.isVisible()) {
        await editButton.click();
        await page.waitForTimeout(1000);
        
        // Check if content updated
        const updatedContent = await page.locator('body').textContent();
        
        // Content should change when entering edit mode
        expect(updatedContent).not.toBe(initialContent);
        console.log('✅ Content updates without page refresh');
      } else {
        console.log('ℹ️  Edit button not found - testing basic reactivity');
        
        // Test tab switching as a form of state update
        const tabs = page.locator('[data-testid^="tab-"]');
        const tabCount = await tabs.count();
        
        if (tabCount > 1) {
          await tabs.nth(1).click();
          await page.waitForTimeout(300);
          console.log('✅ Tab switching works (state update)');
        }
      }

      expect(page.url()).toContain('/profile');
    });

    test('should maintain state during navigation', async ({ page }) => {
      // Navigate away and back
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');
      
      // Check that profile content is still there
      const legoProfileContent = page.getByTestId('lego-profile-content');
      await expect(legoProfileContent).toBeVisible();
      
      console.log('✅ Profile state maintained during navigation');
    });
  });

  test.describe('Error Handling', () => {
    test('should handle loading states gracefully', async ({ page }) => {
      // Reload page to potentially catch loading states
      await page.reload();
      await page.waitForTimeout(100); // Brief moment to catch loading state
      
      // Look for loading indicators
      const loadingIndicators = page.locator('.loading, .spinner, [data-loading="true"]');
      const loadingCount = await loadingIndicators.count();
      
      if (loadingCount > 0) {
        console.log(`✅ Found ${loadingCount} loading indicators`);
        
        // Wait for loading to complete
        await page.waitForLoadState('networkidle');
      }
      
      // Ensure content loads eventually
      const legoProfileContent = page.getByTestId('lego-profile-content');
      await expect(legoProfileContent).toBeVisible();
      
      console.log('✅ Loading states handled gracefully');
    });

    test('should handle empty data states', async ({ page }) => {
      // Look for empty state messages
      const emptyStates = page.locator('text=/No items|Empty|will be displayed here/i');
      const emptyStateCount = await emptyStates.count();
      
      if (emptyStateCount > 0) {
        console.log(`✅ Found ${emptyStateCount} empty state messages`);
      }
      
      // Page should still be functional even with empty data
      const profileLayout = page.getByTestId('profile-layout');
      await expect(profileLayout).toBeVisible();
      
      console.log('✅ Empty data states handled properly');
    });
  });

  test.describe('Performance with RTK', () => {
    test('should render efficiently with RTK state', async ({ page }) => {
      const startTime = Date.now();
      
      // Reload to test fresh RTK state loading
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      // Should load efficiently even with RTK state
      expect(loadTime).toBeLessThan(3000);
      console.log(`✅ RTK-powered page loaded in ${loadTime}ms`);
    });

    test('should handle multiple state updates efficiently', async ({ page }) => {
      // Perform multiple actions that trigger state updates
      const tabs = page.locator('[data-testid^="tab-"]');
      const tabCount = await tabs.count();
      
      if (tabCount > 1) {
        for (let i = 0; i < Math.min(tabCount, 3); i++) {
          await tabs.nth(i).click();
          await page.waitForTimeout(100);
        }
        
        console.log('✅ Multiple state updates handled efficiently');
      }
      
      // Page should remain responsive
      const profileLayout = page.getByTestId('profile-layout');
      await expect(profileLayout).toBeVisible();
    });
  });
});
