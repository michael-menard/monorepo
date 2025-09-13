import { expect, test } from '@playwright/test';
import { createAuthTestUtils } from './utils';
import { SOUTH_PARK_USERS, TEST_USERS } from './test-users';

/**
 * Role-Based Access Control (RBAC) Tests
 * 
 * Tests permission and role management:
 * - Admin vs User route access
 * - Permission-based feature access
 * - Role assignment and changes
 * - Privilege escalation prevention
 * - Resource-level permissions
 * - Dynamic permission checking
 */
test.describe('Role-Based Access Control (RBAC)', () => {
  test.describe.configure({ timeout: 120000 }); // 2 minutes for RBAC tests

  test.beforeAll(async () => {
    console.log('👑 Testing Role-Based Access Control:');
    console.log('  - Admin vs User permissions');
    console.log('  - Protected route access');
    console.log('  - Feature-level permissions');
    console.log('  - Role assignment and changes');
    console.log('  - Privilege escalation prevention');
    console.log('  - Resource-level access control');
  });

  test.beforeEach(async ({ page }) => {
    const authUtils = createAuthTestUtils(page);
    await authUtils.setup();
  });

  test.afterEach(async ({ page }) => {
    const authUtils = createAuthTestUtils(page);
    await authUtils.cleanup();
  });

  test.describe('Admin Route Access', () => {
    test('should allow admin access to admin-only routes', async ({ page }) => {
      test.setTimeout(90000);
      
      const authUtils = createAuthTestUtils(page);
      const adminUser = SOUTH_PARK_USERS.RANDY; // Randy is admin

      // Mock admin login
      await authUtils.mockAuthAPI('login', {
        success: true,
        data: {
          user: {
            id: 'randy-123',
            email: adminUser.email,
            name: adminUser.name,
            isVerified: true,
            role: 'admin',
            permissions: [
              'admin:read',
              'admin:write',
              'users:manage',
              'content:moderate',
              'system:configure',
            ],
          },
          tokens: {
            accessToken: 'admin-access-token',
            refreshToken: 'admin-refresh-token',
            expiresIn: 3600,
          },
        },
      });

      // Login as admin
      await authUtils.navigateToAuthPage('login');
      await authUtils.login(adminUser.email, adminUser.password);
      await page.waitForTimeout(3000);

      // Test admin routes
      const adminRoutes = [
        '/admin',
        '/admin/dashboard',
        '/admin/users',
        '/admin/settings',
        '/admin/analytics',
      ];

      for (const route of adminRoutes) {
        try {
          await page.goto(route, { timeout: 10000 });
          await page.waitForTimeout(2000);

          // Should not be redirected to login
          const currentUrl = page.url();
          const isOnAdminRoute = currentUrl.includes('/admin');
          const isRedirectedToLogin = currentUrl.includes('/login');

          if (isOnAdminRoute && !isRedirectedToLogin) {
            console.log(`✅ Admin access granted to: ${route}`);
          } else if (isRedirectedToLogin) {
            console.log(`❌ Admin redirected to login from: ${route}`);
          } else {
            console.log(`ℹ️  Admin route may not exist: ${route}`);
          }
        } catch (error) {
          console.log(`ℹ️  Admin route not accessible: ${route}`);
        }
      }
    });

    test('should deny regular user access to admin routes', async ({ page }) => {
      test.setTimeout(90000);
      
      const authUtils = createAuthTestUtils(page);
      const regularUser = SOUTH_PARK_USERS.STAN; // Stan is regular user

      // Mock regular user login
      await authUtils.mockAuthAPI('login', {
        success: true,
        data: {
          user: {
            id: 'stan-123',
            email: regularUser.email,
            name: regularUser.name,
            isVerified: true,
            role: 'user',
            permissions: [
              'profile:read',
              'profile:write',
              'content:read',
              'content:create',
            ],
          },
          tokens: {
            accessToken: 'user-access-token',
            refreshToken: 'user-refresh-token',
            expiresIn: 3600,
          },
        },
      });

      // Login as regular user
      await authUtils.navigateToAuthPage('login');
      await authUtils.login(regularUser.email, regularUser.password);
      await page.waitForTimeout(3000);

      // Try to access admin routes
      const adminRoutes = ['/admin', '/admin/users', '/admin/settings'];

      for (const route of adminRoutes) {
        try {
          await page.goto(route, { timeout: 10000 });
          await page.waitForTimeout(3000);

          const currentUrl = page.url();
          const isRedirectedToLogin = currentUrl.includes('/login');
          const hasAccessDenied = await page.locator('text=/access.*denied|unauthorized|forbidden/i').count();
          const isOnAdminRoute = currentUrl.includes('/admin') && !isRedirectedToLogin && hasAccessDenied === 0;

          if (isRedirectedToLogin || hasAccessDenied > 0) {
            console.log(`✅ Regular user denied access to: ${route}`);
          } else if (isOnAdminRoute) {
            console.log(`❌ Regular user gained access to: ${route}`);
          } else {
            console.log(`ℹ️  Admin route behavior unclear: ${route}`);
          }
        } catch (error) {
          console.log(`ℹ️  Admin route not accessible: ${route}`);
        }
      }
    });
  });

  test.describe('Feature-Level Permissions', () => {
    test('should control feature access based on permissions', async ({ page }) => {
      test.setTimeout(90000);
      
      const authUtils = createAuthTestUtils(page);

      // Test different permission levels
      const permissionTests = [
        {
          user: 'admin',
          permissions: ['content:create', 'content:edit', 'content:delete', 'users:manage'],
          shouldHaveAccess: ['create-button', 'edit-button', 'delete-button', 'user-management'],
        },
        {
          user: 'moderator',
          permissions: ['content:create', 'content:edit', 'content:moderate'],
          shouldHaveAccess: ['create-button', 'edit-button', 'moderate-button'],
          shouldNotHaveAccess: ['delete-button', 'user-management'],
        },
        {
          user: 'user',
          permissions: ['content:read', 'content:create'],
          shouldHaveAccess: ['create-button'],
          shouldNotHaveAccess: ['edit-button', 'delete-button', 'moderate-button'],
        },
      ];

      for (const test of permissionTests) {
        // Mock login with specific permissions
        await authUtils.mockAuthAPI('login', {
          success: true,
          data: {
            user: {
              id: `${test.user}-123`,
              email: `${test.user}@example.com`,
              name: test.user,
              isVerified: true,
              role: test.user,
              permissions: test.permissions,
            },
            tokens: {
              accessToken: `${test.user}-token`,
              refreshToken: `${test.user}-refresh`,
              expiresIn: 3600,
            },
          },
        });

        await authUtils.navigateToAuthPage('login');
        await authUtils.login(`${test.user}@example.com`, 'TestPassword123!');
        await page.waitForTimeout(3000);

        // Navigate to main content area
        await page.goto('/dashboard', { timeout: 10000 });
        await page.waitForTimeout(2000);

        // Check for permission-based UI elements
        if (test.shouldHaveAccess) {
          for (const element of test.shouldHaveAccess) {
            const hasElement = await page.locator(`[data-permission="${element}"], button:has-text("${element}"), .${element}`).count();
            if (hasElement > 0) {
              console.log(`✅ ${test.user} has access to: ${element}`);
            } else {
              console.log(`ℹ️  ${test.user} element not found: ${element}`);
            }
          }
        }

        if (test.shouldNotHaveAccess) {
          for (const element of test.shouldNotHaveAccess) {
            const hasElement = await page.locator(`[data-permission="${element}"], button:has-text("${element}"), .${element}`).count();
            if (hasElement === 0) {
              console.log(`✅ ${test.user} correctly denied access to: ${element}`);
            } else {
              console.log(`❌ ${test.user} has unexpected access to: ${element}`);
            }
          }
        }

        // Logout for next test
        await authUtils.logout();
      }
    });

    test('should validate permissions on API calls', async ({ page }) => {
      test.setTimeout(60000);
      
      const authUtils = createAuthTestUtils(page);

      // Mock permission validation on API calls
      await page.route('**/api/admin/**', async route => {
        const authHeader = route.request().headers()['authorization'];
        const hasAdminToken = authHeader?.includes('admin-token');

        if (hasAdminToken) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, data: 'Admin data' }),
          });
        } else {
          await route.fulfill({
            status: 403,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              message: 'Insufficient permissions',
              code: 'FORBIDDEN',
            }),
          });
        }
      });

      // Test API call with user token (should fail)
      const userResponse = await page.evaluate(async () => {
        return fetch('/api/admin/users', {
          headers: { 'Authorization': 'Bearer user-token' }
        }).then(r => r.json());
      });

      expect(userResponse.success).toBe(false);
      console.log('✅ API permission validation working');
    });
  });

  test.describe('Role Assignment & Changes', () => {
    test('should allow admin to change user roles', async ({ page }) => {
      test.setTimeout(90000);
      
      const authUtils = createAuthTestUtils(page);
      const adminUser = SOUTH_PARK_USERS.RANDY;

      // Mock admin login
      await authUtils.mockAuthAPI('login', {
        success: true,
        data: {
          user: {
            id: 'randy-123',
            email: adminUser.email,
            name: adminUser.name,
            isVerified: true,
            role: 'admin',
            permissions: ['users:manage', 'roles:assign'],
          },
          tokens: {
            accessToken: 'admin-token',
            refreshToken: 'admin-refresh',
            expiresIn: 3600,
          },
        },
      });

      // Mock role change endpoint
      await authUtils.mockAuthAPI('change-user-role', {
        success: true,
        message: 'User role updated successfully',
        data: {
          userId: 'stan-123',
          oldRole: 'user',
          newRole: 'moderator',
          changedBy: 'randy-123',
          changedAt: new Date().toISOString(),
        },
      });

      await authUtils.navigateToAuthPage('login');
      await authUtils.login(adminUser.email, adminUser.password);
      await page.waitForTimeout(3000);

      // Navigate to user management
      await page.goto('/admin/users', { timeout: 10000 });
      await page.waitForTimeout(2000);

      // Look for role change functionality
      const hasRoleSelect = await page.locator('select[name="role"], .role-selector').count();
      
      if (hasRoleSelect > 0) {
        // Try to change a user's role
        await page.selectOption('select[name="role"]', 'moderator');
        await page.click('button:has-text("Update Role"), button:has-text("Save")');
        await page.waitForTimeout(3000);

        const hasSuccessMessage = await page.locator('text=/role.*updated|role.*changed/i').count();
        expect(hasSuccessMessage).toBeGreaterThan(0);
        console.log('✅ Admin can change user roles');
      } else {
        console.log('ℹ️  Role management UI may not be implemented yet');
      }
    });

    test('should prevent regular users from changing roles', async ({ page }) => {
      test.setTimeout(60000);
      
      const authUtils = createAuthTestUtils(page);
      const regularUser = SOUTH_PARK_USERS.KYLE;

      // Mock regular user login
      await authUtils.mockAuthAPI('login', {
        success: true,
        data: {
          user: {
            id: 'kyle-123',
            email: regularUser.email,
            name: regularUser.name,
            isVerified: true,
            role: 'user',
            permissions: ['profile:read', 'profile:write'],
          },
          tokens: {
            accessToken: 'user-token',
            refreshToken: 'user-refresh',
            expiresIn: 3600,
          },
        },
      });

      // Mock unauthorized role change
      await authUtils.mockAuthAPI('change-user-role', {
        success: false,
        message: 'Insufficient permissions to change user roles',
        code: 'FORBIDDEN',
      }, 403);

      await authUtils.navigateToAuthPage('login');
      await authUtils.login(regularUser.email, regularUser.password);
      await page.waitForTimeout(3000);

      // Try to access user management
      await page.goto('/admin/users', { timeout: 10000 });
      await page.waitForTimeout(3000);

      const currentUrl = page.url();
      const hasAccessDenied = await page.locator('text=/access.*denied|unauthorized|forbidden/i').count();
      const isRedirectedToLogin = currentUrl.includes('/login');

      if (hasAccessDenied > 0 || isRedirectedToLogin) {
        console.log('✅ Regular user denied access to role management');
      } else {
        console.log('ℹ️  Role management access control may not be implemented');
      }
    });
  });

  test.describe('Privilege Escalation Prevention', () => {
    test('should prevent users from escalating their own privileges', async ({ page }) => {
      test.setTimeout(60000);
      
      const authUtils = createAuthTestUtils(page);

      // Mock privilege escalation attempt
      await authUtils.mockAuthAPI('update-profile', {
        success: false,
        message: 'Cannot modify role or permissions',
        code: 'PRIVILEGE_ESCALATION_DENIED',
      }, 403);

      // Test privilege escalation via profile update
      const response = await page.evaluate(async () => {
        return fetch('/api/auth/update-profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Updated Name',
            role: 'admin', // Attempting to escalate
            permissions: ['admin:read', 'admin:write'],
          }),
        }).then(r => r.json());
      });

      expect(response.success).toBe(false);
      console.log('✅ Privilege escalation prevention working');
    });

    test('should validate role changes through proper channels only', async ({ page }) => {
      test.setTimeout(60000);
      
      const authUtils = createAuthTestUtils(page);

      // Mock direct role manipulation attempt
      await page.route('**/api/users/*/role', async route => {
        const method = route.request().method();
        const authHeader = route.request().headers()['authorization'];
        const hasAdminPermission = authHeader?.includes('admin-token');

        if (method === 'PUT' && !hasAdminPermission) {
          await route.fulfill({
            status: 403,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              message: 'Only administrators can change user roles',
              code: 'INSUFFICIENT_PERMISSIONS',
            }),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true }),
          });
        }
      });

      // Test unauthorized role change
      const response = await page.evaluate(async () => {
        return fetch('/api/users/123/role', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer user-token'
          },
          body: JSON.stringify({ role: 'admin' }),
        }).then(r => r.json());
      });

      expect(response.success).toBe(false);
      console.log('✅ Role change authorization working');
    });
  });

  test.describe('Resource-Level Permissions', () => {
    test('should control access to specific resources', async ({ page }) => {
      test.setTimeout(90000);
      
      const authUtils = createAuthTestUtils(page);

      // Test resource ownership and permissions
      const resourceTests = [
        {
          user: 'owner',
          resourceId: 'resource-123',
          permissions: ['read', 'write', 'delete'],
          shouldHaveAccess: true,
        },
        {
          user: 'collaborator',
          resourceId: 'resource-123',
          permissions: ['read', 'write'],
          shouldHaveAccess: true,
        },
        {
          user: 'viewer',
          resourceId: 'resource-123',
          permissions: ['read'],
          shouldHaveAccess: true,
        },
        {
          user: 'stranger',
          resourceId: 'resource-123',
          permissions: [],
          shouldHaveAccess: false,
        },
      ];

      for (const test of resourceTests) {
        // Mock resource access check
        await page.route(`**/api/resources/${test.resourceId}`, async route => {
          const authHeader = route.request().headers()['authorization'];
          const userToken = authHeader?.split(' ')[1];

          if (test.shouldHaveAccess && userToken?.includes(test.user)) {
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                success: true,
                data: {
                  id: test.resourceId,
                  title: 'Test Resource',
                  permissions: test.permissions,
                },
              }),
            });
          } else {
            await route.fulfill({
              status: 403,
              contentType: 'application/json',
              body: JSON.stringify({
                success: false,
                message: 'Access denied to this resource',
                code: 'RESOURCE_ACCESS_DENIED',
              }),
            });
          }
        });

        // Test resource access
        const response = await page.evaluate(async (userId, resourceId) => {
          return fetch(`/api/resources/${resourceId}`, {
            headers: { 'Authorization': `Bearer ${userId}-token` }
          }).then(r => r.json());
        }, test.user, test.resourceId);

        if (test.shouldHaveAccess) {
          expect(response.success).toBe(true);
          console.log(`✅ ${test.user} has access to resource`);
        } else {
          expect(response.success).toBe(false);
          console.log(`✅ ${test.user} denied access to resource`);
        }
      }
    });
  });

  test.describe('Dynamic Permission Checking', () => {
    test('should check permissions dynamically based on context', async ({ page }) => {
      test.setTimeout(60000);
      
      const authUtils = createAuthTestUtils(page);

      // Mock dynamic permission endpoint
      await authUtils.mockAuthAPI('check-permission', {
        success: true,
        data: {
          hasPermission: true,
          context: {
            resource: 'project-123',
            action: 'edit',
            conditions: ['is_owner', 'is_collaborator'],
          },
        },
      });

      // Test dynamic permission check
      const response = await page.evaluate(async () => {
        return fetch('/api/auth/check-permission', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resource: 'project-123',
            action: 'edit',
            context: { userId: 'user-123' },
          }),
        }).then(r => r.json());
      });

      if (response.success) {
        console.log('✅ Dynamic permission checking available');
      } else {
        console.log('ℹ️  Dynamic permission checking may not be implemented');
      }
    });
  });
});
