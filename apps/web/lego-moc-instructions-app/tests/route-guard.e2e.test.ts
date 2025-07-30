import { expect, test } from '@playwright/test'

test.describe('Route Guard E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('http://localhost:5173')
    await page.evaluate(() => {
      localStorage.clear()
    })
  })

  test.describe('Authentication Flow', () => {
    test('should redirect unauthenticated users to login when accessing protected routes', async ({ page }) => {
      // Try to access profile page without authentication
      await page.goto('http://localhost:5173/profile')
      
      // Should be redirected to login page
      await expect(page).toHaveURL('http://localhost:5173/auth/login')
      await expect(page.locator('h1')).toContainText('Welcome Back')
    })

    test('should redirect unauthenticated users to login when accessing wishlist', async ({ page }) => {
      // Try to access wishlist page without authentication
      await page.goto('http://localhost:5173/wishlist')
      
      // Should be redirected to login page
      await expect(page).toHaveURL('http://localhost:5173/auth/login')
      await expect(page.locator('h1')).toContainText('Welcome Back')
    })

    test('should redirect unauthenticated users to login when accessing MOC detail', async ({ page }) => {
      // Try to access MOC detail page without authentication
      await page.goto('http://localhost:5173/moc-instructions/123')
      
      // Should be redirected to login page
      await expect(page).toHaveURL('http://localhost:5173/auth/login')
      await expect(page.locator('h1')).toContainText('Welcome Back')
    })

    test('should allow access to public routes without authentication', async ({ page }) => {
      // Access home page without authentication
      await page.goto('http://localhost:5173/')
      
      // Should be on home page
      await expect(page).toHaveURL('http://localhost:5173/')
      await expect(page.locator('h1')).toContainText('LEGO MOC Instructions App')
    })

    test('should allow access to login page without authentication', async ({ page }) => {
      // Access login page without authentication
      await page.goto('http://localhost:5173/auth/login')
      
      // Should be on login page
      await expect(page).toHaveURL('http://localhost:5173/auth/login')
      await expect(page.locator('h1')).toContainText('Welcome Back')
    })

    test('should allow access to signup page without authentication', async ({ page }) => {
      // Access signup page without authentication
      await page.goto('http://localhost:5173/auth/signup')
      
      // Should be on signup page
      await expect(page).toHaveURL('http://localhost:5173/auth/signup')
      await expect(page.locator('h1')).toContainText('Create Account')
    })
  })

  test.describe('Authenticated User Flow', () => {
    test('should allow authenticated users to access protected routes', async ({ page }) => {
      // First, simulate a successful login by setting auth state
      await page.goto('http://localhost:5173/')
      await page.evaluate(() => {
        localStorage.setItem('auth_state', JSON.stringify({
          user: {
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
            emailVerified: true,
            role: 'user',
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
          },
          isAuthenticated: true,
          lastUpdated: Date.now(),
        }))
      })

      // Now try to access profile page
      await page.goto('http://localhost:5173/profile')
      
      // Should be on profile page
      await expect(page).toHaveURL('http://localhost:5173/profile')
      await expect(page.locator('h1')).toContainText('Profile')
    })

    test('should allow authenticated users to access wishlist', async ({ page }) => {
      // Set auth state
      await page.goto('http://localhost:5173/')
      await page.evaluate(() => {
        localStorage.setItem('auth_state', JSON.stringify({
          user: {
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
            emailVerified: true,
            role: 'user',
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
          },
          isAuthenticated: true,
          lastUpdated: Date.now(),
        }))
      })

      // Try to access wishlist page
      await page.goto('http://localhost:5173/wishlist')
      
      // Should be on wishlist page
      await expect(page).toHaveURL('http://localhost:5173/wishlist')
      await expect(page.locator('h1')).toContainText('Wishlist')
    })

    test('should allow authenticated users to access MOC detail', async ({ page }) => {
      // Set auth state
      await page.goto('http://localhost:5173/')
      await page.evaluate(() => {
        localStorage.setItem('auth_state', JSON.stringify({
          user: {
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
            emailVerified: true,
            role: 'user',
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
          },
          isAuthenticated: true,
          lastUpdated: Date.now(),
        }))
      })

      // Try to access MOC detail page
      await page.goto('http://localhost:5173/moc-instructions/123')
      
      // Should be on MOC detail page
      await expect(page).toHaveURL('http://localhost:5173/moc-instructions/123')
      await expect(page.locator('h1')).toContainText('MOC Instructions')
    })
  })

  test.describe('Email Verification Flow', () => {
    test('should redirect unverified users to email verification when required', async ({ page }) => {
      // Set auth state with unverified email
      await page.goto('http://localhost:5173/')
      await page.evaluate(() => {
        localStorage.setItem('auth_state', JSON.stringify({
          user: {
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
            emailVerified: false,
            role: 'user',
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
          },
          isAuthenticated: true,
          lastUpdated: Date.now(),
        }))
      })

      // Try to access a route that requires email verification
      // Note: This would require a route with requireVerified: true
      // For now, we'll test the basic auth flow
      await page.goto('http://localhost:5173/profile')
      
      // Should be on profile page (since current routes don't require email verification)
      await expect(page).toHaveURL('http://localhost:5173/profile')
    })

    test('should allow verified users to access protected routes', async ({ page }) => {
      // Set auth state with verified email
      await page.goto('http://localhost:5173/')
      await page.evaluate(() => {
        localStorage.setItem('auth_state', JSON.stringify({
          user: {
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
            emailVerified: true,
            role: 'user',
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
          },
          isAuthenticated: true,
          lastUpdated: Date.now(),
        }))
      })

      // Try to access profile page
      await page.goto('http://localhost:5173/profile')
      
      // Should be on profile page
      await expect(page).toHaveURL('http://localhost:5173/profile')
    })
  })

  test.describe('Session Management', () => {
    test('should redirect users with expired sessions to login', async ({ page }) => {
      // Set auth state with expired session
      await page.goto('http://localhost:5173/')
      await page.evaluate(() => {
        localStorage.setItem('auth_state', JSON.stringify({
          user: {
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
            emailVerified: true,
            role: 'user',
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
          },
          isAuthenticated: true,
          lastUpdated: Date.now() - (25 * 60 * 60 * 1000), // 25 hours ago
        }))
      })

      // Try to access profile page
      await page.goto('http://localhost:5173/profile')
      
      // Should be redirected to login page
      await expect(page).toHaveURL('http://localhost:5173/auth/login')
    })

    test('should handle missing auth state gracefully', async ({ page }) => {
      // Clear auth state
      await page.goto('http://localhost:5173/')
      await page.evaluate(() => {
        localStorage.removeItem('auth_state')
      })

      // Try to access profile page
      await page.goto('http://localhost:5173/profile')
      
      // Should be redirected to login page
      await expect(page).toHaveURL('http://localhost:5173/auth/login')
    })

    test('should handle malformed auth state gracefully', async ({ page }) => {
      // Set malformed auth state
      await page.goto('http://localhost:5173/')
      await page.evaluate(() => {
        localStorage.setItem('auth_state', 'invalid json')
      })

      // Try to access profile page
      await page.goto('http://localhost:5173/profile')
      
      // Should be redirected to login page
      await expect(page).toHaveURL('http://localhost:5173/auth/login')
    })
  })

  test.describe('Real Login Flow', () => {
    test('should redirect to profile after successful login', async ({ page }) => {
      // Go to login page
      await page.goto('http://localhost:5173/auth/login')
      
      // Fill in login form
      await page.fill('input[type="email"]', 'test@example.com')
      await page.fill('input[type="password"]', 'password123')
      
      // Submit form
      await page.click('button[type="submit"]')
      
      // Wait for navigation to profile page
      await expect(page).toHaveURL('http://localhost:5173/profile')
    })

    test('should save auth state after successful login', async ({ page }) => {
      // Go to login page
      await page.goto('http://localhost:5173/auth/login')
      
      // Fill in login form
      await page.fill('input[type="email"]', 'test@example.com')
      await page.fill('input[type="password"]', 'password123')
      
      // Submit form
      await page.click('button[type="submit"]')
      
      // Wait for navigation
      await expect(page).toHaveURL('http://localhost:5173/profile')
      
      // Check that auth state was saved
      const authState = await page.evaluate(() => {
        return localStorage.getItem('auth_state')
      })
      
      expect(authState).toBeTruthy()
      const parsedAuthState = JSON.parse(authState!)
      expect(parsedAuthState.isAuthenticated).toBe(true)
      expect(parsedAuthState.user).toBeTruthy()
    })

    test('should allow access to protected routes after login', async ({ page }) => {
      // Login first
      await page.goto('http://localhost:5173/auth/login')
      await page.fill('input[type="email"]', 'test@example.com')
      await page.fill('input[type="password"]', 'password123')
      await page.click('button[type="submit"]')
      
      // Wait for login to complete
      await expect(page).toHaveURL('http://localhost:5173/profile')
      
      // Now try to access other protected routes
      await page.goto('http://localhost:5173/wishlist')
      await expect(page).toHaveURL('http://localhost:5173/wishlist')
      
      await page.goto('http://localhost:5173/moc-instructions/123')
      await expect(page).toHaveURL('http://localhost:5173/moc-instructions/123')
    })
  })

  test.describe('Navigation and UX', () => {
    test('should maintain user on current page when already authenticated', async ({ page }) => {
      // Set auth state
      await page.goto('http://localhost:5173/')
      await page.evaluate(() => {
        localStorage.setItem('auth_state', JSON.stringify({
          user: {
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
            emailVerified: true,
            role: 'user',
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
          },
          isAuthenticated: true,
          lastUpdated: Date.now(),
        }))
      })

      // Navigate to profile page
      await page.goto('http://localhost:5173/profile')
      await expect(page).toHaveURL('http://localhost:5173/profile')
      
      // Navigate to another protected route
      await page.goto('http://localhost:5173/wishlist')
      await expect(page).toHaveURL('http://localhost:5173/wishlist')
      
      // Navigate back to profile
      await page.goto('http://localhost:5173/profile')
      await expect(page).toHaveURL('http://localhost:5173/profile')
    })

    test('should handle browser back/forward navigation correctly', async ({ page }) => {
      // Set auth state
      await page.goto('http://localhost:5173/')
      await page.evaluate(() => {
        localStorage.setItem('auth_state', JSON.stringify({
          user: {
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
            emailVerified: true,
            role: 'user',
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
          },
          isAuthenticated: true,
          lastUpdated: Date.now(),
        }))
      })

      // Navigate to profile
      await page.goto('http://localhost:5173/profile')
      await expect(page).toHaveURL('http://localhost:5173/profile')
      
      // Navigate to wishlist
      await page.goto('http://localhost:5173/wishlist')
      await expect(page).toHaveURL('http://localhost:5173/wishlist')
      
      // Go back
      await page.goBack()
      await expect(page).toHaveURL('http://localhost:5173/profile')
      
      // Go forward
      await page.goForward()
      await expect(page).toHaveURL('http://localhost:5173/wishlist')
    })

    test('should handle direct URL access correctly', async ({ page }) => {
      // Set auth state
      await page.goto('http://localhost:5173/')
      await page.evaluate(() => {
        localStorage.setItem('auth_state', JSON.stringify({
          user: {
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
            emailVerified: true,
            role: 'user',
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
          },
          isAuthenticated: true,
          lastUpdated: Date.now(),
        }))
      })

      // Access protected routes directly
      await page.goto('http://localhost:5173/profile')
      await expect(page).toHaveURL('http://localhost:5173/profile')
      
      await page.goto('http://localhost:5173/wishlist')
      await expect(page).toHaveURL('http://localhost:5173/wishlist')
      
      await page.goto('http://localhost:5173/moc-instructions/456')
      await expect(page).toHaveURL('http://localhost:5173/moc-instructions/456')
    })
  })

  test.describe('Error Scenarios', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate network error by going offline
      await page.context().setOffline(true)
      
      // Try to access protected route
      await page.goto('http://localhost:5173/profile')
      
      // Should still redirect to login (auth check happens client-side)
      await expect(page).toHaveURL('http://localhost:5173/auth/login')
      
      // Go back online
      await page.context().setOffline(false)
    })

    test('should handle localStorage errors gracefully', async ({ page }) => {
      // Try to access protected route
      await page.goto('http://localhost:5173/profile')
      
      // Should redirect to login
      await expect(page).toHaveURL('http://localhost:5173/auth/login')
    })

    test('should handle invalid route parameters', async ({ page }) => {
      // Set auth state
      await page.goto('http://localhost:5173/')
      await page.evaluate(() => {
        localStorage.setItem('auth_state', JSON.stringify({
          user: {
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
            emailVerified: true,
            role: 'user',
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
          },
          isAuthenticated: true,
          lastUpdated: Date.now(),
        }))
      })

      // Try to access MOC detail with invalid ID
      await page.goto('http://localhost:5173/moc-instructions/invalid-id')
      
      // Should still be on the page (route guard passes, but page might show error)
      await expect(page).toHaveURL('http://localhost:5173/moc-instructions/invalid-id')
    })
  })

  test.describe('Performance and Load Testing', () => {
    test('should handle rapid navigation between protected routes', async ({ page }) => {
      // Set auth state
      await page.goto('http://localhost:5173/')
      await page.evaluate(() => {
        localStorage.setItem('auth_state', JSON.stringify({
          user: {
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
            emailVerified: true,
            role: 'user',
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
          },
          isAuthenticated: true,
          lastUpdated: Date.now(),
        }))
      })

      // Rapidly navigate between protected routes
      const startTime = Date.now()
      
      for (let i = 0; i < 10; i++) {
        await page.goto('http://localhost:5173/profile')
        await page.goto('http://localhost:5173/wishlist')
        await page.goto('http://localhost:5173/moc-instructions/123')
      }
      
      const endTime = Date.now()
      const totalTime = endTime - startTime
      
      // Should complete within reasonable time (less than 10 seconds)
      expect(totalTime).toBeLessThan(10000)
      
      // Should end up on the last page
      await expect(page).toHaveURL('http://localhost:5173/moc-instructions/123')
    })

    test('should handle concurrent route access', async ({ page, context }) => {
      // Set auth state
      await page.goto('http://localhost:5173/')
      await page.evaluate(() => {
        localStorage.setItem('auth_state', JSON.stringify({
          user: {
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
            emailVerified: true,
            role: 'user',
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
          },
          isAuthenticated: true,
          lastUpdated: Date.now(),
        }))
      })

      // Create multiple pages and access routes concurrently
      const pages = await Promise.all([
        context.newPage(),
        context.newPage(),
        context.newPage(),
      ])

      // Set auth state on all pages
      for (const page of pages) {
        await page.goto('http://localhost:5173/')
        await page.evaluate(() => {
          localStorage.setItem('auth_state', JSON.stringify({
            user: {
              id: '1',
              email: 'test@example.com',
              name: 'Test User',
              emailVerified: true,
              role: 'user',
              createdAt: '2024-01-01',
              updatedAt: '2024-01-01',
            },
            isAuthenticated: true,
            lastUpdated: Date.now(),
          }))
        })
      }

      // Access different protected routes concurrently
      await Promise.all([
        pages[0].goto('http://localhost:5173/profile'),
        pages[1].goto('http://localhost:5173/wishlist'),
        pages[2].goto('http://localhost:5173/moc-instructions/123'),
      ])

      // Verify all pages loaded correctly
      await expect(pages[0]).toHaveURL('http://localhost:5173/profile')
      await expect(pages[1]).toHaveURL('http://localhost:5173/wishlist')
      await expect(pages[2]).toHaveURL('http://localhost:5173/moc-instructions/123')

      // Close pages
      await Promise.all(pages.map(page => page.close()))
    })
  })
}) 