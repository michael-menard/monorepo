/**
 * CSRF Protection Demo Page
 * 
 * Interactive demo showing CSRF protection features including:
 * - Token fetching and display
 * - RTK Query mutations with CSRF protection
 * - Custom fetch requests with CSRF headers
 * - Error handling and retry logic
 * - Manual CSRF debugging tools
 */

import { useEffect, useState } from 'react'
import { 
  clearCSRFToken,
  getCSRFHeaders,
  getCSRFToken, 
  hasCSRFToken, 
  initializeCSRF,
  refreshCSRFToken
} from '@repo/auth'
import { authApi } from '../../services/authApi'
import { useCreateMOCInstructionMutation } from '../../services/api'

interface DemoResult {
  success: boolean
  message: string
  data?: any
  timestamp: string
}

export default function CSRFDemoPage() {
  const [csrfToken, setCsrfToken] = useState<string>('')
  const [isTokenAvailable, setIsTokenAvailable] = useState(false)
  const [demoResults, setDemoResults] = useState<Array<DemoResult>>([])
  const [isLoading, setIsLoading] = useState(false)
  
  // RTK Query mutation hook
  const [createMOC, { isLoading: isMOCLoading }] = useCreateMOCInstructionMutation()

  useEffect(() => {
    updateTokenStatus()
  }, [])

  const addResult = (result: Omit<DemoResult, 'timestamp'>) => {
    const newResult: DemoResult = {
      ...result,
      timestamp: new Date().toLocaleTimeString()
    }
    setDemoResults(prev => [newResult, ...prev])
  }

  const updateTokenStatus = async () => {
    try {
      const hasToken = hasCSRFToken()
      setIsTokenAvailable(hasToken)
      
      if (hasToken) {
        const token = await getCSRFToken()
        setCsrfToken(token.substring(0, 20) + '...')
      } else {
        setCsrfToken('')
      }
    } catch (error) {
      console.error('Error updating token status:', error)
    }
  }

  // Demo 1: Initialize CSRF
  const handleInitializeCSRF = async () => {
    setIsLoading(true)
    try {
      await initializeCSRF()
      await updateTokenStatus()
      addResult({
        success: true,
        message: 'CSRF protection initialized successfully'
      })
    } catch (error: any) {
      addResult({
        success: false,
        message: `CSRF initialization failed: ${error.message}`
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Demo 2: Fetch Fresh Token
  const handleFetchToken = async () => {
    setIsLoading(true)
    try {
      const token = await getCSRFToken()
      await updateTokenStatus()
      addResult({
        success: true,
        message: `CSRF token fetched successfully`,
        data: { tokenPreview: token.substring(0, 20) + '...' }
      })
    } catch (error: any) {
      addResult({
        success: false,
        message: `Token fetch failed: ${error.message}`
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Demo 3: Refresh Token
  const handleRefreshToken = async () => {
    setIsLoading(true)
    try {
      const newToken = await refreshCSRFToken()
      await updateTokenStatus()
      addResult({
        success: true,
        message: 'CSRF token refreshed successfully',
        data: { tokenPreview: newToken.substring(0, 20) + '...' }
      })
    } catch (error: any) {
      addResult({
        success: false,
        message: `Token refresh failed: ${error.message}`
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Demo 4: RTK Query Mutation with CSRF
  const handleRTKQueryDemo = async () => {
    setIsLoading(true)
    try {
      const mockMOC = {
        title: 'CSRF Demo Starship',
        difficulty: 'intermediate' as const,
        pieces: 1500,
        estimatedTime: 240,
        instructions: [
          {
            step: 1,
            image: 'https://example.com/step1.jpg',
            description: 'Build the hull',
            parts: [
              { partNumber: '3001', color: 'white', quantity: 10 }
            ]
          }
        ],
        tags: ['demo', 'csrf', 'starship']
      }

      const result = await createMOC(mockMOC).unwrap()
      addResult({
        success: true,
        message: 'RTK Query mutation with CSRF protection succeeded',
        data: { mocId: result.data?.id }
      })
    } catch (error: any) {
      addResult({
        success: false,
        message: `RTK Query mutation failed: ${error.message}`,
        data: { errorCode: error.data?.code }
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Demo 5: Auth API with CSRF
  const handleAuthDemo = async () => {
    setIsLoading(true)
    try {
      // Try to check auth status (this should work with CSRF)
      const result = await authApi.checkAuth()
      addResult({
        success: true,
        message: 'Auth API call with CSRF protection succeeded',
        data: { user: result.data?.user?.email }
      })
    } catch (error: any) {
      // This might fail if not logged in, but should still show CSRF protection
      if (error.status === 401) {
        addResult({
          success: true,
          message: 'Auth API call with CSRF protection executed (not authenticated)',
          data: { status: error.status }
        })
      } else {
        addResult({
          success: false,
          message: `Auth API call failed: ${error.message}`,
          data: { status: error.status, code: error.code }
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Demo 6: Custom Fetch with CSRF
  const handleCustomFetchDemo = async () => {
    setIsLoading(true)
    try {
      const headers = await getCSRFHeaders()
      
      const response = await fetch('/api/moc-instructions', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          title: 'Custom Fetch Demo MOC',
          difficulty: 'beginner'
        })
      })

      if (response.ok) {
        const data = await response.json()
        addResult({
          success: true,
          message: 'Custom fetch with CSRF headers succeeded',
          data: { status: response.status }
        })
      } else {
        const errorData = await response.json()
        addResult({
          success: false,
          message: `Custom fetch failed: ${errorData.message || response.statusText}`,
          data: { 
            status: response.status, 
            code: errorData.code,
            csrfHeaderPresent: !!headers['X-CSRF-Token']
          }
        })
      }
    } catch (error: any) {
      addResult({
        success: false,
        message: `Custom fetch error: ${error.message}`
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Demo 7: Clear Token
  const handleClearToken = () => {
    clearCSRFToken()
    updateTokenStatus()
    addResult({
      success: true,
      message: 'CSRF token cleared from memory'
    })
  }

  // Demo 8: Run Audit Report
  const handleRunAudit = async () => {
    try {
      // Run the global audit function
      if (window.testCSRFIntegration) {
        await window.testCSRFIntegration()
        addResult({
          success: true,
          message: 'CSRF audit completed - check browser console for details'
        })
      } else {
        addResult({
          success: false,
          message: 'CSRF audit tools not available'
        })
      }
    } catch (error: any) {
      addResult({
        success: false,
        message: `CSRF audit failed: ${error.message}`
      })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            🔒 CSRF Protection Demo
          </h1>
          
          <p className="text-gray-600 mb-8">
            This demo page shows the CSRF protection features in action. 
            Use the buttons below to test different aspects of CSRF token management,
            automatic retry logic, and integration with RTK Query and Auth APIs.
          </p>

          {/* Current Status */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
            <h2 className="text-lg font-semibold text-blue-900 mb-2">Current Status</h2>
            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-medium">CSRF Token Available:</span>{' '}
                <span className={isTokenAvailable ? 'text-green-600' : 'text-red-600'}>
                  {isTokenAvailable ? '✅ Yes' : '❌ No'}
                </span>
              </p>
              {csrfToken && (
                <p className="text-sm">
                  <span className="font-medium">Token Preview:</span>{' '}
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                    {csrfToken}
                  </code>
                </p>
              )}
            </div>
          </div>

          {/* Demo Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <button
              onClick={handleInitializeCSRF}
              disabled={isLoading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '...' : '1. Initialize CSRF'}
            </button>

            <button
              onClick={handleFetchToken}
              disabled={isLoading}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '...' : '2. Fetch Token'}
            </button>

            <button
              onClick={handleRefreshToken}
              disabled={isLoading}
              className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '...' : '3. Refresh Token'}
            </button>

            <button
              onClick={handleRTKQueryDemo}
              disabled={isLoading || isMOCLoading}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading || isMOCLoading ? '...' : '4. RTK Query Demo'}
            </button>

            <button
              onClick={handleAuthDemo}
              disabled={isLoading}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '...' : '5. Auth API Demo'}
            </button>

            <button
              onClick={handleCustomFetchDemo}
              disabled={isLoading}
              className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '...' : '6. Custom Fetch Demo'}
            </button>

            <button
              onClick={handleClearToken}
              disabled={isLoading}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              7. Clear Token
            </button>

            <button
              onClick={handleRunAudit}
              disabled={isLoading}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              8. Run Audit
            </button>
          </div>

          {/* Results Log */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Demo Results ({demoResults.length})
            </h3>
            
            {demoResults.length === 0 ? (
              <p className="text-gray-500 italic">
                No results yet. Try running some demos above.
              </p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {demoResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      result.success
                        ? 'bg-green-50 border-green-200 text-green-800'
                        : 'bg-red-50 border-red-200 text-red-800'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium">
                          {result.success ? '✅' : '❌'} {result.message}
                        </p>
                        {result.data && (
                          <pre className="mt-2 text-xs bg-white bg-opacity-50 p-2 rounded overflow-x-auto">
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 ml-2">
                        {result.timestamp}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => setDemoResults([])}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Clear Results
              </button>
            </div>
          </div>

          {/* Developer Tools */}
          <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-yellow-900 mb-2">
              Developer Tools
            </h3>
            <p className="text-sm text-yellow-800 mb-3">
              Open your browser's developer console and try these commands:
            </p>
            <div className="space-y-2 text-sm">
              <code className="block bg-white p-2 rounded text-black">
                window.testCSRFIntegration() // Run comprehensive CSRF test
              </code>
              <code className="block bg-white p-2 rounded text-black">
                window.enableCSRFRequestLogging() // Log CSRF headers on requests
              </code>
              <code className="block bg-white p-2 rounded text-black">
                window.generateCSRFAuditReport() // Generate audit report
              </code>
              <code className="block bg-white p-2 rounded text-black">
                window.csrfExamples // Explore example functions
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    testCSRFIntegration?: () => Promise<void>
    enableCSRFRequestLogging?: () => () => void
    generateCSRFAuditReport?: () => string
    csrfExamples?: any
  }
}
