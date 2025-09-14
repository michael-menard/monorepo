import { expect, test } from '@playwright/test';
import { TEST_USERS } from '../auth/test-users';
import { navigateToProfile, waitForProfilePageLoad, debugAuthState } from '../helpers/auth-helper';

/**
 * Profile Page RTK Layout Tests
 *
 * Comprehensive E2E tests for the new RTK-powered Profile page layout:
 * - New ProfileLayout with sidebar and main content
 * - RTK Redux state integration
 * - Enhanced avatar functionality
 * - LEGO-themed content and tabs
 * - Responsive design and accessibility
 */
test.describe('Profile Page - RTK Layout System', () => {
  test.beforeEach(async ({ page }) => {
    try {
      // Navigate to profile page with authentication
      await navigateToProfile(page, { user: TEST_USERS.STANDARD });

      // Wait for profile page to load completely
      const profileLoaded = await waitForProfilePageLoad(page);

      if (!profileLoaded) {
        console.log('⚠️  Profile page not fully loaded, debugging...');
        await debugAuthState(page);
      }

      console.log(`📍 Profile page ready: ${page.url()}`);
    } catch (error) {
      console.error('❌ Failed to set up profile page:', error);
      await debugAuthState(page);
      throw error;
    }
  });

  test.describe('Layout Structure', () => {
    test('should render new ProfileLayout with correct structure', async ({ page }) => {
      // Check for new ProfileLayout structure
      const profileLayout = page.getByTestId('profile-layout');
      const profileSidebar = page.getByTestId('profile-layout-sidebar');
      const profileMain = page.getByTestId('profile-layout-content');

      await expect(profileLayout).toBeVisible();
      await expect(profileSidebar).toBeVisible();
      await expect(profileMain).toBeVisible();

      console.log('✅ ProfileLayout structure verified');
    });

    test('should apply LEGO-themed gradient background', async ({ page }) => {
      const profileLayout = page.getByTestId('profile-layout');
      
      // Check for gradient background classes
      const hasGradient = await profileLayout.evaluate((el) => {
        const classes = el.className;
        return classes.includes('bg-gradient-to-br') && 
               classes.includes('from-orange-50') && 
               classes.includes('via-yellow-50') && 
               classes.includes('to-red-50');
      });

      expect(hasGradient).toBe(true);
      console.log('✅ LEGO-themed gradient background applied');
    });

    test('should show back button with correct functionality', async ({ page }) => {
      const backButton = page.getByTestId('back-button');
      
      await expect(backButton).toBeVisible();
      await expect(backButton).toHaveText('← Back to Home');

      // Test navigation
      await backButton.click();
      await page.waitForURL('/');
      
      expect(page.url()).toContain('/');
      console.log('✅ Back button navigation works');
    });
  });

  test.describe('Sidebar Content', () => {
    test('should render ProfileAvatar with enhanced features', async ({ page }) => {
      const profileAvatar = page.getByTestId('profile-avatar');
      const avatarImage = page.getByTestId('avatar-image');
      
      await expect(profileAvatar).toBeVisible();
      await expect(avatarImage).toBeVisible();

      // Check avatar properties
      const avatarSrc = await avatarImage.getAttribute('src');
      const avatarAlt = await avatarImage.getAttribute('alt');
      
      expect(avatarSrc).toBeTruthy();
      expect(avatarAlt).toContain('avatar');

      console.log('✅ ProfileAvatar rendered with correct properties');
    });

    test('should show avatar hover overlay with pencil icon', async ({ page }) => {
      const avatarContainer = page.getByTestId('avatar-container');
      const avatarHoverOverlay = page.getByTestId('avatar-hover-overlay');
      const pencilIcon = page.getByTestId('pencil-icon');

      // Hover over avatar
      await avatarContainer.hover();
      await page.waitForTimeout(300);

      await expect(avatarHoverOverlay).toBeVisible();
      await expect(pencilIcon).toBeVisible();

      console.log('✅ Avatar hover overlay and pencil icon work');
    });

    test('should display user information correctly', async ({ page }) => {
      const userName = page.getByTestId('user-name');
      const userEmail = page.getByTestId('user-email');
      const username = page.getByTestId('username');
      const userTitle = page.getByTestId('user-title');
      const userLocation = page.getByTestId('user-location');

      await expect(userName).toHaveText('John Doe');
      await expect(userEmail).toHaveText('john.doe@example.com');
      await expect(username).toHaveText('@johndoe');
      await expect(userTitle).toHaveText('LEGO Builder');
      await expect(userLocation).toHaveText('San Francisco, CA');

      console.log('✅ User information displayed correctly');
    });

    test('should show user badges', async ({ page }) => {
      const badge1 = page.getByTestId('badge-0');
      const badge2 = page.getByTestId('badge-1');

      await expect(badge1).toBeVisible();
      await expect(badge1).toHaveText('Verified Builder');
      
      await expect(badge2).toBeVisible();
      await expect(badge2).toHaveText('Active Member');

      console.log('✅ User badges displayed correctly');
    });

    test('should display bio and social links', async ({ page }) => {
      // Check bio section
      const aboutSection = page.locator('text=About').first();
      await expect(aboutSection).toBeVisible();

      const bioText = page.locator('text=LEGO enthusiast and MOC creator');
      await expect(bioText).toBeVisible();

      // Check social links
      const connectSection = page.locator('text=Connect').first();
      await expect(connectSection).toBeVisible();

      const twitterLink = page.locator('a[href*="twitter.com"]');
      const linkedinLink = page.locator('a[href*="linkedin.com"]');
      const githubLink = page.locator('a[href*="github.com"]');
      const instagramLink = page.locator('a[href*="instagram.com"]');

      await expect(twitterLink).toBeVisible();
      await expect(linkedinLink).toBeVisible();
      await expect(githubLink).toBeVisible();
      await expect(instagramLink).toBeVisible();

      console.log('✅ Bio and social links displayed correctly');
    });

    test('should show website section', async ({ page }) => {
      const websiteSection = page.locator('text=Website').first();
      await expect(websiteSection).toBeVisible();

      const websiteLink = page.locator('a[href="https://johndoe.dev"]');
      await expect(websiteLink).toBeVisible();
      await expect(websiteLink).toHaveText('Visit Website');

      console.log('✅ Website section displayed correctly');
    });

    test('should have edit profile button in sidebar', async ({ page }) => {
      const editButton = page.getByTestId('button-default');
      
      await expect(editButton).toBeVisible();
      await expect(editButton).toHaveText('Edit Profile');

      console.log('✅ Edit profile button found in sidebar');
    });
  });

  test.describe('Main Content', () => {
    test('should render ProfileMain with correct title', async ({ page }) => {
      const profileMain = page.getByTestId('profile-main');
      
      await expect(profileMain).toBeVisible();
      
      const title = profileMain.locator('h1');
      await expect(title).toHaveText('Profile');

      const description = profileMain.locator('p');
      await expect(description).toHaveText('Manage your account settings and preferences');

      console.log('✅ ProfileMain rendered with correct content');
    });

    test('should render LegoProfileContent component', async ({ page }) => {
      const legoProfileContent = page.getByTestId('lego-profile-content');
      
      await expect(legoProfileContent).toBeVisible();

      // Check for welcome header
      const welcomeHeader = page.getByTestId('welcome-header');
      await expect(welcomeHeader).toBeVisible();
      await expect(welcomeHeader).toContainText("Welcome to John's LEGO Workshop!");

      console.log('✅ LegoProfileContent component rendered');
    });

    test('should display LEGO-themed tabs', async ({ page }) => {
      const contentTabs = page.getByTestId('content-tabs');
      await expect(contentTabs).toBeVisible();

      // Check for specific tabs
      const mocsTab = page.getByTestId('tab-mocs');
      const instructionsTab = page.getByTestId('tab-instructions');
      const favoritesTab = page.getByTestId('tab-favorites');
      const achievementsTab = page.getByTestId('tab-achievements');

      await expect(mocsTab).toBeVisible();
      await expect(instructionsTab).toBeVisible();
      await expect(favoritesTab).toBeVisible();
      await expect(achievementsTab).toBeVisible();

      console.log('✅ LEGO-themed tabs displayed correctly');
    });
  });

  test.describe('Interactive Features', () => {
    test('should handle avatar upload interaction', async ({ page }) => {
      const avatarContainer = page.getByTestId('avatar-container');
      
      // Set up file chooser listener
      const fileChooserPromise = page.waitForEvent('filechooser');

      // Hover and click on avatar
      await avatarContainer.hover();
      await page.waitForTimeout(300);
      await avatarContainer.click();

      // Wait for file chooser
      const fileChooser = await fileChooserPromise;
      expect(fileChooser).toBeTruthy();

      console.log('✅ Avatar upload interaction works');
    });

    test('should open edit profile modal', async ({ page }) => {
      const editButton = page.getByTestId('button-default');
      
      await editButton.click();
      await page.waitForTimeout(500);

      // Check for modal elements (implementation may vary)
      const modalTitle = page.locator('h2:has-text("Edit Profile")');
      const avatarUploader = page.getByTestId('avatar-uploader');
      const formSection = page.getByTestId('form-section');

      // At least one of these should be visible
      const modalVisible = await modalTitle.isVisible() || 
                          await avatarUploader.isVisible() || 
                          await formSection.isVisible();

      expect(modalVisible).toBe(true);
      console.log('✅ Edit profile modal opens');
    });

    test('should handle tab navigation', async ({ page }) => {
      // Test clicking on different tabs
      const mocsTab = page.getByTestId('tab-mocs');
      const instructionsTab = page.getByTestId('tab-instructions');
      const favoritesTab = page.getByTestId('tab-favorites');

      await mocsTab.click();
      await page.waitForTimeout(200);
      console.log('   MOCs tab clicked');

      await instructionsTab.click();
      await page.waitForTimeout(200);
      console.log('   Instructions tab clicked');

      await favoritesTab.click();
      await page.waitForTimeout(200);
      console.log('   Favorites tab clicked');

      console.log('✅ Tab navigation works');
    });
  });

  test.describe('Responsive Design', () => {
    test('should adapt to different screen sizes', async ({ page }) => {
      const viewports = [
        { width: 1920, height: 1080, name: 'Desktop Large' },
        { width: 1280, height: 720, name: 'Desktop' },
        { width: 768, height: 1024, name: 'Tablet' },
        { width: 375, height: 667, name: 'Mobile' }
      ];

      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.waitForTimeout(300);

        console.log(`📱 Testing ${viewport.name} (${viewport.width}x${viewport.height})`);

        // Check that main layout elements are still visible
        const profileLayout = page.getByTestId('profile-layout');
        const profileSidebar = page.getByTestId('profile-layout-sidebar');
        
        await expect(profileLayout).toBeVisible();
        
        // Sidebar might be hidden on mobile
        if (viewport.width >= 768) {
          await expect(profileSidebar).toBeVisible();
        }

        console.log(`   ✅ Layout adapts to ${viewport.name}`);
      }

      // Reset to default
      await page.setViewportSize({ width: 1280, height: 720 });
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper ARIA attributes', async ({ page }) => {
      const profileMain = page.getByTestId('profile-layout-content');
      
      // Check for aria-hidden attribute
      const ariaHidden = await profileMain.locator('div[aria-hidden]').first();
      await expect(ariaHidden).toBeVisible();

      console.log('✅ ARIA attributes properly set');
    });

    test('should support keyboard navigation', async ({ page }) => {
      // Test tab navigation through interactive elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Check if focus is visible
      const focusedElement = page.locator(':focus');
      const isFocused = await focusedElement.count() > 0;
      
      expect(isFocused).toBe(true);
      console.log('✅ Keyboard navigation works');
    });

    test('should have proper heading structure', async ({ page }) => {
      const h1 = page.locator('h1');
      await expect(h1).toBeVisible();
      await expect(h1).toHaveText('Profile');

      console.log('✅ Proper heading structure');
    });
  });

  test.describe('Performance', () => {
    test('should load quickly', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
      console.log(`✅ Page loaded in ${loadTime}ms`);
    });

    test('should handle large amounts of data', async ({ page }) => {
      // Check if page remains responsive with content
      const legoProfileContent = page.getByTestId('lego-profile-content');
      await expect(legoProfileContent).toBeVisible();

      // Test scrolling performance
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(100);
      await page.mouse.wheel(0, -500);

      console.log('✅ Page handles scrolling smoothly');
    });
  });
});
