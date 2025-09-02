/**
 * CSRF Token Management Service
 * 
 * Handles fetching and managing CSRF tokens for secure API requests.
 * Implements Phase F: Client Security requirements.
 */

let csrfToken: string | null = null

/**
 * Fetch CSRF token from the server
 */
export async function fetchCSRFToken(): Promise<string> {
  try {
    const response = await fetch('/api/csrf', {
      method: 'GET',
      credentials: 'include', // Include cookies for session
    })

    if (!response.ok) {
      throw new Error(`CSRF token fetch failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    if (!data.csrfToken && !data.token) {
      throw new Error('CSRF token not found in response')
    }

    const token = data.csrfToken || data.token
    csrfToken = token
    
    console.debug('CSRF token fetched successfully')
    return token
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error)
    throw error
  }
}

/**
 * Get current CSRF token (fetch if not available)
 */
export async function getCSRFToken(): Promise<string> {
  if (!csrfToken) {
    await fetchCSRFToken()
  }
  
  if (!csrfToken) {
    throw new Error('CSRF token is not available')
  }
  
  return csrfToken
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
export async function initializeCSRF(): Promise<void> {
  try {
    await fetchCSRFToken()
    console.info('CSRF initialized successfully')
  } catch (error) {
    console.error('Failed to initialize CSRF:', error)
    // Don't throw here - let the app continue and handle CSRF errors per request
  }
}

/**
 * Prepare headers with CSRF token for mutation requests
 */
export async function getCSRFHeaders(): Promise<Record<string, string>> {
  try {
    const token = await getCSRFToken()
    return {
      'X-CSRF-Token': token,
      'Content-Type': 'application/json',
    }
  } catch (error) {
    console.warn('Failed to get CSRF token for headers:', error)
    return {
      'Content-Type': 'application/json',
    }
  }
}
