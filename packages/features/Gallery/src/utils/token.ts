// Token management utilities for gallery (HTTP-only cookies assumed for security)

export function getToken(): string | null {
  return null;
}

export function setToken(token: string): void {}

export function removeToken(): void {}

export function isTokenExpired(token: string): boolean {
  try {
    if (typeof token !== 'string' || !token) return true;
    const parts = token.split('.');
    if (parts.length < 2 || !parts[1]) return true;
    const payload = JSON.parse(atob(parts[1]));
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  } catch {
    return true;
  }
}

export async function refreshToken(): Promise<string | null> {
  return null;
} 