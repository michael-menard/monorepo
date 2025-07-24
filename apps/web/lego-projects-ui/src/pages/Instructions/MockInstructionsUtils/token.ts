// Token management utilities for moc (HTTP-only cookies assumed for security)

export function getToken(): string | null {
  return null;
}

export function setToken(token: string): void {}

export function removeToken(): void {}

export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  } catch {
    return true;
  }
}

export async function refreshToken(): Promise<string | null> {
  return null;
} 