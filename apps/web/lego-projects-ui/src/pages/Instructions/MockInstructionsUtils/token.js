// Token management utilities for moc (HTTP-only cookies assumed for security)
export function getToken() {
    return null;
}
export function setToken(token) { }
export function removeToken() { }
export function isTokenExpired(token) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const now = Math.floor(Date.now() / 1000);
        return payload.exp < now;
    }
    catch {
        return true;
    }
}
export async function refreshToken() {
    return null;
}
