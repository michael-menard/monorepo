/**
 * CSRF Protection Examples
 *
 * Comprehensive examples showing different ways to handle CSRF protection
 * in various scenarios throughout the application.
 */

import {
  clearCSRFToken,
  getCSRFHeaders,
  getCSRFToken,
  initializeCSRF,
  refreshCSRFToken,
  useFetchCSRFTokenQuery,
} from '@repo/auth'
import { api } from './api'
import { authApi } from './authApi'

// ============================================================================
// Example 1: RTK Query Mutations (Automatic CSRF Protection)
// ============================================================================

/**
 * RTK Query mutations are automatically CSRF-protected through the baseQueryWithCSRF
 * No manual intervention required - CSRF tokens are added automatically
 */
export const rtkQueryExamples = {
  // Creating a new MOC instruction
  async createMOCInstruction() {
    const { useCreateMOCInstructionMutation } = api

    // In a React component:
    // const [createMOC, { isLoading, error }] = useCreateMOCInstructionMutation()

    const mocData = {
      title: 'Starship Enterprise',
      difficulty: 'expert' as const,
      pieces: 2500,
      estimatedTime: 480,
      instructions: [],
      tags: ['starship', 'star-trek', 'sci-fi'],
    }

    try {
      // CSRF token is automatically added by baseQueryWithCSRF
      // Automatic retry on CSRF failure
      // const result = await createMOC(mocData).unwrap()
      console.log('MOC created successfully with automatic CSRF protection')
    } catch (error) {
      console.error('Creation failed:', error)
    }
  },

  // Updating an existing MOC
  async updateMOCInstruction() {
    const { useUpdateMOCInstructionMutation } = api

    // In a React component:
    // const [updateMOC] = useUpdateMOCInstructionMutation()

    const updateData = {
      id: 'moc-123',
      body: {
        title: 'Updated Starship Enterprise',
        pieces: 2600,
      },
    }

    try {
      // CSRF protection and retry logic handled automatically
      // const result = await updateMOC(updateData).unwrap()
      console.log('MOC updated with CSRF protection')
    } catch (error) {
      console.error('Update failed:', error)
    }
  },
}

// ============================================================================
// Example 2: Auth API Usage (Automatic CSRF Protection)
// ============================================================================

/**
 * Authentication endpoints with CSRF protection and retry logic
 */
