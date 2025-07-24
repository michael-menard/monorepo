// Token management utilities for auth (HTTP-only cookies for security)

// Configuration for token management
const TOKEN_CONFIG = {
  refreshThreshold: 5 * 60 * 1000, // 5 minutes before expiry
  maxRefreshAttempts: 3,
} as const;

let refreshPromise: Promise<string | null> | null = null;

// Get token from cookies (client-side: only non-HTTP-only tokens are accessible)
export function getToken(): string | null {
  // For HTTP-only cookies, token is not accessible from JS. Use server-side or rely on API.
  return null;
}

// Set token in cookies (client-side: only non-HTTP-only tokens are accessible)
export function setToken(token: string): void {
  // For HTTP-only cookies, set via server response only
  console.warn('setToken: HTTP-only cookies should be set by server response, not client-side');
}

// Remove token from cookies
export function removeToken(): void {
  // For HTTP-only cookies, removal should be handled by server logout endpoint
  console.warn('removeToken: HTTP-only cookies should be removed by server logout endpoint');
}

// Check if JWT token is expired
export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  } catch (error) {
    console.error('Error parsing JWT token:', error);
    return true; // Treat invalid tokens as expired
  }
}

// Get token expiry time in milliseconds
export function getTokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000; // Convert to milliseconds
  } catch (error) {
    console.error('Error parsing JWT token expiry:', error);
    return null;
  }
}

// Check if token should be refreshed (within threshold of expiry)
export function shouldRefreshToken(token: string): boolean {
  const expiry = getTokenExpiry(token);
  if (!expiry) return true;

  const timeUntilExpiry = expiry - Date.now();
  return timeUntilExpiry <= TOKEN_CONFIG.refreshThreshold;
}

// Automatic token refresh with deduplication
// Note: Using fetch here instead of RTK Query because this utility function
// needs to work outside of React components, and RTK Query's initiate method
// has complex typing when used in utility functions
export async function refreshToken(): Promise<string | null> {
  // If there's already a refresh in progress, return that promise
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include', // Include cookies
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Refresh failed: ${response.status}`);
      }

      const data = await response.json();
      // Handle both possible response structures
      const token = data?.data?.tokens?.accessToken || data?.tokens?.accessToken || data?.accessToken || null;
      return token;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return null;
    } finally {
      // Clear the promise so future calls can attempt refresh again
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// Refresh token with retry logic
export async function refreshTokenWithRetry(): Promise<string | null> {
  for (let attempt = 1; attempt <= TOKEN_CONFIG.maxRefreshAttempts; attempt++) {
    try {
      const result = await refreshToken();
      if (result !== null) {
        return result;
      }

      // If we get here, refresh failed but didn't throw
      console.error(`Token refresh attempt ${attempt} failed`);

      // Wait before retrying (exponential backoff)
      if (attempt < TOKEN_CONFIG.maxRefreshAttempts) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    } catch (error) {
      console.error(`Token refresh attempt ${attempt} error:`, error);

      // Wait before retrying (exponential backoff)
      if (attempt < TOKEN_CONFIG.maxRefreshAttempts) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  console.error(`Token refresh failed after ${TOKEN_CONFIG.maxRefreshAttempts} attempts`);
  return null;
}

// Clear refresh state (useful for testing)
export function clearRefreshState(): void {
  refreshPromise = null;
} 