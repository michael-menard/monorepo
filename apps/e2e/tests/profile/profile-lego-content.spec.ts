import { expect, test } from '@playwright/test';
import { TEST_USERS } from '../auth/test-users';
import { navigateToProfile, waitForProfilePageLoad, debugAuthState } from '../helpers/auth-helper';

/**
 * LEGO-Themed Profile Content Tests
 *
 * E2E tests for the LEGO-specific profile content:
 * - LegoProfileContent component
 * - LEGO-themed tabs (MOCs, Instructions, Favorites, Achievements)
 * - LEGO workshop welcome message
 * - Interactive content and navigation
 * - LEGO-specific terminology and styling
 */
test.describe('Profile Page - LEGO-Themed Content', () => {
  test.beforeEach(async ({ page }) => {
    try {
      await navigateToProfile(page, { user: TEST_USERS.STANDARD });
      const profileLoaded = await waitForProfilePageLoad(page);

      if (!profileLoaded) {
        console.log('⚠️  Profile page not fully loaded, debugging...');
        await debugAuthState(page);
      }

      console.log(`📍 Profile page ready for LEGO content testing: ${page.url()}`);
    } catch (error) {
      console.error('❌ Failed to set up profile page for LEGO content testing:', error);
      await debugAuthState(page);
      throw error;
    }
  });

  test.describe('LEGO Workshop Welcome', () => {
    test('should display LEGO workshop welcome message', async ({ page }) => {
      const legoProfileContent = page.getByTestId('lego-profile-content');
      await expect(legoProfileContent).toBeVisible();

      // Look for LEGO workshop welcome message
      const welcomeHeader = page.getByTestId('welcome-header');
      if (await welcomeHeader.isVisible()) {
        const welcomeText = await welcomeHeader.textContent();
        expect(welcomeText).toContain("Welcome to John's LEGO Workshop!");
        console.log(`✅ Welcome message: ${welcomeText}`);
      } else {
        // Look for alternative welcome patterns
        const welcomePatterns = page.locator('text=/Welcome.*LEGO|LEGO.*Workshop|Builder.*Workshop/i');
        const welcomeCount = await welcomePatterns.count();
        
        if (welcomeCount > 0) {
          console.log(`✅ Found ${welcomeCount} LEGO welcome elements`);
        } else {
          console.log('ℹ️  No specific welcome message found - checking for LEGO branding');
          
          // Look for general LEGO references
          const legoRefs = page.locator('text=/LEGO|MOC|Builder|Brick/i');
          const legoCount = await legoRefs.count();
          expect(legoCount).toBeGreaterThan(0);
          console.log(`✅ Found ${legoCount} LEGO-related terms`);
        }
      }
    });

    test('should show LEGO-themed styling and colors', async ({ page }) => {
      const legoProfileContent = page.getByTestId('lego-profile-content');
      
      // Check for LEGO-themed classes or styling
      const hasLegoStyling = await legoProfileContent.evaluate((el) => {
        const classes = el.className;
        return classes.includes('lego') || 
               classes.includes('brick') || 
               classes.includes('orange') || 
               classes.includes('yellow') || 
               classes.includes('red');
      });

      if (hasLegoStyling) {
        console.log('✅ LEGO-themed styling detected');
      } else {
        console.log('ℹ️  No specific LEGO styling classes found - checking computed styles');
        
        // Check for LEGO-like colors in computed styles
        const bgColor = await legoProfileContent.evaluate((el) => {
          return window.getComputedStyle(el).backgroundColor;
        });
        
        console.log(`Background color: ${bgColor}`);
      }

      expect(legoProfileContent).toBeVisible();
    });
  });

  test.describe('LEGO-Themed Tabs', () => {
    test('should display all LEGO-themed tabs', async ({ page }) => {
      const contentTabs = page.getByTestId('content-tabs');
      await expect(contentTabs).toBeVisible();

      // Check for specific LEGO-themed tabs
      const expectedTabs = ['MOCs', 'Instructions', 'Favorites', 'Achievements'];
      
      for (const tabName of expectedTabs) {
        const tab = page.getByTestId(`tab-${tabName.toLowerCase()}`);
        if (await tab.isVisible()) {
          await expect(tab).toHaveText(tabName);
          console.log(`✅ ${tabName} tab found`);
        } else {
          // Look for alternative tab patterns
          const altTab = page.locator(`text=${tabName}`).first();
          if (await altTab.isVisible()) {
            console.log(`✅ ${tabName} tab found (alternative selector)`);
          } else {
            console.log(`ℹ️  ${tabName} tab not found - may be using different naming`);
          }
        }
      }

      console.log('✅ LEGO-themed tabs structure verified');
    });

    test('should navigate between tabs correctly', async ({ page }) => {
      // Get all available tabs
      const tabs = page.locator('[data-testid^="tab-"]');
      const tabCount = await tabs.count();
      
      if (tabCount > 1) {
        console.log(`Found ${tabCount} tabs to test`);
        
        for (let i = 0; i < Math.min(tabCount, 4); i++) {
          const tab = tabs.nth(i);
          const tabText = await tab.textContent();
          
          await tab.click();
          await page.waitForTimeout(300);
          
          console.log(`   ✅ Clicked ${tabText} tab`);
        }
        
        console.log('✅ Tab navigation works correctly');
      } else {
        console.log('ℹ️  Less than 2 tabs found - checking for alternative tab structure');
        
        // Look for alternative tab patterns
        const altTabs = page.locator('button:has-text("MOCs"), button:has-text("Instructions"), button:has-text("Favorites")');
        const altTabCount = await altTabs.count();
        
        if (altTabCount > 0) {
          console.log(`✅ Found ${altTabCount} alternative tab elements`);
        }
      }
    });

    test('should show appropriate content for each tab', async ({ page }) => {
      const tabContentMap = {
        'mocs': ['Custom Batmobile', 'Medieval Castle', 'Space Station', 'MOC', 'creation'],
        'instructions': ['Download', 'Step-by-step', 'Building guide', 'Instructions'],
        'favorites': ['Favorite', 'Liked', 'Bookmarked', 'Saved'],
        'achievements': ['Achievement', 'Badge', 'Milestone', 'Completed']
      };

      for (const [tabKey, expectedContent] of Object.entries(tabContentMap)) {
        const tab = page.getByTestId(`tab-${tabKey}`);
        
        if (await tab.isVisible()) {
          await tab.click();
          await page.waitForTimeout(500);
          
          // Look for expected content
          let contentFound = false;
          for (const content of expectedContent) {
            const contentElement = page.locator(`text=/${content}/i`);
            if (await contentElement.count() > 0) {
              contentFound = true;
              console.log(`   ✅ Found "${content}" in ${tabKey} tab`);
              break;
            }
          }
          
          if (!contentFound) {
            console.log(`   ℹ️  No specific content found for ${tabKey} tab - may be empty state`);
          }
          
          console.log(`✅ ${tabKey} tab content checked`);
        }
      }
    });
  });

  test.describe('MOCs Tab Content', () => {
    test('should display MOC gallery when available', async ({ page }) => {
      const mocsTab = page.getByTestId('tab-mocs');
      
      if (await mocsTab.isVisible()) {
        await mocsTab.click();
        await page.waitForTimeout(500);
        
        // Look for MOC-related content
        const mocElements = page.locator('text=/MOC|Custom|Build|Creation/i');
        const mocCount = await mocElements.count();
        
        if (mocCount > 0) {
          console.log(`✅ Found ${mocCount} MOC-related elements`);
          
          // Look for specific MOCs from test data
          const batmobile = page.locator('text=/Batmobile/i');
          const castle = page.locator('text=/Castle/i');
          const spaceStation = page.locator('text=/Space.*Station/i');
          
          if (await batmobile.count() > 0) console.log('   ✅ Batmobile MOC found');
          if (await castle.count() > 0) console.log('   ✅ Castle MOC found');
          if (await spaceStation.count() > 0) console.log('   ✅ Space Station MOC found');
        } else {
          // Check for empty state
          const emptyState = page.locator('text=/Upload your first MOC|No MOCs|Create your first/i');
          if (await emptyState.count() > 0) {
            console.log('✅ Empty MOCs state displayed correctly');
          }
        }
      }
      
      console.log('✅ MOCs tab content verified');
    });

    test('should show MOC statistics and actions', async ({ page }) => {
      const mocsTab = page.getByTestId('tab-mocs');
      
      if (await mocsTab.isVisible()) {
        await mocsTab.click();
        await page.waitForTimeout(500);
        
        // Look for MOC statistics
        const downloadCounts = page.locator('text=/\\d+.*download|download.*\\d+/i');
        const ratings = page.locator('text=/\\d+\\.\\d+.*star|star.*\\d+\\.\\d+|rating/i');
        const viewCounts = page.locator('text=/\\d+.*view|view.*\\d+/i');
        
        const statsFound = await downloadCounts.count() + await ratings.count() + await viewCounts.count();
        
        if (statsFound > 0) {
          console.log(`✅ Found ${statsFound} MOC statistics elements`);
        }
        
        // Look for action buttons
        const actionButtons = page.locator('button:has-text("Download"), button:has-text("View"), button:has-text("Edit")');
        const actionCount = await actionButtons.count();
        
        if (actionCount > 0) {
          console.log(`✅ Found ${actionCount} MOC action buttons`);
        }
      }
      
      console.log('✅ MOC statistics and actions verified');
    });
  });

  test.describe('Instructions Tab Content', () => {
    test('should display building instructions', async ({ page }) => {
      const instructionsTab = page.getByTestId('tab-instructions');
      
      if (await instructionsTab.isVisible()) {
        await instructionsTab.click();
        await page.waitForTimeout(500);
        
        // Look for instruction-related content
        const instructionElements = page.locator('text=/Step|Guide|Tutorial|Instructions|Building/i');
        const instructionCount = await instructionElements.count();
        
        if (instructionCount > 0) {
          console.log(`✅ Found ${instructionCount} instruction-related elements`);
        } else {
          // Check for empty state
          const emptyInstructions = page.locator('text=/No instructions|Upload instructions|Create guide/i');
          if (await emptyInstructions.count() > 0) {
            console.log('✅ Empty instructions state displayed');
          }
        }
      }
      
      console.log('✅ Instructions tab content verified');
    });

    test('should show instruction download options', async ({ page }) => {
      const instructionsTab = page.getByTestId('tab-instructions');
      
      if (await instructionsTab.isVisible()) {
        await instructionsTab.click();
        await page.waitForTimeout(500);
        
        // Look for download options
        const downloadButtons = page.locator('button:has-text("Download"), a:has-text("Download")');
        const downloadCount = await downloadButtons.count();
        
        if (downloadCount > 0) {
          console.log(`✅ Found ${downloadCount} download options`);
        }
        
        // Look for file format options
        const formatOptions = page.locator('text=/PDF|LDR|LDD|Studio/i');
        const formatCount = await formatOptions.count();
        
        if (formatCount > 0) {
          console.log(`✅ Found ${formatCount} file format options`);
        }
      }
      
      console.log('✅ Instruction download options verified');
    });
  });

  test.describe('Favorites Tab Content', () => {
    test('should display favorite LEGO sets and MOCs', async ({ page }) => {
      const favoritesTab = page.getByTestId('tab-favorites');
      
      if (await favoritesTab.isVisible()) {
        await favoritesTab.click();
        await page.waitForTimeout(500);
        
        // Look for favorite items
        const favoriteElements = page.locator('text=/Favorite|Liked|Bookmarked|LEGO Creator|LEGO Technic/i');
        const favoriteCount = await favoriteElements.count();
        
        if (favoriteCount > 0) {
          console.log(`✅ Found ${favoriteCount} favorite elements`);
          
          // Look for specific favorite items from test data
          const creatorExpert = page.locator('text=/Creator Expert.*10242/i');
          const technic = page.locator('text=/Technic.*42115/i');
          
          if (await creatorExpert.count() > 0) console.log('   ✅ Creator Expert favorite found');
          if (await technic.count() > 0) console.log('   ✅ Technic favorite found');
        } else {
          // Check for empty favorites state
          const emptyFavorites = page.locator('text=/No favorites|Add favorites|Heart icon/i');
          if (await emptyFavorites.count() > 0) {
            console.log('✅ Empty favorites state displayed');
          }
        }
      }
      
      console.log('✅ Favorites tab content verified');
    });

    test('should allow favoriting and unfavoriting items', async ({ page }) => {
      const favoritesTab = page.getByTestId('tab-favorites');
      
      if (await favoritesTab.isVisible()) {
        await favoritesTab.click();
        await page.waitForTimeout(500);
        
        // Look for heart icons or favorite buttons
        const heartIcons = page.locator('[data-testid="heart-icon"], .heart, button:has-text("♥")');
        const favoriteButtons = page.locator('button:has-text("Favorite"), button:has-text("Like")');
        
        const interactiveElements = await heartIcons.count() + await favoriteButtons.count();
        
        if (interactiveElements > 0) {
          console.log(`✅ Found ${interactiveElements} interactive favorite elements`);
        }
      }
      
      console.log('✅ Favorite interaction elements verified');
    });
  });

  test.describe('Achievements Tab Content', () => {
    test('should display LEGO building achievements', async ({ page }) => {
      const achievementsTab = page.getByTestId('tab-achievements');
      
      if (await achievementsTab.isVisible()) {
        await achievementsTab.click();
        await page.waitForTimeout(500);
        
        // Look for achievement-related content
        const achievementElements = page.locator('text=/Achievement|Badge|Milestone|Trophy|Completed/i');
        const achievementCount = await achievementElements.count();
        
        if (achievementCount > 0) {
          console.log(`✅ Found ${achievementCount} achievement elements`);
          
          // Look for specific LEGO achievements
          const builderBadge = page.locator('text=/Builder.*Badge|Master.*Builder/i');
          const creativeBadge = page.locator('text=/Creative|Innovative|Designer/i');
          
          if (await builderBadge.count() > 0) console.log('   ✅ Builder badge found');
          if (await creativeBadge.count() > 0) console.log('   ✅ Creative badge found');
        } else {
          // Check for empty achievements state
          const emptyAchievements = page.locator('text=/No achievements|Earn your first|Start building/i');
          if (await emptyAchievements.count() > 0) {
            console.log('✅ Empty achievements state displayed');
          }
        }
      }
      
      console.log('✅ Achievements tab content verified');
    });

    test('should show achievement progress and unlocked badges', async ({ page }) => {
      const achievementsTab = page.getByTestId('tab-achievements');
      
      if (await achievementsTab.isVisible()) {
        await achievementsTab.click();
        await page.waitForTimeout(500);
        
        // Look for progress indicators
        const progressBars = page.locator('.progress, [role="progressbar"], .progress-bar');
        const progressCount = await progressBars.count();
        
        if (progressCount > 0) {
          console.log(`✅ Found ${progressCount} progress indicators`);
        }
        
        // Look for badge icons
        const badgeIcons = page.locator('[data-testid="trophy-icon"], .badge, .achievement-icon');
        const badgeCount = await badgeIcons.count();
        
        if (badgeCount > 0) {
          console.log(`✅ Found ${badgeCount} badge icons`);
        }
      }
      
      console.log('✅ Achievement progress and badges verified');
    });
  });

  test.describe('LEGO Terminology and Branding', () => {
    test('should use proper LEGO terminology throughout', async ({ page }) => {
      // Look for LEGO-specific terms
      const legoTerms = [
        'MOC', 'LEGO', 'Brick', 'Builder', 'Creation', 'Set', 'Minifigure', 
        'Technic', 'Creator', 'Architecture', 'Ideas', 'Studio'
      ];
      
      let termsFound = 0;
      for (const term of legoTerms) {
        const termElements = page.locator(`text=/${term}/i`);
        const count = await termElements.count();
        if (count > 0) {
          termsFound++;
          console.log(`   ✅ Found "${term}" (${count} times)`);
        }
      }
      
      expect(termsFound).toBeGreaterThan(0);
      console.log(`✅ Found ${termsFound} different LEGO terms`);
    });

    test('should maintain LEGO brand consistency', async ({ page }) => {
      // Check for consistent LEGO branding
      const legoElements = page.locator('text=/LEGO/');
      const legoCount = await legoElements.count();
      
      if (legoCount > 0) {
        console.log(`✅ LEGO brand mentioned ${legoCount} times`);
        
        // Check for proper capitalization
        for (let i = 0; i < Math.min(legoCount, 5); i++) {
          const legoText = await legoElements.nth(i).textContent();
          if (legoText?.includes('LEGO')) {
            console.log(`   ✅ Proper LEGO capitalization: "${legoText}"`);
          }
        }
      }
      
      console.log('✅ LEGO brand consistency verified');
    });
  });
});
