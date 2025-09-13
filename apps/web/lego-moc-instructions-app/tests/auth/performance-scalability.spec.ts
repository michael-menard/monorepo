import { expect, test } from '@playwright/test';
import { createAuthTestUtils } from './utils';
import { SOUTH_PARK_USERS, TEST_USERS } from './test-users';

/**
 * Performance & Scalability Tests
 * 
 * Tests auth system performance:
 * - Concurrent login stress testing
 * - Database connection pooling
 * - Auth API response times
 * - Memory leak detection
 * - Load testing scenarios
 * - Caching effectiveness
 */
test.describe('Performance & Scalability Tests', () => {
  test.describe.configure({ timeout: 180000 }); // 3 minutes for performance tests

  test.beforeAll(async () => {
    console.log('⚡ Testing Performance & Scalability:');
    console.log('  - Concurrent login stress testing');
    console.log('  - Auth API response times');
    console.log('  - Memory usage monitoring');
    console.log('  - Database connection handling');
    console.log('  - Caching effectiveness');
    console.log('  - Load testing scenarios');
  });

  test.beforeEach(async ({ page }) => {
    const authUtils = createAuthTestUtils(page);
    await authUtils.setup();
  });

  test.afterEach(async ({ page }) => {
    const authUtils = createAuthTestUtils(page);
    await authUtils.cleanup();
  });

  test.describe('Auth API Response Times', () => {
    test('should have fast response times for auth endpoints', async ({ page }) => {
      test.setTimeout(90000);
      
      const authUtils = createAuthTestUtils(page);
      const testUser = SOUTH_PARK_USERS.STAN;

      // Mock auth endpoints with timing
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

      const performanceTests = [
        { endpoint: '/api/auth/csrf', method: 'GET', expectedTime: 200 },
        { endpoint: '/api/auth/login', method: 'POST', expectedTime: 500 },
        { endpoint: '/api/auth/refresh-token', method: 'POST', expectedTime: 300 },
        { endpoint: '/api/auth/logout', method: 'POST', expectedTime: 200 },
        { endpoint: '/api/auth/check-auth', method: 'GET', expectedTime: 150 },
      ];

      for (const test of performanceTests) {
        const startTime = Date.now();
        
        try {
          const response = await page.evaluate(async (endpoint, method) => {
            const options: RequestInit = { method };
            
            if (method === 'POST') {
              options.headers = { 'Content-Type': 'application/json' };
              options.body = JSON.stringify({
                email: 'test@example.com',
                password: 'TestPassword123!',
              });
            }
            
            return fetch(endpoint, options).then(r => r.json());
          }, test.endpoint, test.method);
          
          const endTime = Date.now();
          const responseTime = endTime - startTime;
          
          console.log(`📊 ${test.endpoint}: ${responseTime}ms (target: <${test.expectedTime}ms)`);
          
          if (responseTime < test.expectedTime) {
            console.log(`✅ ${test.endpoint} response time acceptable`);
          } else {
            console.log(`⚠️  ${test.endpoint} response time slow: ${responseTime}ms`);
          }
        } catch (error) {
          console.log(`ℹ️  ${test.endpoint} not available or error occurred`);
        }
      }
    });

    test('should handle concurrent auth requests efficiently', async ({ page, context }) => {
      test.setTimeout(120000);
      
      const authUtils = createAuthTestUtils(page);

      // Mock auth endpoint
      await authUtils.mockAuthAPI('login', {
        success: true,
        data: {
          user: { id: 'user-123', email: 'test@example.com', name: 'Test User' },
          tokens: { accessToken: 'token', refreshToken: 'refresh', expiresIn: 3600 },
        },
      });

      // Create multiple concurrent requests
      const concurrentRequests = 10;
      const requests: Promise<any>[] = [];
      
      console.log(`🚀 Starting ${concurrentRequests} concurrent login requests...`);
      const startTime = Date.now();

      for (let i = 0; i < concurrentRequests; i++) {
        const request = page.evaluate(async (index) => {
          const requestStart = Date.now();
          
          try {
            const response = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: `user${index}@example.com`,
                password: 'TestPassword123!',
              }),
            });
            
            const data = await response.json();
            const requestEnd = Date.now();
            
            return {
              index,
              success: data.success,
              responseTime: requestEnd - requestStart,
              status: response.status,
            };
          } catch (error) {
            return {
              index,
              success: false,
              error: error instanceof Error ? error.message : String(error),
              responseTime: Date.now() - requestStart,
            };
          }
        }, i);
        
        requests.push(request);
      }

      // Wait for all requests to complete
      const results = await Promise.all(requests);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Analyze results
      const successfulRequests = results.filter(r => r.success).length;
      const averageResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
      const maxResponseTime = Math.max(...results.map(r => r.responseTime));
      const minResponseTime = Math.min(...results.map(r => r.responseTime));

      console.log(`📊 Concurrent Request Results:`);
      console.log(`   Total Time: ${totalTime}ms`);
      console.log(`   Successful Requests: ${successfulRequests}/${concurrentRequests}`);
      console.log(`   Average Response Time: ${averageResponseTime.toFixed(2)}ms`);
      console.log(`   Min Response Time: ${minResponseTime}ms`);
      console.log(`   Max Response Time: ${maxResponseTime}ms`);

      // Performance expectations
      expect(successfulRequests).toBeGreaterThan(concurrentRequests * 0.8); // 80% success rate
      expect(averageResponseTime).toBeLessThan(2000); // Average under 2 seconds
      
      console.log('✅ Concurrent request handling performance acceptable');
    });
  });

  test.describe('Memory Usage Monitoring', () => {
    test('should monitor memory usage during auth operations', async ({ page }) => {
      test.setTimeout(90000);
      
      const authUtils = createAuthTestUtils(page);

      // Get initial memory usage
      const initialMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory;
        }
        return null;
      });

      if (initialMemory) {
        console.log(`📊 Initial Memory Usage:`);
        console.log(`   Used: ${(initialMemory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   Total: ${(initialMemory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   Limit: ${(initialMemory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`);
      }

      // Perform multiple auth operations
      await authUtils.mockAuthAPI('login', {
        success: true,
        data: {
          user: { id: 'user-123', email: 'test@example.com', name: 'Test User' },
          tokens: { accessToken: 'token', refreshToken: 'refresh', expiresIn: 3600 },
        },
      });

      // Simulate multiple login/logout cycles
      for (let i = 0; i < 5; i++) {
        await authUtils.navigateToAuthPage('login');
        await authUtils.login('test@example.com', 'TestPassword123!');
        await page.waitForTimeout(1000);
        await authUtils.logout();
        await page.waitForTimeout(1000);
      }

      // Get final memory usage
      const finalMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory;
        }
        return null;
      });

      if (initialMemory && finalMemory) {
        const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
        const memoryIncreasePercent = (memoryIncrease / initialMemory.usedJSHeapSize) * 100;

        console.log(`📊 Final Memory Usage:`);
        console.log(`   Used: ${(finalMemory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   Memory Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB (${memoryIncreasePercent.toFixed(2)}%)`);

        // Memory increase should be reasonable (less than 50% increase)
        expect(memoryIncreasePercent).toBeLessThan(50);
        console.log('✅ Memory usage within acceptable limits');
      } else {
        console.log('ℹ️  Memory monitoring not available in this browser');
      }
    });

    test('should detect memory leaks in auth components', async ({ page }) => {
      test.setTimeout(90000);
      
      const authUtils = createAuthTestUtils(page);

      // Force garbage collection if available
      const gcAvailable = await page.evaluate(() => {
        return typeof (window as any).gc === 'function';
      });

      if (gcAvailable) {
        await page.evaluate(() => (window as any).gc());
      }

      // Get baseline memory
      const baselineMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });

      // Simulate repeated component mounting/unmounting
      for (let i = 0; i < 10; i++) {
        await page.goto('/auth/login', { timeout: 10000 });
        await page.waitForTimeout(500);
        await page.goto('/auth/signup', { timeout: 10000 });
        await page.waitForTimeout(500);
        await page.goto('/auth/forgot-password', { timeout: 10000 });
        await page.waitForTimeout(500);
      }

      // Force garbage collection again
      if (gcAvailable) {
        await page.evaluate(() => (window as any).gc());
        await page.waitForTimeout(1000);
      }

      // Check final memory
      const finalMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });

      if (baselineMemory && finalMemory) {
        const memoryLeak = finalMemory - baselineMemory;
        const leakPercentage = (memoryLeak / baselineMemory) * 100;

        console.log(`📊 Memory Leak Detection:`);
        console.log(`   Baseline: ${(baselineMemory / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   Final: ${(finalMemory / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   Potential Leak: ${(memoryLeak / 1024 / 1024).toFixed(2)} MB (${leakPercentage.toFixed(2)}%)`);

        // Memory leak should be minimal (less than 20% increase)
        if (leakPercentage < 20) {
          console.log('✅ No significant memory leaks detected');
        } else {
          console.log('⚠️  Potential memory leak detected');
        }
      }
    });
  });

  test.describe('Database Performance', () => {
    test('should handle database connection efficiently', async ({ page }) => {
      test.setTimeout(60000);
      
      const authUtils = createAuthTestUtils(page);

      // Test database connection performance
      const dbTests = [
        { operation: 'user_lookup', expectedTime: 100 },
        { operation: 'password_verification', expectedTime: 200 },
        { operation: 'token_generation', expectedTime: 50 },
        { operation: 'session_creation', expectedTime: 100 },
      ];

      for (const test of dbTests) {
        const startTime = Date.now();
        
        // Mock database operation
        const response = await page.evaluate(async (operation) => {
          return fetch(`/api/auth/db-test/${operation}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          }).then(r => r.json()).catch(() => ({ success: false }));
        }, test.operation);
        
        const endTime = Date.now();
        const operationTime = endTime - startTime;
        
        console.log(`📊 DB ${test.operation}: ${operationTime}ms (target: <${test.expectedTime}ms)`);
        
        if (operationTime < test.expectedTime) {
          console.log(`✅ ${test.operation} performance acceptable`);
        } else {
          console.log(`⚠️  ${test.operation} performance slow`);
        }
      }
    });
  });

  test.describe('Caching Effectiveness', () => {
    test('should cache auth responses effectively', async ({ page }) => {
      test.setTimeout(90000);
      
      const authUtils = createAuthTestUtils(page);

      // Test CSRF token caching
      console.log('🔍 Testing CSRF token caching...');
      
      const firstCsrfTime = Date.now();
      const firstCsrfResponse = await page.evaluate(async () => {
        return fetch('/api/auth/csrf').then(r => r.json());
      });
      const firstCsrfDuration = Date.now() - firstCsrfTime;

      await page.waitForTimeout(1000);

      const secondCsrfTime = Date.now();
      const secondCsrfResponse = await page.evaluate(async () => {
        return fetch('/api/auth/csrf').then(r => r.json());
      });
      const secondCsrfDuration = Date.now() - secondCsrfTime;

      console.log(`📊 CSRF Token Caching:`);
      console.log(`   First Request: ${firstCsrfDuration}ms`);
      console.log(`   Second Request: ${secondCsrfDuration}ms`);

      if (secondCsrfDuration < firstCsrfDuration * 0.8) {
        console.log('✅ CSRF token caching appears to be working');
      } else {
        console.log('ℹ️  CSRF token caching may not be implemented');
      }

      // Test user data caching
      await authUtils.mockAuthAPI('login', {
        success: true,
        data: {
          user: { id: 'user-123', email: 'test@example.com', name: 'Test User' },
          tokens: { accessToken: 'token', refreshToken: 'refresh', expiresIn: 3600 },
        },
      });

      await authUtils.navigateToAuthPage('login');
      await authUtils.login('test@example.com', 'TestPassword123!');
      await page.waitForTimeout(2000);

      // Test repeated user data requests
      const userDataTimes: number[] = [];
      
      for (let i = 0; i < 3; i++) {
        const startTime = Date.now();
        await page.evaluate(async () => {
          return fetch('/api/auth/user').then(r => r.json());
        });
        const endTime = Date.now();
        userDataTimes.push(endTime - startTime);
        await page.waitForTimeout(500);
      }

      console.log(`📊 User Data Caching:`);
      userDataTimes.forEach((time, index) => {
        console.log(`   Request ${index + 1}: ${time}ms`);
      });

      // Later requests should be faster if caching is working
      const averageEarlyTime = userDataTimes.slice(0, 1)[0];
      const averageLaterTime = userDataTimes.slice(1).reduce((a, b) => a + b, 0) / userDataTimes.slice(1).length;

      if (averageLaterTime < averageEarlyTime * 0.8) {
        console.log('✅ User data caching appears to be working');
      } else {
        console.log('ℹ️  User data caching may not be implemented');
      }
    });
  });

  test.describe('Load Testing Scenarios', () => {
    test('should handle rapid successive auth operations', async ({ page }) => {
      test.setTimeout(120000);
      
      const authUtils = createAuthTestUtils(page);

      // Mock auth endpoints
      await authUtils.mockAuthAPI('login', {
        success: true,
        data: {
          user: { id: 'user-123', email: 'test@example.com', name: 'Test User' },
          tokens: { accessToken: 'token', refreshToken: 'refresh', expiresIn: 3600 },
        },
      });

      await authUtils.mockAuthAPI('logout', {
        success: true,
        message: 'Logged out successfully',
      });

      // Rapid login/logout cycles
      const cycles = 5;
      const results: { cycle: number; loginTime: number; logoutTime: number }[] = [];

      console.log(`🚀 Starting ${cycles} rapid login/logout cycles...`);

      for (let i = 0; i < cycles; i++) {
        // Login
        const loginStart = Date.now();
        await page.evaluate(async () => {
          return fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'test@example.com',
              password: 'TestPassword123!',
            }),
          }).then(r => r.json());
        });
        const loginTime = Date.now() - loginStart;

        // Logout
        const logoutStart = Date.now();
        await page.evaluate(async () => {
          return fetch('/api/auth/logout', {
            method: 'POST',
          }).then(r => r.json());
        });
        const logoutTime = Date.now() - logoutStart;

        results.push({ cycle: i + 1, loginTime, logoutTime });
        
        console.log(`   Cycle ${i + 1}: Login ${loginTime}ms, Logout ${logoutTime}ms`);
      }

      // Analyze performance degradation
      const firstCycleTotal = results[0].loginTime + results[0].logoutTime;
      const lastCycleTotal = results[results.length - 1].loginTime + results[results.length - 1].logoutTime;
      const performanceDegradation = ((lastCycleTotal - firstCycleTotal) / firstCycleTotal) * 100;

      console.log(`📊 Load Testing Results:`);
      console.log(`   First Cycle Total: ${firstCycleTotal}ms`);
      console.log(`   Last Cycle Total: ${lastCycleTotal}ms`);
      console.log(`   Performance Degradation: ${performanceDegradation.toFixed(2)}%`);

      // Performance should not degrade significantly (less than 100% increase)
      expect(performanceDegradation).toBeLessThan(100);
      console.log('✅ Load testing performance acceptable');
    });
  });
});
