/**
 * CSRF Token Management Service for Auth Package
 *
 * Handles fetching and managing CSRF tokens for secure API requests.
 * Implements double-submit cookie pattern with automatic retry logic.
 * Integrates with RTK Query for seamless auth API protection.
 */

let csrfToken: string | null = null

/**
 * Get CSRF token from cookie (double-submit cookie pattern)
 */
function getCSRFTokenFromCookie(): string | null {
  try {
    const cookieValue = document.cookie
      .split('; ')
      .find(row => row.startsWith('XSRF-TOKEN='))
      ?.split('=')[1]

    return cookieValue ? decodeURIComponent(cookieValue) : null
  } catch (error) {
    console.warn('Failed to read CSRF token from cookie:', error)
    return null
  }
}

/**
 * Fetch CSRF token from the server
 */
export async function fetchCSRFToken(baseUrl?: string): Promise<string> {
  // Environment-aware URL building
  let url = baseUrl

  if (!url) {
    // Check if we're in a browser environment with Vite
    if (typeof window !== 'undefined' && typeof import.meta !== 'undefined' && import.meta.env) {
      const isDev = import.meta.env.DEV

      if (isDev) {
        // Development: Use local auth service
        const authPort = import.meta.env.VITE_AUTH_API_PORT || '3001'
        url = `http://localhost:${authPort}`
      } else {
        // Production/Staging: Use environment-specific URL
        const authUrl = import.meta.env.VITE_AUTH_API_URL
        if (authUrl) {
          // Remove /api/auth suffix if present to get base URL
          url = authUrl.replace(/\/api\/auth$/, '')
        } else {
          url = '' // Use relative URL
        }
      }
    } else {
      // Node.js environment
      url = process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : ''
    }
  }

  try {
    const response = await fetch(`${url}/api/auth/csrf`, {
      method: 'GET',
      credentials: 'include', // Include cookies for session
    })

    if (!response.ok) {
      throw new Error(`CSRF token fetch failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (!data.token) {
      throw new Error('CSRF token not found in response')
    }

    const token = data.token
    csrfToken = token

    console.debug('CSRF token fetched successfully')
    return token
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error)
    throw error
  }
}

/**
 * Get current CSRF token (prioritize cookie, fallback to fetch)
 */
export async function getCSRFToken(baseUrl?: string): Promise<string> {
  // First, try to get token from cookie (double-submit pattern)
  const token = getCSRFTokenFromCookie()

  if (token) {
    csrfToken = token
    return token
  }

  // If no cookie token, use in-memory token or fetch new one
  if (!csrfToken) {
    await fetchCSRFToken(baseUrl)
  }

  if (!csrfToken) {
    throw new Error('CSRF token is not available')
  }

  return csrfToken
}

/**
 * Refresh CSRF token (force fetch from server)
 */
export async function refreshCSRFToken(baseUrl?: string): Promise<string> {
  csrfToken = null // Clear cached token
  return await fetchCSRFToken(baseUrl)
}

/**
 * Clear stored CSRF token (on logout or auth changes)
 */
export function clearCSRFToken(): void {
  csrfToken = null
  console.debug('CSRF token cleared')
}

/**
 * Check if CSRF token is available
 */
export function hasCSRFToken(): boolean {
  return csrfToken !== null
}

/**
 * Initialize CSRF token on app start
 */
export async function initializeCSRF(baseUrl?: string): Promise<void> {
  try {
    await fetchCSRFToken(baseUrl)
    console.info('CSRF initialized successfully')
  } catch (error) {
    console.error('Failed to initialize CSRF:', error)
    // Don't throw here - let the app continue and handle CSRF errors per request
  }
}

/**
 * Prepare headers with CSRF token for mutation requests
 */
export async function getCSRFHeaders(baseUrl?: string): Promise<Record<string, string>> {
  try {
    const token = await getCSRFToken(baseUrl)
    return {
      'X-CSRF-Token': token,
    }
  } catch (error) {
    console.warn('Failed to get CSRF token for headers:', error)
    return {}
  }
}

/**
 * Check if an error is a CSRF failure
 */
export function isCSRFError(error: any): boolean {
  return (
    error?.status === 403 &&
    (error?.data?.code === 'CSRF_FAILED' || error?.data?.message?.includes('CSRF'))
  )
}