export const authApiExamples = {
  // User login with CSRF protection
  async loginUser(email: string, password: string) {
    try {
      // CSRF token automatically added for mutation requests
      // Automatic retry on CSRF failure
      const response = await authApi.login({ email, password })

      console.log('Login successful:', response.data?.user)
      return response.data?.user
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  },

  // User signup with CSRF protection
  async signupUser(name: string, email: string, password: string) {
    try {
      // CSRF protection built-in
      const response = await authApi.signup({ name, email, password })

      console.log('Signup successful:', response.data?.user)
      return response.data?.user
    } catch (error) {
      console.error('Signup failed:', error)
      throw error
    }
  },

  // User logout with CSRF protection
  async logoutUser() {
    try {
      await authApi.logout()

      // Clear CSRF token after successful logout
      clearCSRFToken()

      console.log('Logout successful')
    } catch (error) {
      console.error('Logout failed:', error)
      throw error
    }
  },
}

// ============================================================================
// Example 3: Custom Fetch Requests (Manual CSRF Handling)
// ============================================================================

/**
 * Manual CSRF token handling for custom fetch requests
 */
export const customFetchExamples = {
  // Basic custom request with CSRF headers
  async basicCustomRequest() {
    try {
      const headers = await getCSRFHeaders()

      const response = await fetch('/api/custom-endpoint', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ data: 'example' }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log('Custom request successful:', data)
      return data
    } catch (error) {
      console.error('Custom request failed:', error)
      throw error
    }
  },

  // Custom request with manual CSRF retry logic
  async requestWithManualRetry() {
    const makeRequest = async (token?: string) => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      if (token) {
        headers['X-CSRF-Token'] = token
      } else {
        const csrfHeaders = await getCSRFHeaders()
        Object.assign(headers, csrfHeaders)
      }

      return fetch('/api/protected-endpoint', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ action: 'sensitive-operation' }),
      })
    }

    try {
      let response = await makeRequest()

      // Handle CSRF failure with manual retry
      if (response.status === 403) {
        const errorData = await response.json()

        if (errorData.code === 'CSRF_FAILED') {
          console.log('CSRF token failed, refreshing and retrying...')

          // Get fresh token and retry
          const newToken = await refreshCSRFToken()
          response = await makeRequest(newToken)
        }
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log('Request with manual retry successful:', data)
      return data
    } catch (error) {
      console.error('Request with manual retry failed:', error)
      throw error
    }
  },

  // File upload with CSRF protection
  async uploadFileWithCSRF(file: File) {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'instruction-image')

      // Get CSRF token for file upload
      const token = await getCSRFToken()

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'X-CSRF-Token': token,
          // Don't set Content-Type - let browser set it for FormData
        },
        credentials: 'include',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`)
      }

      const result = await response.json()
      console.log('File uploaded with CSRF protection:', result)
      return result
    } catch (error) {
      console.error('File upload failed:', error)
      throw error
    }
  },
}

// ============================================================================
// Example 4: Application Lifecycle Management
// ============================================================================

/**
 * CSRF token management throughout the application lifecycle
 */
export const lifecycleExamples = {
  // Initialize CSRF on app startup
  async initializeApp() {
    try {
      console.log('Initializing CSRF protection...')
      await initializeCSRF()
      console.log('CSRF protection initialized successfully')
    } catch (error) {
      console.error('CSRF initialization failed:', error)
      // App can still function, but CSRF protection may not work
    }
  },

  // Handle user logout
  async handleUserLogout() {
    try {
      // Perform logout request (includes CSRF protection)
      await authApi.logout()

      // Clear CSRF token from memory
      clearCSRFToken()

      // Clear other user data
      localStorage.removeItem('user-preferences')

      console.log('User logged out successfully')
    } catch (error) {
      console.error('Logout failed:', error)

      // Still clear local data even if logout request failed
      clearCSRFToken()
      localStorage.removeItem('user-preferences')
    }
  },

  // Handle token refresh scenarios
  async handleTokenRefresh() {
    try {
      console.log('Refreshing CSRF token...')
      const newToken = await refreshCSRFToken()
      console.log('CSRF token refreshed successfully')
      return newToken
    } catch (error) {
      console.error('CSRF token refresh failed:', error)

      // Might need to redirect to login or show error
      throw new Error('Security token expired. Please refresh the page.')
    }
  },
}

// ============================================================================
// Example 5: Error Handling Patterns
// ============================================================================

/**
 * Different error handling patterns for CSRF-protected requests
 */
export const errorHandlingExamples = {
  // Basic error handling with user feedback
  async handleRequestWithFeedback(showError: (message: string) => void) {
    try {
      const headers = await getCSRFHeaders()

      const response = await fetch('/api/user-action', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ action: 'update-profile' }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 403 && data.code === 'CSRF_FAILED') {
          showError('Security error. Please refresh the page and try again.')
        } else {
          showError(data.message || 'An error occurred. Please try again.')
        }
        return null
      }

      return data
    } catch (error) {
      console.error('Request failed:', error)
      showError('Network error. Please check your connection.')
      return null
    }
  },

  // Error handling with automatic retry attempts
  async requestWithRetries(maxRetries = 2) {
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const headers = await getCSRFHeaders()

        const response = await fetch('/api/important-action', {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({ critical: true }),
        })

        if (response.ok) {
          const data = await response.json()
          console.log(`Request successful on attempt ${attempt + 1}`)
          return data
        }

        const errorData = await response.json()

        if (response.status === 403 && errorData.code === 'CSRF_FAILED') {
          console.log(`CSRF failure on attempt ${attempt + 1}, refreshing token...`)
          await refreshCSRFToken()
          continue // Retry with new token
        }

        // Non-CSRF error, don't retry
        throw new Error(errorData.message || `HTTP ${response.status}`)
      } catch (error) {
        lastError = error as Error
        console.error(`Attempt ${attempt + 1} failed:`, error)

        if (attempt === maxRetries) {
          break // Max retries reached
        }

        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
      }
    }

    throw new Error(`Request failed after ${maxRetries + 1} attempts: ${lastError?.message}`)
  },
}

// ============================================================================
// Example 6: React Hook Integration
// ============================================================================

/**
 * Custom React hooks for CSRF-protected operations
 */
export const reactHookExamples = {
  // Custom hook for CSRF-protected mutations
  useCSRFMutation: (url: string) => {
    // This would be implemented as a custom React hook
    const mutate = async (data: any) => {
      const headers = await getCSRFHeaders()

      const response = await fetch(url, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()

        if (response.status === 403 && errorData.code === 'CSRF_FAILED') {
          // Attempt automatic retry with fresh token
          const newToken = await refreshCSRFToken()
          const retryResponse = await fetch(url, {
            method: 'POST',
            headers: {
              ...headers,
              'X-CSRF-Token': newToken,
            },
            credentials: 'include',
            body: JSON.stringify(data),
          })

          if (!retryResponse.ok) {
            throw new Error('Request failed after CSRF retry')
          }

          return retryResponse.json()
        }

        throw new Error(errorData.message || 'Request failed')
      }

      return response.json()
    }

    return { mutate }
  },
}

// ============================================================================
// Export all examples for easy access
// ============================================================================

export const csrfExamples = {
  rtkQuery: rtkQueryExamples,
  authApi: authApiExamples,
  customFetch: customFetchExamples,
  lifecycle: lifecycleExamples,
  errorHandling: errorHandlingExamples,
  reactHooks: reactHookExamples,
}

// Make examples available globally for development/debugging
if (typeof window !== 'undefined') {
  const globalWindow = window as any
  globalWindow.csrfExamples = csrfExamples

  // Quick test function for immediate verification
  globalWindow.testCSRFExample = async () => {
    try {
      console.log('🔒 Running CSRF Example Test')
      console.log('==============================')

      // Test token fetching
      const token = await getCSRFToken()
      console.log('✅ CSRF Token Retrieved:', token ? 'Success' : 'Failed')

      // Test header preparation
      const headers = await getCSRFHeaders()
      console.log('✅ CSRF Headers Prepared:', headers['X-CSRF-Token'] ? 'Success' : 'Failed')

      console.log('==============================')
      console.log('CSRF Example Test Complete')
    } catch (error) {
      console.error('❌ CSRF Example Test Failed:', error)
    }
  }
}
