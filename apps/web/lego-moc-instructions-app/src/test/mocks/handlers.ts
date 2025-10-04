import { HttpResponse, http } from 'msw'

// Define handlers that correspond to your API endpoints
export const handlers = [
  // Health check
  http.get('/api/health', () => {
    return HttpResponse.json({ status: 'ok' })
  }),

  // CSRF token endpoint - CRITICAL for auth tests
  http.get('*/auth/csrf', () => {
    return HttpResponse.json({
      token: 'mock-csrf-token-123'  // Match test expectations exactly
    })
  }),

  // Auth API endpoints - using the actual base URL pattern
  http.post('*/auth/verify-email', async ({ request }) => {
    const body = await request.json() as { code?: string }
    
    // Mock successful verification
    if (body.code === '123456') {
      return HttpResponse.json({
        success: true,
        message: 'Email verified successfully',
        data: {
          user: {
            _id: '1',
            email: 'test@example.com',
            name: 'Test User',
            isVerified: true,
            lastLogin: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        }
      })
    }
    
    // Mock failed verification
    return HttpResponse.json({
      success: false,
      message: 'Invalid or expired verification code'
    }, { status: 400 })
  }),

  http.post('*/auth/resend-verification', async ({ request }) => {
    const body = await request.json() as { email?: string }
    
    // Mock successful resend
    if (body.email && body.email.includes('@')) {
      return HttpResponse.json({
        success: true,
        message: 'Verification email resent'
      })
    }
    
    // Mock failed resend
    return HttpResponse.json({
      success: false,
      message: 'Email is required'
    }, { status: 400 })
  }),

  // Reset password endpoint
  http.post('*/auth/reset-password/*', () => {
    return HttpResponse.json({
      success: true,
      message: 'Password reset successful'
    }, { status: 200 })
  }),

  // Login endpoint
  http.post('*/auth/login', async ({ request }) => {
    const body = await request.json() as { email?: string; password?: string }

    if (body.email === 'test@example.com' && body.password === 'password123') {
      return HttpResponse.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            _id: '1',
            email: 'test@example.com',
            name: 'Test User',
            isVerified: true,
            lastLogin: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token'
        }
      })
    }

    return HttpResponse.json({
      success: false,
      message: 'Invalid credentials'
    }, { status: 401 })
  }),

  // Logout endpoint
  http.post('*/auth/logout', () => {
    return HttpResponse.json({
      success: true,
      message: 'Logged out successfully'
    })
  }),

  // User profile endpoint
  http.get('*/auth/me', () => {
    return HttpResponse.json({
      success: true,
      data: {
        user: {
          _id: '1',
          email: 'test@example.com',
          name: 'Test User',
          isVerified: true,
          lastLogin: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }
    })
  }),

  // Add more auth handlers as needed
] 