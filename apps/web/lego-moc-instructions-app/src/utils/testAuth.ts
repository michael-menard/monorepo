/**
 * Test Authentication Utility
 * 
 * This utility helps you get authenticated for testing the MOC creation functionality.
 * Run these functions in the browser console to set up authentication.
 */

/**
 * Get a test authentication token and set it as a cookie
 */
export async function getTestAuthToken(): Promise<string> {
  try {
    const response = await fetch('/api/mocs/test-auth', {
      method: 'POST',
      credentials: 'include', // This will set the auth cookie
    });

    if (!response.ok) {
      throw new Error(`Failed to get test auth token: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Test auth token obtained:', data.message);
    console.log('🔑 User ID:', data.userId);

    // Also manually set the cookie for the current domain
    // Note: We need to set this without HttpOnly so it can be accessed by JavaScript
    document.cookie = `token=${data.token}; path=/; max-age=3600; SameSite=Lax; Secure=false`;

    return data.token;
  } catch (error) {
    console.error('❌ Failed to get test auth token:', error);
    throw error;
  }
}

/**
 * Get a CSRF token and set it as a cookie
 */
export async function getCSRFToken(): Promise<string> {
  try {
    const response = await fetch('/api/csrf', {
      method: 'GET',
      credentials: 'include', // This will set the CSRF cookie
    });

    if (!response.ok) {
      throw new Error(`Failed to get CSRF token: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ CSRF token obtained');

    // Also manually set the cookie for the current domain
    // CSRF token must be accessible to JavaScript (not HttpOnly)
    document.cookie = `XSRF-TOKEN=${data.token}; path=/; max-age=7200; SameSite=Lax; Secure=false`;

    return data.token;
  } catch (error) {
    console.error('❌ Failed to get CSRF token:', error);
    throw error;
  }
}

/**
 * Set up complete authentication for testing
 * This function gets both auth and CSRF tokens
 */
export async function setupTestAuth(): Promise<void> {
  try {
    console.log('🚀 Setting up test authentication...');
    
    // Get auth token (sets auth cookie)
    await getTestAuthToken();
    
    // Get CSRF token (sets CSRF cookie)
    await getCSRFToken();
    
    console.log('✅ Test authentication setup complete!');
    console.log('🎯 You can now use the Create MOC modal');
    
    // Reload the page to ensure all cookies are properly set
    console.log('🔄 Reloading page to apply authentication...');
    window.location.reload();
    
  } catch (error) {
    console.error('❌ Failed to setup test authentication:', error);
    throw error;
  }
}

/**
 * Check current authentication status
 */
export async function checkAuthStatus(): Promise<void> {
  try {
    // Check if auth cookie exists
    const authCookie = document.cookie.split('; ').find(row => row.startsWith('token='));
    const csrfCookie = document.cookie.split('; ').find(row => row.startsWith('XSRF-TOKEN='));

    console.log('🔍 Authentication Status:');
    console.log('  Auth Cookie:', authCookie ? '✅ Present' : '❌ Missing');
    console.log('  CSRF Cookie:', csrfCookie ? '✅ Present' : '❌ Missing');

    if (authCookie) {
      console.log('  Auth Token Preview:', authCookie.substring(0, 50) + '...');
    }
    if (csrfCookie) {
      console.log('  CSRF Token Preview:', csrfCookie.substring(0, 50) + '...');
    }

    console.log('  All Cookies:', document.cookie);

    if (authCookie && csrfCookie) {
      console.log('✅ Authentication appears to be set up correctly');

      // Test a simple API call
      try {
        const testResponse = await fetch('/api/mocs/search?q=&from=0&size=1', {
          credentials: 'include'
        });
        console.log('  API Test Response:', testResponse.status, testResponse.ok ? '✅' : '❌');
      } catch (error) {
        console.log('  API Test Failed:', error);
      }
    } else {
      console.log('❌ Authentication is not properly set up');
      console.log('💡 Run setupTestAuth() to fix this');
    }

  } catch (error) {
    console.error('❌ Failed to check auth status:', error);
  }
}

/**
 * Test the exact API call that the modal makes
 */
export async function testMocCreation(): Promise<void> {
  try {
    console.log('🧪 Testing MOC creation API call...');

    // Get current cookies
    const authCookie = document.cookie.split('; ').find(row => row.startsWith('token='));
    const csrfCookie = document.cookie.split('; ').find(row => row.startsWith('XSRF-TOKEN='));

    if (!authCookie || !csrfCookie) {
      console.error('❌ Missing cookies. Run setupTestAuth() first.');
      return;
    }

    // Extract CSRF token value
    const csrfToken = csrfCookie.split('=')[1];

    console.log('📋 Request details:');
    console.log('  URL: /api/mocs/with-files');
    console.log('  Auth Cookie:', authCookie ? '✅ Present' : '❌ Missing');
    console.log('  CSRF Cookie:', csrfCookie ? '✅ Present' : '❌ Missing');
    console.log('  CSRF Token:', csrfToken);

    // Make the exact same request as the modal
    const response = await fetch('/api/mocs/with-files', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      credentials: 'include',
      body: JSON.stringify({
        title: 'Test MOC from Console',
        description: 'Testing authentication',
      }),
    });

    console.log('📡 Response:', response.status, response.statusText);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Success!', data);
    } else {
      const errorData = await response.text();
      console.log('❌ Error response:', errorData);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Make functions available globally for easy console access
if (typeof window !== 'undefined') {
  (window as any).setupTestAuth = setupTestAuth;
  (window as any).checkAuthStatus = checkAuthStatus;
  (window as any).getTestAuthToken = getTestAuthToken;
  (window as any).getCSRFToken = getCSRFToken;
  (window as any).testMocCreation = testMocCreation;
}
