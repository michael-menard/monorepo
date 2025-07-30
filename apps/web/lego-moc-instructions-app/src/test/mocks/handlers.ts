import { HttpResponse, http } from 'msw'

// Define handlers that correspond to your API endpoints
export const handlers = [
  // Health check
  http.get('/api/health', () => {
    return HttpResponse.json({ status: 'ok' })
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

  // Add more auth handlers as needed
] 