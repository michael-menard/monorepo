// Token management utilities for auth (HTTP-only cookies assumed for security)

// Get token from cookies (client-side: only non-HTTP-only tokens are accessible)
export function getToken(): string | null {
  // For HTTP-only cookies, token is not accessible from JS. Use server-side or rely on API.
  return null;
}

// Set token in cookies (client-side: only non-HTTP-only tokens are accessible)
export function setToken(token: string): void {
  // For HTTP-only cookies, set via server response only.
}

// Remove token from cookies (client-side: only non-HTTP-only tokens are accessible)
export function removeToken(): void {
  // For HTTP-only cookies, remove via server response only.
}

// Check if a JWT token is expired
export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  } catch {
    return true;
  }
}

// Placeholder for refresh token logic (should call API endpoint)
export async function refreshToken(): Promise<string | null> {
  // Call your /refresh endpoint; server should set new HTTP-only cookie
  // Example:
  // await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
  return null;
} 